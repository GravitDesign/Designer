// Runs the patched pdf.js builds on real documents: the worker build in
// the main build's fake-worker mode (window.pdfjsWorker), both in one vm
// context, so the worker patches (xref_table, CMYK operators, the
// serialized font dictionary, adjustMapping) are executed rather than
// only checked as text.
//
// __fixtures__/open-sans-ab.ttf is Open Sans Regular from the old app's
// assets cut down with fontTools to the glyphs "A" and "B" (all name
// records kept).
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { describe, expect, it } from "vitest";
import { applyPatches, MAIN_PATCHES, WORKER_PATCHES, type TextPatch } from "./pdfjs-patches.ts";

const BUILD = path.join(
  import.meta.dirname,
  "..",
  "..",
  "..",
  "node_modules",
  "pdfjs-dist",
  "build",
);
const mainSource = applyPatches(fs.readFileSync(path.join(BUILD, "pdf.js"), "utf8"), MAIN_PATCHES);
const workerSource = fs.readFileSync(path.join(BUILD, "pdf.worker.js"), "utf8");
const FONT = fs.readFileSync(path.join(import.meta.dirname, "__fixtures__", "open-sans-ab.ttf"));

interface OperatorList {
  fnArray: number[];
  argsArray: unknown[][];
}

interface LoadedFont {
  baseDict?: SerializedValue;
}

type SerializedValue = { type: string; value: unknown } | number | boolean | null;

interface PdfJs {
  OPS: Record<string, number>;
  getDocument(params: Record<string, unknown>): {
    promise: Promise<{
      getPage(n: number): Promise<{
        getOperatorList(): Promise<OperatorList>;
        commonObjs: { get(id: string): LoadedFont };
      }>;
    }>;
  };
}

/**
 * pdf.js with the worker build patched by `workerPatches` (all of them
 * unless a test leaves one out to see it matters).
 */
function loadPdfJs(workerPatches: readonly TextPatch[] = WORKER_PATCHES): PdfJs {
  const window: Record<string, unknown> = {};
  const context = vm.createContext({ window, console: quietConsole, setTimeout, clearTimeout });
  const run = (source: string): Record<string, unknown> => {
    const module = { exports: {} as Record<string, unknown> };
    context.module = module;
    context.exports = module.exports;
    vm.runInContext(source, context);
    return module.exports;
  };
  window.pdfjsWorker = run(applyPatches(workerSource, workerPatches));
  return run(mainSource) as unknown as PdfJs;
}

const quietConsole = { log() {}, warn() {}, error() {}, info() {} };

/**
 * A PDF from object bodies (1-based), with a classic xref table under
 * `keyword`; `leading` goes right after the header.
 */
function pdf(objects: string[], keyword = "xref", leading = ""): Uint8Array {
  let out = "%PDF-1.4\n" + leading;
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(out, "latin1"));
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const start = Buffer.byteLength(out, "latin1");
  out += `${keyword}\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) out += `${String(offset).padStart(10, "0")} 00000 n \n`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  out += `startxref\n${start}\n%%EOF\n`;
  return new Uint8Array(Buffer.from(out, "latin1"));
}

function stream(data: string, extra = ""): string {
  return `<< /Length ${Buffer.byteLength(data, "latin1")} ${extra}>>\nstream\n${data}\nendstream`;
}

function onePage(content: string, resources = "<< >>", extra: string[] = []): string[] {
  return [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] /Contents 4 0 R /Resources ${resources} >>`,
    stream(content),
    ...extra,
  ];
}

async function operators(
  pdfjs: PdfJs,
  data: Uint8Array,
  options: Record<string, unknown> = {},
): Promise<{ list: OperatorList; page: Awaited<ReturnType<typeof firstPage>> }> {
  const page = await firstPage(pdfjs, data, options);
  return { list: await page.getOperatorList(), page };
}

