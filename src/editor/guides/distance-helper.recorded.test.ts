// DistanceHelper against outputs recorded from the old app: old module 540
// (GDistanceHelper) ran refreshVisuals and correctValuePoint on the same
// rects and views (distance-helper.fixture.json). The rect pairs cover
// every sign combination of the four side distances, both ways round, so
// each crossing and corner case of _measureCrossing / _measureCorners runs;
// the small and slide views put labels off screen so they clamp, slide
// along their bounds, flip direction or get dropped.
import { describe, expect, it } from "vitest";
import { Point } from "../../engine/math/point.ts";
import { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import { Scene } from "../../engine/scene/scene.ts";
import { Workspace } from "../../engine/scene/workspace.ts";
import { DistanceHelper, type DistanceHelperView } from "./distance-helper.ts";
import fixture from "./distance-helper.fixture.json";

type Box = [number, number, number, number];

interface RecordedView {
  visible: number[];
  zoom: number;
  tx: number;
  ty: number;
}

interface RefreshCase {
  view: string;
  base: number[];
  target: number[];
  keepBase?: boolean;
  keepTarget?: boolean;
  visuals: (number | null)[][];
  areas: number[][];
}

interface CorrectCase {
  view: string;
  value: number;
  labelPoint: number[];
  line: number[];
  dir: number;
  low: number | null;
  high: number | null;
  optional: boolean;
  valuePt: number[] | null;
  valueDir: number | null;
  outLine: number[] | null;
}

const views = fixture.views as Record<string, RecordedView>;
const refreshCases = fixture.refresh as RefreshCase[];
const correctCases = fixture.correct as CorrectCase[];

function view(name: string): DistanceHelperView {
  const v = views[name] as RecordedView;
  const [x, y, w, h] = v.visible as Box;
  return {
    getZoom: () => v.zoom,
    getViewConfiguration: () => ({ multiPageView: false }),
    getViewVisibleArea: () => new Rect(x, y, w, h),
    getWorldTransform: () => new Transform(v.zoom, 0, 0, v.zoom, v.tx, v.ty),
    getViewTransform: () =>
      new Transform(1 / v.zoom, 0, 0, 1 / v.zoom, -v.tx / v.zoom, -v.ty / v.zoom),
  };
}

function helper(viewName: string): DistanceHelper {
  const h = new DistanceHelper(new Scene(new Workspace()));
  h.setView(view(viewName));
  return h;
}

const toRect = (a: number[]): Rect => new Rect(...(a as Box));
const flatRect = (r: Rect): number[] => [r.getX(), r.getY(), r.getWidth(), r.getHeight()];

/** A visual in the fixture's flat form (see its "format"). */
function flatVisual(h: DistanceHelper, index: number): (number | null)[] {
  const v = (h._visuals ?? [])[index];
  if (!v) return [];
  const line = v.line ?? [null, null];
  const coords = line.flatMap((p) => (p ? [p.getX(), p.getY()] : [null, null]));
  return [
    ...coords,
    v.value ?? null,
    v.valueBoxView ? v.valueBoxView.getWidth() : null,
    v.valueBoxView ? v.valueBoxView.getHeight() : null,
    v.valuePt ? v.valuePt.getX() : null,
    v.valuePt ? v.valuePt.getY() : null,
    v.valueDir ?? null,
  ];
}

function caseName(c: RefreshCase): string {
  return `${c.view}: base ${c.base.join(",")} target ${c.target.join(",")}`;
}

/** The sign (-1, 0, 1) of each side distance, as the old code branches on them. */
function distanceSigns(c: RefreshCase): [number, number, number, number] {
  const offset = toRect(c.base).getXYOffset(toRect(c.target), true, true, true);
  return [
    Math.sign(offset.leftDist as number),
    Math.sign(offset.topDist as number),
    Math.sign(offset.rightDist as number),
    Math.sign(offset.bottomDist as number),
  ];
}

describe("DistanceHelper matches the recorded old module 540", () => {
  it("was recorded with the same label metrics and unit formatting", () => {
    expect([DistanceHelper.VALUE_MARGIN, DistanceHelper.FONT_SIZE]).toEqual([
      fixture.valueMargin,
      fixture.fontSize,
    ]);
    const scene = new Scene(new Workspace());
    expect([12.5, 20, 1 / 3].map((value) => scene.pointToString(value, 1))).toEqual(
      fixture.unitSample,
    );
  });

  it("covers every crossing and corner case", () => {
    // The flags of _measureCrossing (6) and _measureCorners (8) as sign
    // patterns of left, top, right, bottom distance (0 matches both
    // sides for the corner flags). Each must occur in a recorded case.
    const crossing = [
      [-1, -1, -1, -1],
      [1, 1, 1, 1],
      [1, -1, 1, -1],
      [-1, 1, -1, 1],
      [-1, 1, 1, -1],
      [1, -1, -1, 1],
    ];
    const corners = [
      [1, 1, 1, -1],
      [-1, -1, -1, 1],
      [1, 1, -1, 1],
      [-1, -1, 1, -1],
      [-1, 1, -1, -1],
      [1, -1, 1, 1],
      [1, -1, -1, -1],
      [-1, 1, 1, 1],
    ];
    const signs = refreshCases.filter((c) => c.view === "wide").map(distanceSigns);
    for (const pattern of crossing) {
      expect(signs.some((s) => s.every((v, i) => v === pattern[i]))).toBe(true);
    }
    for (const pattern of corners) {
      // A corner case has at least one zero distance; the others match the flag's signs.
      const hit = signs.some(
        (s) => s.includes(0) && s.every((v, i) => v === 0 || v === pattern[i]),
      );
      expect(hit).toBe(true);
    }
  });

  for (const c of refreshCases) {
    it(`refreshVisuals ${caseName(c)}`, () => {
      const h = helper(c.view);
      const areas: number[][] = [];
      h.addEventListener(DistanceHelper.InvalidationRequestEvent, (event) => {
        const area = (event as InstanceType<typeof DistanceHelper.InvalidationRequestEvent>).area;
        areas.push(flatRect(area as Rect));
      });
      h.activateMeasurement();
      h.refreshVisuals(toRect(c.base), toRect(c.target), !!c.keepBase, !!c.keepTarget);
      const count = (h._visuals ?? []).length;
      expect(Array.from({ length: count }, (_, i) => flatVisual(h, i))).toEqual(c.visuals);
      expect(areas).toEqual(c.areas);
    });
  }

  it("slides off-screen labels along their bounds and flips them on both axes", () => {
    // Guards that the slide cases still exercise what they are meant to.
    // The measured lines of the tall and wide rect pairs run through
    // x or y 500, the middle of the rects; a slid line has moved off it
    // to the middle of the visible part. Below and right of the label the
    // direction flips (Up to Down, Left to Right), above and left it stays.
    const slidDirections = (viewName: string): number[] =>
      refreshCases
        .filter((c) => c.view === viewName && c.base[2] !== c.base[3])
        .flatMap((c) =>
          c.visuals
            .filter((v) => (v[0] === v[2] ? v[0] !== 500 : v[1] !== 500))
            .map((v) => v[9] as number),
        );
    expect(slidDirections("below")).toEqual([2, 2]);
    expect(slidDirections("above")).toEqual([1, 1]);
    expect(slidDirections("right")).toEqual([4, 4]);
    expect(slidDirections("left")).toEqual([3, 3]);
  });

  for (const [index, c] of correctCases.entries()) {
    it(`correctValuePoint #${index} (${c.view}, dir ${c.dir}, at ${c.labelPoint.join(",")})`, () => {
      const h = helper(c.view);
      const [x0, y0, x1, y1] = c.line as Box;
      const result = h.correctValuePoint(
        new Point(c.labelPoint[0] as number, c.labelPoint[1] as number),
        h.getValueBoxView(c.value),
        [new Point(x0, y0), new Point(x1, y1)],
        c.dir,
        c.low,
        c.high,
        c.optional,
      );
      expect({
        valuePt: result.valuePt ? [result.valuePt.getX(), result.valuePt.getY()] : null,
        valueDir: result.valueDir,
        outLine: result.line ? result.line.flatMap((p) => [p.getX(), p.getY()]) : null,
      }).toEqual({ valuePt: c.valuePt, valueDir: c.valueDir, outLine: c.outLine });
    });
  }
});
