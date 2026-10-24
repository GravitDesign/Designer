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

/** Programs with a `.fixed.json` recording, and the BUGS-FIXED.md entry that explains it. */
const FIXED: Record<string, string> = {
  // The JPEG handshake asks for the size, then for the RGBA pixels.
  "filter-dct-file.ps": "BUG-008",
  "fixture-image-dct.eps": "BUG-008",
  // An exception ends the run with error "04" and done.
  "basic-atan.ps": "BUG-109",
  "basic-cos-typecheck.ps": "BUG-109",
  "basic-cvr-bool.ps": "BUG-109",
  "basic-cvrs-radix0.ps": "BUG-109",
  "basic-eexec-file.ps": "BUG-109",
  "basic-errordict-number-handler.ps": "BUG-109",
  "basic-internaldict-error.ps": "BUG-109",
  "basic-loops.ps": "BUG-109",
  "color-fn-procedure.ps": "BUG-109",
  "color-image-cie-repeat.ps": "BUG-109",
  "color-separation-function-dict.ps": "BUG-109",
  "color-sh-pattern-mesh.ps": "BUG-109",
  "color-sh4-cmyk.ps": "BUG-109",
  "color-sh4-flag3.ps": "BUG-109",
  "color-sh4-function.ps": "BUG-109",
  "color-sh4-gray.ps": "BUG-109",
  "color-sh4-rgb.ps": "BUG-109",
  "color-sh4-scaled-ctm.ps": "BUG-109",
  "color-sh4-small-bits.ps": "BUG-109",
  "color-sh4-truncated.ps": "BUG-109",
  "color-sh5-gray-2rows.ps": "BUG-109",
  "color-sh5-lattice.ps": "BUG-109",
  "color-sh6-function.ps": "BUG-109",
  "filter-ascii85-string.ps": "BUG-109",
  "filter-dct-read.ps": "BUG-109",
  "filter-lzw.ps": "BUG-109",
  "filter-reusable-file.ps": "BUG-109",
  "filters.ps": "BUG-109",
  "fixture-arc-closepath.eps": "BUG-109",
  "fixture-shapes-ps.ps": "BUG-109",
  "font-type1-missing-subr.ps": "BUG-109",
  "gfx-closepath-arc.ps": "BUG-109",
  "gfx-curves.ps": "BUG-109",
  "gfx-image-errors.ps": "BUG-109",
  "gfx-image-ps-operands.ps": "BUG-109",
  "gfx-imagemask-ps-operands.ps": "BUG-109",
  "gfx-imagemask.ps": "BUG-109",
  "gfx-lineto-nopath.ps": "BUG-109",
  "gfx-resourceforall-typecheck.ps": "BUG-109",
  "gfx-rlineto-nopath.ps": "BUG-109",
  "images.eps": "BUG-109",
  "math-stack.ps": "BUG-109",
  "shadings.eps": "BUG-109",
};

/** The programs whose fixed recording comes from `bug` alone. */
const fixedBy = (bug: string): string[] => Object.keys(FIXED).filter((f) => FIXED[f] === bug);

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
      const old = JSON.parse(fs.readFileSync(recordingFile(file, false), "utf8")) as Record<
        string,
        RecordedRun
      >;
      const fixed = JSON.parse(fs.readFileSync(recordingFile(file, true), "utf8")) as Record<
        string,
        RecordedRun
      >;
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
