// Runs every program in __fixtures__/corpus through the interpreter and
// compares the messages it posts with what the old worker (public/ps*.js)
// posted for the same program, recorded in __fixtures__/recorded. Each
// program runs with outlined fonts, with plain text, and without
// SharedArrayBuffer (where JPEG decoding reports error "02").
//
// Programs whose recording shows an old bug the port fixes are compared
// with <name>.fixed.json instead (see BUGS-FIXED.md). The fixed recordings
// equal the old ones except for the messages the fix explains.
import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runInterpreter, type RecordedMessage, type RecordedRun } from "./test-support.ts";

const FIXTURES = path.join(import.meta.dirname, "__fixtures__");
const CORPUS = path.join(FIXTURES, "corpus");
const RECORDED = path.join(FIXTURES, "recorded");

const VARIANTS = {
  "outline-sab": { outlineFonts: true, sab: true },
  "plain-sab": { outlineFonts: false, sab: true },
  "outline-nosab": { outlineFonts: true, sab: false },
} as const;

/** Exception texts name minified variables in the old code; only their place in the stream counts. */
function normalize(run: RecordedRun): RecordedRun {
  return {
    finished: run.finished,
    messages: run.messages.map((m): RecordedMessage =>
      "exception" in m ? { exception: true } : m,
    ),
  };
}

/**
 * Programs with a `.fixed.json` recording, and the BUGS-FIXED.md entries
 * that explain it (space separated, in the order they were fixed).
 */
