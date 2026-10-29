import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { ASSETS_ROOT, DOCS_ROOT } from "./server/paths.ts";

/**
 * Content types for the shared folders. Without one, Chrome refuses to draw
 * an SVG in an <img> (the welcome screen's preset images stayed broken).
 */
const CONTENT_TYPES: Record<string, string> = {
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".json": "application/json",
  ".css": "text/css",
  ".js": "text/javascript",
  ".html": "text/html",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".icc": "application/vnd.iccprofile",
  ".mp4": "video/mp4",
};

/** Serves /assets and /docs from their shared folders in `vite dev`. */
function sharedFolders(): Plugin {
  const mounts: [string, string][] = [
    ["/assets/", ASSETS_ROOT],
    ["/docs/", DOCS_ROOT],
  ];
  return {
    name: "gravit-shared-folders",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = decodeURIComponent((req.url ?? "").split("?")[0] ?? "");
        for (const [prefix, root] of mounts) {
          if (!url.startsWith(prefix)) continue;
          const file = path.join(root, url.slice(prefix.length));
          if (file.startsWith(root) && fs.existsSync(file) && fs.statSync(file).isFile()) {
            const type = CONTENT_TYPES[path.extname(file).toLowerCase()];
            if (type) res.setHeader("Content-Type", type);
            fs.createReadStream(file).pipe(res);
            return;
          }
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), sharedFolders()],
  build: {
    outDir: "dist",
    // "assets" is taken by the shared image/font folder.
    assetsDir: "bundle",
    sourcemap: true,
    target: "es2023",
    rolldownOptions: {
      output: {
        // The code the app starts with in four files instead of one: the
        // packages, the engine, the editor and the rest (the app, io and
        // the parity bridge, in the entry). The browser downloads and
        // compiles them side by side, so the bundle starts running about
        // 100 ms sooner than with one 4.7 MB file on the benchmark runner.
        // Each part only imports from the ones before it
        // (the engine only reads the locale table under src/app), so the
        // modules run in an order their imports allow, as before.
        // Mousetrap stays in the entry: its global-bind plugin patches the
        // global Mousetrap that mousetrap.js sets when it runs, and in the
        // packages file the plugin ran first.
        codeSplitting: {
          groups: [
            {
              name: "vendor",
              test: /[\\/]node_modules[\\/](?!mousetrap[\\/])/,
              tags: ["$initial"],
              priority: 3,
            },
            {
              name: "engine",
              test: /[\\/]src[\\/](engine[\\/]|app[\\/]locale[\\/]data[\\/])/,
              tags: ["$initial"],
              priority: 2,
            },
            { name: "editor", test: /[\\/]src[\\/]editor[\\/]/, tags: ["$initial"], priority: 1 },
          ],
        },
      },
    },
  },
  worker: { format: "es" },
  // Same cross-origin isolation as the server (BUG-008), so `vite dev` pages
  // get SharedArrayBuffer too.
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "credentialless",
    },
  },
});
