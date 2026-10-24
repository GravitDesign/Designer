// Multi-page snapping (R6-A-023). Expected values worked out from the old
// code: chunk.vendor.js module 153 (GBBoxGuide.map, 32197-32345), module 741
// (GPointsGuide.map, 101378-101410), module 742 (GPageGuide.map,
// 101660-101708) and module 210 (GGuides: finishMap 40490-40600, the pivot
// mapping of mapRect 40733-40742, paint 40874-40925).
import { afterEach, describe, expect, it } from "vitest";
import { Point } from "../../engine/math/point.ts";
import { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import type { PaintContext } from "../../engine/paint/paint-context.ts";
import type { Page } from "../../engine/scene/page.ts";
import { AnchorPoint } from "../../engine/scene/path-base.ts";
import { Path } from "../../engine/scene/path.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import { Scene } from "../../engine/scene/scene.ts";
import { Workspace } from "../../engine/scene/workspace.ts";
import { EditorOptions } from "../editor-options.ts";
import { BBoxGuide } from "./bbox-guide.ts";
import { FullPixelsGuide } from "./full-pixels-guide.ts";
import type { GuideLine } from "./guide.ts";
import { Guides, type GuidesView } from "./guides.ts";
import { PageGuide } from "./page-guide.ts";
import { PointsGuide } from "./points-guide.ts";

function rect(x: number, y: number, w: number, h: number): Rectangle {
  const r = new Rectangle();
  r.setProperty("trf", new Transform(w / 2, 0, 0, h / 2, x + w / 2, y + h / 2));
  return r;
}

/** Pins a page's position: `multi` in the multi-page view, (0, 0) otherwise. */
function placePage(page: Page, multi: Point): void {
  page.getPosition = (multiPage?: unknown) => (multiPage ? multi : new Point(0, 0));
}

/**
 * Two 400 x 300 pages: A (active) at (100, 40) and B at (600, 90) in the
 * multi-page view. Both positions are off the origin so a missing or
 * doubled page offset shows.
 */
function twoPages(): { scene: Scene; pageA: Page; pageB: Page } {
  const scene = new Scene(new Workspace());
  const pageA = scene.getActivePage() as Page;
  pageA.setProperties(["w", "h"], [400, 300]);
  const pageB = scene.insertPage();
  placePage(pageA, new Point(100, 40));
  placePage(pageB, new Point(600, 90));
  return { scene, pageA, pageB };
}

function fakeView(scene: Scene, multiPageView: boolean): GuidesView {
  return {
    getScene: () => scene,
    getZoom: () => 1,
    getLogicalZoom: () => 1,
    getViewConfiguration: () => ({ multiPageView }),
    getEditor: () => ({ getDistanceHelper: () => null }),
  };
}

function guidesFor(scene: Scene, multiPageView = true): Guides {
  const guides = new Guides(scene);
  guides._view = fakeView(scene, multiPageView);
  return guides;
}

/** A pipeline with `guide` and the (disabled) full pixels guide the editor always adds. */
function pipeline(guides: Guides, guide: PointsGuide | PageGuide): Guides {
  guides.addGuide(guide);
  guides.addGuide(new FullPixelsGuide(guides));
  Guides.options.guides = [guide.getId()];
  return guides;
}

/** A paint context that records strokeLine calls. */
function recordingContext(lines: unknown[][]): PaintContext {
  return {
    canvas: {
      strokeLine: (...args: unknown[]) => lines.push(args),
    },
    configuration: { multiPageView: true },
  } as unknown as PaintContext;
}

const savedOptions = { ...Guides.options };
afterEach(() => {
  Object.assign(Guides.options, savedOptions);
  Guides.options.guides = [];
});

describe("BBoxGuide in the multi-page view", () => {
  // Rect on page B, page-local (20, 30)-(60, 50): in active-page space
  // (B minus A) its pivots are (520, 80), (560, 100) and (540, 90).
  function setup(): { scene: Scene; pageA: Page; guide: BBoxGuide } {
    const { scene, pageA, pageB } = twoPages();
    pageB.appendChild(rect(20, 30, 40, 20));
    return { scene, pageA, guide: new BBoxGuide(guidesFor(scene)) };
  }

  it("snaps to an element of the page under the point, in active-page space", () => {
    const { pageA, guide } = setup();
    // (522, 92) in active-page space is (622, 132) on the scene: on page B.
    const hit = guide.map(522, 92, true, 5, 1) as NonNullable<ReturnType<BBoxGuide["map"]>>;
    expect(hit.x).toEqual({
      value: 520,
      delta: 2,
      // The old code always answers with the active page.
      page: pageA,
      guide: {
        bounds: [[80, 100]],
        orient: Guides.Orientation.V,
        // The point lies between the box's top and bottom: the line spans the box plus the margin.
        line: [new Point(520, 60), new Point(520, 120)],
      },
    });
    expect(hit.y).toEqual({
      value: 90,
      delta: 2,
      page: pageA,
      guide: {
        bounds: [[520, 560]],
        orient: Guides.Orientation.H,
        line: [new Point(500, 90), new Point(580, 90)],
      },
    });
  });

  it("takes a page-relative point in scene coordinates and answers the same", () => {
    const { guide } = setup();
    const relative = guide.map(622, 132, true, 5, 1, true);
    expect(relative).toEqual(guide.map(522, 92, true, 5, 1));
    expect(relative?.x?.value).toBe(520);
  });

  it("ignores the other page's elements in the single-page view", () => {
    const { scene } = setup();
    const guide = new BBoxGuide(guidesFor(scene, false));
    expect(guide.map(522, 92, true, 5, 1)).toBeNull();
    // Page-local coordinates of B's rect hit nothing on the empty active page either.
    expect(guide.map(22, 42, true, 5, 1)).toBeNull();
  });

  it("finds nothing when the point is on no page", () => {
    const { guide } = setup();
    // (450, 20) is (550, 60) on the scene: between the pages.
    expect(guide.map(450, 20, true, 50, 1)).toBeNull();
  });

  it("skips elements that lie entirely outside the hit page", () => {
    const { scene, pageB } = twoPages();
    // Left of B: page-local x -30..-15, so active-page x 470..485. Within 20
    // of the point (502, 160) on y (150, 170, 160) and x (485).
    pageB.appendChild(rect(-30, 100, 15, 20));
    const guide = new BBoxGuide(guidesFor(scene));
    expect(guide.map(502, 160, false, 20, 1)).toBeNull();
  });

  it("skips pivots outside the hit page box on that axis", () => {
    const { scene, pageB } = twoPages();
    // Page-local x -10..6: pivots x 490, 506 and 498 in active-page space;
    // the page box starts at 500, so the center (498, 2.5 away) is skipped
    // and the bottom-right (506, 5.5 away) wins.
    pageB.appendChild(rect(-10, 200, 16, 20));
    const guide = new BBoxGuide(guidesFor(scene));
    const hit = guide.map(500.5, 150, false, 20, 1);
    expect(hit?.x?.value).toBe(506);
    expect(hit?.x?.delta).toBe(5.5);
    expect(hit?.y).toBeNull();
  });
});

describe("PointsGuide in the multi-page view", () => {
  function setup(): { scene: Scene; pageA: Page } {
    const { scene, pageA, pageB } = twoPages();
    const path = new Path(false);
    for (const [x, y] of [
      [100, 100],
      [150, 100],
    ]) {
      const point = new AnchorPoint();
      point.setProperties(["x", "y"], [x, y]);
      path.getAnchorPoints().appendChild(point);
    }
    pageB.appendChild(path);
    return { scene, pageA };
  }

  it("snaps to the anchor points of the page under the point, in active-page space", () => {
    const { scene, pageA } = setup();
    const guide = new PointsGuide(guidesFor(scene));
    // (648, 60) is (748, 100) on the scene, (148, 10) on page B.
    const hit = guide.map(648, 60, true, 5, 1) as NonNullable<ReturnType<PointsGuide["map"]>>;
    expect(hit.x).toEqual({
      value: 650,
      delta: 2,
      page: pageA,
      // B's (150, 100) plus B's position minus A's.
      guide: [new Point(650, 60), new Point(650, 150)],
    });
    expect(hit.y).toBeNull();
    expect(guide.map(748, 100, true, 5, 1, true)).toEqual(hit);
  });

  it("puts the active page's offset on the snap line in finishMap and paint", () => {
    const { scene } = setup();
    const guides = guidesFor(scene);
    pipeline(guides, new PointsGuide(guides));
    const areas: Rect[] = [];
    guides.addEventListener(Guides.InvalidationRequestEvent, (event) => {
      areas.push((event as InstanceType<typeof Guides.InvalidationRequestEvent>).area as Rect);
    });
    guides.beginMap();
    expect(guides.mapPoint(new Point(648, 60))).toEqual(new Point(650, 60));
    guides.finishMap();
    // The line (650, 60)-(650, 150) plus A's (100, 40), padded by one.
    expect(areas).toEqual([new Rect(749, 99, 2, 92)]);
    const lines: unknown[][] = [];
    guides.paint(new Transform(), recordingContext(lines));
    const half = EditorOptions.outlineWidth % 2 != 0 ? 0.5 : 0;
    expect(lines).toEqual([
      [
        750 + half,
        100 + half,
        750 + half,
        190 + half,
        EditorOptions.outlineWidth,
        EditorOptions.guideOutlineColor,
        false,
      ],
    ]);
  });
});

describe("PageGuide in the multi-page view", () => {
  it("snaps to the page under the point in that page's own coordinates", () => {
    const { scene, pageB } = twoPages();
    const guide = new PageGuide(guidesFor(scene));
    // (498, 100) is (598, 140) on the scene, within 5 of B, (-2, 50) on B.
    const hit = guide.map(498, 100, false, 5, 1) as NonNullable<ReturnType<PageGuide["map"]>>;
    expect(hit.x).toEqual({
      value: 0,
      delta: 2,
      page: pageB,
      guide: {
        bounds: [[0, 300]],
        orient: Guides.Orientation.V,
        line: [new Point(0, 0), new Point(0, 300)],
      },
    });
    expect(hit.y).toBeNull();
    expect(guide.map(598, 140, false, 5, 1, true)).toEqual(hit);
  });

  it("BUG-049: mapPoint converts the other page's value into the point's space", () => {
    const { scene } = twoPages();
    const guides = guidesFor(scene);
    pipeline(guides, new PageGuide(guides));
    guides.beginMap();
    // B's left edge, 0 on B, is 500 in active-page space and 600 on the
    // scene. The old code returned B's local 0.
    expect(guides.mapPoint(new Point(498, 100))).toEqual(new Point(500, 100));
    expect(guides.mapPoint(new Point(598, 140), null, null, true)).toEqual(new Point(600, 140));
    guides.finishMap();
  });

  function mapRectOnB(pageRelative: boolean): {
    result: Rect;
    guides: Guides;
    pageB: Page;
    areas: Rect[];
  } {
    const { scene, pageB } = twoPages();
    const guides = guidesFor(scene);
    pipeline(guides, new PageGuide(guides));
    const areas: Rect[] = [];
    guides.addEventListener(Guides.InvalidationRequestEvent, (event) => {
      areas.push((event as InstanceType<typeof Guides.InvalidationRequestEvent>).area as Rect);
    });
    guides.beginMap();
    const result = pageRelative
      ? guides.mapRect(new Rect(598, 140, 20, 20), null, true)
      : guides.mapRect(new Rect(498, 100, 20, 20));
    return { result, guides, pageB, areas };
  }

  it("mapRect converts the pivot into the hit page's space before taking the delta", () => {
    const { result, guides, pageB, areas } = mapRectOnB(false);
    // Top-left (-2, 50) on B snaps to B's left edge: a shift of +2.
    expect(result).toEqual(new Rect(500, 100, 20, 20));
    expect(guides._visuals.length).toBe(1);
    const entry = guides._visuals[0] as { guide: GuideLine; page: Page | null };
    expect(entry.page).toBe(pageB);
    // The moved rect's y range on B (50..70) is the source of the line.
    expect(entry.guide.srcBounds).toEqual([50, 70]);
    expect(entry.guide.line).toEqual([new Point(0, 0), new Point(0, 300)]);
    guides.finishMap();
    expect(entry.guide.freeSegments).toEqual([
      [0, 0],
      [50, 70],
    ]);
    expect(entry.guide.valueSegments).toEqual([{ bounds: [0, 50] }, { bounds: [70, 300] }]);
    // The line plus B's (600, 90), padded by one.
    expect(areas).toEqual([new Rect(599, 89, 2, 302)]);
  });

  it("mapRect gives the same snap for a page-relative rect", () => {
    const { result, guides } = mapRectOnB(true);
    expect(result).toEqual(new Rect(600, 140, 20, 20));
    const entry = guides._visuals[0] as { guide: GuideLine };
    expect(entry.guide.srcBounds).toEqual([50, 70]);
    guides.finishMap();
  });

  it("paints the hit page's snap line with that page's offset", () => {
    const { guides } = mapRectOnB(false);
    guides.finishMap();
    const lines: unknown[][] = [];
    guides.paint(new Transform(), recordingContext(lines));
    const half = EditorOptions.outlineWidth % 2 != 0 ? 0.5 : 0;
    const at = (y1: number, y2: number, color: unknown) => [
      600 + half,
      90 + y1 + half,
      600 + half,
      90 + y2 + half,
      EditorOptions.outlineWidth,
      color,
      false,
    ];
    expect(lines).toEqual([
      // Free segments in the outline colour, then the value segments in the distance colour.
      at(0, 0, EditorOptions.guideOutlineColor),
      at(50, 70, EditorOptions.guideOutlineColor),
      at(0, 50, EditorOptions.distanceHelperColor),
      at(70, 300, EditorOptions.distanceHelperColor),
    ]);
  });
});
