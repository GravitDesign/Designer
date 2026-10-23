// Runs every program in __fixtures__/corpus through the interpreter and
// compares the messages it posts with what the old worker (public/ps*.js)
// posted for the same program, recorded in __fixtures__/recorded. Each
// program runs with outlined fonts, with plain text, and without
// SharedArrayBuffer (where JPEG decoding reports error "02").
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

  for (const file of programs) {
    for (const [variant, options] of Object.entries(VARIANTS)) {
      it(`${file} (${variant})`, () => {
        const recorded = JSON.parse(
          fs.readFileSync(path.join(RECORDED, file.replace(/\.[^.]+$/, ".json")), "utf8"),
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