const FIXED: Record<string, string> = {
  // The JPEG handshake asks for the size, then for the RGBA pixels.
  "filter-dct-file.ps": "BUG-008",
  "fixture-image-dct.eps": "BUG-008",
  // An exception ends the run with error "04" and done. The mesh
  // shadings (color-sh*, BUG-116) draw where the old worker threw;
  // color-shadings.test.ts checks their pixels.
  "basic-atan.ps": "BUG-109 BUG-111 BUG-112",
  "basic-cos-typecheck.ps": "BUG-109 BUG-112",
  "basic-cvr-bool.ps": "BUG-109 BUG-112",
  "basic-cvrs-radix0.ps": "BUG-109 BUG-112",
  "basic-eexec-file.ps": "BUG-109 BUG-112",
  "basic-errordict-number-handler.ps": "BUG-109 BUG-112",
  "basic-internaldict-error.ps": "BUG-109 BUG-112",
  "basic-loops.ps": "BUG-109 BUG-112",
  "color-fn-procedure.ps": "BUG-109",
  "color-image-cie-repeat.ps": "BUG-109",
  "color-separation-function-dict.ps": "BUG-109",
  "color-sh-pattern-mesh.ps": "BUG-109 BUG-116",
  "color-sh4-cmyk.ps": "BUG-109 BUG-116",
  "color-sh4-flag3.ps": "BUG-109 BUG-116",
  "color-sh4-function.ps": "BUG-109 BUG-116",
  "color-sh4-gray.ps": "BUG-109 BUG-116",
  "color-sh4-rgb.ps": "BUG-109 BUG-116",
  "color-sh4-scaled-ctm.ps": "BUG-109 BUG-116",
  "color-sh4-small-bits.ps": "BUG-109 BUG-116",
  "color-sh4-truncated.ps": "BUG-109 BUG-116",
  "color-sh5-gray-2rows.ps": "BUG-109 BUG-116",
  "color-sh5-lattice.ps": "BUG-109 BUG-116",
  "color-sh6-function.ps": "BUG-109 BUG-116",
  "filter-ascii85-string.ps": "BUG-109 BUG-115",
  "filter-dct-read.ps": "BUG-109",
  "filter-lzw.ps": "BUG-109 BUG-115",
  "filter-reusable-file.ps": "BUG-109 BUG-112",
  "filters.ps": "BUG-109",
  "fixture-arc-closepath.eps": "BUG-109 BUG-110 BUG-112",
  "fixture-shapes-ps.ps": "BUG-109 BUG-110 BUG-112",
  "font-type1-missing-subr.ps": "BUG-109",
  "gfx-closepath-arc.ps": "BUG-109 BUG-110",
  "gfx-curves.ps": "BUG-109 BUG-112",
  "gfx-image-errors.ps": "BUG-109",
  "gfx-image-ps-operands.ps": "BUG-109 BUG-112",
  "gfx-imagemask-ps-operands.ps": "BUG-109 BUG-112",
  "gfx-imagemask.ps": "BUG-109",
  "gfx-lineto-nopath.ps": "BUG-109",
  "gfx-resourceforall-typecheck.ps": "BUG-109",
  "gfx-rlineto-nopath.ps": "BUG-109",
  "images.eps": "BUG-109",
  "math-stack.ps": "BUG-109 BUG-111 BUG-112",
  "shadings.eps": "BUG-109",

  // An arc without a current point starts its subpath with a moveto.
  "fixture-shapes.eps": "BUG-110 BUG-112",
  "gfx-arcs.ps": "BUG-110 BUG-112",
  "paths.eps": "BUG-110 BUG-112 BUG-117",
  // rectfill fills and rectstroke strokes a CTM-mapped rectangle path;
  // rectclip uses x + width and y + height.
  "basic-access.ps": "BUG-112",
  "basic-arith-errors.ps": "BUG-112",
  "basic-arith.ps": "BUG-112",
  "basic-array-ops.ps": "BUG-112",
  "basic-astore-aload.ps": "BUG-112",
  "basic-bind-exec.ps": "BUG-112",
  "basic-compare.ps": "BUG-112",
  "basic-cvi.ps": "BUG-112",
  "basic-cvr.ps": "BUG-112",
  "basic-cvrs.ps": "BUG-112",
  "basic-cvs.ps": "BUG-112",
  "basic-dicts.ps": "BUG-112",
  "basic-dictstack-lookup.ps": "BUG-112",
  "basic-dictstack.ps": "BUG-112",
  "basic-eexec-string.ps": "BUG-112",
  "basic-exit-outside.ps": "BUG-112",
  "basic-exit-stopped.ps": "BUG-112",
  "basic-files.ps": "BUG-112",
  "basic-filter-op.ps": "BUG-112",
  "basic-global.ps": "BUG-112",
  "basic-interval.ps": "BUG-112",
  "basic-logic.ps": "BUG-112",
  "basic-matrix.ps": "BUG-112",
  "basic-packedarray-nocount.ps": "BUG-112",
  "basic-print-version.ps": "BUG-112",
  "basic-put-get.ps": "BUG-112",
  "basic-readline.ps": "BUG-112",
  "basic-readstring.ps": "BUG-112",
  "basic-save-restore.ps": "BUG-112",
  "basic-screen-cache.ps": "BUG-112",
  "basic-search.ps": "BUG-112",
  "basic-stack.ps": "BUG-112",
  "basic-stop-quit.ps": "BUG-112",
  "basic-stopped.ps": "BUG-112",
  "basic-trig.ps": "BUG-112",
  "basic-type.ps": "BUG-112",
  "color-cie-a.ps": "BUG-112",
  "color-cie-abc-full.ps": "BUG-112",
  "color-cie-abc-plain.ps": "BUG-112",
  "color-cie-def.ps": "BUG-112",
  "color-current-conversions.ps": "BUG-112",
  "color-device-spaces.ps": "BUG-112",
  "color-devicen.ps": "BUG-112",
  "color-hsb-sectors.ps": "BUG-112",
  "color-indexed-cmyk.ps": "BUG-112",
  "color-indexed-proc.ps": "BUG-112",
  "color-indexed-string.ps": "BUG-112",
  "color-lab.ps": "BUG-112",
  "color-pattern-type1.ps": "BUG-112",
  "color-pattern-type2.ps": "BUG-112",
  "color-separation-cmyk.ps": "BUG-112",
  "color-separation-gray.ps": "BUG-112",
  "color-separation-rgb-array.ps": "BUG-112",
  "color-sh4-bad-first-flag.ps": "BUG-112",
  "color-sh4-string-data.ps": "BUG-112",
  "color-sh6-coons.ps": "BUG-112",
  "color-sh6-gray-flags.ps": "BUG-112",
  "color-sh6-separation.ps": "BUG-112 BUG-116",
  "color-sh6-tiny.ps": "BUG-112",
  "color-sh6-truncated.ps": "BUG-112",
  "color-sh7-tensor-cmyk.ps": "BUG-112",
  "color-sh7-tensor-rgb.ps": "BUG-112",
  "colors.eps": "BUG-112",
  "filter-ascii85-badeod.ps": "BUG-112 BUG-115",
  "filter-ascii85-onechar.ps": "BUG-112 BUG-115",
  "filter-ascii85-partial.ps": "BUG-112",
  "filter-ascii85-short.ps": "BUG-112",
  "filter-ascii85-z.ps": "BUG-112",
  "filter-ascii85.ps": "BUG-112 BUG-115",
  "filter-chain.ps": "BUG-112",
  "filter-eexec-hex-lines.ps": "BUG-112",
  "filter-eexec-hex.ps": "BUG-112",
  "filter-eexec-nonfile.ps": "BUG-112",
  "filter-reusable-dict.ps": "BUG-112 BUG-115",
  "filter-reusable.ps": "BUG-112",
  "filter-runlength-short.ps": "BUG-112",
  "filter-runlength.ps": "BUG-112",
  "filter-subfile-count.ps": "BUG-112 BUG-115",
  "filter-subfile-empty.ps": "BUG-112",
  "filter-subfile-eod.ps": "BUG-112 BUG-115",
  "filter-subfile-underflow.ps": "BUG-112",
  "filter-unknown.ps": "BUG-112",
  "fixture-postscript-only.ai": "BUG-112",
  "gfx-cachedevice.ps": "BUG-112",
  "gfx-clip.ps": "BUG-112",
  "gfx-cliprestore-empty.ps": "BUG-112",
  "gfx-clipsave.ps": "BUG-112",
  "gfx-closepath.ps": "BUG-112",
  "gfx-cmap.ps": "BUG-112",
  "gfx-colorspace.ps": "BUG-112",
  "gfx-definefont.ps": "BUG-112",
  "gfx-flat-ustroke.ps": "BUG-112",
  "gfx-fonts.ps": "BUG-112",
  "gfx-gray-rgb-cmyk.ps": "BUG-112",
  "gfx-gsave.ps": "BUG-112",
  "gfx-gstate.ps": "BUG-112",
  "gfx-imagecolor.ps": "BUG-112",
  "gfx-linestate.ps": "BUG-112 BUG-117",
  "gfx-matrices.ps": "BUG-112",
  "gfx-moveto.ps": "BUG-112",
  "gfx-params.ps": "BUG-112",
  "gfx-pathbbox.ps": "BUG-112",
  "gfx-patterns.ps": "BUG-112",
  "gfx-rand.ps": "BUG-112",
  "gfx-rectclip-nopoint.ps": "BUG-112",
  "gfx-rectclip.ps": "BUG-112",
  "gfx-rects.ps": "BUG-112",
  "gfx-resourceforall.ps": "BUG-112",
  "gfx-resources.ps": "BUG-112",
  "gfx-selectfont.ps": "BUG-112",
  "gfx-setbbox.ps": "BUG-112",
  "gfx-show-stubs.ps": "BUG-112",
  "gfx-transforms.ps": "BUG-112",
  "show-builtin-nopoint.ps": "BUG-112",
  "show-builtin-stringwidth.ps": "BUG-112",
  "show-builtin-typecheck.ps": "BUG-112",
  "show-builtin-underflow.ps": "BUG-112",
  "show-builtin-xshow-range.ps": "BUG-112",
  "show-nofont.ps": "BUG-112",
  "show-outlined-nopoint.ps": "BUG-112",
  "show-outlined-stringwidth.ps": "BUG-112",
  "show-outlined-typecheck.ps": "BUG-112",
  "show-outlined-underflow.ps": "BUG-112",
  "show-outlined-xshow-range.ps": "BUG-112",
  // stroke scales its width and dashes by the CTM (stroke.test.ts checks
  // it): gfx-linestate.ps and paths.eps above.
  // charpath advances from glyph to glyph (show.test.ts checks it).
  "show-outlined-charpath-false.ps": "BUG-114",
  "show-outlined-charpath-true.ps": "BUG-114",
};

