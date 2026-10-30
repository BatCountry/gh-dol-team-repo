# Day of Learning Challenge project instructions

This repository is the shared starter and challenge guide for teams building
Mona's Octoverse Arcade as a Copilot App canvas extension.

## Extension structure

- `.github/extensions/monas-octoverse-arcade-starter/extension.mjs` registers
  the starter canvas and serves its HTML from a loopback HTTP server.
- `.github/extensions/monas-octoverse-arcade-starter/game.html` is the canvas
  UI and the only file teams should need to change to build the game.
- Keep the extension self-contained and use plain HTML, CSS, and vanilla
  JavaScript. Do not add a package manifest, dependencies, external assets, or
  a build step for the game.

## Challenge goals

- Make the baseline game playable: Mona collects green commit squares, avoids
  red bugs, earns score, gets faster over time, and can restart after game over.
- Add an encouraging Copilot sidekick tip every 10 points.
- Once the baseline works, add the team's own visual style and a stretch goal.
- Preserve the canvas registration and serving in `extension.mjs`; implement
  the game inside the canvas in `.github/extensions/monas-octoverse-arcade-starter/game.html`.
- Keep the starter intentionally minimal until the team asks to build the game;
  do not turn it into a finished reference game or add stretch goals early.

The repository README is the source of truth for the prompt, workshop
constraints, submission requirements, and judging rubric.
