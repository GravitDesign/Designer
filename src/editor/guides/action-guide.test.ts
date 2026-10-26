// Expected values worked out from the old GActionGuide (chunk.vendor.js
// module 1076, lines 235527-235618).
import { describe, expect, it } from "vitest";
import { Point } from "../../engine/math/point.ts";
import { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import type { PaintContext } from "../../engine/paint/paint-context.ts";
import { Actionable } from "../../engine/scene/annotations/actionable.ts";
import { Accelerated } from "../../engine/scene/element-accelerated.ts";
import { Element } from "../../engine/scene/element.ts";
import { NodeFlag } from "../../engine/scene/node-change.ts";
import { Container } from "../../engine/scene/node-container.ts";
import type { Scene } from "../../engine/scene/scene.ts";
import { Text } from "../../engine/text/text.ts";
import { CollabTextAnnotationBase } from "../../engine/scene/annotations/collab-text-annotation-base.ts";
import { ActionGuide } from "./action-guide.ts";

type Painted = [string, number[]];

/** An action that records the transform it is painted with. */
function fakeAction(name: string, painted: Painted[]) {
  return {
    name,
    paint: (_context: PaintContext, transform: Transform) => {
      painted.push([name, transform.getMatrix()]);
    },
  };
}

/** An element node with stubbed members; `mixins` is what hasMixin answers yes to. */
function fakeElement(mixins: unknown[], members: Record<string, unknown>): Element {
  return Object.assign(Object.create(Element.prototype) as Element, {
    hasMixin: (mixin: unknown) => mixins.includes(mixin),
    hasFlag: () => false,
    getPrevious: () => null,
    ...members,
  });
}

function actionable(box: Rect | null, actions: unknown[]): Element {
  return fakeElement([Actionable], { getActionsBBox: () => box, getActions: () => actions });
}

/** A page whose children are linked first to last. */
function fakePage(children: Element[], options: { active?: boolean; at?: [number, number] }) {
  children.forEach((child, i) => {
    Object.assign(child, { getPrevious: () => children[i - 1] ?? null });
  });
  const [x, y] = options.at ?? [0, 0];
  return fakeElement([Container], {
    hasFlag: (flag: number) => flag === NodeFlag.Active && !!options.active,
    getLastChild: () => children[children.length - 1] ?? null,
    getPosition: (multiPageView?: boolean) => (multiPageView ? new Point(x, y) : new Point(0, 0)),
  });
}

function paint(
  pages: Element[] | null,
  transform: Transform,
  dirty: Rect[],
  multiPageView: boolean,
): { guide: ActionGuide; context: PaintContext } {
  const scene = { retrieveChildrenInPaintBBox: () => pages } as unknown as Scene;
  const guide = new ActionGuide({ _scene: scene, isMultiPageEnabled: () => multiPageView });
  const context = {
    canvas: { getWidth: () => 1000, getHeight: () => 1000 },
    dirtyMatcher: { getDirtyRectangles: () => dirty },
    configuration: { multiPageView },
  } as unknown as PaintContext;
  guide.paint(transform, context);
  return { guide, context };
}

describe("ActionGuide", () => {
  it("places each element's actions 5 px further left, scaled by the view", () => {
    const painted: Painted[] = [];
    const first = actionable(new Rect(100, 50, 20, 10), [
      fakeAction("a1", painted),
      fakeAction("a2", painted),
      fakeAction("a3", painted),
    ]);
    const outside = actionable(new Rect(600, 50, 20, 10), [fakeAction("c1", painted)]);
    const noBox = actionable(null, [fakeAction("d1", painted)]);
    const last = actionable(new Rect(300, 50, 20, 10), [fakeAction("b1", painted)]);
    const active = fakePage([first, outside, noBox, last], { active: true });
    // Without multi-page view only the active page counts.
    const inactive = fakePage([actionable(new Rect(100, 50, 20, 10), [fakeAction("x", painted)])], {
      at: [0, 0],
    });
    paint([inactive, active], new Transform(2, 0, 0, 2, 10, 20), [new Rect(0, 0, 400, 200)], false);
    // Children are collected last to first and walked back, so the
    // first child comes first; its top-left maps to (210, 120).
    expect(painted).toEqual([
      ["a1", [2, 0, 0, 2, 210, 120]],
      ["a2", [2, 0, 0, 2, 205, 120]],
      ["a3", [2, 0, 0, 2, 200, 120]],
      ["b1", [2, 0, 0, 2, 610, 120]],
    ]);
  });

  it("offsets boxes by the page position in multi-page view and paints each element once", () => {
    const painted: Painted[] = [];
    const visibleAreas: Rect[] = [];
    const inGroup = actionable(new Rect(0, 0, 10, 10), [fakeAction("g1", painted)]);
    const group = fakeElement([Container, Accelerated], {
      retrieveChildrenInPaintBBox: (area: Rect) => {
        visibleAreas.push(area);
        return [inGroup];
      },
    });
    const other = actionable(new Rect(20, 0, 10, 10), [fakeAction("o1", painted)]);
    const page = fakePage([group, other], { at: [1000, 0] });
    paint(
      [page],
      new Transform(),
      // Both areas cover both boxes (1000, 0) and (1020, 0).
      [new Rect(990, -5, 50, 30), new Rect(995, -5, 50, 30)],
      true,
    );
    expect(painted).toEqual([
      // The group is collected after `other`, so its child comes first.
      ["g1", [1, 0, 0, 1, 1000, 0]],
      ["o1", [1, 0, 0, 1, 1020, 0]],
    ]);
    // Accelerated containers are asked for the visible scene area.
    expect(visibleAreas.map((area) => [area.getX(), area.getY(), area.getWidth()])).toEqual([
      [0, 0, 1000],
    ]);
  });

  it("asks real nodes their class each time, so a swapped prototype counts at once", () => {
    const painted: Painted[] = [];
    // Real prototypes with the stock hasMixin; only what the guide reads is stubbed.
    const real = (proto: object, name: string, x: number): Element =>
      Object.assign(Object.create(proto) as Element, {
        getActionsBBox: () => new Rect(x, 0, 10, 10),
        getActions: () => [fakeAction(name, painted)],
        getPrevious: () => null,
      });
    const text = real(Text.prototype, "text", 0);
    const collab = real(CollabTextAnnotationBase.prototype, "collab", 20);
    const page = fakePage([text, collab], { active: true });
    paint([page], new Transform(), [new Rect(-5, -5, 100, 100)], false);
    expect(painted.map(([name]) => name)).toEqual(["collab"]);
    // Swap the classes (as CollabText.setModeText does) and paint again.
    painted.length = 0;
    Object.setPrototypeOf(text, CollabTextAnnotationBase.prototype);
    Object.setPrototypeOf(collab, Text.prototype);
    paint([page], new Transform(), [new Rect(-5, -5, 100, 100)], false);
    expect(painted.map(([name]) => name)).toEqual(["text"]);
  });

  it("gathers nothing when the scene returns no pages", () => {
    const { guide, context } = paint(null, new Transform(), [new Rect(0, 0, 10, 10)], false);
    expect(guide._gatherActions(new Transform(), context)).toBeUndefined();
  });
});
