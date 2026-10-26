import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer } from "./app.ts";
import { pickEncoding } from "./compression.ts";

interface Reply {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: Buffer;
}

/** A raw request: unlike fetch, nothing decodes the body. */
function request(
  server: http.Server,
  urlPath: string,
  headers: Record<string, string> = {},
  method = "GET",
): Promise<Reply> {
  const { port } = server.address() as AddressInfo;
  return new Promise((resolve, reject) => {
    const req = http.request({ host: "127.0.0.1", port, path: urlPath, method, headers }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () =>
        resolve({ status: res.statusCode ?? 0, headers: res.headers, body: Buffer.concat(chunks) }),
      );
    });
    req.on("error", reject);
    req.end();
  });
}

function decoded(reply: Reply): Buffer {
  const encoding = reply.headers["content-encoding"];
  if (encoding === "br") return zlib.brotliDecompressSync(reply.body);
  if (encoding === "gzip") return zlib.gunzipSync(reply.body);
  return reply.body;
}

const BROWSER = { "accept-encoding": "gzip, deflate, br, zstd" };
/** Headers express.static sets that compression must leave as they are. */
const KEPT = [
  "content-type",
  "cache-control",
  "etag",
  "last-modified",
  "cross-origin-opener-policy",
  "cross-origin-embedder-policy",
] as const;

let root = "";
let plain: http.Server;
let compressing: http.Server;
let css: Buffer;
let script: Buffer;

function listen(server: http.Server): Promise<void> {
  return new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
}

beforeAll(async () => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "gd-compress-"));
  for (const dir of ["client/bundle", "assets/font", "assets/img", "docs"])
    fs.mkdirSync(path.join(root, dir), { recursive: true });
  css = Buffer.from(".rule { color: red; }\n".repeat(4000));
  script = Buffer.from(Array.from({ length: 3000 }, (_, i) => `console.log(${i});`).join("\n"));
  fs.writeFileSync(path.join(root, "client/designer.browser.light.css"), css);
  fs.writeFileSync(
    path.join(root, "client/index.html"),
    "<!doctype html>" + "<p>x</p>".repeat(500),
  );
  fs.writeFileSync(path.join(root, "client/bundle/index-abc.js"), script);
  fs.writeFileSync(path.join(root, "client/small.js"), "console.log(1)");
  fs.writeFileSync(path.join(root, "assets/font/a.ttf"), Buffer.alloc(20000, 7));
  fs.writeFileSync(path.join(root, "assets/img/a.png"), Buffer.alloc(20000, 7));
  fs.writeFileSync(path.join(root, "docs/index.html"), "<title>guide</title>".repeat(200));
  const options = {
    clientRoot: path.join(root, "client"),
    assetsRoot: path.join(root, "assets"),
    docsRoot: path.join(root, "docs"),
  };
  plain = createServer(options);
  compressing = createServer({ ...options, compress: true });
  await Promise.all([listen(plain), listen(compressing)]);
});

afterAll(() => {
  plain.close();
  compressing.close();
  fs.rmSync(root, { recursive: true, force: true });
});

describe("compression", () => {
  it.each([
    ["/designer.browser.light.css", "br", BROWSER],
    ["/", "br", BROWSER],
    ["/bundle/index-abc.js", "br", BROWSER],
    ["/assets/font/a.ttf", "br", BROWSER],
    ["/designer.browser.light.css", "gzip", { "accept-encoding": "gzip, deflate" }],
  ])(
    "sends %s as %s, decoding to the file with the same headers",
    async (url, encoding, accept) => {
      const original = await request(plain, url, accept);
      const reply = await request(compressing, url, accept);
      expect(original.headers["content-encoding"]).toBeUndefined();
      expect(reply.status).toBe(200);
      expect(reply.headers["content-encoding"]).toBe(encoding);
      expect(reply.body.length).toBeLessThan(original.body.length / 2);
      expect(Number(reply.headers["content-length"])).toBe(reply.body.length);
      expect(decoded(reply).equals(original.body)).toBe(true);
      for (const name of KEPT) expect(reply.headers[name], name).toBe(original.headers[name]);
      expect(reply.headers.vary).toBe("Accept-Encoding");
    },
  );

  it("sends the file as it is when the browser accepts no encoding", async () => {
    const reply = await request(compressing, "/designer.browser.light.css");
    expect(reply.headers["content-encoding"]).toBeUndefined();
    expect(reply.body.equals(css)).toBe(true);
    expect(reply.headers.vary).toBe("Accept-Encoding");
  });

  it("leaves small files, images, HEAD requests and the guide alone", async () => {
    for (const [url, method] of [
      ["/small.js", "GET"],
      ["/assets/img/a.png", "GET"],
      ["/designer.browser.light.css", "HEAD"],
      ["/docs/index.html", "GET"],
    ] as const) {
      const original = await request(plain, url, BROWSER, method);
      const reply = await request(compressing, url, BROWSER, method);
      expect(reply.headers["content-encoding"], url).toBeUndefined();
      expect(reply.body.equals(original.body), url).toBe(true);
      for (const name of KEPT) expect(reply.headers[name], name).toBe(original.headers[name]);
    }
  });

  it("answers 304 to the compressed response's ETag and ranges with the plain file", async () => {
    const first = await request(compressing, "/designer.browser.light.css", BROWSER);
    const again = await request(compressing, "/designer.browser.light.css", {
      ...BROWSER,
      "if-none-match": String(first.headers.etag),
    });
    expect(again.status).toBe(304);
    expect(again.body.length).toBe(0);
    const ranged = await request(compressing, "/designer.browser.light.css", {
      ...BROWSER,
      range: "bytes=0-4",
    });
    expect(ranged.status).toBe(206);
    expect(ranged.headers["content-encoding"]).toBeUndefined();
    expect(ranged.body.toString()).toBe(".rule");
  });

  it("compresses a file again once it changed", async () => {
    const file = path.join(root, "client/bundle/index-abc.js");
    expect(
      decoded(await request(compressing, "/bundle/index-abc.js", BROWSER)).equals(script),
    ).toBe(true);
    const changed = Buffer.from(script.toString().replace(/console/g, "Console") + "\n// more");
    fs.writeFileSync(file, changed);
    const later = new Date(Date.now() + 5000);
    fs.utimesSync(file, later, later);
    const reply = await request(compressing, "/bundle/index-abc.js", BROWSER);
    expect(reply.headers["content-encoding"]).toBe("br");
    expect(decoded(reply).equals(changed)).toBe(true);
    fs.writeFileSync(file, script);
  });

  it("is off unless asked for (the desktop app's server)", async () => {
    const reply = await request(plain, "/designer.browser.light.css", BROWSER);
    expect(reply.headers["content-encoding"]).toBeUndefined();
    expect(reply.headers.vary).toBeUndefined();
  });
});

describe("pickEncoding", () => {
  it.each([
    ["gzip, deflate, br, zstd", "br"],
    ["gzip, deflate", "gzip"],
    ["br;q=0, gzip", "gzip"],
    ["gzip;q=0.5, br;q=0.4", "gzip"],
    ["*", "br"],
    ["*;q=0, gzip", "gzip"],
    ["identity", null],
    ["deflate", null],
    ["", null],
    [undefined, null],
  ])("picks %s as %s", (header, encoding) => {
    expect(pickEncoding(header)).toBe(encoding);
  });
});
