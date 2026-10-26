import { promisify } from "node:util";
import zlib from "node:zlib";
import type { Request, RequestHandler, Response } from "express";

/**
 * Compression for the static files: the client build and the shared
 * assets. express.static still answers every request (status, Content-Type,
 * Cache-Control, ETag, Last-Modified, 304s, HEAD, ranges, redirects, 404s);
 * this only swaps the body of a 200 GET for its brotli or gzip copy when
 * the browser accepts one, so the decoded bytes are the file's bytes.
 *
 * Each copy is made once per file version (the ETag express.static sends
 * is its size and mtime) and kept in memory, so later requests cost no
 * compression. The first request for a file waits for its copy.
 */

export type Encoding = "br" | "gzip";

/** Types worth compressing (images, fonts in woff2, video and audio already are). */
const COMPRESSIBLE =
  /^(text\/|application\/(javascript|json|wasm|xml|manifest\+json|vnd\.iccprofile)\b|image\/(svg\+xml|x-icon|vnd\.microsoft\.icon)\b|font\/(ttf|otf)\b)/i;

/** Below this a compressed body saves less than the headers it adds. */
export const MIN_SIZE = 1024;

/** How many compressed bytes the cache keeps before it drops the oldest copies. */
const CACHE_LIMIT = 96 * 1024 * 1024;

const brotli = promisify(zlib.brotliCompress);
const gzip = promisify(zlib.gzip);

function compress(body: Buffer, encoding: Encoding): Promise<Buffer> {
  return encoding === "br"
    ? brotli(body, {
        params: {
          // Quality 6: within 5% of the size of 9 at under half the time
          // (the 4.8 MB entry chunk: 1.12 MB in about 170 ms).
          [zlib.constants.BROTLI_PARAM_QUALITY]: 6,
          [zlib.constants.BROTLI_PARAM_SIZE_HINT]: body.length,
        },
      })
    : gzip(body, { level: 6 });
}

/** The q value an Accept-Encoding header gives `name` (0: not acceptable). */
function quality(header: string, name: string): number {
  let named: number | null = null;
  let any: number | null = null;
  for (const part of header.split(",")) {
    const [token = "", ...params] = part.trim().split(";");
    const coding = token.trim().toLowerCase();
    if (coding !== name && coding !== "*") continue;
    let q = 1;
    for (const param of params) {
      const [key, value] = param.trim().split("=");
      if (key?.trim().toLowerCase() === "q") q = Number(value);
    }
    if (Number.isNaN(q)) q = 0;
    if (coding === name) named = q;
    else any = q;
  }
  return named ?? any ?? 0;
}

/** brotli when the browser takes it at least as gladly as gzip, else gzip, else none. */
export function pickEncoding(header: string | undefined): Encoding | null {
  if (!header) return null;
  const br = quality(header, "br");
  const gz = quality(header, "gzip");
  if (br > 0 && br >= gz) return "br";
  if (gz > 0) return "gzip";
  return null;
}

/** The compressed copies, by encoding, path and ETag, oldest first. */
export class CompressedCache {
  private readonly _entries = new Map<string, Promise<Buffer>>();
  private readonly _sizes = new Map<string, number>();
  private _bytes = 0;

  private readonly _limit: number;

  constructor(limit = CACHE_LIMIT) {
    this._limit = limit;
  }

  /** The copy of `body` for `key`, made with `encoding` unless it is cached. */
  get(key: string, encoding: Encoding, body: () => Buffer): Promise<Buffer> {
    let entry = this._entries.get(key);
    if (!entry) {
      entry = compress(body(), encoding);
      this._entries.set(key, entry);
      entry.then(
        (compressed) => {
          if (this._entries.get(key) !== entry) return;
          this._sizes.set(key, compressed.length);
          this._bytes += compressed.length;
          this._evict();
        },
        () => this._entries.delete(key),
      );
    }
    return entry;
  }

  /** Compressed bytes held. */
  get bytes(): number {
    return this._bytes;
  }

  private _evict(): void {
    for (const key of this._sizes.keys()) {
      if (this._bytes <= this._limit) return;
      this._bytes -= this._sizes.get(key) as number;
      this._sizes.delete(key);
      this._entries.delete(key);
    }
  }
}

function appendVary(res: Response): void {
  const vary = res.getHeader("Vary");
  const list = vary === undefined ? [] : String(vary).split(/\s*,\s*/);
  if (list.some((v) => v === "*" || v.toLowerCase() === "accept-encoding")) return;
  res.setHeader("Vary", [...list, "Accept-Encoding"].join(", "));
}

/**
 * `serve` (an express.static handler) with compressed bodies. Only the
 * requests `serve` answers itself are touched: when it passes a request on
 * (no such file), the response is given back as it was.
 */
export function compressed(serve: RequestHandler, cache = new CompressedCache()): RequestHandler {
  return (req: Request, res: Response, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      serve(req, res, next);
      return;
    }
    const encoding =
      req.method === "GET" && !req.headers.range
        ? pickEncoding(req.headers["accept-encoding"])
        : null;
    const write = res.write;
    const end = res.end;
    const restore = (): void => {
      res.write = write;
      res.end = end;
    };
    // Decided when express.static starts the body (or ends without one):
    // by then its status and headers are set.
    let collect: boolean | null = null;
    let key = "";
    let length = 0;
    const chunks: Buffer[] = [];
    const decide = (): boolean => {
      if (collect !== null) return collect;
      collect = false;
      if (res.headersSent || res.statusCode !== 200) return false;
      if (res.getHeader("Content-Encoding") !== undefined) return false;
      const type = res.getHeader("Content-Type");
      length = Number(res.getHeader("Content-Length"));
      if (typeof type !== "string" || !COMPRESSIBLE.test(type) || !(length >= MIN_SIZE))
        return false;
      appendVary(res);
      const etag = res.getHeader("ETag");
      if (!encoding || typeof etag !== "string") return false;
      key = `${encoding} ${req.baseUrl}${req.path} ${etag}`;
      return (collect = true);
    };
    const keep = (chunk: unknown): void => {
      if (chunk == null || typeof chunk === "function") return;
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array | string));
    };
    res.write = function (this: Response, chunk: unknown, ...rest: unknown[]): boolean {
      if (!decide()) return (write as (...args: unknown[]) => boolean).call(this, chunk, ...rest);
      keep(chunk);
      return true;
    } as Response["write"];
    res.end = function (this: Response, chunk?: unknown, ...rest: unknown[]): Response {
      const compress = decide();
      restore();
      if (!compress) return (end as (...args: unknown[]) => Response).call(this, chunk, ...rest);
      keep(chunk);
      const original = Buffer.concat(chunks);
      // The file changed while it was read: its ETag doesn't name these bytes.
      if (original.length !== length) {
        res.setHeader("Content-Length", original.length);
        return (end as (...args: unknown[]) => Response).call(this, original);
      }
      cache
        .get(key, encoding as Encoding, () => original)
        .then(
          (body) => {
            res.setHeader("Content-Encoding", encoding as Encoding);
            res.setHeader("Content-Length", body.length);
            // Ranges would count the compressed bytes; ranged requests get the file as is.
            res.removeHeader("Accept-Ranges");
            res.end(body);
          },
          // Compression failed: the file as it is.
          () => res.end(original),
        );
      return this;
    } as Response["end"];
    serve(req, res, (error?: unknown) => {
      restore();
      next(error);
    });
  };
}
