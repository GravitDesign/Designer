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
  root = fs.mkdtempSync(path.join(os.tmpdir(), "gd-server-"));
  for (const dir of ["client/bundle", "assets/font", "docs"]) {
    fs.mkdirSync(path.join(root, dir), { recursive: true });
  }
  fs.writeFileSync(path.join(root, "client/index.html"), "<!doctype html><title>app</title>");
  fs.writeFileSync(path.join(root, "client/bundle/index-abc.js"), "console.log(1)");
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

describe("server", () => {
  it("serves the app at /", async () => {
    const res = await fetch(`${base}/`);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("<title>app</title>");
  });

  it("caches hashed bundles for a year and the page not at all", async () => {
    const bundle = await fetch(`${base}/bundle/index-abc.js`);
    expect(bundle.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
    const page = await fetch(`${base}/`);
    expect(page.headers.get("cache-control")).toBe("public, max-age=0");
  });

  it("serves the shared assets and the user guide", async () => {
    expect(await (await fetch(`${base}/assets/font/a.woff2`)).text()).toBe("font");
    expect(await (await fetch(`${base}/docs/index.html`)).text()).toContain("guide");
  });

  it("answers the connection test", async () => {
    const res = await fetch(`${base}/connection/test`);
    expect(await res.text()).toBe("OK");
  });

  it.each([
    "/license",
    "/subscription/test",
    "/subscription/nextbillingdate",
    "/subscription/lifetime",
    "/quota",
    "/ever-subscribed",
    "/total-subscription-days",
    "/pro/paywall/x",
  ])("has no license or subscription route %s", async (route) => {
    expect((await fetch(`${base}${route}`)).status).toBe(404);
  });

  it("doesn't advertise Express", async () => {
    expect((await fetch(`${base}/`)).headers.get("x-powered-by")).toBeNull();
  });
});
