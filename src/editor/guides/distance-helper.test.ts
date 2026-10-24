import { describe, expect, it } from "vitest";
import { Point } from "../../engine/math/point.ts";
import { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import { Scene } from "../../engine/scene/scene.ts";
import { Workspace } from "../../engine/scene/workspace.ts";
import { DistanceHelper, type DistanceHelperView } from "./distance-helper.ts";

function view(visible = new Rect(-1000, -1000, 3000, 3000), zoom = 1): DistanceHelperView {
  return {
    getZoom: () => zoom,
    getViewConfiguration: () => ({ multiPageView: false }),
    getViewVisibleArea: () => visible,
    getWorldTransform: () => new Transform(zoom, 0, 0, zoom, 0, 0),
    getViewTransform: () => new Transform(1 / zoom, 0, 0, 1 / zoom, 0, 0),
  };
}

function helper(v: DistanceHelperView | null = view()): DistanceHelper {
  const h = new DistanceHelper(new Scene(new Workspace()));
  h.setView(v);
  return h;
}

/** The visuals as plain numbers. */
function visuals(h: DistanceHelper): unknown[] {
  return (h._visuals ?? []).map((v) => ({
    line: v.line ? v.line.map((p) => [p.getX(), p.getY()]) : null,
    value: v.value,
    dir: v.valueDir,
  }));
}

describe("DistanceHelper", () => {
  it("activates only with a view", () => {
    const h = helper(null);
    h.activateMeasurement();
    expect(h.isActivated()).toBe(false);
    const withView = helper();
    withView.activateMeasurement();
    expect(withView.isActivated()).toBe(true);
    withView.deactivateMeasurement();
    expect(withView.isActivated()).toBe(false);
  });

  it("sizes value boxes from the text length and places them by direction", () => {
    const h = helper(view(undefined, 2));
    const box = h.getValueBoxView(12.5);
    // "12.5" is four characters at FONT_SIZE 10 (screen DPI 1 in tests).
    expect([box.getWidth(), box.getHeight()]).toEqual([(10 / 1.2) * 4 + 3, 1.6 * 10 + 3]);
    const at = new Point(100, 100);
    const left = h.getValueBoxScene(box, at, DistanceHelper.ValueDirection.Left);
    expect(left.getX()).toBeCloseTo(100 - 2.5 - box.getWidth() / 2, 10);
    const down = h.getValueBoxScene(box, at, DistanceHelper.ValueDirection.Down);
    expect(down.getY()).toBe(102.5);
  });

  it("measures the gap between rects apart on x", () => {
    const h = helper();
    h.activateMeasurement();
    h.refreshVisuals(new Rect(0, 0, 10, 10), new Rect(30, 2, 10, 4));
    expect(visuals(h)).toEqual([
      {
        // At the base's vertical center, which lies within the overlap.
        line: [
          [30, 5],
          [10, 5],
        ],
        value: 20,
        dir: DistanceHelper.ValueDirection.Up,
      },
    ]);
  });

  it("measures both distances of rects apart on both axes", () => {
    const h = helper();
    h.activateMeasurement();
    h.refreshVisuals(new Rect(0, 0, 10, 10), new Rect(30, 40, 10, 10));
    const out = visuals(h) as { value?: number }[];
    expect(out.length).toBe(4);
    expect(out.map((v) => v.value)).toEqual([20, undefined, 30, undefined]);
  });

  it("measures the four sides of a rect inside another", () => {
    const h = helper();
    h.activateMeasurement();
    h.refreshVisuals(new Rect(0, 0, 100, 100), new Rect(10, 20, 30, 40));
    expect((visuals(h) as { value?: number }[]).map((v) => v.value)).toEqual([10, 20, 60, 40]);
  });

  it("invalidates the area of its lines and labels", () => {
    const h = helper();
    const areas: Rect[] = [];
    h.addEventListener(DistanceHelper.InvalidationRequestEvent, (event) => {
      areas.push(
        (event as InstanceType<typeof DistanceHelper.InvalidationRequestEvent>).area as Rect,
      );
    });
    h.activateMeasurement();
    h.refreshVisuals(new Rect(0, 0, 10, 10), new Rect(30, 2, 10, 4));
    expect(areas.length).toBe(1);
    const area = areas[0] as Rect;
    // The line from x 10 to 30 at y 5, padded by one, united with the label above it.
    expect(area.getX()).toBe(9);
    expect(area.getX() + area.getWidth()).toBe(31);
    expect(area.getY()).toBeLessThan(2 - 5);
  });

  it("drops an optional label that can't be placed in view", () => {
    const h = helper(view(new Rect(0, 0, 50, 50)));
    const box = h.getValueBoxView(5);
    const far = [new Point(500, 500), new Point(510, 500)];
    expect(
      h.correctValuePoint(
        new Point(505, 500),
        box,
        far,
        DistanceHelper.ValueDirection.Up,
        null,
        null,
        true,
      ),
    ).toEqual({ valuePt: null, valueDir: null, line: null });
    const kept = h.correctValuePoint(
      new Point(505, 500),
      box,
      far,
      DistanceHelper.ValueDirection.Up,
      null,
      null,
    );
    expect(kept.valuePt).toEqual(new Point(505, 500));
  });
});
