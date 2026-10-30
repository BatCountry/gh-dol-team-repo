import { createDrumSynth } from "./fm-drums.mjs";

export function createGameAudio({ hooks, tempo, onError, contextFactory = () => new AudioContext() }) {
  let context, drums, timer, enabled = false, disposed = false;
  let lastScheduled = -1;
  let anchor = { beat: tempo.beat, parity: tempo.parity };
  let generation = 0;
  const collected = new WeakSet();
  const subscriptions = [];

  function stop() {
    clearInterval(timer);
    timer = undefined;
    drums?.stop();
    lastScheduled = -1;
  }

  function pump() {
    if (!enabled || !hooks.playing || context.state !== "running") return;
    const beat = tempo.beat + 1;
    if (beat <= lastScheduled) return;
    // Predict only the next boundary within a 100 ms horizon. The presentation
    // clock is frame-updated, so this is close alignment, not sample-locked sync.
    const remaining = (1 - tempo.phase) * 60 / tempo.bpm;
    if (remaining > 0.1) return;
    const sameParity = (beat - anchor.beat) % 2 === 0;
    const parity = sameParity ? anchor.parity : anchor.parity === "even" ? "odd" : "even";
    drums[parity === "even" ? "kick" : "hat"](context.currentTime + Math.max(0.005, remaining));
    lastScheduled = beat;
  }

  function sync() {
    stop();
    anchor = { beat: tempo.beat, parity: tempo.parity };
    if (!enabled || !hooks.playing || context.state !== "running") return;
    pump();
    timer = setInterval(pump, 25);
  }

  function fail(error) {
    enabled = false;
    generation++;
    stop();
    onError(error);
  }

  subscriptions.push(hooks.on("beat", (tick) => { anchor = tick; }));
  subscriptions.push(hooks.on("transport:changed", sync));
  const pickup = (item) => {
    if (!enabled || !hooks.playing || context.state !== "running" || collected.has(item)) return;
    collected.add(item);
    const start = context.currentTime + 0.005;
    for (let i = 0; i < 3; i++) drums.snare(start + i * 0.055, 0.65);
  };
  subscriptions.push(hooks.on("commit:collected", ({ square }) => pickup(square)));
  subscriptions.push(hooks.on("secret:collected", ({ secret }) => pickup(secret)));

  return {
    async enable() {
      if (disposed) throw new Error("Game audio has been disposed.");
      const request = ++generation;
      try {
        if (!context || context.state === "closed") {
          context = contextFactory();
          drums = createDrumSynth(context);
          context.onstatechange = () => {
            if (context.state === "running") sync();
            else stop();
          };
        }
        await context.resume();
        if (request !== generation || disposed) return false;
        if (context.state !== "running") throw new Error("Audio did not start. Try enabling sound again.");
        enabled = true;
        sync();
        return true;
      } catch (error) {
        if (request === generation) fail(error);
        return false;
      }
    },
    disable() {
      enabled = false;
      generation++;
      stop();
    },
    async dispose() {
      if (disposed) return;
      disposed = true;
      enabled = false;
      generation++;
      stop();
      for (const unsubscribe of subscriptions) unsubscribe();
      if (context) {
        context.onstatechange = null;
        drums?.dispose();
        if (context.state !== "closed") await context.close();
      }
    },
  };
}
