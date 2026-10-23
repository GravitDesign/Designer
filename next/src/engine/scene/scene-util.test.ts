import { describe, expect, it } from "vitest";
import { Transform } from "../math/transform.ts";
import { Ellipse } from "./ellipse.ts";
import { Group } from "./group.ts";
import { Layer } from "./layer.ts";
import { Node } from "./node.ts";
import { Page } from "./page.ts";
import { Rectangle } from "./rectangle.ts";
import { SceneUtil } from "./scene-util.ts";

function rect(): Rectangle {
  const r = new Rectangle();
  r.setProperty("trf", new Transform(5, 0, 0, 5, 5, 5));
  return r;
}

const names = (node: Node): unknown =>
  node instanceof Group || node instanceof Layer
    ? [Node.getName(node), ...node.getChildren().map(names)]
    : Node.getName(node);

describe("SceneUtil.asFlattenElement", () => {
  it("returns the only element itself", () => {
    const page = new Page();
    const only = rect();
    page.appendChild(only);
    expect(SceneUtil.asFlattenElement(page)).toBe(only);
    expect(only.getParent()).toBeNull();
  });

  it("dissolves groups and turns layers into groups", () => {
    const page = new Page();
    const layer = new Layer();
    const group = new Group();
    group.appendChild(rect());
    group.appendChild(new Ellipse());
    layer.appendChild(group);
    layer.appendChild(rect());
    page.appendChild(layer);
    page.appendChild(new Ellipse());
    const result = SceneUtil.asFlattenElement(page);
    // The layer's content ends up directly in the result group, the inner
    // group dissolved into it; the layer itself stays in the page.
    expect(names(result)).toEqual(["group", "rectangle", "ellipse", "rectangle", "ellipse"]);
    expect(page.getChildren()).toEqual([layer]);
  });

  it("can't be constructed", () => {
    expect(() => new SceneUtil()).toThrow("This class cannot be instantiated");
  });
});
