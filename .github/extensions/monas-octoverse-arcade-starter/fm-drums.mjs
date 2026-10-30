const FLOOR = 0.0001;
// Peak gains before the shared 0.3 output stage. Kick punch is a short 2nd-harmonic layer
// that makes the kick read louder on small speakers without raising its sub peak.
// The hat is mostly high-passed noise (hiss) with only a faint FM shimmer so it never reads as a chime.
export const LEVELS = { output: 0.3, kick: 1, kickPunch: 0.35, hat: 0.4, hatTone: 0.08, snare: 0.15, snareNoise: 0.28 };
const NOISE_SECONDS = 0.25;

export function createDrumSynth(context) {
  if (!context || typeof context.createOscillator !== "function") {
    throw new TypeError("An AudioContext or OfflineAudioContext is required.");
  }
  if (context.state === "closed") throw new Error("The audio context is closed.");

  const output = context.createGain();
  output.gain.value = LEVELS.output;
  output.connect(context.destination);
  const voices = new Set();
  let noiseBuffer, disposed = false;

  function trigger(kind, when = context.currentTime, velocity = 1) {
    if (disposed) throw new Error("The drum synth has been disposed.");
    if (context.state === "closed") throw new Error("The audio context is closed.");
    if (!Number.isFinite(when) || when < 0) {
      throw new RangeError("when must be a non-negative audio-clock time in seconds.");
    }
    if (!Number.isFinite(velocity) || velocity < 0 || velocity > 1) {
      throw new RangeError("velocity must be between 0 and 1.");
    }
    const start = Math.max(when, context.currentTime);
    if (velocity === 0) return start;

    const duration = kind === "kick" ? 0.48 : kind === "hat" ? 0.09 : 0.22;
    const end = start + duration;
    const sources = [], nodes = [];
    const node = (value) => { nodes.push(value); return value; };
    const oscillator = (frequency) => {
      const source = node(context.createOscillator());
      source.frequency.setValueAtTime(frequency, start);
      sources.push(source);
      return source;
    };
    const envelope = (peak, decay) => {
      const gain = node(context.createGain());
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(peak * velocity, start + 0.002);
      gain.gain.exponentialRampToValueAtTime(FLOOR, start + decay);
      gain.gain.linearRampToValueAtTime(0, end);
      return gain;
    };

    const carrier = oscillator(kind === "kick" ? 150 : kind === "hat" ? 5400 : 185);
    const modulator = oscillator(kind === "kick" ? 90 : kind === "hat" ? 8340 : 330);
    const depth = node(context.createGain());
    depth.gain.setValueAtTime(kind === "kick" ? 95 : kind === "hat" ? 4500 : 2400, start);
    depth.gain.exponentialRampToValueAtTime(kind === "hat" ? 100 : 1, start + duration * 0.7);
    modulator.connect(depth);
    depth.connect(carrier.frequency);

    if (kind === "kick") {
      carrier.frequency.exponentialRampToValueAtTime(55, start + 0.12);
      modulator.frequency.exponentialRampToValueAtTime(55, start + 0.1);
    }
    const noiseSource = () => {
      if (!noiseBuffer) {
        noiseBuffer = context.createBuffer(1, Math.ceil(context.sampleRate * NOISE_SECONDS), context.sampleRate);
        const samples = noiseBuffer.getChannelData(0);
        for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
      }
      const noise = node(context.createBufferSource());
      noise.buffer = noiseBuffer;
      sources.push(noise);
      return noise;
    };
    const amplitude = envelope(kind === "hat" ? LEVELS.hatTone : LEVELS[kind], duration * 0.85);
    carrier.connect(amplitude);
    if (kind === "kick") {
      const punch = oscillator(300);
      punch.frequency.exponentialRampToValueAtTime(110, start + 0.08);
      const punchAmplitude = envelope(LEVELS.kickPunch, 0.12);
      punch.connect(punchAmplitude);
      punchAmplitude.connect(output);
    }
    if (kind === "hat") {
      const filter = node(context.createBiquadFilter());
      filter.type = "highpass";
      filter.frequency.value = Math.min(6500, context.sampleRate * 0.4);
      filter.Q.value = 0.7;
      amplitude.connect(filter);
      const hiss = envelope(LEVELS.hat, duration * 0.6);
      noiseSource().connect(hiss);
      hiss.connect(filter);
      filter.connect(output);
    } else {
      amplitude.connect(output);
    }

    if (kind === "snare") {
      const noise = noiseSource();
      const filter = node(context.createBiquadFilter());
      filter.type = "highpass";
      filter.frequency.value = Math.min(1200, context.sampleRate * 0.4);
      filter.Q.value = 0.7;
      const noiseAmplitude = envelope(LEVELS.snareNoise, duration * 0.85);
      noise.connect(filter);
      filter.connect(noiseAmplitude);
      noiseAmplitude.connect(output);
    }

    const voice = { sources, cleanup };
    function cleanup() {
      for (const source of sources) source.onended = null;
      for (const item of nodes) item.disconnect();
      voices.delete(voice);
    }
    let remaining = sources.length;
    for (const source of sources) {
      source.onended = () => { if (--remaining === 0) cleanup(); };
      source.start(start);
      source.stop(end);
    }
    voices.add(voice);
    return start;
  }

  function stop() {
    for (const voice of voices) {
      for (const source of voice.sources) source.stop(context.currentTime);
      voice.cleanup();
    }
  }

  return {
    kick: (when, velocity) => trigger("kick", when, velocity),
    hat: (when, velocity) => trigger("hat", when, velocity),
    snare: (when, velocity) => trigger("snare", when, velocity),
    stop,
    dispose() {
      stop();
      output.disconnect();
      noiseBuffer = undefined;
      disposed = true;
    },
  };
}
