# FM drums

`fm-drums.mjs` exports `createDrumSynth(context)`, using only Web Audio.
Kick uses a pitch-dropping sine FM pair, the closed hat uses high-passed
metallic FM, and snare combines a short FM tone with generated noise.
There are no samples, downloads, dependencies, or build steps.

| API | Behavior |
| --- | --- |
| `createDrumSynth(audioContext)` | Connects to the supplied context's destination; also supports `OfflineAudioContext`. |
| `drums.kick(when?, velocity?)` | Schedules a 480 ms kick. |
| `drums.hat(when?, velocity?)` | Schedules a 90 ms closed hi-hat. |
| `drums.snare(when?, velocity?)` | Schedules a 220 ms snare. |
| `drums.stop()` | Immediately silences and cancels all current/future voices; synth remains reusable. |
| `drums.dispose()` | Stops voices and disconnects output; future triggers throw. Does not close the caller's context. |

`when` is **absolute AudioContext time in seconds**, defaulting to
`context.currentTime`. Past timestamps clamp to now. `velocity` defaults to 1
and must be finite and in [0, 1]; 0 is silent. Invalid times/velocities throw
`RangeError`; a closed context or disposed synth throws `Error`.
Each trigger returns its effective start time. Completed voices disconnect
automatically. Output gain is 0.3 for headroom, not a limiter: avoid scheduling
unbounded simultaneous voices. Call `stop()` before closing an owned context.

## Gameplay integration

The game's **Enable sound** button creates/resumes one AudioContext from its
click handler. Audio is off by default; **Mute sound** cancels queued notes.
Failures are shown beside the button and logged. The server explicitly serves
only the two audio modules as JavaScript in addition to its HTML routes.

`game-audio.mjs` exports `createGameAudio({ hooks, tempo, onError })`, returning
`enable()` (async, returns whether enabled), `disable()`, and `dispose()` (async).
The controller owns its context; dispose closes it and unsubscribes its hooks.
Optional `contextFactory` supports testing with an owned offline/fake context.

Even beats get a kick, odd beats get a closed hi-hat. Beat 0 is silent; beat 1
is the first hat. The controller reads the `beat` event's `parity`, predicts the
next boundary from `tempo.phase` and `tempo.bpm`, and schedules at most one beat
ahead when it falls within a 100 ms horizon (25 ms polling). Late/missed beats
are skipped, not played as a burst. The ramp to 240 BPM is followed continuously.
The frame-updated presentation clock introduces up to roughly a frame of timing
error; this is close alignment, not sample-locked synchronization.

Each `commit:collected` or `secret:collected` item schedules three snares 55 ms
apart on the audio clock (110 ms from first to last). Item objects are deduplicated.
Misses/explosions do not play a pickup sound. `transport:changed` plus the
`gameHooks.playing` getter stop/cancel voices on pause, death, game-over or a
hidden page, and re-anchor after resume/restart. Page hiding stops the scheduler;
showing the page resumes from the current phase without a backlog. Suspended
contexts never schedule; a browser interruption resumes only when the context
is running again (use the sound button if another gesture is required).

## Audio-clock look-ahead example

For reuse outside the game, this alternative adapter demonstrates a constant-BPM
eighth-note groove. It is not the game's alternating beat pattern and does not
implement the game's tempo ramp.

```js
import { createDrumSynth } from "./fm-drums.mjs";

let audio, drums, timer = null;

async function enableSound() {
  audio ??= new AudioContext();
  drums ??= createDrumSynth(audio);
  await audio.resume();
  startGroove(window.tempo);
}

function stopGroove() {
  clearInterval(timer);
  timer = null;
  drums?.stop();
}

function startGroove(tempo) {
  if (!audio || audio.state !== "running") throw new Error("Enable audio first.");
  if (!Number.isFinite(tempo.bpm) || tempo.bpm <= 0 ||
      !Number.isFinite(tempo.seconds) || tempo.seconds < 0) {
    throw new RangeError("Expected positive BPM and non-negative elapsed seconds.");
  }
  stopGroove();
  const stepSeconds = 60 / tempo.bpm / 2; // Eighth notes.
  const origin = audio.currentTime + 0.05 - tempo.seconds;
  let step = Math.ceil(tempo.seconds / stepSeconds);
  function pump() {
    // Drop missed notes after a throttled timer; never replay a catch-up burst.
    const now = audio.currentTime;
    step = Math.max(step, Math.ceil((now + 0.005 - origin) / stepSeconds));
    while (origin + step * stepSeconds < now + 0.1) {
      const when = origin + step * stepSeconds;
      if (step % 8 === 0 || step % 8 === 4) drums.kick(when);
      if (step % 8 === 2 || step % 8 === 6) drums.snare(when, 0.8);
      drums.hat(when, step % 2 ? 0.45 : 0.65);
      step++;
    }
  }
  pump();
  timer = setInterval(pump, 25);
}

// Wire a real sound-enable click to enableSound(), catching rejection in the UI.
// On pause/game-over/hidden page: stopGroove().
// On resume/restart/BPM change: stopGroove(); then startGroove(window.tempo)
// AFTER the presentation tempo has been updated/reset, and audio is running.
// On teardown: stopGroove(); drums?.dispose(); close audio only if you own it.
```

`window.tempo` is a live presentation object `{ bpm, seconds, beat, parity, phase, pulse }`;
it uses performance time, freezes on pause/game-over, and resets on restart.
The example takes a snapshot of seconds/BPM and establishes an audio-clock
anchor; visuals and audio are approximately aligned, **not sample-locked**.
Re-anchor on lifecycle/BPM changes; stop while hidden rather than relying on
background timers. A fully synchronized transport should make audio time the
master clock and derive presentation values from it.

`window.gameHooks.onBeat(every, handler, offset = 0)` emits
`{ beat, parity, bpm, seconds }` from animation frames, with missed beats caught up in
order; the first tick occurs after an interval. Keep it for visual cues or
notifications, e.g. `const off = gameHooks.onBeat(4, ({ beat }) => flash(beat));`.
It does not provide an audio deadline. Do **not** call drums from that callback
or replay every event immediately: a delayed frame could create a burst of late notes.
The example's `step` is an independent eighth-note index starting at zero,
not the hook's first delivered tick. This standalone example needs its own
lifecycle wiring; the game's controller already handles that separately.

## Checks

Run `node --test .github/extensions/monas-octoverse-arcade-starter/{fm-drums,game-audio}.test.mjs`.
The tests cover scheduling, voice topology, envelopes, validation, and cleanup.
Use a browser `OfflineAudioContext` to check actual rendered waveforms; graph
tests alone are not an audible or native Web Audio check.
