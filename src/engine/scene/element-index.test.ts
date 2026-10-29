// `_elementIndex` is renumbered on its next read (element-index.ts), not
// on every remove and insert. These check that a read never sees a stale
// number: right after removes from the front, re-inserts and reorders,
// after list changes the accelerated handler doesn't see (blocked
// changes, an open beginUpdate), in the hit order, and over a long mixed
// run against a layer that renumbers right away like the old code.
import { describe, expect, it } from "vitest";
import { Point } from "../math/point.ts";
import { Transform } from "../math/transform.ts";
import type { AcceleratedApi } from "./element-accelerated.ts";
import { ElementFlag } from "./element-change.ts";
import type { ElementHit } from "./element.ts";
import { Layer } from "./layer.ts";
import { NodeChange } from "./node-change.ts";
import type { Node } from "./node.ts";
import { Rectangle } from "./rectangle.ts";

function rect(name: string, x: number, y: number, w: number, h: number): Rectangle {
  const shape = new Rectangle();
  shape.setProperty("name", name);
  shape.setProperty("trf", new Transform(w / 2, 0, 0, h / 2, x + w / 2, y + h / 2));
  return shape;
}

function layerOf(count: number): { layer: Layer; shapes: Rectangle[] } {
  const layer = new Layer();
  const shapes: Rectangle[] = [];
  for (let i = 0; i < count; i++) {
    const shape = rect(`r${i}`, 10 * i, 10 * i, 50, 50);
    layer.appendChild(shape);
    shapes.push(shape);
  }
  return { layer, shapes };
}

/** name:index of every child, read through getElementIndex. */
function indices(layer: Layer): string[] {
  return layer.getChildren().map((node) => {
    const shape = node as Rectangle;
    return `${shape.getProperty("name") as string}:${shape.getElementIndex()}`;
  });
}

/** The children hit at a point, top first (forced, so unfilled rectangles hit). */
function hits(layer: Layer, x: number, y: number): unknown[] {
  const found = layer.hitTest(new Point(x, y), null, null, true, null, 0, true) as
    ElementHit[] | null;
  return (found || [])
    .filter((hit) => hit.element !== layer)
    .map((hit) => (hit.element as Rectangle).getProperty("name"));
}

/** Makes `layer` renumber in place on every change, as the old code did. */
function renumberRightAway(layer: Layer): Layer {
  (layer as unknown as AcceleratedApi)._refreshIndicesForward = (element, startIndex) => {
    let index = "number" != typeof startIndex || isNaN(startIndex) ? 0 : startIndex;
    for (let node: Node | null = element; null !== node; node = node.getNext()) {
      (node as Rectangle)._elementIndex = index++;
    }
  };
  return layer;
}

const REMOVE = [NodeChange.BeforeChildRemove, NodeChange.AfterChildRemove];

