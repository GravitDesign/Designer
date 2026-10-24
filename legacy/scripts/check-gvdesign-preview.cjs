#!/usr/bin/env node
/**
 * Inspect a .gvdesign file and report its embedded Explorer preview, if any.
 *
 *   node scripts/check-gvdesign-preview.cjs "path/to/file.gvdesign"
 *   node scripts/check-gvdesign-preview.cjs "file.gvdesign" --extract out.jpg
 *
 * A .gvdesign is gzipped JSON. Files saved by this build embed the preview as a
 * "_preview" data-URL key at the root of the scene object. This mirrors exactly
 * what a Windows IThumbnailProvider would do: gunzip -> find "_preview" -> decode.
 */
const fs = require("fs");
const zlib = require("zlib");

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/check-gvdesign-preview.cjs <file.gvdesign> [--extract <out>]');
  process.exit(2);
}

let raw;
try {
  raw = fs.readFileSync(file);
} catch (e) {
  console.error("Cannot read file:", e.message);
  process.exit(1);
}

let json;
try {
  json = zlib.gunzipSync(raw).toString("utf8");
} catch (e) {
  console.error("Not a gzip stream (unexpected for .gvdesign):", e.message);
  process.exit(1);
}

let url = null;
try {
  url = JSON.parse(json)._preview || null;
} catch (e) {
  // Fall back to a cheap scan — a native handler can do the same without a full parse.
  const m = json.match(/"_preview"\s*:\s*"(data:[^"]+)"/);
  url = m ? m[1] : null;
}

if (!url) {
  console.log("NO PREVIEW embedded. (File saved before the preview feature, or save skipped it.)");
  process.exit(0);
}

const m = /^data:(image\/[a-z+]+);base64,(.*)$/.exec(url);
if (!m) {
  console.log("Found _preview but it is not a base64 image data URL.");
  process.exit(0);
}
const mime = m[1];
const bytes = Buffer.from(m[2], "base64");
console.log("PREVIEW FOUND");
console.log("  mime:       ", mime);
console.log("  size:       ", bytes.length, "bytes");
console.log("  valid JPEG: ", bytes[0] === 0xff && bytes[1] === 0xd8);
console.log("  valid PNG:  ", bytes.slice(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])));

const extractIdx = process.argv.indexOf("--extract");
if (extractIdx !== -1 && process.argv[extractIdx + 1]) {
  fs.writeFileSync(process.argv[extractIdx + 1], bytes);
  console.log("  extracted -> ", process.argv[extractIdx + 1]);
}
