// Snap scope rules (R6-A-028). Expected values worked out from the old
// code: chunk.vendor.js module 153 (GBBoxGuide.setScope 32759-32790,
// _applySnappingToPivots 32822-32845, the scope switch in map 32340-32343)
// and module 741 (GPointsGuide.setScope 101618-101640, map 101540-101560).
import { describe, expect, it } from "vitest";
import { Point } from "../../engine/math/point.ts";
import { Transform } from "../../engine/math/transform.ts";
import { Group } from "../../engine/scene/group.ts";
import type { Page } from "../../engine/scene/page.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import { Scene } from "../../engine/scene/scene.ts";
import { Workspace } from "../../engine/scene/workspace.ts";
import { BBoxGuide } from "./bbox-guide.ts";
import { Guides, type GuidesView } from "./guides.ts";
import { PointsGuide } from "./points-guide.ts";

function rect(x: number, y: number, w: number, h: number): Rectangle {
  const r = new Rectangle();
  r.setProperty("trf", new Transform(w / 2, 0, 0, h / 2, x + w / 2, y + h / 2));
  return r;
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

/**
 * A 400 x 300 active page with a group of two rects, (0, 100)-(20, 120)
 * and (60, 100)-(80, 120). The group's x pivots are 0, 80 and 40, the
 * first rect's 0, 20 and 10.
 */
function groupScene(multiPageView = false): {
  scene: Scene;
  page: Page;
  group: Group;
  guides: Guides;
} {
  const scene = new Scene(new Workspace());
  const page = scene.getActivePage() as Page;
  page.setProperties(["w", "h"], [400, 300]);
  const group = new Group();
  group.appendChild(rect(0, 100, 20, 20));
  group.appendChild(rect(60, 100, 20, 20));
  page.appendChild(group);
  const guides = new Guides(scene);
  guides._view = fakeView(scene, multiPageView);
  return { scene, page, group, guides };
}

/**
 * Adds page B with a top-level rect at page-local (20, 30)-(60, 50), and
 * pins the multi-page positions: the active page at (100, 40), B at
 * (600, 90). (522, 92) in active-page space then lies on B within 2 of
 * the rect's left edge (520 in active-page space).
 */
function addSecondPage(scene: Scene, activePage: Page): Page {
  const pageB = scene.insertPage();
  pageB.appendChild(rect(20, 30, 40, 20));
  const place = (page: Page, multi: Point): void => {
    page.getPosition = (multiPage?: unknown) => (multiPage ? multi : new Point(0, 0));
  };
  place(activePage, new Point(100, 40));
  place(pageB, new Point(600, 90));
  return pageB;
}

describe("BBoxGuide scope", () => {
  it("skips group children without a scope and snaps to the group's box", () => {
    const { guides } = groupScene();
    const guide = new BBoxGuide(guides);
    // 2 from the first rect's right edge, but children of an item don't count.
    expect(guide.map(22, 200, false, 5, 1)).toBeNull();
    // 1 from the group's center.
    expect(guide.map(41, 200, false, 5, 1)?.x?.value).toBe(40);
  });

  it("with the group as scope snaps to its children only", () => {
    const { guides, group, page } = groupScene();
    const guide = new BBoxGuide(guides);
    guide.setScope([group]);
    expect(guide._snapElems).toEqual([group.getFirstChild(), group.getLastChild()]);
    expect(guide._snapMainPage).toBe(page);
    expect(guide.map(22, 200, false, 5, 1)?.x?.value).toBe(20);
    // The group itself is outside its own scope.
    expect(guide.map(41, 200, false, 5, 1)).toBeNull();
    guide.setScope(null);
    expect(guide.map(22, 200, false, 5, 1)).toBeNull();
    expect(guide._scoped).toBe(false);
  });

  it("takes a scope node's own page as main page when none is on the active page", () => {
    const { scene, page } = groupScene();
    const pageB = addSecondPage(scene, page);
    const guide = new BBoxGuide(new Guides(scene));
    guide.setScope([pageB.getFirstChild() as Rectangle]);
    expect(guide._snapMainPage).toBe(pageB);
    // A container on the active page anywhere in the scope makes the active page main.
    guide.setScope([pageB.getFirstChild() as Rectangle, page]);
    expect(guide._snapMainPage).toBe(page);
    expect(guide._snapElems).toEqual([page.getFirstChild()]);
  });

  it("switches to the other page's top-level elements when the point is over it", () => {
    const { scene, page, group, guides } = groupScene(true);
    addSecondPage(scene, page);
    const guide = new BBoxGuide(guides);
    guide.setScope([group]);
    expect(guide._eSnapElems).toBeNull();
    // Over page B: the scope (the group's children) would exclude B's rect.
    expect(guide.map(522, 92, false, 5, 1)?.x?.value).toBe(520);
    expect(guide._eSnapElems?.length).toBe(1);
  });

  it("BUG-050: goes back to the scope when the point comes back to the main page", () => {
    const { scene, page, group, guides } = groupScene(true);
    addSecondPage(scene, page);
    const guide = new BBoxGuide(guides);
    guide.setScope([group]);
    // On the active page, 2 from the first child's right edge.
    expect(guide.map(22, 200, false, 5, 1)?.x?.value).toBe(20);
    guide.map(522, 92, false, 5, 1);
    expect(guide._eSnapElems?.length).toBe(1);
    // Back on the active page the scope's children snap again (the old
    // code kept the other page's elements: no snap).
    expect(guide.map(22, 200, false, 5, 1)?.x?.value).toBe(20);
    expect(guide._eSnapElems).toBeNull();
  });
});

describe("PointsGuide scope", () => {
  it("snaps to group children without a scope, unlike the bbox guide", () => {
    const { guides } = groupScene();
    const guide = new PointsGuide(guides);
    expect(guide.map(22, 200, false, 5, 1)?.x?.value).toBe(20);
  });

  it("limits snapping to the scope's items, with the active page as main page", () => {
    const { scene, guides, group, page } = groupScene();
    const other = new Group();
    other.appendChild(rect(300, 250, 10, 10));
    page.appendChild(other);
    const guide = new PointsGuide(guides);
    guide.setScope([group]);
    expect(guide._snapMainPage).toBe(scene.getActivePage());
    expect(guide.map(22, 200, false, 5, 1)?.x?.value).toBe(20);
    guide.setScope([other]);
    expect(guide.map(22, 200, false, 5, 1)).toBeNull();
    expect(guide.map(312, 200, false, 5, 1)?.x?.value).toBe(310);
  });

  it("switches to the other page's items when the point is over it", () => {
    const { scene, page, group, guides } = groupScene(true);
    addSecondPage(scene, page);
    const guide = new PointsGuide(guides);
    guide.setScope([group]);
    // B's rect corner (20, 30) is (520, 80) in active-page space.
    expect(guide.map(522, 82, false, 5, 1)?.x?.value).toBe(520);
    expect(guide._eSnapElems?.length).toBe(1);
  });

  it("BUG-050: goes back to the scope's items when the point comes back", () => {
    const { scene, page, group, guides } = groupScene(true);
    addSecondPage(scene, page);
    const guide = new PointsGuide(guides);
    guide.setScope([group]);
    guide.map(522, 82, false, 5, 1);
    // The old code kept B's items: no snap on the active page.
    expect(guide.map(22, 200, false, 5, 1)?.x?.value).toBe(20);
  });
});
