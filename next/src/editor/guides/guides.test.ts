import { afterEach, describe, expect, it } from "vitest";
import { Platform } from "../../engine/core/platform.ts";
import { Point } from "../../engine/math/point.ts";
import { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import type { Page } from "../../engine/scene/page.ts";
import { AnchorPoint } from "../../engine/scene/path-base.ts";
import { Path } from "../../engine/scene/path.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import { Scene } from "../../engine/scene/scene.ts";
import { Workspace } from "../../engine/scene/workspace.ts";
import { BBoxGuide } from "./bbox-guide.ts";
import type { DistanceHelper } from "./distance-helper.ts";
import { FullPixelsGuide } from "./full-pixels-guide.ts";
import { GridGuide } from "./grid-guide.ts";
import { DetailMapMode, Guide, type GuideLine } from "./guide.ts";
import { GuideLinesGuide } from "./guide-lines-guide.ts";
import { Guides, type GuidesView } from "./guides.ts";
import { PageGuide } from "./page-guide.ts";
import { PointsGuide } from "./points-guide.ts";

function rect(x: number, y: number, w: number, h: number): Rectangle {
  const r = new Rectangle();
  r.setProperty("trf", new Transform(w / 2, 0, 0, h / 2, x + w / 2, y + h / 2));
  return r;
}

/** A scene with a fixed 400 x 300 page. */
function newScene(): Scene {
  const scene = new Scene(new Workspace());
  (scene.getActivePage() as Page).setProperties(["w", "h"], [400, 300]);
  return scene;
}

/** A view at zoom 1 with no page offsets, as GEditorWidget would give. */
function fakeView(scene: Scene, helper: DistanceHelper | null = null, zoom = 1): GuidesView {
  return {
    getScene: () => scene,
    getZoom: () => zoom,
    getLogicalZoom: () => zoom,
    getViewConfiguration: () => ({ multiPageView: false }),
    getEditor: () => ({ getDistanceHelper: () => helper }),
  };
}

/** The guides in the editor's order (GEditor constructor). */
function editorGuides(scene: Scene): Guides {
  const guides = new Guides(scene);
  const bbox = new BBoxGuide(guides);
  bbox.setPriority(BBoxGuide.PRIORITY.DISTANCE_FIRST);
  guides.addGuide(bbox, true);
  guides.addGuide(new GridGuide(guides));
  guides.addGuide(new GuideLinesGuide(guides));
  guides.addGuide(new PointsGuide(guides));
  guides.addGuide(new PageGuide(guides));
  guides.addGuide(new FullPixelsGuide(guides));
  return guides;
}

const savedOptions = { ...Guides.options };
afterEach(() => {
  Object.assign(Guides.options, savedOptions);
  Guides.options.guides = [];
  Platform.modifiers.metaKey = false;
});

describe("Guide zones and mapping rules", () => {
  it("allows top-left, center and bottom-right by default", () => {
    const guides = new Guides(newScene());
    expect(new PageGuide(guides).getAllowedSnapZones()).toEqual(["tl", "cc", "br"]);
    expect(new GridGuide(guides).getAllowedSnapZones()).toEqual(["tl", "br"]);
  });

  it("keeps bottom-right on the full pixels guide (the constructor skips it while splicing)", () => {
    const guide = new FullPixelsGuide(new Guides(newScene()));
    expect(guide.getAllowedSnapZones()).toEqual(["tl", "br"]);
    expect(guide.mapTopLeftOnly()).toBe(false);
  });

  it("inverts mapping while Cmd/Ctrl is held", () => {
    const guide = new GuideLinesGuide(new Guides(newScene()));
    expect(guide.isMappingAllowed(null)).toBe(true);
    Platform.modifiers.metaKey = true;
    expect(guide.isMappingAllowed(null)).toBe(false);
    Guides.options.disabled = true;
    expect(guide.isMappingAllowed(null)).toBe(true);
    Platform.modifiers.metaKey = false;
    expect(guide.isMappingAllowed(null)).toBe(false);
  });

  it("maps in detail mode only with the DetailMap mixin", () => {
    const guides = new Guides(newScene());
    expect(new GuideLinesGuide(guides).isMappingAllowed(DetailMapMode.DetailOnFilterOn)).toBe(true);
    expect(new PageGuide(guides).isMappingAllowed(DetailMapMode.DetailOnFilterOn)).toBe(false);
    expect(new PageGuide(guides).isMappingAllowed(DetailMapMode.DetailOffFilterOn)).toBe(false);
    expect(new PageGuide(guides).isMappingAllowed(DetailMapMode.FilterOff)).toBe(true);
    // Full pixels ignores Cmd but not the detail-off mode.
    const full = new FullPixelsGuide(guides);
    Platform.modifiers.metaKey = true;
    expect(full.isMappingAllowed(null)).toBe(true);
    expect(full.isMappingAllowed(DetailMapMode.DetailOffFilterOn)).toBe(false);
  });

  it("knows the visual guides through the Visual mixin", () => {
    const guides = new Guides(newScene());
    expect(new GridGuide(guides).isVisual()).toBe(true);
    expect(new PageGuide(guides).isVisual()).toBe(false);
    expect(Guide.DetailMap.Mode.FilterOff).toBe(3);
    expect(String(new PageGuide(guides))).toBe("[Object GPageGuide]");
  });
});

describe("single guides", () => {
  it("guide lines snap to the first line within the distance, not the closest", () => {
    const scene = newScene();
    scene.setProperties(["hgl", "vgl"], [[10, 12], [50]]);
    const guide = new GuideLinesGuide(new Guides(scene));
    const hit = guide.map(52, 12.5, false, 5, 1) as NonNullable<ReturnType<GuideLinesGuide["map"]>>;
    expect(hit.x).toEqual({ value: 50, delta: 2 });
    expect(hit.y).toEqual({ value: 10, delta: 2.5 });
    // The distance is in screen units: zoom 2 halves it.
    expect(guide.map(53, 100, false, 5, 2)).toBeNull();
  });

  it("the grid snaps only with a grid mode, axonometric along the second angle", () => {
    const scene = newScene();
    const guide = new GridGuide(new Guides(scene));
    expect(guide.map(13, 17)).toBeNull();
    scene.setProperty("gm", Scene.GridMode.Boxed);
    expect(guide.map(13, 17)).toEqual({
      x: { value: 10, guide: null, delta: 3 },
      y: { value: 20, guide: null, delta: 3 },
    });
    scene.setProperties(
      ["gm", "gaw", "gah", "ga2"],
      [Scene.GridMode.Axonometric, 20, 10, Math.PI / 4],
    );
    const hit = guide.map(21, 3) as NonNullable<ReturnType<GridGuide["map"]>>;
    expect(hit.x?.value).toBe(20);
    // x = 20 shifts the rows by tan(-45°) * 20 = -20, a whole row step.
    expect(hit.y?.value).toBeCloseTo(0, 12);
  });

  it("the grid combines with full pixels only for cells over one pixel", () => {
    const scene = newScene();
    scene.setProperties(["gm", "gx", "gy"], [Scene.GridMode.Boxed, 1, 1]);
    const guide = new GridGuide(new Guides(scene));
    expect(guide.canMapWithFullPixelsGuide()).toBe(false);
    scene.setProperty("ut", "mm");
    expect(guide.canMapWithFullPixelsGuide()).toBe(true);
    scene.setProperties(["ut", "gx", "gy"], ["px", 2, 2]);
    expect(guide.canMapWithFullPixelsGuide()).toBe(true);
  });

  it("full pixels round half down, only in px documents", () => {
    const scene = newScene();
    const guide = new FullPixelsGuide(new Guides(scene));
    expect(guide.map(2.5, 3.6)).toEqual({
      x: { value: 2, guide: null, delta: 0.5 },
      y: { value: 4, guide: null, delta: Math.abs(3.6 - 4) },
    });
    scene.setProperty("ut", "mm");
    expect(guide.map(2.5, 3.6)).toBeNull();
  });

  it("the page guide snaps to page edges and centers of fixed-size pages", () => {
    const scene = newScene();
    const guide = new PageGuide(new Guides(scene));
    const hit = guide.map(198, 3, false, 5, 1) as NonNullable<ReturnType<PageGuide["map"]>>;
    expect(hit.x?.value).toBe(200);
    expect(hit.x?.guide).toEqual({
      bounds: [[0, 300]],
      orient: Guides.Orientation.V,
      line: [new Point(200, 0), new Point(200, 300)],
    });
    expect(hit.y?.value).toBe(0);
    expect(hit.x?.page).toBe(scene.getActivePage());
    (scene.getActivePage() as Page).setProperties(["w", "h"], [0, 0]);
    expect(guide.map(198, 3, false, 5, 1)).toBeNull();
  });
});

describe("BBoxGuide", () => {
  it("snaps to the nearest edge or center of top-level boxes and draws a margin line", () => {
    const scene = newScene();
    const box = rect(100, 100, 50, 40);
    scene.appendChild(box);
    const guide = new BBoxGuide(new Guides(scene));
    const hit = guide.map(148, 20, true, 5, 1) as NonNullable<ReturnType<BBoxGuide["map"]>>;
    expect(hit.x?.value).toBe(150);
    expect(hit.x?.delta).toBe(2);
    // The point is above the box: from the point to the box bottom, plus the margin.
    expect((hit.x?.guide as GuideLine).line).toEqual([new Point(150, 0), new Point(150, 160)]);
    expect(hit.y).toBeNull();
    guide.useExclusions([box]);
    expect(guide.map(148, 20, true, 5, 1)).toBeNull();
  });

  it("calls BBOX_FIRST 'distance first' (the names are swapped)", () => {
    const guide = new BBoxGuide(new Guides(newScene()));
    expect(guide.getPriority()).toBe(BBoxGuide.PRIORITY.DISTANCE_FIRST);
    expect(guide.hasPriorityDistanceFirst()).toBe(false);
    guide.setPriority(BBoxGuide.PRIORITY.BBOX_FIRST);
    expect(guide.hasPriorityDistanceFirst()).toBe(true);
  });

  it("finds equal spacing between three boxes in a row", () => {
    const scene = newScene();
    scene.appendChild(rect(10, 10, 20, 20));
    scene.appendChild(rect(50, 10, 20, 20));
    const guide = new BBoxGuide(new Guides(scene));
    const delta: number[] = [];
    const visualsY: unknown[] = [];
    const visualsX: { guide: GuideLine }[] = [];
    // Gap 20 between the first two; the moving box sits 22 to the right of the second.
    const moved = guide.checkDistanceGuidesMapping(
      new Rect(92, 10, 20, 20),
      5,
      1,
      false,
      delta,
      visualsY as never[],
      visualsX as never[],
    );
    expect(moved).toEqual(new Rect(90, 10, 20, 20));
    expect(delta).toEqual([-2, 0]);
    expect(visualsY).toEqual([]);
    expect(visualsX.length).toBeGreaterThan(0);
    const first = visualsX[0]?.guide as GuideLine;
    expect(first.orient).toBe(Guides.Orientation.H);
    expect(first.valueSegments).toEqual([{ bounds: [30, 50] }]);
  });
});

describe("PointsGuide", () => {
  it("snaps to the anchor points in the strips through the point", () => {
    const scene = newScene();
    const path = new Path(false);
    for (const [x, y] of [
      [100, 100],
      [150, 100],
      [150, 140],
    ]) {
      const point = new AnchorPoint();
      point.setProperties(["x", "y"], [x, y]);
      path.getAnchorPoints().appendChild(point);
    }
    scene.appendChild(path);
    scene.appendChild(rect(10, 200, 20, 20));
    const guide = new PointsGuide(new Guides(scene));
    const hit = guide.map(149, 30, true, 5, 1) as NonNullable<ReturnType<PointsGuide["map"]>>;
    expect(hit.x?.value).toBe(150);
    expect(hit.y).toBeNull();
    // From the point to the farthest point at the same distance.
    expect(hit.x?.guide).toEqual([new Point(150, 30), new Point(150, 140)]);
    // Rectangle corners count too.
    expect(guide.map(31, 219, true, 5, 1)?.y?.value).toBe(220);
    expect(guide.map(300, 280, true, 5, 1)).toBeNull();
  });
});

describe("Guides pipeline", () => {
  it("maps a point through the enabled guides in order, first hit per axis wins", () => {
    const scene = newScene();
    scene.setProperties(["hgl", "vgl"], [[33], [47]]);
    scene.setProperties(["gm"], [Scene.GridMode.Boxed]);
    const guides = editorGuides(scene);
    guides._view = fakeView(scene);
    Guides.options.guides = [GridGuide.ID, GuideLinesGuide.ID, FullPixelsGuide.ID];
    guides.beginMap();
    // The grid comes before the guide lines, so it wins both axes.
    expect(guides.mapPoint(new Point(46, 32))).toEqual(new Point(50, 30));
    Guides.options.guides = [GuideLinesGuide.ID, FullPixelsGuide.ID];
    expect(guides.mapPoint(new Point(46, 32))).toEqual(new Point(47, 33));
    Guides.options.guides = [GuideLinesGuide.ID];
    // Only x within reach: y keeps the input.
    expect(guides.mapPoint(new Point(46, 80.5))).toEqual(new Point(47, 80.5));
    guides.finishMap();
    Guides.options.guides = [];
    expect(guides.mapPoint(new Point(46, 32))).toEqual(new Point(46, 32));
  });

  it("maps a rect by its pivots and records snap lines whose area it invalidates", () => {
    const scene = newScene();
    const guides = editorGuides(scene);
    guides._view = fakeView(scene);
    Guides.options.guides = [PageGuide.ID];
    const areas: Rect[] = [];
    guides.addEventListener(Guides.InvalidationRequestEvent, (event) => {
      areas.push((event as InstanceType<typeof Guides.InvalidationRequestEvent>).area as Rect);
    });
    guides.beginMap();
    const mapped = guides.mapRect(new Rect(3, 142, 40, 20));
    guides.finishMap();
    // Top-left snaps to the page's left edge, the center to its middle.
    expect(mapped).toEqual(new Rect(0, 140, 40, 20));
    expect(guides._visuals.length).toBe(2);
    expect(areas.length).toBe(1);
    expect(areas[0]).toEqual(new Rect(-1, -1, 402, 302));
    // invalidate() without an area sends the snap lines' area once and forgets the lines.
    guides.invalidate();
    expect(areas.length).toBe(2);
    expect(guides._visuals).toEqual([]);
    guides.invalidate();
    expect(areas.length).toBe(2);
  });

  it("invalidates a given area, ignores empty ones without lines", () => {
    const guides = new Guides(newScene());
    const areas: (Rect | null)[] = [];
    guides.invalidate(new Rect(1, 2, 3, 4));
    guides.addEventListener(Guides.InvalidationRequestEvent, (event) => {
      areas.push((event as InstanceType<typeof Guides.InvalidationRequestEvent>).area);
    });
    guides.invalidate(new Rect(1, 2, 3, 4));
    guides.invalidate(new Rect(5, 5, 0, 0));
    guides.invalidate();
    expect(areas).toEqual([new Rect(1, 2, 3, 4)]);
  });

  it("gives snap zone marks only near the box and only with a zonable guide", () => {
    const scene = newScene();
    const guides = editorGuides(scene);
    const box = new Rect(0, 0, 100, 50);
    expect(guides.getBBoxSnapZones(box, new Point(100, 25))).toBeNull();
    Guides.options.guides = [PageGuide.ID, FullPixelsGuide.ID];
    expect(guides.getBBoxSnapZones(box, new Point(100, 25))).toEqual([
      [new Point(90, 25), new Point(100, 25)],
      [new Point(100, 20), new Point(100, 30)],
    ]);
    expect(guides.getBBoxSnapZones(box, new Point(200, 25))).toBeNull();
  });

  it("only takes scene views", () => {
    const scene = newScene();
    const guides = new Guides(scene);
    guides.setView(fakeView(scene));
    expect(guides._view).toBeNull();
    expect(guides.isMultiPageEnabled()).toBeNull();
  });
});
