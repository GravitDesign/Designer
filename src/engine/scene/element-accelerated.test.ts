// The quadtree index upkeep of GElement.Accelerated (old module 912):
// `_elementIndex` numbering after removes, re-inserts, visibility and
// geometry updates and a restore, and the hit order that depends on it.
// The fixture was recorded by running the same steps on the old GLayer and
// GRectangle (vendor modules 159 and 73) in Node.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { Point } from "../math/point.ts";
import { Transform } from "../math/transform.ts";
import type { AcceleratedApi } from "./element-accelerated.ts";
import { ElementChange, ElementFlag } from "./element-change.ts";
import type { ElementHit } from "./element.ts";
import { Layer } from "./layer.ts";
import { Node } from "./node.ts";
import { Rectangle } from "./rectangle.ts";

const recorded = JSON.parse(
  fs.readFileSync(
    path.join(import.meta.dirname, "__fixtures__/old-accelerated-index.json"),
    "utf8",
  ),
) as Record<string, unknown>;

type Indexed = Rectangle & { _dirtyIndex?: boolean };

function rect(name: string, x: number, y: number, w: number, h: number): Rectangle {
  const shape = new Rectangle();
  shape.setProperty("name", name);
  shape.setProperty("trf", new Transform(w / 2, 0, 0, h / 2, x + w / 2, y + h / 2));
  return shape;
}

/** name:index:<p if in the paint tree><g if in the geometry tree><d if dirty>. */
function names(layer: Layer): string[] {
  const out: string[] = [];
  for (let child = layer.getFirstChild(); child; child = child.getNext()) {
    const element = child as Indexed;
    out.push(
      `${element.getProperty("name") as string}:${element._elementIndex}:` +
        (element._containingPaintQTreeElement ? "p" : "-") +
        (element._containingGeometryQTreeElement ? "g" : "-") +
        (element._dirtyIndex ? "d" : ""),
    );
  }
  return out;
}

/** All hits at a point, top first (forced, so unfilled rectangles hit). */
function hits(layer: Layer, x: number, y: number): unknown[] {
  const found = layer.hitTest(new Point(x, y), null, null, true, null, 0, true) as
    ElementHit[] | null;
  return (found || []).map((hit) => (hit.element as Rectangle).getProperty("name"));
}

describe("GElement.Accelerated index upkeep", () => {
  it("numbers the children like the old layer through removes, inserts, updates and a restore", () => {
    const out: Record<string, unknown> = {};
    const layer = new Layer();
    const accel = layer as unknown as Layer & AcceleratedApi;
    const a = rect("a", 0, 0, 50, 50);
    const b = rect("b", 20, 20, 50, 50);
    const c = rect("c", 40, 40, 50, 50);
    layer.appendChild(a);
    layer.appendChild(b);
    layer.appendChild(c);
    out.appended = names(layer);
    out.hitsAppended = hits(layer, 45, 45);

    // The bottom one removed (it is marked dirty) and put on top.
    layer.removeChild(a);
    out.removed = names(layer);
    out.removedDirty = !!(a as unknown as Indexed)._dirtyIndex;
    layer.appendChild(a);
    out.reinserted = names(layer);
    out.hitsReinserted = hits(layer, 45, 45);

    b.setFlag(ElementFlag.Hidden);
    out.hidden = names(layer);
    out.hitsHidden = hits(layer, 45, 45);
    b.removeFlag(ElementFlag.Hidden);
    out.shown = names(layer);
    out.hitsShown = hits(layer, 45, 45);

    const d = rect("d", 30, 30, 50, 50);
    layer.insertChild(d, c);
    out.insertedMiddle = names(layer);
    out.hitsInsertedMiddle = hits(layer, 45, 45);
    d.setProperty("trf", new Transform(25, 0, 0, 25, 56, 56));
    out.movedMiddle = names(layer);
    out.hitsMovedMiddle = hits(layer, 45, 45);

    // A visual update of a child that isn't in the trees numbers it from
    // the previous child's index without + 1 (kept quirk); the geometry
    // update adds the 1.
    const e = rect("e", 0, 0, 10, 10);
    layer.insertChild(e, c);
    accel._removeAccelElement(e);
    accel._handleChildrenStructureChange(ElementChange.ChildVisualUpdate, [e]);
    out.visualUpdateNotInTree = names(layer);
    accel._removeAccelElement(e);
    accel._handleChildrenStructureChange(ElementChange.ChildGeometryUpdate, [e]);
    out.geometryUpdateNotInTree = names(layer);

    // A middle child removed (it gets its index - 1) and inserted further up.
    layer.removeChild(d);
    out.removedMiddle = names(layer);
    out.removedMiddleOwnIndex = (d as unknown as Indexed)._elementIndex;
    layer.insertChild(d, a);
    out.reinsertedMiddle = names(layer);
    out.hitsReinsertedMiddle = hits(layer, 45, 45);

    const copy = Node.deserialize(Node.serialize(layer) as string) as Layer;
    out.restored = names(copy);
    out.hitsRestored = hits(copy, 45, 45);

    layer.beginUpdate();
    layer.endUpdate();
    out.updated = names(layer);

    expect(out).toEqual(recorded);
  });

  it("hits the re-inserted bottom element first", () => {
    const layer = new Layer();
    const a = rect("a", 0, 0, 50, 50);
    const b = rect("b", 20, 20, 50, 50);
    const c = rect("c", 40, 40, 50, 50);
    layer.appendChild(a);
    layer.appendChild(b);
    layer.appendChild(c);
    layer.removeChild(a);
    layer.appendChild(a);
    const top = layer.hitTest(new Point(45, 45), null, null, false, null, 0, true) as ElementHit[];
    expect(top[0]?.element).toBe(a);
  });
});
