/**
 * What the shared normalizer (support/normalize.ts) can't do for exported
 * SVG files, which are markup rather than a serialized document.
 *
 * An SVG export holds random ids in two places:
 * - the markup: clip path, mask, gradient and image ids and filter
 *   results end in a fresh 32-character token ("_clipPath_<token>",
 *   "img_<token>", result="_out_<token>"), and the
 *   gravitGraphicSource element has a token id that gravitElementRef
 *   points at;
 * - the editing data (FMT-EXPORT-010): zlib-compressed serialized nodes
 *   with their usual random ids.
 *
 * Only tokens that are defined as ids (an `id` or `result` attribute in the
 * markup, an id key in the editing data, found by documentIds) are
 * renamed, so an unrelated 32-character string still shows up as a
 * difference. The editing data is inflated so it can be compared, and the
 * deflate level is recorded by compressing the inflated bytes again at
 * each level until the exact bytes come out. That uses pako 1.0.11, the
 * deflate the old app ships (Node's zlib produces different bytes).
 */
import zlib from "node:zlib";
import pako from "pako";
import { documentIds, type Json } from "../../support/normalize.ts";

/**
 * Where an SVG export keeps its editing data: the base64 CDATA of the
 * gravitGraphicSource element. The payload is zlib data held as a
 * JavaScript binary string, UTF-8 encoded, then base64 encoded.
 */
export function svgGraphicSource(svg: string): { start: number; end: number; b64: string } | null {
  const m = /(<gravitDesigner:gravitGraphicSource[^>]*><!\[CDATA\[)([A-Za-z0-9+/=]*)(\]\]>)/.exec(
    svg,
  );
  if (!m) return null;
  const start = m.index + (m[1] as string).length;
  return { start, end: start + (m[2] as string).length, b64: m[2] as string };
}

type Level = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
const LEVELS: Level[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

/**
 * The pako levels (0-9) whose zlib stream reproduces `compressed` from
 * `raw` ("4,5,6,7,8,9": small inputs come out the same at several
 * levels), or "unknown".
 */
export function deflateLevel(raw: Buffer, compressed: Buffer): string {
  const levels = LEVELS.filter((level) =>
    Buffer.from(pako.deflate(raw, { level })).equals(compressed),
  );
  return levels.length > 0
    ? levels.join(",")
    : `unknown (header ${compressed.subarray(0, 2).toString("hex")})`;
}

/** The pako levels (0-9) that reproduce a gzip file's deflate body, or "unknown". */
export function gzipLevel(gz: Buffer, raw: Buffer): string {
  // The header is 10 bytes when no optional fields are set; the trailer is
  // CRC32 + size (8 bytes).
  const flags = gz[3] ?? 0;
  if (flags !== 0) return `unknown (flags ${flags})`;
  const body = gz.subarray(10, gz.length - 8);
  const levels = LEVELS.filter((level) =>
    Buffer.from(pako.deflateRaw(raw, { level })).equals(body),
  );
  return levels.length > 0 ? levels.join(",") : "unknown";
}

/** Replaces every whole occurrence of a token in `ids` with its new name. */
export function renameTokens(text: string, ids: ReadonlyMap<string, string>): string {
  if (ids.size === 0) return text;
  const alternatives = [...ids.keys()]
    .sort((a, b) => b.length - a.length)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const any = new RegExp(`(?<![A-Za-z0-9])(${alternatives.join("|")})(?![A-Za-z0-9])`, "g");
  return text.replace(any, (token: string) => ids.get(token) ?? token);
}

/**
 * Random tokens defined by `id="..."` attributes and filter primitive
 * `result="..."` names, in order of appearance.
 */
function markupIds(svg: string): string[] {
  const out: string[] = [];
  for (const m of svg.matchAll(/\s(?:id|result)="(?:[^"]*_)?([A-Za-z0-9]{32})"/g)) {
    const token = m[1] as string;
    if (!out.includes(token)) out.push(token);
  }
  return out;
}

/**
 * An exported SVG made comparable: the editing data inflated in place as
 * "inflated(level N,M,...):<json>" and every random id renamed (markup ids to
 * "svg1", "svg2", ..., editing-data ids to "id1", "id2", ...).
 */
export function normalizeSvg(svg: string): string {
  const ids = new Map<string, string>();
  let markupCount = 0;
  for (const token of markupIds(svg)) ids.set(token, `svg${++markupCount}`);
  const src = svgGraphicSource(svg);
  let out = svg;
  if (src) {
    const compressed = Buffer.from(Buffer.from(src.b64, "base64").toString("utf8"), "latin1");
    const raw = zlib.inflateSync(compressed);
    const json = raw.toString("utf8");
    let docCount = 0;
    for (const id of documentIds(JSON.parse(json) as Json)) {
      if (!ids.has(id)) ids.set(id, `id${++docCount}`);
    }
    out =
      svg.slice(0, src.start) +
      `inflated(level ${deflateLevel(raw, compressed)}):` +
      json +
      svg.slice(src.end);
  }
  return renameTokens(out, ids);
}
