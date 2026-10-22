/**
 * Random ids the shared normalizer (support/normalize.ts) does not reach.
 * Pure functions, so they also run in the page when sent as source text.
 *
 * The old app writes fresh random ids on every run in places where
 * normalize.ts does not look:
 * - 6-character node ids ("@id") inside nested pattern strings such as a
 *   texture's "T#{...}" (they start with "T#", not "{");
 * - 32-character ids in path point arrays ([data, "#", id]), image
 *   dictionary entries ("uuid" and "dictionary://<uuid>");
 * - SVG exports: clip path, gradient, pattern and image ids
 *   ("_clipPath_<32 chars>") and the id of the gravitGraphicSource element.
 *
 * normalizeRandomTokens renames every such token, wherever it appears, to
 * a sequential name in order of first appearance ("~a1", "~b1", ...). The
 * structure of the references survives; only the random values go.
 */
export function normalizeRandomTokens(text: string): string {
  const names = new Map<string, string>();
  const short = /@id\\*"\s*:\s*\\*"([A-Za-z0-9]{6})\\*"/g;
  let m: RegExpExecArray | null;
  while ((m = short.exec(text))) {
    const tok = m[1] as string;
    if (!names.has(tok)) names.set(tok, "~a" + (names.size + 1));
  }
  const long = /(?<![A-Za-z0-9+/=])[A-Za-z0-9]{32}(?![A-Za-z0-9+/=])/g;
  while ((m = long.exec(text))) {
    const tok = m[0];
    if (!names.has(tok)) names.set(tok, "~b" + (names.size + 1));
  }
  if (names.size === 0) return text;
  const any = new RegExp(
    "(?<![A-Za-z0-9])(" + [...names.keys()].join("|") + ")(?![A-Za-z0-9])",
    "g",
  );
  return text.replace(any, (tok: string) => names.get(tok) ?? tok);
}

/**
 * Where an SVG export keeps its editing data: the base64 CDATA of the
 * gravitGraphicSource element (FMT-EXPORT-010). The payload is zlib data
 * held as a JavaScript binary string, UTF-8 encoded, then base64 encoded.
 */
export function svgGraphicSource(svg: string): { start: number; end: number; b64: string } | null {
  const m = /(<gravitDesigner:gravitGraphicSource[^>]*><!\[CDATA\[)([A-Za-z0-9+/=]*)(\]\]>)/.exec(
    svg,
  );
  if (!m) return null;
  const start = m.index + (m[1] as string).length;
  return { start, end: start + (m[2] as string).length, b64: m[2] as string };
}
