import { describe, expect, it } from "vitest";
import { Point } from "../../engine/math/point.ts";
import { Transform } from "../../engine/math/transform.ts";
import { ParameterizedVertexProcessor } from "../../engine/scene/parameterized-vertex-processor.ts";
import { Scene } from "../../engine/scene/scene.ts";
import { SimpleShape } from "../../engine/scene/simple-shape.ts";
import { Workspace } from "../../engine/scene/workspace.ts";
import { BaseEditor } from "./base-editor.ts";
import { ElementEditor } from "./element-editor.ts";
import { SimpleShapeEditor } from "./simple-shape-editor.ts";

const annotations = [{ X: "x", Y: -1, minX: -0.9, maxX: 0.9 }];
const parameters = [
  { name: "px", expression: "annot[0].X" },
  { name: "py", expression: "min(1, abs(annot[0].X) + 0.5)" },
];
const vertices = [1, 2, "px", 1, -1, 2, 1, 1, 2, "py", 2, 1, -1, 1, 1, 5];

function setup() {
  const scene = new Scene(new Workspace());
  (scene as unknown as { __graphic_editor__: unknown }).__graphic_editor__ = {
    requestInvalidation: () => {},
  };
  const processor = new ParameterizedVertexProcessor("annot", annotations, parameters, vertices);
  const shape = new SimpleShape(processor, [new Point(-0.5, -1)], 100, 80, "Triangle", "icon");
  scene.appendChild(shape);
  const editor = ElementEditor.openEditor(shape) as SimpleShapeEditor;
  editor.setFlag(BaseEditor.Flag.Selected);
  return { shape, editor };
}

function xy(p: Point | null): number[] | null {
  return p ? [p.getX(), p.getY()] : null;
}

describe("GSimpleShapeEditor", () => {
  it("shows the annotations only in detail mode", () => {
    const { editor } = setup();
    expect(editor._showSegmentDetails()).toBe(false);
    editor.setFlag(BaseEditor.Flag.Detail);
    expect(editor._showSegmentDetails()).toBe(true);
  });

  it("hits an annotation in detail mode", () => {
    const { shape, editor } = setup();
    const at = shape.getAnnotationPosition(0) as Point;
    expect(editor._getPartInfoAt(at, new Transform(), 0)?.id).not.toBe(
      SimpleShapeEditor.ANNOTATION_PART_ID,
    );
    editor.setFlag(BaseEditor.Flag.Detail);
    const hit = editor._getPartInfoAt(at, new Transform(), 0);
    expect(hit?.id).toBe(SimpleShapeEditor.ANNOTATION_PART_ID);
    expect(hit?.data).toEqual({ annotationIdx: 0 });
  });

  it("moves an annotation on a preview and writes it on apply", () => {
    const { shape, editor } = setup();
    editor.setFlag(BaseEditor.Flag.Detail);
    const before = xy(shape.getAnnotationPosition(0));
    const data = { annotationIdx: 0 };
    const target = new Point((before?.[0] as number) + 20, before?.[1] as number);
    const result = editor.movePart(
      SimpleShapeEditor.ANNOTATION_PART_ID,
      data,
      target,
      new Transform(),
      { mapPoint: (p: Point) => p },
    );
    expect(result).toBeNull();
    const preview = editor.getPaintElement();
    expect(preview).not.toBe(shape);
    expect(xy(shape.getAnnotationPosition(0))).toEqual(before);
    // While a preview is painted the annotations hide.
    expect(editor._showSegmentDetails()).toBe(false);
    const moved = xy(preview.getAnnotationPosition(0));
    expect(moved).not.toEqual(before);
    editor.applyPartMove(SimpleShapeEditor.ANNOTATION_PART_ID, data);
    expect(xy(shape.getAnnotationPosition(0))).toEqual(moved);
    expect(editor.getPaintElement()).toBe(shape);
  });

  it("never deletes parts", () => {
    expect(setup().editor.isDeletePartsAllowed()).toBe(false);
  });
});
