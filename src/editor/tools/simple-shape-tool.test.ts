import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Point } from "../../engine/math/point.ts";
import { Rect } from "../../engine/math/rect.ts";
import { SimpleShape } from "../../engine/scene/simple-shape.ts";
import { installFakeDom } from "../view/testing/fake-dom.ts";
import type { DrawnShape } from "./shape-tool.ts";
import { SimpleShapeTool, type SimpleShapeDefinition } from "./simple-shape-tool.ts";
import { children, clearModifiers, releaseTools, setupTools } from "./tool-testing.ts";

let uninstall: () => void;
beforeEach(() => {
  uninstall = installFakeDom();
  vi.useFakeTimers();
});
afterEach(() => {
  releaseTools();
  clearModifiers();
  vi.useRealTimers();
  uninstall();
});

/**
 * A small ready shape: a triangle whose tip follows one annotation, at a
 * natural size of 100 x 80 (as in simple-shape.test.ts).
 */
const TRIANGLE: SimpleShapeDefinition = {
  name: "Test Triangle",
  width: 100,
  height: 80,
  annotations: {
    name: "annot",
    annotList: [{ X: "x", Y: -1, minX: -0.9, maxX: 0.9, x0: -0.25, y0: -1 }],
  },
  parameters: [
    { name: "px", expression: "annot[0].X" },
    { name: "py", expression: "min(1, abs(annot[0].X) + 0.5)" },
  ],
  vertices: [1, 2, "px", 1, -1, 2, 1, 1, 2, "py", 2, 1, -1, 1, 1, 5],
};

/** The pointer tool's manager with the ready shape tool active for `definition`. */
function activate(definition: SimpleShapeDefinition | null, icon: string | null = "shape-icon") {
  const s = setupTools();
  const tool = s.manager.getTool(s.manager.indexOf(SimpleShapeTool)) as SimpleShapeTool;
  if (definition) tool.init(definition);
  s.manager.activateTool(SimpleShapeTool, icon);
  return { ...s, tool };
}

const shapes = (s: ReturnType<typeof activate>): SimpleShape[] =>
  children(s.page).filter((n): n is SimpleShape => n instanceof SimpleShape);

const box = (rect: Rect | null): number[] =>
  rect ? [rect.getX(), rect.getY(), rect.getWidth(), rect.getHeight()] : [];

describe("SimpleShapeTool", () => {
  it("starts the shape's annotations at the definition's start values", () => {
    const s = activate(TRIANGLE);
    expect(s.tool._annotationsParamInitVals?.map((p) => [p.getX(), p.getY()])).toEqual([
      [-0.25, -1],
    ]);
    s.input.click(200, 150);
    const [shape] = shapes(s);
    // The annotation's unit position (-0.25, -1) in the 100 x 80 shape
    // placed at (200, 150): x 200 + (1 - 0.25) / 2 * 100, y at the top.
    const position = (shape as SimpleShape).getAnnotationPosition(0) as Point;
    expect([position.getX(), position.getY()]).toEqual([237.5, 150]);
  });

  it("a click places the shape at its natural size with its top-left corner at the click", () => {
    const s = activate(TRIANGLE);
    s.input.click(200, 150);
    const all = shapes(s);
    expect(all).toHaveLength(1);
    const shape = all[0] as SimpleShape;
    expect(box(shape.getGeometryBBox())).toEqual([200, 150, 100, 80]);
    expect(s.editor.getUndoStateName()).toBe("Insert Element(s)");
  });

  it("a drag maps the shape's source box onto the dragged area", () => {
    const s = activate(TRIANGLE);
    s.input.dragThrough(
      [100, 50],
      [
        [150, 80],
        [300, 150],
      ],
    );
    const all = shapes(s);
    expect(all).toHaveLength(1);
    const shape = all[0] as SimpleShape;
    const geometry = box(shape.getGeometryBBox());
    [100, 50, 200, 100].forEach((value, i) => expect(geometry[i]).toBeCloseTo(value, 9));
    expect(s.editor.getUndoStates().length).toBe(1);
  });

  it("the icon given at activation reaches the shape", () => {
    const s = activate(TRIANGLE, "my-ready-shape");
    expect(s.tool.getIcon()).toBe("my-ready-shape");
    s.input.click(200, 150);
    expect((shapes(s)[0] as SimpleShape).getIcon()).toBe("my-ready-shape");
  });

  it("without a definition there is no shape to draw", () => {
    const tool = new SimpleShapeTool();
    expect(tool._createShape()).toBeNull();
    expect(tool.getIcon()).toBeNull();
    const s = activate(null);
    s.tool._parameterizedVertexProcessor = null;
    s.input.click(200, 150);
    expect(shapes(s)).toEqual([]);
  });

  it("_updateShape fails without an area or with an empty source box", () => {
    const tool = new SimpleShapeTool();
    const set = vi.fn();
    const shapeWith = (source: Rect | null) =>
      ({ getSourceBBox: () => source, setProperty: set }) as unknown as DrawnShape;
    const area = new Rect(0, 0, 10, 10);
    expect(tool._updateShape(shapeWith(new Rect(0, 0, 5, 5)), null, null)).toBe(false);
    expect(tool._updateShape(shapeWith(null), area, null)).toBe(false);
    expect(tool._updateShape(shapeWith(new Rect(3, 3, 0, 0)), area, null)).toBe(false);
    expect(set).not.toHaveBeenCalled();
    expect(tool._updateShape(shapeWith(new Rect(0, 0, 5, 5)), area, null)).toBe(true);
    expect(set).toHaveBeenCalledTimes(1);
  });
});
