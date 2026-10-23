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
};

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

  it.each(Object.keys(FIXED))(
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
