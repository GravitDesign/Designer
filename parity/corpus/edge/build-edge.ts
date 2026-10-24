// Builds the edge-case .gvdesign files in parity/corpus/edge/files from
// committed corpus files, so their content is real old-app output and only
// the edge case itself is hand-made. Deterministic: run it again and the
// bytes stay the same.
//
//   cd next && node parity/corpus/edge/build-edge.ts
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { NEXT_ROOT } from "../../support/env.ts";

const CORPUS = path.join(NEXT_ROOT, "parity", "corpus", "files");
const OUT = path.join(NEXT_ROOT, "parity", "corpus", "edge", "files");

type Doc = Record<string, unknown> & { $: Record<string, unknown>[] };

function read(name: string): { text: string; doc: Doc } {
  const text = zlib.gunzipSync(fs.readFileSync(path.join(CORPUS, `${name}.gvdesign`))).toString();
  return { text, doc: JSON.parse(text) as Doc };
}

/** gzip as the old app writes it: level 9, no file name, mtime 0. */
function gzip(text: string): Buffer {
  return zlib.gzipSync(Buffer.from(text, "utf8"), { level: 9 });
}

function write(name: string, bytes: Buffer): void {
  fs.writeFileSync(path.join(OUT, `${name}.gvdesign`), bytes);
  console.log(`${name}: ${bytes.length} bytes`);
}

fs.mkdirSync(OUT, { recursive: true });

// FMT-GVD-003: plain UTF-8 JSON, no gzip.
write("uncompressed", Buffer.from(read("shapes-ellipses").text, "utf8"));

// FMT-PREVIEW-001: a file without the embedded preview.
{
  const { doc } = read("fills-colors");
  delete doc._preview;
  write("no-preview", gzip(JSON.stringify(doc)));
}

// FMT-GVD-006: gzip of JSON that ends in the middle.
{
  const { text } = read("shapes-polygons");
  write("invalid-json", gzip(text.slice(0, Math.floor(text.length / 2))));
}

// FMT-GVD-006: an unknown node type ("@") among known ones.
{
  const { doc } = read("shapes-rectangles");
  const page = doc.$[0] as Doc;
  page.$.splice(2, 0, {
    "@": "hologram",
    "@id": "Unkn0w",
    w: 40,
    $: [{ "@": "rectangle", "@id": "UnkCh1" }],
  });
  write("unknown-type", gzip(JSON.stringify(doc)));
}

// FMT-GVD-009: a file from before 3.10 (no root "dictionary"), so text
// heights are recomputed the legacy way, with an old "v" that nothing reads.
{
  const { doc } = read("text-layout");
  delete doc.dictionary;
  doc.v = 9;
  write("legacy-pre310", gzip(JSON.stringify(doc)));
}

// FMT-GVD-010, 011, 014: an image linked to a local file (file:// in the
// dictionary) next to embedded ones.
{
  const { doc } = read("images");
  const dictionary = doc.dictionary as { entries: { value: string }[] };
  const first = dictionary.entries[0];
  if (!first) throw new Error("images.gvdesign has no dictionary entries");
  first.value = "file:///C:/parity-missing/linked.png";
  write("linked-file", gzip(JSON.stringify(doc)));
}

// FMT-GVD-015: a document so small that its save is under 200 bytes.
write(
  "tiny",
  gzip(JSON.stringify({ "@": "scene", "@id": "Tiny01", $: [{ "@": "page", "@id": "Tiny02" }] })),
);
