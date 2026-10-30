import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import { createDrumSynth, LEVELS } from "./fm-drums.mjs";

class Param {
  value = 0;
  events = [];
  setValueAtTime(...args) { this.events.push(["set", ...args]); }
  linearRampToValueAtTime(...args) { this.events.push(["linear", ...args]); }
  exponentialRampToValueAtTime(...args) { this.events.push(["exponential", ...args]); }
}

function makeContext() {
  const nodes = [];
  const makeNode = (kind) => {
    const node = {
      kind, connections: [], stops: [], gain: new Param(), frequency: new Param(),
      Q: new Param(), disconnected: false,
      connect(target) { this.connections.push(target); },
      disconnect() { this.disconnected = true; },
      start(time) { this.started = time; },
      stop(time) { this.stops.push(time); },
    };
    nodes.push(node);
    return node;
  };
  return {
    nodes, currentTime: 2, state: "running", sampleRate: 48000, destination: {},
    async resume() { this.state = "running"; },
    createGain: () => makeNode("gain"),
    createOscillator: () => makeNode("oscillator"),
    createBiquadFilter: () => makeNode("filter"),
    createBufferSource: () => makeNode("noise"),
    createBuffer: (_, length) => {
      const samples = new Float32Array(length);
      return { getChannelData: () => samples };
    },
  };
}

for (const [kind, duration, count] of [["kick", 0.48, 3], ["hat", 0.09, 2], ["snare", 0.22, 3]]) {
  test(`${kind}: schedules FM sources, envelopes and complete cleanup`, () => {
    const ctx = makeContext(), drums = createDrumSynth(ctx);
    assert.equal(drums[kind](3, 0.5), 3);
    const sources = ctx.nodes.filter((node) => node.started !== undefined);
    assert.equal(sources.length, count);
    for (const source of sources) {
      assert.equal(source.started, 3);
      assert.deepEqual(source.stops, [3 + duration]);
    }
    const oscillators = sources.filter((node) => node.kind === "oscillator");
    const depth = ctx.nodes.find((node) => node.connections.includes(oscillators[0].frequency));
    assert.ok(depth);
    assert.ok(oscillators[1].connections.includes(depth));
    for (const node of ctx.nodes) {
      for (const param of [node.gain, node.frequency]) {
        let last = 3;
        for (const [type, value, time] of param.events) {
          assert.ok(Number.isFinite(value));
          assert.ok(time >= last);
          if (type === "exponential") assert.ok(value > 0);
          last = time;
        }
      }
    }
    const amplitude = ctx.nodes.find((node) => node.gain.events[0]?.[1] === 0);
    assert.equal(amplitude.gain.events[1][1], LEVELS[kind] * 0.5);
    assert.deepEqual(amplitude.gain.events.at(-1), ["linear", 0, 3 + duration]);
    if (kind === "hat") assert.ok(ctx.nodes.some((node) => node.type === "highpass" && node.frequency.value === 6500));
    if (kind === "snare") {
      const samples = sources[2].buffer.getChannelData(0);
      assert.ok(samples.some((value) => value !== 0));
      assert.ok(samples.every((value) => Number.isFinite(value) && Math.abs(value) <= 1));
    }
    for (const source of sources) source.onended();
    assert.ok(ctx.nodes.slice(1).every((node) => node.disconnected));
    assert.equal(ctx.nodes[0].disconnected, false);
    drums.stop();
    assert.ok(sources.every((node) => node.stops.length === 1));
  });
}

test("mix: snare sits under kick and hat, kick has punch, worst-case peak keeps headroom", () => {
  // Snare (tone + noise) is about half its original 0.3 + 0.6 and well under the kick.
  assert.ok(LEVELS.snare + LEVELS.snareNoise <= 0.9 / 2);
  assert.ok(LEVELS.snare + LEVELS.snareNoise < (LEVELS.kick + LEVELS.kickPunch) / 2);
  assert.ok(LEVELS.kickPunch > 0);
  // Kick + hat + three overlapping pickup snares at full velocity must stay below full scale.
  const peak = LEVELS.output * (LEVELS.kick + LEVELS.kickPunch + LEVELS.hat + 3 * (LEVELS.snare + LEVELS.snareNoise));
  assert.ok(peak < 1, `worst-case peak ${peak}`);
  const ctx = makeContext(), drums = createDrumSynth(ctx);
  assert.equal(ctx.nodes[0].gain.value, LEVELS.output);
  drums.kick(3);
  const kickPeaks = ctx.nodes.filter((n) => n.gain.events[0]?.[1] === 0).map((n) => n.gain.events[1][1]);
  assert.deepEqual(kickPeaks, [LEVELS.kick, LEVELS.kickPunch]);
});

