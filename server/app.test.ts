import fs from "node:fs";
import type http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer } from "./app.ts";

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
  fs.writeFileSync(path.join(root, "docs/clip.mp4"), "video");
  server = createServer({
    clientRoot: path.join(root, "client"),
    assetsRoot: path.join(root, "assets"),
    docsRoot: path.join(root, "docs"),
  });
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

  it.each([
    ["GET", "/maintenance/status"],
    ["GET", "/i18n-url/en-US/designer?lang=1"],
    ["GET", "/null"],
    ["GET", "/user?lang=1"],
    ["GET", "/user/settings"],
    ["PUT", "/user"],
    ["GET", "/file"],
  ])("has no cloud or account stub %s %s", async (method, route) => {
    expect((await fetch(`${base}${route}`, { method })).status).toBe(404);
  });

  it("serves the guide's videos as application/mp4, as the old server did", async () => {
    const res = await fetch(`${base}/docs/clip.mp4`);
    expect(res.headers.get("content-type")).toBe("application/mp4");
  });

  it("refuses WebSocket upgrades and closes the connection at once", async () => {
    // Without the upgrade handler Express answers 404 and keeps the
    // connection alive, so it would not close within the second.
    const { port } = server.address() as AddressInfo;
    const { response, closed } = await new Promise<{ response: string; closed: boolean }>(
      (resolve) => {
        let response = "";
        const socket = net.connect(port, "127.0.0.1", () =>
          socket.write(
            "GET /license/license?lang=1 HTTP/1.1\r\nHost: 127.0.0.1\r\n" +
              "Connection: Upgrade\r\nUpgrade: websocket\r\nSec-WebSocket-Version: 13\r\n" +
              "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n\r\n",
          ),
        );
        const timer = setTimeout(() => {
          socket.destroy();
          resolve({ response, closed: false });
        }, 1000);
        socket.on("data", (d: Buffer) => (response += d.toString()));
        socket.on("close", () => {
          clearTimeout(timer);
          resolve({ response, closed: true });
        });
      },
    );
    expect(response.split("\r\n")[0]).toBe("HTTP/1.1 404 Not Found");
    expect(closed).toBe(true);
  });

  it("doesn't advertise Express", async () => {
    expect((await fetch(`${base}/`)).headers.get("x-powered-by")).toBeNull();
  });
});
