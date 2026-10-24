import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runInterpreter, type RecordedMessage } from "./test-support.ts";

const CORPUS = path.join(import.meta.dirname, "__fixtures__", "corpus");

/** A corpus program with `edit` applied to its text. */
function program(name: string, edit: (text: string) => string): Uint8Array {
  return new TextEncoder().encode(edit(fs.readFileSync(path.join(CORPUS, name), "latin1")));
}

const painted = (messages: RecordedMessage[]) =>
  messages.filter((m) => "func" in m && (m.func === "fill" || m.func === "stroke"));

describe("outlined text (BUG-114)", () => {
  it("strokes a font with PaintType 2 and no lowercase paintType", () => {
    // The corpus font also defines the misspelt key the old code read.
    const input = program("font-type1-stroked.ps", (t) => t.replace(" /paintType 2 def", ""));
    const run = runInterpreter(input, { outlineFonts: true });
    expect(painted(run.messages).map((m) => ("func" in m ? m.func : ""))).toEqual(["stroke"]);
  });

  it("advances charpath from glyph to glyph and leaves the point after the text", () => {
    const input = program("show-outlined-charpath-true.ps", (t) =>
      t.replace("true charpath fill", "true charpath currentpoint 1 1 rectfill fill"),
    );
    const run = runInterpreter(input, { outlineFonts: true });
    const [point, fill] = painted(run.messages) as { data: unknown[] }[];
    const segments = (fill?.data[0] as { type: string; coord: { x: number } }[][]).flat();
    const starts = segments.filter((seg) => seg.type === "moveto").map((seg) => seg.coord.x);
    // The second glyph starts right of the first one's origin.
    expect(Math.max(...starts)).toBeGreaterThan(Math.min(...starts) + 5);
    // The current point after charpath is right of where the text started.
    const corner = (point?.data[0] as { coord: { x: number } }[][])[0]?.[0]?.coord.x as number;
    expect(corner).toBeGreaterThan(Math.max(...starts));
  });
});
