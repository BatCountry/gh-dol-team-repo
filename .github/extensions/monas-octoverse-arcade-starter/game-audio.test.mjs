import test from "node:test";
import assert from "node:assert/strict";
import { createGameAudio } from "./game-audio.mjs";

function setup(t, overrides = {}) {
  const nodes = [], listeners = new Map(), intervals = new Map(), errors = [];
  let nextTimer = 0, created = 0;
  const param = () => ({
    value: 0, values: [],
    setValueAtTime(value) { this.values.push(value); },
    linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {},
  });
  const node = () => {
    const value = {
      frequency: param(), gain: param(), Q: param(), stops: [],
      connect() {}, disconnect() { this.disconnected = true; },
      start(when) { this.startTime = when; }, stop(when) { this.stops.push(when); },
    };
    nodes.push(value);
    return value;
  };
  const context = {
    state: "suspended", currentTime: 5, sampleRate: 48000, destination: {},
    createGain: node, createOscillator: node, createBiquadFilter: node,
    createBufferSource: node,
    createBuffer: (_, length) => ({ getChannelData: () => new Float32Array(length) }),
    async resume() { this.state = "running"; this.onstatechange?.(); },
    async close() { this.state = "closed"; },
  };
  const hooks = {
    playing: true,
    on(name, fn) {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name).add(fn);
      return () => listeners.get(name).delete(fn);
    },
  };
  const tempo = { beat: 0, parity: "even", bpm: 60, phase: 0 };
  t.mock.method(globalThis, "setInterval", (callback) => {
    intervals.set(++nextTimer, callback);
    return nextTimer;
  });
  t.mock.method(globalThis, "clearInterval", (id) => intervals.delete(id));
  const audio = createGameAudio({
    hooks, tempo, onError: (error) => errors.push(error),
    contextFactory: () => { created++; return context; }, ...overrides,
  });
  const emit = (name, value) => { for (const fn of listeners.get(name) || []) fn(value); };
  const pump = () => { for (const callback of intervals.values()) callback(); };
  const carriers = () => nodes.filter((n) => [150, 5400, 185].includes(n.frequency.values[0]));
  return { audio, context, hooks, tempo, nodes, listeners, errors, intervals, emit, pump, carriers, created: () => created };
}

test("audio is gesture-opt-in, beat 0 silent, odd hats and even kicks schedule once", async (t) => {
  const f = setup(t);
  assert.equal(f.created(), 0);
  assert.equal(await f.audio.enable(), true);
  assert.equal(f.created(), 1);
  assert.equal(f.carriers().length, 0);
  f.tempo.phase = 0.94;
  f.pump();
  assert.equal(f.carriers()[0].frequency.values[0], 5400);
  assert.ok(Math.abs(f.carriers()[0].startTime - 5.06) < 1e-10);
  f.pump();
  assert.equal(f.carriers().length, 1);
  Object.assign(f.tempo, { beat: 1, parity: "odd", phase: 0.9, bpm: 240 });
  f.emit("beat", { beat: 1, parity: "odd", bpm: 240, seconds: 1 });
  f.pump();
  assert.equal(f.carriers()[1].frequency.values[0], 150);
  assert.ok(Math.abs(f.carriers()[1].startTime - (5 + 0.1 / 4)) < 1e-10);
  await f.audio.dispose();
});

test("event parity is authoritative; catch-up beats never make late-note bursts", async (t) => {
  const f = setup(t);
  await f.audio.enable();
  for (let beat = 1; beat <= 9; beat++) f.emit("beat", { beat, parity: beat % 2 ? "odd" : "even" });
  Object.assign(f.tempo, { beat: 9, parity: "odd", phase: 0.5 });
  f.pump();
  assert.equal(f.carriers().length, 0);
  f.emit("beat", { beat: 9, parity: "even" }); // Deliberately invert to verify payload use.
  f.tempo.phase = 0.95;
  f.pump();
  assert.equal(f.carriers().length, 1);
  assert.equal(f.carriers()[0].frequency.values[0], 5400);
  await f.audio.dispose();
});

test("each collected commit or secret gets one 55 ms snare triplet; misses stay silent", async (t) => {
  const f = setup(t), square = {}, secret = {};
  f.emit("commit:collected", { square });
  assert.equal(f.created(), 0);
  await f.audio.enable();
  f.emit("commit:collected", { square });
  f.emit("commit:collected", { square });
  f.emit("secret:collected", { secret });
  f.emit("commit:missed", { square: {} });
  f.emit("secret:exploded", { secret: {} });
  const hits = f.carriers();
  assert.equal(hits.length, 6);
  assert.ok(hits.every((n) => n.frequency.values[0] === 185));
  assert.deepEqual(hits.map((n) => n.startTime), [5.005, 5.06, 5.115, 5.005, 5.06, 5.115]);
  await f.audio.dispose();
});

test("pause/death/hidden transport cancels queued audio, restart reanchors, mute silences pickups", async (t) => {
  const f = setup(t);
  await f.audio.enable();
  f.tempo.phase = 0.95;
  f.pump();
  const first = f.carriers()[0];
  f.hooks.playing = false;
  f.emit("transport:changed");
  assert.equal(first.disconnected, true);
  assert.equal(first.stops.at(-1), 5);
  assert.equal(f.intervals.size, 0);
  f.emit("commit:collected", { square: {} });
  assert.equal(f.carriers().length, 1);
  Object.assign(f.tempo, { beat: 0, phase: 0.95, parity: "even" });
  f.hooks.playing = true;
  f.emit("transport:changed");
  assert.equal(f.carriers().length, 2);
  assert.equal(f.carriers()[1].frequency.values[0], 5400);
  f.audio.disable();
  f.emit("commit:collected", { square: {} });
  assert.equal(f.carriers().length, 2);
  assert.equal(f.intervals.size, 0);
  await f.audio.dispose();
  assert.equal(f.context.state, "closed");
  assert.ok([...f.listeners.values()].every((set) => set.size === 0));
});

test("context suspension cancels voices, returning to running reanchors", async (t) => {
  const f = setup(t);
  await f.audio.enable();
  f.tempo.phase = 0.95;
  f.pump();
  f.context.state = "suspended";
  f.context.onstatechange();
  assert.equal(f.intervals.size, 0);
  assert.equal(f.carriers()[0].disconnected, true);
  f.context.state = "running";
  f.context.onstatechange();
  assert.equal(f.carriers().length, 2);
  await f.audio.dispose();
});

test("unsupported/blocked audio reports an error, and pending resume cannot undo mute", async (t) => {
  const f = setup(t, { contextFactory() { throw new Error("Web Audio unavailable"); } });
  assert.equal(await f.audio.enable(), false);
  assert.match(f.errors[0].message, /unavailable/);
  await f.audio.dispose();
  const g = setup(t);
  let resume;
  g.context.resume = () => new Promise((resolve) => { resume = resolve; });
  const enabling = g.audio.enable();
  g.audio.disable();
  g.context.state = "running";
  resume();
  assert.equal(await enabling, false);
  assert.equal(g.intervals.size, 0);
  await g.audio.dispose();
});
