import { describe, expect, it } from "vitest";
import { Point } from "../../engine/math/point.ts";
import type { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import { CompoundPath } from "../../engine/scene/compound-path.ts";
import { AnchorPoint } from "../../engine/scene/path-base.ts";
import { NodeFlag } from "../../engine/scene/node-change.ts";
import type { Node } from "../../engine/scene/node.ts";
import { Path } from "../../engine/scene/path.ts";
import { Scene } from "../../engine/scene/scene.ts";
import { Workspace } from "../../engine/scene/workspace.ts";
import { BaseEditor } from "./base-editor.ts";
import { BoxEditor } from "./box-editor.ts";
import { CompoundPathEditor } from "./compound-path-editor.ts";
import { ElementEditor } from "./element-editor.ts";
import { PathEditor } from "./path-editor.ts";

function box(rect: Rect | null): number[] | null {
  return rect ? [rect.getX(), rect.getY(), rect.getWidth(), rect.getHeight()] : null;
}

function square(x: number, y: number, size: number): Path {
  const p = new Path(true);
  for (const [px, py] of [
    [x, y],
    [x + size, y],
    [x + size, y + size],
    [x, y + size],
  ] as const) {
    const ap = new AnchorPoint();
    ap.setProperties(["x", "y"], [px, py]);
    p.getAnchorPoints().appendChild(ap);
  }
  return p;
}

function setup() {
  const scene = new Scene(new Workspace());
  (scene as unknown as { __graphic_editor__: unknown }).__graphic_editor__ = {
    requestInvalidation: () => {},
  };
  const compound = new CompoundPath();
  const outer = square(0, 0, 100);
  const inner = square(25, 25, 50);
  compound.getPaths().appendChild(outer);
  compound.getPaths().appendChild(inner);
  scene.appendChild(compound);
  const editor = ElementEditor.openEditor(compound) as CompoundPathEditor;
  expect(editor).toBeInstanceOf(CompoundPathEditor);
  return { compound, outer, inner, editor };
}

describe("GCompoundPathEditor", () => {
  it("opens the sub-path editors with the flags, without catch handles or resize handles", () => {
    const { outer, inner, editor } = setup();
    editor.setFlag(BaseEditor.Flag.Selected);
    for (const path of [outer, inner]) {
      const child = ElementEditor.getEditor(path) as PathEditor;
      expect(child).toBeInstanceOf(PathEditor);
      expect(child.getParentEditor()).toBe(editor);
      expect(child.hasFlag(BaseEditor.Flag.Selected)).toBe(true);
      // The compound path is resizable, so the sub-paths are outlined.
      expect(child.hasFlag(BaseEditor.Flag.Outline)).toBe(true);
      expect(child.hasFlag(BoxEditor.Flag.ResizeEdges)).toBe(false);
      expect(child._catchHandleAllowed()).toBe(false);
    }
    editor.removeFlag(BoxEditor.Flag.ResizeAll);
    expect((ElementEditor.getEditor(outer) as PathEditor).hasFlag(BaseEditor.Flag.Outline)).toBe(
      false,
    );
  });

  it("compares path part ids by point or segment", () => {
    const { editor } = setup();
    const a = {};
    const b = {};
    const point = PathEditor.PartType.Point;
    const segment = PathEditor.PartType.Segment;
    expect(editor._partIdAreEqual({ type: point, point: a }, { type: point, point: a })).toBe(true);
    expect(editor._partIdAreEqual({ type: point, point: a }, { type: point, point: b })).toBe(
      false,
    );
    expect(
      editor._partIdAreEqual(
        { type: segment, apLeft: a, apRight: b },
        { type: segment, apLeft: a, apRight: b },
      ),
    ).toBe(true);
    expect(
      editor._partIdAreEqual(
        { type: segment, apLeft: a, apRight: b },
        { type: segment, apLeft: b, apRight: b },
      ),
    ).toBe(false);
    expect(editor._partIdAreEqual({ type: point, point: a }, { type: segment, point: a })).toBe(
      false,
    );
  });

  it("keeps no part selection of its own", () => {
    const { editor } = setup();
    editor.setFlag(BaseEditor.Flag.Selected);
    editor.updatePartSelection(false, ["x"]);
    expect(editor.getPartSelection()).toBeNull();
  });

  it("tags hits with itself as owner", () => {
    const { editor } = setup();
    editor.setFlag(BaseEditor.Flag.Selected);
    // The bottom-right resize handle of the compound path.
    const hit = editor.getPartInfoAt(new Point(100, 100), new Transform(), null, 2);
    expect(hit?.id).toBe(BoxEditor.RESIZE_HANDLE_PART_ID);
    expect((hit?.data as { ownerEditor: unknown }).ownerEditor).toBe(editor);
    // Without the resize handles the sub-path's anchor point is hit.
    editor.removeFlag(BoxEditor.Flag.ResizeAll);
    const point = editor.getPartInfoAt(new Point(100, 100), new Transform(), null, 2);
    expect(point?.editor).toBeInstanceOf(PathEditor);
    expect(point?.editor).not.toBe(editor);
    expect((point?.data as { ownerEditor: unknown }).ownerEditor).toBe(editor);
  });

  it("passes a transform to the sub-path editors and applies it to the whole compound path", () => {
    const { compound, outer, editor } = setup();
    editor.setFlag(BaseEditor.Flag.Selected);
    editor.edTransform(new Transform(1, 0, 0, 1, 10, 5));
    expect(editor._transform).not.toBeNull();
    expect(editor.canApplyTransform()).toBeTruthy();
    editor.applyTransform(compound);
    expect(box(compound.getGeometryBBox())).toEqual([10, 5, 100, 100]);
    expect(box(outer.getGeometryBBox())).toEqual([10, 5, 100, 100]);
    expect(editor._transform).toBeNull();
  });

  it("allows deleting when some, but not all, sub-paths are fully selected", () => {
    const { outer, inner, editor } = setup();
    editor.setFlag(BaseEditor.Flag.Selected);
    expect(editor.isDeletePartsAllowed()).toBe(false);
    for (let p: Node | null = outer.getAnchorPoints().getFirstChild(); p; p = p.getNext()) {
      p.setFlag(NodeFlag.Selected);
    }
    const child = ElementEditor.getEditor(outer) as PathEditor;
    expect(child.hasAllPointsSelected()).toBe(true);
    expect(child.isDeletePartsAllowed()).toBe(false);
    expect(editor.isDeletePartsAllowed()).toBe(true);
    // Both sub-paths fully selected: nothing to delete part-wise.
    for (let p: Node | null = inner.getAnchorPoints().getFirstChild(); p; p = p.getNext())
      p.setFlag(NodeFlag.Selected);
    expect(editor.isDeletePartsAllowed()).toBe(false);
  });
});