/**
 * BUG-112 programs whose rectangles go beyond what the default-CTM check
 * below can map from the old rectfill: a changed CTM (scale, rotate,
 * matrices), rectstroke and rectclip, the array form, and NaN widths.
 */
const RECTS_BEYOND_DEFAULT_CTM = new Set([
  "basic-arith.ps",
  "basic-matrix.ps",
  "gfx-matrices.ps",
  "gfx-pathbbox.ps",
  "gfx-rectclip.ps",
  "gfx-rects.ps",
  "gfx-transforms.ps",
  // A rectfill under a clip: the fill now carries the clip.
  "gfx-clip.ps",
  "gfx-clipsave.ps",
  "gfx-rectclip-nopoint.ps",
  // Rectangles under a translated or scaled CTM next to the arcs of
  // BUG-110; their moveto change was checked against the BUG-110 stage.
  "fixture-shapes.eps",
  "paths.eps",
]);

/**
 * The programs whose fixed recording comes from exactly these entries,
 * apart from BUG-112, whose rectangles the checks map into the old
 * recording (see oldRecording); programs with rectangles beyond that map
 * are left out of the step checks.
 */
const fixedBy = (bugs: string): string[] =>
  Object.keys(FIXED).filter((file) => {
    const list = (FIXED[file] as string).split(" ");
    if (list.includes("BUG-112") && RECTS_BEYOND_DEFAULT_CTM.has(file)) return false;
    return list.filter((bug) => bug !== "BUG-112").join(" ") === bugs;
  });

