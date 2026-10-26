import http from "node:http";
import path from "node:path";
import express, { type Express, type RequestHandler } from "express";
import { compressed } from "./compression.ts";
import { ASSETS_ROOT, CLIENT_ROOT, DOCS_ROOT } from "./paths.ts";

export interface ServerOptions {
  clientRoot?: string;
  assetsRoot?: string;
  docsRoot?: string;
  /**
   * Sends the client build and the assets brotli or gzip compressed to
   * browsers that accept it. server/main.ts turns it on; the desktop app
   * leaves it off, since it loads them over loopback, where compressing
   * would only cost time.
   */
  compress?: boolean;
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
  const statics = (serve: RequestHandler): RequestHandler =>
    options.compress ? compressed(serve) : serve;

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

  app.use("/assets", statics(express.static(assetsRoot)));
  app.use(
    statics(
      express.static(clientRoot, {
        setHeaders: (res, filePath) => {
          // Vite puts a content hash in every bundle name under assets-*/.
          if (filePath.includes(`${path.sep}bundle${path.sep}`)) {
            res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          }
        },
      }),
    ),
  );
  app.use(
    "/docs",
    express.static(docsRoot, {
      setHeaders: (res, filePath) => {
        // The old server's mime table (mime-types 2) typed .mp4 as
        // application/mp4; the current one says video/mp4. Kept, see
        // "User guide videos served as application/mp4" in QUESTIONS.md.
        if (path.extname(filePath).toLowerCase() === ".mp4") {
          res.setHeader("Content-Type", "application/mp4");
        }
      },
    }),
  );

  app.get("/connection/test", (_req, res) => {
    res.send("OK");
  });

  return app;
}

/**
 * The HTTP server around createApp. It refuses every WebSocket upgrade
 * (the old license socket at /license/license is gone) by answering 404
 * and closing the connection; without an "upgrade" listener Node would
 * pass the request to Express, whose 404 keeps the connection open, so a
 * client would wait for the socket to close before giving up.
 */
export function createServer(options: ServerOptions = {}): http.Server {
  const server = http.createServer(createApp(options));
  server.on("upgrade", (_req, socket) => {
    socket.on("error", () => {});
    socket.end("HTTP/1.1 404 Not Found\r\nConnection: close\r\nContent-Length: 0\r\n\r\n");
  });
  return server;
}
