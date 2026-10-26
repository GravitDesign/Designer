import { describe, expect, it } from "vitest";
import { runInterpreter } from "./test-support.ts";

/** The width and dash pattern of a program's strokes. */
function strokes(program: string): unknown[][] {
  const run = runInterpreter(new TextEncoder().encode(program), { outlineFonts: true });
  return run.messages
    .filter((m) => "func" in m && m.func === "stroke")
    .map((m) => {
      const data = (m as { data: unknown[] }).data;
      return [data[2], data[8]];
    });
}

describe("stroke scales width and dashes by the CTM (BUG-117)", () => {
  it("scales the line width, the dash lengths and the phase", () => {
    expect(
      strokes(
        "%!PS\n2 2 scale 3 setlinewidth [4 2] 1 setdash newpath 0 0 moveto 10 0 lineto stroke\n",
      ),
    ).toEqual([[6, { arr: [8, 4], param: 2 }]]);
  });

  it("takes sqrt(|det|) of a CTM that scales x and y differently", () => {
    expect(
      strokes(
        "%!PS\n[4 0 0 1 0 0] concat 1.5 setlinewidth [1] 0 setdash 0 0 moveto 1 1 lineto stroke\n",
      ),
    ).toEqual([[3, { arr: [2], param: 0 }]]);
  });

  it("keeps width and dashes under the default CTM", () => {
    expect(
      strokes("%!PS\n4 setlinewidth [6 3] 0 setdash 0 0 moveto 10 10 lineto stroke\n"),
    ).toEqual([[4, { arr: [6, 3], param: 0 }]]);
  });
});