type Point = { x: number; y: number };

/** A point under the default CTM, [1 0 0 -1 0 0]. */
const device = (x: number, y: number): Point => ({ x: x + 0, y: 0 - y });

/**
 * The old messages with each rectfill [x, y, width, height, color] turned
 * into the fill of its rectangle path under the default CTM, without a
 * clip, which is what rectfill posts since BUG-112.
 */
function withRectFills(messages: RecordedMessage[]): RecordedMessage[] {
  return messages.map((message) => {
    if (!("func" in message) || message.func !== "rectfill" || !("data" in message)) return message;
    const [x, y, width, height, color] = message.data as [number, number, number, number, unknown];
    const start = device(x, y);
    const path = [
      { type: "moveto", coord: start },
      { type: "lineto", coord: device(x + width, y) },
      { type: "lineto", coord: device(x + width, y + height) },
      { type: "lineto", coord: device(x, y + height) },
      { type: "closepath", coord: { x: start.x, y: start.y } },
    ];
    return { func: "fill", data: [[path], color, [], false] };
  });
}

/** Whether `message` strokes one rectangle subpath (moveto, three linetos, closepath). */
function strokesRectangle(message: RecordedMessage): boolean {
  if (!("func" in message) || message.func !== "stroke" || !("data" in message)) return false;
  const path = (message.data as unknown[])[0] as { type: string }[][];
  return (
    path.length === 1 &&
    (path[0] as { type: string }[]).map((s) => s.type).join(" ") ===
      "moveto lineto lineto lineto closepath"
  );
}

/**
 * The fixed recording; for BUG-112 programs without the strokes of
 * rectstroke, which the old worker never posted (its recordings stroke no
 * rectangle subpaths).
 */
function fixedRecording(file: string): Record<string, RecordedRun> {
  const fixed = JSON.parse(fs.readFileSync(recordingFile(file, true), "utf8")) as Record<
    string,
    RecordedRun
  >;
  if (!(FIXED[file] as string).split(" ").includes("BUG-112")) return fixed;
  return Object.fromEntries(
    Object.entries(fixed).map(([variant, run]) => [
      variant,
      { finished: run.finished, messages: run.messages.filter((m) => !strokesRectangle(m)) },
    ]),
  );
}

/** The old recording, with BUG-112's rectangles mapped in where the program has them. */
function oldRecording(file: string): Record<string, RecordedRun> {
  const old = JSON.parse(fs.readFileSync(recordingFile(file, false), "utf8")) as Record<
    string,
    RecordedRun
  >;
  if (!(FIXED[file] as string).split(" ").includes("BUG-112")) return old;
  return Object.fromEntries(
    Object.entries(old).map(([variant, run]) => [
      variant,
      { finished: run.finished, messages: withRectFills(run.messages) },
    ]),
  );
}

/** `value` with every moveto that starts an arc's subpath taken out (BUG-110). */
function withoutArcMoveto(value: unknown): unknown {
  if (Array.isArray(value)) {
    const items = value.map(withoutArcMoveto);
    const [first, second] = value as { type?: string }[];
    return first?.type === "moveto" && (second?.type === "arc" || second?.type === "arcn")
      ? items.slice(1)
      : items;
  }
  if (value && typeof value == "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, withoutArcMoveto(v)]));
  }
  return value;
}

