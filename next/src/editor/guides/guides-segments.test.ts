// Snap line splitting and painting of GGuides against the old app:
// guides-segments.fixture.json was recorded from chunk.vendor.js module
// 210 (with module 540 as the distance helper) on the same inputs. It
// covers finishMap's srcBounds splitting (neighbours before and after,
// source past either line end, no bounds), the value labels, the page
// offsets, a one-point line whose null bounds coerce to 0, and mapRect's
// second pass that stretches a snap line past its end markers; then the
// paint calls for free segments (outline colour or freeSegmentsColor),
// value segments with their hints, point pairs and markers.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { Point } from "../../engine/math/point.ts";
import { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import type { PaintContext } from "../../engine/paint/paint-context.ts";
import { installFakeCanvas } from "../../engine/paint/testing/fake-canvas.ts";
import type { Page } from "../../engine/scene/page.ts";
import type { Scene } from "../../engine/scene/scene.ts";
import { Scene as RealScene } from "../../engine/scene/scene.ts";
import { Workspace } from "../../engine/scene/workspace.ts";
import { DistanceHelper, type DistanceHelperView } from "./distance-helper.ts";
import type { Guide, GuideLine, GuideMapResult, GuidePoint, GuideShape } from "./guide.ts";
import { Guides, type GuidesView } from "./guides.ts";
import fixture from "./guides-segments.fixture.json";

type XY = [number, number];
type MarkerInput = { pt: XY; annot: string; size: number };
type PointInput = XY | MarkerInput;

interface VisualInput {
  orient?: number;
  line?: PointInput[];
  pair?: PointInput[];
  bounds?: number[][];
  srcBounds?: number[];
  freeSegments?: number[][];
  freeSegmentsColor?: number[];
  onPage?: boolean;
}

interface FinishInput {
  name: string;
  page?: XY;
  multi?: boolean;
  zoom?: number;
  noHelper?: boolean;
  visuals: VisualInput[];
}

interface Recorded {
  name: string;
  visuals?: unknown[];
  afterMap?: unknown[];
  afterFinish?: unknown[];
  mapped?: number[];
  areas: number[][];
  paint: unknown[][];
}

const finishInputs = fixture.inputs.finish as FinishInput[];
const mapRectInputs = fixture.inputs.mapRect as { name: string; rect: number[] }[];
const finishRecorded = fixture.finish as Recorded[];
const mapRectRecorded = fixture.mapRect as Recorded[];

/** A page stand-in that only knows its position (0,0 outside the multi-page view). */
interface FakePage {
  getPosition(multiPage: boolean): Point;
  position: XY;
}

function fakePage(position: XY): FakePage {
  return {
    getPosition: (multiPage) => (multiPage ? new Point(...position) : new Point(0, 0)),
    position,
  };
}

let uninstallCanvas: () => void;
beforeEach(() => {
  uninstallCanvas = installFakeCanvas();
});
const savedGuideIds = Guides.options.guides;
afterEach(() => {
  uninstallCanvas();
  Guides.options.guides = savedGuideIds;
});

/** Guides on a fake scene with the view and distance helper the recorder used. */
function makeGuides(c: { zoom?: number; multi?: boolean; noHelper?: boolean }): {
  guides: Guides;
  areas: number[][];
} {
  const active = fakePage([0, 0]);
  const scene = { getActivePage: () => active } as unknown as Scene;
  const guides = new Guides(scene);
  const zoom = c.zoom ?? 1;
  let helper: DistanceHelper | null = null;
  if (!c.noHelper) {
    helper = new DistanceHelper(new RealScene(new Workspace()));
    helper.setView({ getZoom: () => zoom } as DistanceHelperView);
  }
  const view: GuidesView = {
    getScene: () => scene,
    getZoom: () => zoom,
    getLogicalZoom: () => zoom,
    getViewConfiguration: () => ({ multiPageView: !!c.multi }),
    getEditor: () => ({ getDistanceHelper: () => helper }),
  };
  guides._view = view;
  const areas: number[][] = [];
  guides.addEventListener(Guides.InvalidationRequestEvent, (event) => {
    const area = (event as InstanceType<typeof Guides.InvalidationRequestEvent>).area as Rect;
    areas.push([area.getX(), area.getY(), area.getWidth(), area.getHeight()]);
  });
  return { guides, areas };
}

function guidePoint(input: PointInput): GuidePoint {
  return Array.isArray(input)
    ? new Point(...input)
    : { pt: new Point(...input.pt), annot: input.annot, size: input.size };
}

function plainPoint(entry: GuidePoint): unknown {
  return entry instanceof Point
    ? [entry.getX(), entry.getY()]
    : { pt: [entry.pt.getX(), entry.pt.getY()], annot: entry.annot, size: entry.size };
}

/** A visual in the recorder's form. */
function serialize(entry: { guide: GuideShape; page: Page | null }): unknown {
  const page = entry.page ? (entry.page as unknown as FakePage).position : null;
  if (entry.guide instanceof Array) return { pair: entry.guide.map(plainPoint), page };
  const guide = entry.guide as GuideLine;
  const out: Record<string, unknown> = {
    line: guide.line ? (guide.line as GuidePoint[]).map(plainPoint) : null,
    orient: guide.orient,
    page,
  };
  if (out.orient === undefined) delete out.orient;
  if (guide.bounds) out.bounds = guide.bounds;
  if (guide.srcBounds) out.srcBounds = guide.srcBounds;
  if (guide.freeSegments) out.freeSegments = guide.freeSegments;
  if (guide.valueSegments) {
    out.valueSegments = (
      guide.valueSegments as {
        bounds: number[];
        value?: number;
        valuePt?: Point;
        valueDir?: number;
      }[]
    ).map((segment) => {
      const value: Record<string, unknown> = { bounds: segment.bounds };
      if (segment.value !== undefined) value.value = segment.value;
      if (segment.valuePt) value.valuePt = [segment.valuePt.getX(), segment.valuePt.getY()];
      if (segment.valueDir !== undefined) value.valueDir = segment.valueDir;
      return value;
    });
  }
  return out;
}

/** Paints with a recording canvas at scale 2, offset (10, 20), as the recorder did. */
function paintLog(guides: Guides, multiPage: boolean): unknown[][] {
  const log: unknown[][] = [];
  const canvas = {
    strokeLine: (...args: unknown[]) =>
      log.push(["strokeLine", ...args.slice(0, 5), (args[5] as RGBColor).toScreenCSS(), args[6]]),
    putAuxilliaryText: (...args: unknown[]) => log.push(["putAuxilliaryText", ...args]),
    drawImage: (image: { width: number; height: number }, ...args: unknown[]) =>
      log.push(["drawImage", image.width, image.height, ...args]),
  };
  const context = { canvas, configuration: { multiPageView: multiPage } };
  guides.paint(new Transform(2, 0, 0, 2, 10, 20), context as unknown as PaintContext);
  return log;
}

describe("Guides.finishMap and paint match the recorded old module 210", () => {
  for (const [index, c] of finishInputs.entries()) {
    it(c.name, () => {
      const recorded = finishRecorded[index] as Recorded;
      expect(recorded.name).toBe(c.name);
      const { guides, areas } = makeGuides(c);
      const page = c.page ? (fakePage(c.page) as unknown as Page) : null;
      guides._counter = 1;
      guides._visuals = c.visuals.map((v) => {
        const visualPage = v.onPage === false ? null : page;
        if (v.pair) return { guide: v.pair.map(guidePoint), page: visualPage };
        const guide: GuideLine = { line: (v.line as PointInput[]).map(guidePoint) as Point[] };
        if (v.orient !== undefined) guide.orient = v.orient;
        if (v.bounds) guide.bounds = v.bounds;
        if (v.srcBounds) guide.srcBounds = v.srcBounds;
        if (v.freeSegments) guide.freeSegments = v.freeSegments;
        if (v.freeSegmentsColor) guide.freeSegmentsColor = new RGBColor(v.freeSegmentsColor);
        return { guide, page: visualPage };
      });
      guides.finishMap();
      expect(guides._visuals.map(serialize)).toEqual(recorded.visuals);
      expect(areas).toEqual(recorded.areas);
      expect(paintLog(guides, !!c.multi)).toEqual(recorded.paint);
      expect(guides._visuals).toEqual([]);
    });
  }
});

/** The methods of a guide mapRect calls, all permissive. */
function fakeGuide(
  id: string,
  map: (x: number, y: number, distance: number) => GuideMapResult | null,
): Guide {
  return {
    getId: () => id,
    map: (x: number, y: number, _useMargin: boolean, distance: number) => map(x, y, distance),
    isMappingAllowed: () => true,
    canMapWithFullPixelsGuide: () => true,
    snapZoneIsAllowed: () => true,
    isRelativeToPage: () => false,
    isScopeSupported: () => false,
    setScope: () => {},
    isVisual: () => false,
    isFullPixelsGuide: () => id === "fakeFullPixels",
    mapTopLeftOnly: () => false,
    useExclusions: () => {},
    cleanExclusions: () => {},
  } as unknown as Guide;
}

describe("Guides.mapRect snap lines match the recorded old module 210", () => {
  for (const [index, c] of mapRectInputs.entries()) {
    it(c.name, () => {
      const recorded = mapRectRecorded[index] as Recorded;
      expect(recorded.name).toBe(c.name);
      const { guides, areas } = makeGuides({});
      // Snaps x to 50; the line has markers at y 30 and 60 that the second
      // pass replaces with plain points when the rect reaches past them.
      guides.addGuide(
        fakeGuide("fakeX", (x, _y, distance) => {
          const delta = Math.abs(x - 50);
          if (delta > distance) return null;
          const line = [
            { pt: new Point(50, 30), annot: "circle", size: 6 },
            { pt: new Point(50, 60), annot: "rect", size: 6 },
          ] as unknown as Point[];
          return {
            x: {
              value: 50,
              delta,
              guide: {
                line,
                bounds: [
                  [0, 10],
                  [200, 220],
                ],
              },
            },
          } as GuideMapResult;
        }),
      );
      // Snaps y to 200 with a guide that is a pair of points.
      guides.addGuide(
        fakeGuide("fakeY", (_x, y, distance) => {
          const delta = Math.abs(y - 200);
          if (delta > distance) return null;
          return {
            y: { value: 200, delta, guide: [new Point(100, 200), new Point(130, 200)] },
          } as GuideMapResult;
        }),
      );
      guides._fullPixelsGuide = fakeGuide("fakeFullPixels", () => null);
      Guides.options.guides = ["fakeX", "fakeY"];
      guides.beginMap(null);
      const [x, y, w, h] = c.rect as [number, number, number, number];
      const mapped = guides.mapRect(new Rect(x, y, w, h));
      expect([mapped.getX(), mapped.getY(), mapped.getWidth(), mapped.getHeight()]).toEqual(
        recorded.mapped,
      );
      expect(guides._visuals.map(serialize)).toEqual(recorded.afterMap);
      guides.finishMap();
      expect(guides._visuals.map(serialize)).toEqual(recorded.afterFinish);
      expect(areas).toEqual(recorded.areas);
      expect(paintLog(guides, false)).toEqual(recorded.paint);
    });
  }
});
