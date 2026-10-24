import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { VertexPolyBoolean } from "../../engine/geometry/boolean/vertex-poly-boolean.ts";
import { CompoundShape } from "../../engine/scene/compound-shape.ts";
import { Ellipse } from "../../engine/scene/ellipse.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import { BoolOpProperties } from "./bool-op-properties.ts";
import type { InspectedElements } from "./properties.ts";
import {
  click,
  documentOf,
  find,
  installShapeTestDom,
  sceneWith,
  type ShapeTestDom,
} from "./shape-panels-dom.testing.ts";

let env: ShapeTestDom;
beforeEach(() => {
  env = installShapeTestDom();
});
afterEach(() => env.uninstall());

describe("BoolOpProperties", () => {
  it("writes the operation to every child after the first in one transaction", () => {
    const compound = new CompoundShape();
    const first = new Rectangle();
    const second = new Rectangle();
    const third = new Ellipse();
    compound.appendChild(first);
    compound.appendChild(second);
    compound.appendChild(third);
    const log: string[] = [];
    const document = documentOf(sceneWith(compound), log);
    const panel = env.dom.document.createElement("div");
    const properties = new BoolOpProperties();
    properties.init(panel as unknown as HTMLElement);
    expect(properties.update(document, [compound] as InspectedElements)).toBe(true);

    const button = (op: number) => find(panel, `button[data-op="${op}"]`);
    const active = () =>
      [
        VertexPolyBoolean.OR,
        VertexPolyBoolean.SUB,
        VertexPolyBoolean.AND,
        VertexPolyBoolean.XOR,
      ].filter((op) => button(op).classList.contains("g-active"));
    const before = first.getProperty("bool");

    // A click on the icon inside the button finds the button's operation.
    click(find(button(VertexPolyBoolean.SUB), "span"));
    expect(second.getProperty("bool")).toBe(VertexPolyBoolean.SUB);
    expect(third.getProperty("bool")).toBe(VertexPolyBoolean.SUB);
    expect(first.getProperty("bool")).toBe(before);
    expect(log).toEqual(["begin", "commit Modify merge mode"]);
    expect(env.stats).toContainEqual(["booleanops_click_subtract"]);
    // The change on the first edited child re-marks the buttons.
    expect(active()).toEqual([VertexPolyBoolean.SUB]);

    click(button(VertexPolyBoolean.XOR));
    expect(active()).toEqual([VertexPolyBoolean.XOR]);
    expect(third.getProperty("bool")).toBe(VertexPolyBoolean.XOR);
  });
});
