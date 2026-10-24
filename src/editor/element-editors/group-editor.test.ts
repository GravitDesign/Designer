import { describe, expect, it } from "vitest";
import { Point } from "../../engine/math/point.ts";
import { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import { Group } from "../../engine/scene/group.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import { Scene } from "../../engine/scene/scene.ts";
import { Workspace } from "../../engine/scene/workspace.ts";
import { BaseEditor } from "./base-editor.ts";
import { BoxEditor } from "./box-editor.ts";
import { ElementEditor } from "./element-editor.ts";
import { GroupEditor } from "./group-editor.ts";
import "./rectangle-editor.ts";

function box(rect: Rect | null): number[] | null {
  return rect ? [rect.getX(), rect.getY(), rect.getWidth(), rect.getHeight()] : null;
}

function rect(x: number, y: number, w: number, h: number): Rectangle {
  const r = new Rectangle();
  r.setProperty("trf", new Transform(w / 2, 0, 0, h / 2, x + w / 2, y + h / 2));
  return r;
}

/** A scene with a GEditor stand-in and a group of two rectangles. */
function setup() {
  const scene = new Scene(new Workspace());
  const invalidations: unknown[] = [];
  (scene as unknown as { __graphic_editor__: unknown }).__graphic_editor__ = {
    requestInvalidation: (editor: unknown) => invalidations.push(editor),
  };
  const group = new Group();
  const a = rect(0, 0, 100, 50);
  const b = rect(200, 100, 50, 50);
  group.appendChild(a);
  group.appendChild(b);
  scene.appendChild(group);
  const editor = ElementEditor.openEditor(group) as GroupEditor;
  editor.setFlag(BaseEditor.Flag.Selected);
  return { scene, group, a, b, editor, invalidations };
}

describe("GGroupEditor", () => {
  it("is the editor of groups", () => {
    const { editor } = setup();
    expect(editor).toBeInstanceOf(GroupEditor);
    expect(editor.toString()).toBe("[Object GGroupEditor]");
  });

  it("previews a transform through the children's editors and applies it to them", () => {
    const { group, a, b, editor } = setup();
    editor.edTransform(new Transform(1, 0, 0, 1, 10, 5));
    const childA = ElementEditor.getEditor(a) as ElementEditor;
    expect(childA).not.toBeNull();
    expect(childA.getParentEditor()).toBe(editor);
    // The child previews the move; the element itself is untouched.
    expect(box(childA.getPaintElement().getGeometryBBox())).toEqual([10, 5, 100, 50]);
    expect(box(a.getGeometryBBox())).toEqual([0, 0, 100, 50]);
    editor.applyTransform(group);
    expect(box(a.getGeometryBBox())).toEqual([10, 5, 100, 50]);
    expect(box(b.getGeometryBBox())).toEqual([210, 105, 50, 50]);
    expect(box(group.getGeometryBBox())).toEqual([10, 5, 250, 150]);
    // Applying resets the preview.
    expect(editor._transform).toBeNull();
  });

  it("leaves the children alone in a reset", () => {
    const { a, editor } = setup();
    editor.edTransform(new Transform(2, 0, 0, 2, 0, 0));
    editor.resetTransform();
    const childA = ElementEditor.getEditor(a) as ElementEditor;
    expect(childA.getPaintElement()).toBe(a);
    expect(box(a.getGeometryBBox())).toEqual([0, 0, 100, 50]);
  });

  it("doesn't preview through the children with a frame", () => {
    const { group, a, editor } = setup();
    group.setFrame(true);
    editor.edTransform(new Transform(1, 0, 0, 1, 10, 5));
    expect(ElementEditor.getEditor(a)).toBeNull();
  });

  it("resizes the group's source box from a handle drag", () => {
    const { a, editor } = setup();
    const guides = { mapPoint: (p: Point) => p };
    const result = editor.movePart(
      BoxEditor.RESIZE_HANDLE_PART_ID,
      { side: Rect.Side.BOTTOM_RIGHT, point: new Point(250, 150), resizeSegment: 4, offset: null },
      new Point(500, 300),
      new Transform(),
      guides,
    ) as Transform;
    expect(Transform.serialize(result)).toEqual([2, 0, 0, 2, 0, 0]);
    // The children preview the resize (edTransform, not transformBox).
    const childA = ElementEditor.getEditor(a) as ElementEditor;
    expect(box(childA.getPaintElement().getGeometryBBox())).toEqual([0, 0, 200, 100]);
  });

  it("has no box when not selected or highlighted", () => {
    const { editor } = setup();
    editor.removeFlag(BaseEditor.Flag.Selected);
    expect(editor.getBBox(new Transform())).toBeNull();
  });
});
