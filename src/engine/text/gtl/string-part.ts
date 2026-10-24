// Old: chunk.vendor.js module 922 (GTLCodes.String: an inline code drawn as text).
import type { Run } from "./formatting.ts";
import type { CodeMeasurement, TextCode } from "./inline.ts";
import { RunDraw, type RunDrawContext } from "./run-draw.ts";

/** An inline code that shows a string in the run's formatting (list numbers). */
export class StringCode implements TextCode {
  value: string | null = null;
  obj: unknown = null;

  constructor(obj: unknown, value: string) {
    this.value = value;
    this.obj = obj;
  }

  measure(run: Run): CodeMeasurement | null {
    return RunDraw.measure(this.value as string, run);
  }

  draw(
    context: RunDrawContext,
    x: number,
    y: number,
    width: number,
    ascent: number,
    descent: number,
    run: Run,
  ): void {
    RunDraw.draw(context, this.value as string, run, x, y, width, ascent, descent);
  }
}
