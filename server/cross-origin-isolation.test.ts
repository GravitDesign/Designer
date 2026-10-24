// The server makes its pages cross-origin isolated (COOP + COEP), so the
// EPS importer's PostScript worker gets SharedArrayBuffer (BUG-008).
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "./app.ts";

let server: http.Server;
let base = "";
let root = "";

beforeAll(async () => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "gd-coop-"));
  for (const dir of ["client/bundle", "assets/font", "docs"]) {
    fs.mkdirSync(path.join(root, dir), { recursive: true });
  }
  fs.writeFileSync(path.join(root, "client/index.html"), "<!doctype html><title>app</title>");
  fs.writeFileSync(path.join(root, "client/bundle/ps.worker-abc.js"), "self.onmessage = null;");
  fs.writeFileSync(path.join(root, "assets/font/a.woff2"), "font");
  fs.writeFileSync(path.join(root, "docs/index.html"), "<title>guide</title>");
  server = http.createServer(
    createApp({
      clientRoot: path.join(root, "client"),
      assetsRoot: path.join(root, "assets"),
      docsRoot: path.join(root, "docs"),
    }),
  );
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server.close();
  fs.rmSync(root, { recursive: true, force: true });
});

describe("cross-origin isolation", () => {
  // The page, the worker script (a dedicated worker needs COEP on its own
  // script), shared assets, the guide, an API route and a 404.
  it.each([
    "/",
    "/bundle/ps.worker-abc.js",
    "/assets/font/a.woff2",
    "/docs/index.html",
    "/connection/test",
    "/missing",
  ])("sends COOP same-origin and COEP credentialless for %s", async (route) => {
    const res = await fetch(base + route);
    expect(res.headers.get("cross-origin-opener-policy")).toBe("same-origin");
    // Not require-corp: that would block cross-origin images and fonts
    // served without CORS or CORP headers.
    expect(res.headers.get("cross-origin-embedder-policy")).toBe("credentialless");
  });
});