describe("element index numbering on read", () => {
  it("reads the numbers of removes from the front right away", () => {
    const { layer, shapes } = layerOf(8);
    layer.removeChild(shapes[0] as Rectangle);
    layer.removeChild(shapes[1] as Rectangle);
    layer.removeChild(shapes[2] as Rectangle);
    expect(indices(layer)).toEqual(["r3:0", "r4:1", "r5:2", "r6:3", "r7:4"]);
    expect(shapes.slice(0, 3).map((shape) => shape.getElementIndex())).toEqual([-1, -1, -1]);
  });

  it("reads the numbers of removes from the back to the front", () => {
    const { layer, shapes } = layerOf(8);
    layer.removeChild(shapes[4] as Rectangle);
    layer.removeChild(shapes[3] as Rectangle);
    expect(indices(layer)).toEqual(["r0:0", "r1:1", "r2:2", "r5:3", "r6:4", "r7:5"]);
    expect([shapes[3]?.getElementIndex(), shapes[4]?.getElementIndex()]).toEqual([2, 3]);
  });

  it("reads the numbers of a child moved to the bottom, and hits in that order", () => {
    const layer = new Layer();
    const a = rect("a", 0, 0, 50, 50);
    const b = rect("b", 20, 20, 50, 50);
    const c = rect("c", 40, 40, 50, 50);
    const d = rect("d", 30, 30, 50, 50);
    [a, b, c, d].forEach((shape) => layer.appendChild(shape));
    layer.removeChild(d);
    layer.insertChild(d, a);
    // Hit first: a read of an index would number the children for it.
    expect(hits(layer, 45, 45)).toEqual(["c", "b", "a", "d"]);
    expect(indices(layer)).toEqual(["d:0", "a:1", "b:2", "c:3"]);
  });

  it("keeps the numbers of a remove the layer isn't told about", () => {
    const { layer, shapes } = layerOf(6);
    layer.removeChild(shapes[0] as Rectangle);
    layer._beginBlockChanges(REMOVE);
    layer.removeChild(shapes[3] as Rectangle);
    layer._endBlockChanges(REMOVE);
    // The old code renumbered on the first remove only.
    expect(indices(layer)).toEqual(["r1:0", "r2:1", "r4:3", "r5:4"]);
    expect(shapes[3]?.getElementIndex()).toBe(2);
  });

  it("keeps the numbers around a child inserted while the layer is being updated", () => {
    const { layer, shapes } = layerOf(5);
    layer.beginUpdate();
    layer.removeChild(shapes[0] as Rectangle);
    const x = rect("x", 0, 0, 10, 10);
    layer.insertChild(x, shapes[3] as Rectangle);
    // The insert's tree update waits for endUpdate, so x is not numbered.
    expect(indices(layer)).toEqual(["r1:0", "r2:1", "x:-1", "r3:2", "r4:3"]);
    layer.endUpdate();
    expect(indices(layer)).toEqual(["r1:0", "r2:1", "x:2", "r3:3", "r4:4"]);
  });

  it("numbers like a layer that renumbers right away over a long mixed run", () => {
    function run(layer: Layer): unknown[] {
      let seed = 7;
      const random = (n: number): number => {
        // mulberry32
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * n);
      };
      const out: unknown[] = [];
      const removed: Rectangle[] = [];
      let made = 0;
      const make = (): Rectangle =>
        rect(`r${made++}`, random(150), random(150), 20 + random(60), 20 + random(60));
      /** A random child of the layer, or null when it has none. */
      const any = (): Rectangle | null => {
        const children = layer.getChildren();
        return children.length ? (children[random(children.length)] as Rectangle) : null;
      };
      for (let i = 0; i < 30; i++) layer.appendChild(make());
      for (let step = 0; step < 400; step++) {
        const count = layer.getChildren().length;
        const op = random(10);
        if (op < 3 && count) {
          // Mostly from the front, as imports, deletes and cuts do.
          const child = (random(2) ? layer.getChildByIndex(random(3)) : null) || any();
          layer.removeChild(child as Rectangle);
          removed.push(child as Rectangle);
        } else if (op < 5 && removed.length) {
          const child = removed.splice(random(removed.length), 1)[0] as Rectangle;
          layer.insertChild(child, random(3) ? any() : null);
        } else if (op < 6) {
          layer.insertChild(make(), random(2) ? any() : null);
        } else if (op < 7 && count > 1) {
          const child = any() as Rectangle;
          layer.removeChild(child);
          layer.insertChild(child, random(2) ? any() : null);
        } else if (op < 8 && count) {
          const child = any() as Rectangle;
          if (child.hasFlag(ElementFlag.Hidden)) child.removeFlag(ElementFlag.Hidden);
          else child.setFlag(ElementFlag.Hidden);
        } else if (op < 9 && count) {
          const x = random(150);
          const y = random(150);
          (any() as Rectangle).setProperty("trf", new Transform(15, 0, 0, 15, x, y));
        } else if (count > 2) {
          // A remove and an insert the layer's tree upkeep doesn't see.
          const child = any() as Rectangle;
          layer._beginBlockChanges(REMOVE);
          layer.removeChild(child);
          layer._endBlockChanges(REMOVE);
          removed.push(child);
          layer.beginUpdate();
          layer.insertChild(make(), any());
          if (random(2)) {
            const first = layer.getFirstChild() as Rectangle;
            layer.removeChild(first);
            removed.push(first);
          }
          out.push(indices(layer));
          layer.endUpdate();
        }
        // Read only now and then, so renumberings pile up in between.
        if (0 === random(4)) {
          out.push(hits(layer, 60, 60), hits(layer, 120, 90));
          out.push(
            indices(layer),
            removed.map((shape) => shape.getElementIndex()),
          );
        }
      }
      out.push(
        indices(layer),
        removed.map((shape) => shape.getElementIndex()),
      );
      return out;
    }
    const lazy = run(new Layer());
    const eager = run(renumberRightAway(new Layer()));
    expect(lazy.length).toBeGreaterThan(100);
    expect(lazy).toEqual(eager);
  });
});