test("defaults, past scheduling, velocity zero, and input rejection", () => {
  const ctx = makeContext(), drums = createDrumSynth(ctx);
  assert.equal(drums.kick(), 2);
  assert.equal(drums.hat(1), 2);
  const count = ctx.nodes.length;
  assert.equal(drums.snare(4, 0), 4);
  assert.equal(ctx.nodes.length, count);
  for (const kind of ["kick", "hat", "snare"]) {
    for (const when of [-1, NaN, Infinity, "3", null]) {
      assert.throws(() => drums[kind](when), RangeError);
    }
    for (const velocity of [-1, 1.1, NaN, Infinity, "1", null]) {
      assert.throws(() => drums[kind](3, velocity), RangeError);
    }
  }
  assert.equal(ctx.nodes.length, count);
});

test("stop cancels future and active notes without disconnecting the shared output", () => {
  const ctx = makeContext(), drums = createDrumSynth(ctx);
  drums.kick();
  drums.hat(10);
  drums.snare(12);
  drums.stop();
  const sources = ctx.nodes.filter((node) => node.started !== undefined);
  for (const source of sources) {
    assert.equal(source.stops.at(-1), 2);
    assert.equal(source.onended, null);
    assert.equal(source.disconnected, true);
  }
  drums.stop();
  assert.equal(ctx.nodes[0].disconnected, false);
  assert.equal(drums.kick(4), 4);
});

test("snare reuses generated noise and dispose leaves context ownership with caller", () => {
  const ctx = makeContext(), drums = createDrumSynth(ctx);
  drums.snare(3);
  drums.snare(4);
  const noise = ctx.nodes.filter((node) => node.kind === "noise");
  assert.equal(noise[0].buffer, noise[1].buffer);
  drums.dispose();
  drums.dispose();
  assert.ok(ctx.nodes.every((node) => node.disconnected));
  assert.equal(ctx.state, "running");
  assert.throws(() => drums.kick(), /disposed/);
});

test("missing and closed contexts are explicit errors", () => {
  assert.throws(() => createDrumSynth(), TypeError);
  const ctx = makeContext();
  ctx.state = "closed";
  assert.throws(() => createDrumSynth(ctx), /closed/);
  ctx.state = "running";
  const drums = createDrumSynth(ctx);
  ctx.state = "closed";
  assert.throws(() => drums.hat(), /closed/);
});

test("documented look-ahead adapter schedules on audio time and skips missed steps", async () => {
  const markdown = await readFile(new URL("./fm-drums.md", import.meta.url), "utf8");
  const example = markdown.match(/```js\n([\s\S]*?)\n```/)[1];
  const ctx = makeContext();
  let pump, cleared = false;
  const scope = {
    window: { tempo: { bpm: 120, seconds: 0 } },
    AudioContext: function () { return ctx; },
    createDrumSynth,
    setInterval(callback, milliseconds) {
      assert.equal(milliseconds, 25);
      pump = callback;
      return 1;
    },
    clearInterval() { cleared = true; },
  };
  runInNewContext(example.replace(/^import .+;\n/m, "") +
    "\nglobalThis.start = startGroove; globalThis.stop = stopGroove; globalThis.enable = enableSound;", scope);
  assert.throws(() => scope.start({ bpm: 120, seconds: 0 }), /Enable audio/);
  await scope.enable();
  const sources = () => ctx.nodes.filter((node) => node.started !== undefined);
  // Kick (FM pair + punch) and hat = 5 sources per downbeat step.
  assert.equal(sources().length, 5);
  assert.ok(sources().every((node) => node.started === 2.05));
  ctx.currentTime = 2.03;
  pump();
  assert.equal(sources().length, 5);
  ctx.currentTime = 3;
  pump();
  assert.equal(sources().length, 10);
  assert.ok(sources().slice(5).every((node) => Math.abs(node.started - 3.05) < 1e-10));
  scope.stop();
  assert.equal(cleared, true);
  assert.ok(sources().every((node) => node.disconnected));
  scope.start({ bpm: 90, seconds: 0 });
  assert.equal(sources().length, 15);
  scope.stop();
  assert.throws(() => scope.start({ bpm: 0, seconds: 0 }), /BPM/);
});