function recordingFile(file: string, fixed: boolean): string {
  return path.join(RECORDED, file.replace(/\.[^.]+$/, fixed ? ".fixed.json" : ".json"));
}

const programs = fs
  .readdirSync(CORPUS)
  .filter((f) => /\.(e?ps|ai)$/.test(f))
  .sort();

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("PostScript interpreter against the old worker's recordings", () => {
  it("has a recording for every program", () => {
    for (const file of programs) {
      expect(fs.existsSync(path.join(RECORDED, file.replace(/\.[^.]+$/, ".json"))), file).toBe(
        true,
      );
    }
  });

  it.each(fixedBy("BUG-008"))(
    "%s: the fixed recording differs from the old one only in its jpeg calls",
    (file) => {
      const old = JSON.parse(fs.readFileSync(recordingFile(file, false), "utf8")) as Record<
        string,
        RecordedRun
      >;
      const fixed = JSON.parse(fs.readFileSync(recordingFile(file, true), "utf8")) as Record<
        string,
        RecordedRun
      >;
      const withoutJpeg = (run: RecordedRun | undefined) => ({
        finished: run?.finished,
        messages: run?.messages.filter((m) => !("func" in m) || m.func !== "jpeg"),
      });
      expect(Object.keys(fixed).sort()).toEqual(Object.keys(old).sort());
      for (const variant of Object.keys(old)) {
        expect(withoutJpeg(fixed[variant]), variant).toEqual(withoutJpeg(old[variant]));
      }
      // Without SharedArrayBuffer nothing changes.
      expect(fixed["outline-nosab"]).toEqual(old["outline-nosab"]);
    },
  );

  it.each(fixedBy("BUG-109"))(
    "%s: the fixed recording ends with error 04 and done where the old worker threw",
    (file) => {
      const old = oldRecording(file);
      const fixed = fixedRecording(file);
      expect(Object.keys(fixed).sort()).toEqual(Object.keys(old).sort());
      let threw = false;
      for (const variant of Object.keys(old)) {
        const before = (old[variant] as RecordedRun).messages;
        const after = (fixed[variant] as RecordedRun).messages;
        const at = before.findIndex((m) => "exception" in m);
        if (at < 0) {
          expect(after, variant).toEqual(before);
          continue;
        }
        threw = true;
        expect(at, variant).toBe(before.length - 1);
        expect(after.slice(0, at), variant).toEqual(before.slice(0, at));
        expect(after.slice(at), variant).toEqual([
          { func: "error", data: ["04"] },
          { func: "done", data: [] },
        ]);
        expect(fixed[variant]?.finished, variant).toBe(true);
      }
      expect(threw).toBe(true);
    },
  );

  it.each([...fixedBy("BUG-110"), ...fixedBy("BUG-109 BUG-110")])(
    "%s: the fixed recording differs from the old one only by the moveto before an arc",
    (file) => {
      const old = oldRecording(file);
      const fixed = fixedRecording(file);
      expect(Object.keys(fixed).sort()).toEqual(Object.keys(old).sort());
      for (const variant of Object.keys(old)) {
        const before = (old[variant] as RecordedRun).messages;
        const after = withoutArcMoveto(
          (fixed[variant] as RecordedRun).messages,
        ) as RecordedMessage[];
        expect(after, variant).not.toEqual((fixed[variant] as RecordedRun).messages);
        const at = before.findIndex((m) => "exception" in m);
        if (at < 0) {
          expect(after, variant).toEqual(before);
          continue;
        }
        // The old run threw at the closepath; the fixed one reads on to the end.
        expect(after.slice(0, at), variant).toEqual(before.slice(0, at));
        expect(after[after.length - 1], variant).toEqual({ func: "done", data: [] });
        expect(after.slice(at), variant).not.toContainEqual({ func: "error", data: ["04"] });
      }
    },
  );

  it.each(fixedBy("BUG-109 BUG-111"))(
    "%s: the fixed recording equals the old one up to the atan, then runs to the end",
    (file) => {
      const old = oldRecording(file);
      const fixed = fixedRecording(file);
      for (const variant of Object.keys(old)) {
        const before = (old[variant] as RecordedRun).messages;
        const after = (fixed[variant] as RecordedRun).messages;
        const at = before.findIndex((m) => "exception" in m);
        // The old run threw at its first atan.
        expect(before[at], variant).toEqual({ exception: "this.radianToDegree is not a function" });
        expect(after.slice(0, at), variant).toEqual(before.slice(0, at));
        // The run goes on with the atan's result instead of error "04".
        expect(after.length, variant).toBeGreaterThan(at + 2);
        expect(after[at], variant).not.toEqual({ func: "error", data: ["04"] });
        expect(after[after.length - 1], variant).toEqual({ func: "done", data: [] });
      }
    },
  );

  it.each(fixedBy(""))(
    "%s: the fixed recording fills a rectangle path where the old one posted rectfill",
    (file) => {
      const raw = JSON.parse(fs.readFileSync(recordingFile(file, false), "utf8")) as Record<
        string,
        RecordedRun
      >;
      const fixed = fixedRecording(file);
      const old = oldRecording(file);
      for (const variant of Object.keys(raw)) {
        expect(raw[variant]?.messages, variant).toContainEqual(
          expect.objectContaining({ func: "rectfill" }),
        );
        expect(fixed[variant], variant).toEqual(old[variant]);
      }
    },
  );

  /** `messages` with the width and dash pattern of every stroke left out. */
  const withoutStrokeScale = (messages: RecordedMessage[]) =>
    messages.map((m) => {
      if (!("func" in m) || m.func !== "stroke" || !("data" in m)) return m;
      const data = (m.data as unknown[]).slice();
      data[2] = data[8] = null;
      return { func: m.func, data };
    });

  it.each(fixedBy("BUG-117"))(
    "%s: the fixed recording differs from the old one only in stroke widths and dashes",
    (file) => {
      const old = oldRecording(file);
      const fixed = fixedRecording(file);
      for (const variant of Object.keys(old)) {
        const before = (old[variant] as RecordedRun).messages;
        const after = (fixed[variant] as RecordedRun).messages;
        expect(after, variant).not.toEqual(before);
        expect(withoutStrokeScale(after), variant).toEqual(withoutStrokeScale(before));
      }
    },
  );

  /** A message that draws a mesh: a shfill, or a fill compacted for its mesh image. */
  const drawsMesh = (m: RecordedMessage | undefined) =>
    !!m && "func" in m && (m.func === "shfill" || (m.func === "fill" && "digest" in m));

  it.each([...fixedBy("BUG-109 BUG-116"), ...fixedBy("BUG-116")])(
    "%s: the fixed recording draws the mesh where the old one threw or drew an empty image",
    (file) => {
      const old = oldRecording(file);
      const fixed = fixedRecording(file);
      expect(Object.keys(fixed).sort()).toEqual(Object.keys(old).sort());
      for (const variant of Object.keys(old)) {
        const before = (old[variant] as RecordedRun).messages;
        const after = (fixed[variant] as RecordedRun).messages;
        expect(after, variant).not.toEqual(before);
        const at = before.findIndex((m) => "exception" in m);
        if (at < 0) {
          // Only the image of the shfill differs.
          const others = (messages: RecordedMessage[]) => messages.filter((m) => !drawsMesh(m));
          expect(others(after), variant).toEqual(others(before));
          continue;
        }
        // The old run threw at the mesh; the fixed one draws it and reads on.
        expect(after.slice(0, at), variant).toEqual(before.slice(0, at));
        expect(drawsMesh(after[at]), variant).toBe(true);
        expect(after[after.length - 1], variant).toEqual({ func: "done", data: [] });
        expect(after, variant).not.toContainEqual({ func: "error", data: ["04"] });
      }
    },
  );

  for (const file of programs) {
    for (const [variant, options] of Object.entries(VARIANTS)) {
      it(`${file} (${variant})`, () => {
        const recorded = JSON.parse(
          fs.readFileSync(recordingFile(file, file in FIXED), "utf8"),
        ) as Record<string, RecordedRun>;
        const expected = recorded[variant];
        expect(expected, "recorded variant").toBeDefined();
        if (!options.sab) {
          vi.stubGlobal("SharedArrayBuffer", undefined);
          vi.stubGlobal("Atomics", undefined);
        }
        const input = new Uint8Array(fs.readFileSync(path.join(CORPUS, file)));
        const actual = runInterpreter(input, { outlineFonts: options.outlineFonts });
        expect(normalize(actual)).toEqual(normalize(expected as RecordedRun));
      });
    }
  }
});
