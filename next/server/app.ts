import path from "node:path";
import express, { type Express } from "express";
import { ASSETS_ROOT, CLIENT_ROOT, DOCS_ROOT } from "./paths.ts";

export interface ServerOptions {
  clientRoot?: string;
  assetsRoot?: string;
  docsRoot?: string;
}

/**
 * The HTTP app: the built client, the shared assets, the user guide and the
 * few routes the client calls. The old license, subscription, quota and
 * paywall routes and the license WebSocket are gone: the new app has no
 * license checks.
 */
export function createApp(options: ServerOptions = {}): Express {
  const clientRoot = options.clientRoot ?? CLIENT_ROOT;
  const assetsRoot = options.assetsRoot ?? ASSETS_ROOT;
  const docsRoot = options.docsRoot ?? DOCS_ROOT;

  const app = express();
  app.disable("x-powered-by");
  app.use(express.json());

  // Cross-origin isolation, so the page and its workers get
  // SharedArrayBuffer: the EPS importer's PostScript worker blocks on one
  // (Atomics.wait) while the page decodes an embedded JPEG. The old server
  // sent neither header, so EPS files with JPEG images failed (BUG-008).
  // "credentialless" instead of "require-corp" keeps cross-origin images
  // and fonts loading without CORS headers (they are fetched without
  // cookies).
  app.use((_req, res, next) => {
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Cross-Origin-Embedder-Policy", "credentialless");
    next();
  });

  app.use("/assets", express.static(assetsRoot));
  app.use(
    express.static(clientRoot, {
      setHeaders: (res, filePath) => {
        // Vite puts a content hash in every bundle name under assets-*/.
        if (filePath.includes(`${path.sep}bundle${path.sep}`)) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
      },
    }),
  );
  app.use("/docs", express.static(docsRoot));

  app.get("/connection/test", (_req, res) => {
    res.send("OK");
  });

  return app;
}