async function firstPage(pdfjs: PdfJs, data: Uint8Array, options: Record<string, unknown>) {
  const document = await pdfjs.getDocument({ data, ...options }).promise;
  return document.getPage(1);
}

function argsOf(pdfjs: PdfJs, list: OperatorList, op: string): unknown[][] {
  const code = pdfjs.OPS[op];
  return list.fnArray.flatMap((fn, i) => (fn === code ? [list.argsArray[i] as unknown[]] : []));
}

const without = (name: string) => WORKER_PATCHES.filter((p) => p.name !== name);

// The content stream is object 4, and a stray "4 0 obj" right after the
// header comes first. With the xref table read, object 4 is the one the
// table points at; when pdf.js can't read the table it rebuilds it by
// scanning the file, and the first copy wins.
const CMYK_CONTENT = "0.1 0.2 0.3 0.4 k 0 0 10 10 re f 0.5 0 0 0 K 0 0 10 10 re S";
const XREF_TABLE_PDF = pdf(
  onePage(CMYK_CONTENT),
  "xref_table",
  `4 0 obj\n${stream("1 0 0 rg 0 0 10 10 re f")}\nendobj\n`,
);

describe("patched pdf.js worker", () => {
  it("keeps CMYK colors with disableCMYKToRGB and converts them without", async () => {
    const pdfjs = loadPdfJs();
    const kept = (await operators(pdfjs, pdf(onePage(CMYK_CONTENT)), { disableCMYKToRGB: true }))
      .list;
    expect(argsOf(pdfjs, kept, "setFillCMYKColor").map((a) => Array.from(a as never))).toEqual([
      [10, 20, 30, 40],
    ]);
    expect(argsOf(pdfjs, kept, "setStrokeCMYKColor").map((a) => Array.from(a as never))).toEqual([
      [50, 0, 0, 0],
    ]);
    expect(argsOf(pdfjs, kept, "setFillRGBColor")).toEqual([]);

    const converted = (
      await operators(pdfjs, pdf(onePage(CMYK_CONTENT)), { disableCMYKToRGB: false })
    ).list;
    expect(argsOf(pdfjs, converted, "setFillCMYKColor")).toEqual([]);
    expect(argsOf(pdfjs, converted, "setFillRGBColor")).toHaveLength(1);
    expect(argsOf(pdfjs, converted, "setStrokeRGBColor")).toHaveLength(1);
  });

  it("converts CMYK colors when disableCMYKToRGB isn't passed", async () => {
    const pdfjs = loadPdfJs();
    const list = (await operators(pdfjs, pdf(onePage(CMYK_CONTENT)))).list;
    expect(argsOf(pdfjs, list, "setFillCMYKColor")).toEqual([]);
    expect(argsOf(pdfjs, list, "setFillRGBColor")).toHaveLength(1);
  });

  it("reads xref tables that start with xref_table", async () => {
    const pdfjs = loadPdfJs();
    const list = (await operators(pdfjs, XREF_TABLE_PDF, { disableCMYKToRGB: true })).list;
    expect(argsOf(pdfjs, list, "setFillCMYKColor").map((a) => Array.from(a as never))).toEqual([
      [10, 20, 30, 40],
    ]);
    expect(argsOf(pdfjs, list, "setFillRGBColor")).toEqual([]);
  });

  it("falls back to scanning the file for xref_table without the patch", async () => {
    // Shows the fixture tells the two apart: unpatched pdf.js can't read
    // the table and picks up the later object 4.
    const pdfjs = loadPdfJs(without("XRef tables also start with xref_table"));
    const list = (await operators(pdfjs, XREF_TABLE_PDF, { disableCMYKToRGB: true })).list;
    expect(argsOf(pdfjs, list, "setFillCMYKColor")).toEqual([]);
    expect(argsOf(pdfjs, list, "setFillRGBColor")).toHaveLength(1);
  });

  describe("fonts", () => {
    const fontPdf = pdf(
      onePage("BT /F1 20 Tf 10 10 Td (AB) Tj ET", "<< /Font << /F1 5 0 R >> >>", [
        "<< /Type /Font /Subtype /TrueType /BaseFont /OpenSans /FirstChar 65 /LastChar 66 " +
          "/Widths [639 632] /Encoding /WinAnsiEncoding /FontDescriptor 6 0 R /MyData 8 0 R >>",
        "<< /Type /FontDescriptor /FontName /OpenSans /Flags 32 /FontBBox [-550 -271 1204 1048] " +
          "/ItalicAngle 0 /Ascent 1069 /Descent -293 /CapHeight 714 /StemV 80 /FontFile2 7 0 R >>",
        `<< /Length ${FONT.length} /Length1 ${FONT.length} >>\nstream\n${FONT.toString("latin1")}\nendstream`,
        stream("hello", "/Kind /Note "),
      ]),
    );

    async function loadFont(pdfjs: PdfJs) {
      const { list, page } = await operators(pdfjs, fontPdf);
      const [fontArgs] = argsOf(pdfjs, list, "setFont");
      const font = page.commonObjs.get((fontArgs as [string])[0]);
      const [shown] = argsOf(pdfjs, list, "showText");
      const glyphs = (shown as [{ fontChar: string; unicode: string }[]])[0];
      return { font, glyphs };
    }

    it("carry their font dictionary with references resolved and streams read", async () => {
      const { font } = await loadFont(loadPdfJs());
      const dict = font.baseDict as { type: string; value: Record<string, SerializedValue> };
      expect(dict.type).toBe("dict");
      expect(dict.value.BaseFont).toEqual({ type: "name", value: "OpenSans" });
      expect(dict.value.FirstChar).toBe(65);
      const widths = dict.value.Widths as { type: string; value: unknown[] };
      expect(widths).toEqual({ type: "array", value: [639, 632] });
      const note = dict.value.MyData as {
        type: string;
        value: { buffer: Uint8Array; dict: { type: string; value: Record<string, unknown> } };
      };
      expect(note.type).toBe("stream");
      expect(Buffer.from(note.value.buffer).toString("latin1")).toBe("hello");
      expect(note.value.dict.value.Kind).toEqual({ type: "name", value: "Note" });
      const descriptor = dict.value.FontDescriptor as {
        type: string;
        value: Record<string, { type: string; value: { buffer: Uint8Array } }>;
      };
      expect(descriptor.type).toBe("dict");
      expect(descriptor.value.FontFile2?.type).toBe("stream");
      expect(descriptor.value.FontFile2?.value.buffer.length).toBe(FONT.length);
    });

    it("have no font dictionary without the patch", async () => {
      const { font } = await loadFont(
        loadPdfJs(
          without("fonts keep a serialized copy of their font dictionary").filter(
            (p) =>
              p.name !== "font properties carry the serialized font dictionary" &&
              p.name !== "Font keeps the serialized font dictionary",
          ),
        ),
      );
      expect(font.baseDict).toBeUndefined();
    });

    it("keep the unicode values of char codes", async () => {
      const { glyphs } = await loadFont(loadPdfJs());
      expect(glyphs.map((g) => [g.unicode, g.fontChar])).toEqual([
        ["A", "A"],
        ["B", "B"],
      ]);
    });

    it("move every char code to the private use area without the adjustMapping patches", async () => {
      const { glyphs } = await loadFont(
        loadPdfJs(
          WORKER_PATCHES.filter(
            (p) =>
              ![
                "font char codes keep their unicode values (no private use area for every glyph)",
                "adjustMapping maps char codes to their unicode values where it can",
                "checkAndRepair maps the cmap without a moved glyph zero",
                "convert maps the glyphs without a moved glyph zero",
              ].includes(p.name),
          ),
        ),
      );
      expect(glyphs.map((g) => g.unicode)).toEqual(["A", "B"]);
      for (const glyph of glyphs)
        expect(glyph.fontChar.charCodeAt(0)).toBeGreaterThanOrEqual(0xe000);
    });
  });
});
