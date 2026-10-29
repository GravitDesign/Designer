// The scene's tree entry of a page waits for the next read of the trees
// while the page's children change (GElement.Accelerated
// _deferAccelUpdate). These check that a read never sees a stale entry
// after a child moves, is added or is removed, and that the page is
// measured once for many moved children instead of once per child.
import { describe, expect, it, vi } from "vitest";
import { QuadTree } from "../geometry/quadtree.ts";
import { Point } from "../math/point.ts";
import { Rect } from "../math/rect.ts";
import { Transform } from "../math/transform.ts";
import type { AcceleratedApi } from "./element-accelerated.ts";
import type { Element } from "./element.ts";
import type { Page } from "./page.ts";
import { Rectangle } from "./rectangle.ts";
import { Scene } from "./scene.ts";
import { Workspace } from "./workspace.ts";

const INTERSECT = QuadTree.RETRIEVE_MODE_INTERSECT;

function rect(x: number, y: number, w: number, h: number): Rectangle {
  const r = new Rectangle();
  r.setProperty("trf", new Transform(w / 2, 0, 0, h / 2, x + w / 2, y + h / 2));
  return r;
}

function moveTo(r: Rectangle, x: number, y: number): void {
  const [a, b, c, d] = (r.getProperty("trf") as Transform).getMatrix() as number[] as [
    number,
    number,
    number,
    number,
  ];
  r.setProperty("trf", new Transform(a, b, c, d, x + a, y + d));
}

/** A scene whose one page grows with its content, with `count` rectangles in a row. */
function setup(count: number): { scene: Scene; page: Page; shapes: Rectangle[] } {
  const scene = new Scene(new Workspace());
  const page = scene.getActivePage() as Page;
  page.setProperties(["w", "h"], [0, 0]);
  const shapes: Rectangle[] = [];
  for (let i = 0; i < count; i++) {
    const shape = rect(20 * i, 0, 10, 10);
    page.appendChild(shape);
    shapes.push(shape);
  }
  return { scene, page, shapes };
}

const accel = (scene: Scene): Scene & AcceleratedApi => scene as Scene & AcceleratedApi;

/** The pages the scene's trees find at a scene point. */
function pagesAt(scene: Scene, x: number, y: number): { paint: Element[]; geometry: Element[] } {
  const probe = new Rect(x, y, 1, 1);
  return {
    paint: accel(scene).retrieveChildrenInPaintBBox(probe, INTERSECT) || [],
    geometry: accel(scene).retrieveChildrenInGeometryBBox(probe, INTERSECT) || [],
  };
}

const coords = (e: { x: number; y: number; width: number; height: number } | null) =>
  e ? [e.x, e.y, e.width, e.height] : null;

/** The page's boxes where the scene's trees should have them. */
function expectedEntries(page: Page): { paint: number[]; geometry: number[] } {
  const at = page.getPosition(true);
  const place = (box: Rect | null): number[] => {
    const moved = (box as Rect).translated(at.getX(), at.getY());
    return [moved.getX(), moved.getY(), moved.getWidth(), moved.getHeight()];
  };
  return { paint: place(page.getPaintBBox()), geometry: place(page.getGeometryBBox()) };
}

function entries(page: Page): { paint: number[] | null; geometry: number[] | null } {
  return {
    paint: coords(page._containingPaintQTreeElement),
    geometry: coords(page._containingGeometryQTreeElement),
  };
}

describe("the scene's tree entry of a page whose children change", () => {
  it("is found where a child moved to", () => {
    const { scene, page, shapes } = setup(5);
    expect(pagesAt(scene, 505, 505)).toEqual({ paint: [], geometry: [] });
    moveTo(shapes[2] as Rectangle, 500, 500);
    expect(pagesAt(scene, 505, 505)).toEqual({ paint: [page], geometry: [page] });
    expect(entries(page)).toEqual(expectedEntries(page));
  });

  it("is found where a child was added", () => {
    const { scene, page } = setup(5);
    page.appendChild(rect(800, -300, 10, 10));
    expect(pagesAt(scene, 805, -295)).toEqual({ paint: [page], geometry: [page] });
    expect(entries(page)).toEqual(expectedEntries(page));
  });

  it("no longer covers the place of a removed child", () => {
    const { scene, page, shapes } = setup(5);
    const far = rect(900, 900, 10, 10);
    page.appendChild(far);
    expect(pagesAt(scene, 905, 905)).toEqual({ paint: [page], geometry: [page] });
    page.removeChild(far);
    expect(pagesAt(scene, 905, 905)).toEqual({ paint: [], geometry: [] });
    moveTo(shapes[4] as Rectangle, 300, 300);
    page.removeChild(shapes[4] as Rectangle);
    expect(pagesAt(scene, 305, 305)).toEqual({ paint: [], geometry: [] });
    expect(entries(page)).toEqual(expectedEntries(page));
  });

  it("is up to date for a hit test through the scene in the multi-page view", () => {
    const { scene, shapes } = setup(5);
    const moved = shapes[1] as Rectangle;
    moveTo(moved, -400, 250);
    const hits = scene.hitTest(
      new Point(-395, 255),
      null,
      null,
      false,
      null,
      0,
      true,
      null,
      null,
      false,
      true,
    );
    expect(hits && hits[0]?.element).toBe(moved);
  });

  it("measures the page once for many moved children, when the trees are read", () => {
    const { scene, page, shapes } = setup(40);
    pagesAt(scene, 0, 0);
    const measure = vi.spyOn(page, "_calculatePaintBBox");
    shapes.forEach((shape, i) => moveTo(shape, 20 * i + 3, 7));
    expect(measure).not.toHaveBeenCalled();
    expect(pagesAt(scene, 20 * 39 + 3 + 9.5, 16.5)).toEqual({ paint: [page], geometry: [page] });
    expect(measure).toHaveBeenCalledTimes(1);
    expect(entries(page)).toEqual(expectedEntries(page));
  });
});
