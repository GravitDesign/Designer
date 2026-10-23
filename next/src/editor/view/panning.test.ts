import { describe, expect, it } from "vitest";
import { GObject } from "../../engine/core/object.ts";
import { Point } from "../../engine/math/point.ts";
import { Rect } from "../../engine/math/rect.ts";
import { EditorOptions } from "../editor-options.ts";
import { Panning, type PanningView } from "./panning.ts";

/** A view whose box is (100, 50) 400 x 300 and that records its scrolls. */
function fakeView(): PanningView & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    beginPan: (parameters) => calls.push("beginPan " + JSON.stringify(parameters)),
    finishPan: () => calls.push("finishPan"),
    scrollBy: (dx, dy) => {
      calls.push("scrollBy " + dx + "," + dy);
      return new Point(dx, dy);
    },
    getViewBox: () => new Rect(100, 50, 400, 300),
  };
}

class PanningTool extends Panning(GObject) {}

function tool(): PanningTool & { _view: ReturnType<typeof fakeView> } {
  const panning = new PanningTool() as PanningTool & { _view: ReturnType<typeof fakeView> };
  panning._view = fakeView();
  return panning;
}

describe("Panning", () => {
  it("scrolls one step towards the edge the pointer is past", () => {
    const panning = tool();
    panning.beginPan();
    const step = EditorOptions.autoPanStep as number;
    panning.panView(new Point(600, 200));
    panning.panView(new Point(90, 40));
    panning.panView(new Point(300, 200));
    expect(panning._view.calls).toEqual([
      'beginPan {"quickRender":false,"noWebGL":false}',
      "scrollBy " + step + ",0",
      "scrollBy " + -step + "," + -step,
    ]);
    expect(panning.getLastPanMovement()).toBeNull();
  });

  it("takes the larger of the given step and autoPanStep, and a margin from the far edges", () => {
    const panning = tool();
    panning.beginPan();
    // 480 is inside the box but within 30 px of its right edge.
    panning.panView(new Point(480, 200), new Point(-12, 1), new Point(30, 0));
    expect(panning._view.calls[1]).toBe("scrollBy 12,0");
    expect(panning._calculateInvalidationPanAreaForRect(new Rect(0, 0, 10, 10), 1).getWidth()).toBe(
      36,
    );
  });

  it("maps the drag start point into the scrolled view", () => {
    const panning = tool();
    panning.beginPan();
    panning.panView(new Point(600, 200));
    panning.panView(new Point(600, 200));
    const step = EditorOptions.autoPanStep as number;
    const start = panning.getTranslatedPanStartPoint();
    expect([start.getX(), start.getY()]).toEqual([600 - 2 * step, 200]);
    panning.endPan();
    panning.endPan();
    expect(panning._view.calls.filter((call) => call === "finishPan")).toHaveLength(1);
  });
});
