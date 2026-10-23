import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { ASSETS_ROOT, DOCS_ROOT } from "./server/paths.ts";

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
