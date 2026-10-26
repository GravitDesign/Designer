// The strip queries of the bbox guide: the elements found and the order
// they are visited in must stay those of the old code (chunk.vendor.js
// module 153, _getAllChildrenInBBox and _applySnappingToPivots
// 32800-32845), which collected with Array.concat, dropped repeats with
// indexOf against the list before each strip and searched the scope
// list one by one. The reference functions below are that code.
import { describe, expect, it } from "vitest";
import { QuadTree } from "../../engine/geometry/quadtree.ts";
import { Point } from "../../engine/math/point.ts";
import { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import { Accelerated, type AcceleratedApi } from "../../engine/scene/element-accelerated.ts";
import { ElementFlag } from "../../engine/scene/element-change.ts";
import { Element } from "../../engine/scene/element.ts";
import { Group } from "../../engine/scene/group.ts";
import { Item } from "../../engine/scene/item.ts";
import { Layer } from "../../engine/scene/layer.ts";
import { Container, type ContainerNode } from "../../engine/scene/node-container.ts";
import type { Node } from "../../engine/scene/node.ts";
import type { Page } from "../../engine/scene/page.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import { Scene } from "../../engine/scene/scene.ts";
import { Workspace } from "../../engine/scene/workspace.ts";
import { BBoxGuide } from "./bbox-guide.ts";
import { Guides, type GuidesView } from "./guides.ts";

function rect(x: number, y: number, w: number, h: number): Rectangle {
  const r = new Rectangle();
  r.setProperty("trf", new Transform(w / 2, 0, 0, h / 2, x + w / 2, y + h / 2));
  return r;
}

function fakeView(scene: Scene): GuidesView {
  return {
    getScene: () => scene,
    getZoom: () => 1,
    getLogicalZoom: () => 1,
    getViewConfiguration: () => ({ multiPageView: false }),
    getEditor: () => ({ getDistanceHelper: () => null }),
  };
}

/** A deterministic pseudo-random sequence in [0, 1). */
function random(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

/**
 * A 1000 x 800 page with 150 top-level rects (the page's quadtree splits
 * several levels deep), groups of rects, some nested, and a hidden rect.
 */
function crowdedScene(): { page: Page; guide: BBoxGuide; groups: Group[]; twice: Rectangle } {
  const scene = new Scene(new Workspace());
  const page = scene.getActivePage() as Page;
  page.setProperties(["w", "h"], [1000, 800]);
  const next = random(7);
  for (let i = 0; i < 150; i++) {
    page.appendChild(rect(next() * 980, next() * 780, 2 + next() * 60, 2 + next() * 60));
  }
  const groups: Group[] = [];
  for (let g = 0; g < 6; g++) {
    const group = new Group();
    for (let i = 0; i < 8; i++) {
      group.appendChild(rect(next() * 900, next() * 700, 5 + next() * 80, 5 + next() * 80));
    }
    if (g % 2) {
      // A nested group among the matches: what is under it comes after
      // all of the outer group's matches, not right after it.
      const inner = new Group();
      inner.appendChild(rect(next() * 900, next() * 700, 30, 30));
      inner.appendChild(rect(next() * 900, next() * 700, 30, 30));
      group.insertChild(inner, group.getFirstChild());
    }
    page.appendChild(group);
    groups.push(group);
  }
  // A second tree entry for one rect, as the accelerated restore path can
  // leave: the old code kept repeats found by one strip.
  const twice = page.getFirstChild() as Rectangle;
  const tree = (page as unknown as AcceleratedApi)._childrenGeometryQTree as QuadTree;
  const box = twice.getGeometryBBox() as Rect;
  const entry = new QuadTree.Element(box.getX(), box.getY(), box.getWidth(), box.getHeight());
  entry.data = twice;
  tree.insert(entry);
  const hidden = rect(500, 400, 20, 20);
  hidden.setFlag(ElementFlag.Hidden);
  page.appendChild(hidden);
  const guides = new Guides(scene);
  guides._view = fakeView(scene);
  return { page, guide: new BBoxGuide(guides), groups, twice };
}

function oldChildrenInBBox(node: Node, area: Rect): Element[] {
  let found: Element[] = [];
  if (!node.hasMixin(Container)) return [];
  if (node.hasMixin(Accelerated)) {
    found =
      (node as unknown as AcceleratedApi).retrieveChildrenInGeometryBBox(
        area,
        QuadTree.RETRIEVE_MODE_INTERSECT,
      ) || [];
  } else {
    for (let child = (node as ContainerNode).getFirstChild(); child; child = child.getNext()) {
      if (child instanceof Element) {
        const box = child.getGeometryBBox();
        if (box && box.intersectsRect(area)) found.push(child);
      }
    }
  }
  let nested: Element[] = [];
  for (let a = 0; a < found.length; a++) {
    nested = nested.concat(oldChildrenInBBox(found[a] as Element, area));
  }
  return found.concat(nested);
}

function oldVisits(guide: BBoxGuide, pivots: Point[], distance: number, page: Page): Element[] {
  const visited: Element[] = [];
  const box = page.getGeometryBBox() as Rect;
  let elements: Element[] = [];
  for (const pivot of pivots) {
    const column = new Rect(
      pivot.getX() - distance,
      box.getY() - distance,
      2 * distance,
      box.getHeight() + 2 * distance,
    );
    const row = new Rect(
      box.getX() - distance,
      pivot.getY() - distance,
      box.getWidth() + 2 * distance,
      2 * distance,
    );
    elements = elements.concat(
      oldChildrenInBBox(page, column).filter((element) => elements.indexOf(element) < 0),
    );
    elements = elements.concat(
      oldChildrenInBBox(page, row).filter((element) => elements.indexOf(element) < 0),
    );
  }
  for (const element of elements) {
    if (
      (element instanceof Item || element instanceof Layer) &&
      !element.hasFlag(ElementFlag.Hidden)
    ) {
      let target: Element | null = null;
      const scoped = guide._getEffectiveSnapElems();
      if (scoped || element.getParent() instanceof Item) {
        if (scoped) {
          for (let y = 0; y < scoped.length && !target; ++y) {
            if (element == scoped[y]) target = element;
          }
        }
      } else target = element;
      if (target) visited.push(target);
    }
  }
  return visited;
}

/** Full-height columns and full-width rows through the page, and small boxes. */
function areas(): Rect[] {
  const list: Rect[] = [];
  for (let x = -10; x <= 1010; x += 7.5) list.push(new Rect(x - 5, -5, 10, 810));
  for (let y = -10; y <= 810; y += 7.5) list.push(new Rect(-5, y - 5, 1010, 10));
  for (let k = 0; k < 40; k++) list.push(new Rect(k * 23, k * 19, 12, 9));
  return list;
}

/** Pivot triples (top-left, bottom-right, center) of rects that overlap a lot. */
function pivotSets(): Point[][] {
  const next = random(3);
  const sets: Point[][] = [];
  for (let k = 0; k < 60; k++) {
    const x = next() * 950;
    const y = next() * 750;
    const w = 10 + next() * 300;
    const h = 10 + next() * 300;
    sets.push([new Point(x, y), new Point(x + w, y + h), new Point(x + w / 2, y + h / 2)]);
  }
  return sets;
}

describe("BBoxGuide strip queries", () => {
  it("find the elements in the old order, nested ones after their container's matches", () => {
    const { page, guide } = crowdedScene();
    let nested = 0;
    for (const area of areas()) {
      const expected = oldChildrenInBBox(page, area);
      const found = guide._getAllChildrenInBBox(page, area);
      expect(found.length).toBe(expected.length);
      found.forEach((element, k) => expect(element).toBe(expected[k]));
      nested += found.filter((element) => element.getParent()?.getParent() instanceof Group).length;
    }
    // The scene does exercise the recursion, two levels deep.
    expect(nested).toBeGreaterThan(10);
  });

  it("visit each element once, in the old order, without and with a scope", () => {
    const { page, guide, groups, twice } = crowdedScene();
    const scopes: (Node[] | null)[] = [null, [page], [groups[1] as Group, groups[3] as Group]];
    const counts: number[] = [];
    for (const scope of scopes) {
      guide.setScope(scope);
      let visits = 0;
      for (const pivots of pivotSets()) {
        const expected = oldVisits(guide, pivots, 5, page);
        const visited: Element[] = [];
        guide._applySnappingToPivots(pivots, 5, page, (element) => visited.push(element));
        expect(visited.length).toBe(expected.length);
        visited.forEach((element, k) => expect(element).toBe(expected[k]));
        visits += visited.length;
      }
      counts.push(visits);
    }
    // Every scope lets some elements through.
    counts.forEach((count) => expect(count).toBeGreaterThan(20));
    // A strip through the doubled rect visits it twice.
    guide.setScope(null);
    const box = twice.getGeometryBBox() as Rect;
    const visited: Element[] = [];
    guide._applySnappingToPivots([box.getSide(Rect.Side.CENTER)], 5, page, (element) =>
      visited.push(element),
    );
    expect(visited.filter((element) => element === twice).length).toBe(2);
  });

  it("test the scope of the moment, not one seen before", () => {
    const scene = new Scene(new Workspace());
    const page = scene.getActivePage() as Page;
    page.setProperties(["w", "h"], [400, 300]);
    const group = new Group();
    group.appendChild(rect(0, 100, 20, 20));
    group.appendChild(rect(60, 100, 20, 20));
    page.appendChild(group);
    const guides = new Guides(scene);
    guides._view = fakeView(scene);
    const guide = new BBoxGuide(guides);
    guide.setScope([group]);
    // 2 from the first child's right edge; the group is outside its own scope.
    expect(guide.map(22, 200, false, 5, 1)?.x?.value).toBe(20);
    expect(guide.map(41, 200, false, 5, 1)).toBeNull();
    // The page's scope holds the group, not its children.
    guide.setScope([page]);
    expect(guide.map(22, 200, false, 5, 1)).toBeNull();
    expect(guide.map(41, 200, false, 5, 1)?.x?.value).toBe(40);
    guide.setScope([group]);
    expect(guide.map(22, 200, false, 5, 1)?.x?.value).toBe(20);
  });
});
