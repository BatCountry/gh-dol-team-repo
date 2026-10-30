import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas, joinSession } from "@github/copilot-sdk/extension";

const CANVAS_ID = "monas-octoverse-arcade-starter";
const TITLE = "Mona's Octoverse Arcade starter";
const GAME_FILE = join(dirname(fileURLToPath(import.meta.url)), "game.html");
const AUDIO_FILES = new Map([
  ["/fm-drums.mjs", join(dirname(GAME_FILE), "fm-drums.mjs")],
  ["/game-audio.mjs", join(dirname(GAME_FILE), "game-audio.mjs")],
]);
const servers = new Map();
let session;

async function startServer() {
  const server = createServer(async (req, res) => {
    let url;
    try {
      url = new URL(req.url, "http://127.0.0.1");
    } catch {
      res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Bad request");
      return;
    }

    const audioFile = AUDIO_FILES.get(url.pathname);
    if (req.method !== "GET" || (!audioFile && url.pathname !== "/" && url.pathname !== "/index.html")) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }

    try {
      const content = await readFile(audioFile || GAME_FILE, "utf8");
      res.writeHead(200, {
        "Content-Type": audioFile ? "text/javascript; charset=utf-8" : "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      });
      res.end(content);
    } catch (error) {
      session.log(`Unable to load the canvas starter: ${error.message}`, { level: "error" });
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Unable to load the canvas starter. Check the extension log for details.");
    }
  });

  const port = await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });
  return { server, url: `http://127.0.0.1:${port}/` };
}

const canvas = createCanvas({
  id: CANVAS_ID,
  displayName: TITLE,
  description: "Open the starter welcome screen for the Mona's Octoverse Arcade game challenge.",
  open: async (ctx) => {
    let startup = servers.get(ctx.instanceId);
    if (!startup) {
      startup = startServer();
      servers.set(ctx.instanceId, startup);
      startup.catch(() => {
        if (servers.get(ctx.instanceId) === startup) {
          servers.delete(ctx.instanceId);
        }
      });
    }

    const entry = await startup;
    return { title: TITLE, url: entry.url, status: "Starter ready" };
  },
  onClose: async (ctx) => {
    const startup = servers.get(ctx.instanceId);
    if (!startup) return;

    servers.delete(ctx.instanceId);
    const entry = await startup;
    await new Promise((resolve, reject) => {
      entry.server.close((error) => error ? reject(error) : resolve());
    });
  },
});

session = await joinSession({ canvases: [canvas] });
