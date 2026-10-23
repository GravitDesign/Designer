import { describe, expect, it } from "vitest";
import { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import { Slice } from "../../engine/scene/slice.ts";
import { BaseEditor } from "./base-editor.ts";
import { BoxEditor } from "./box-editor.ts";
import { ElementEditor } from "./element-editor.ts";
import { SliceEditor } from "./slice-editor.ts";

function box(rect: Rect | null): number[] | null {
  return rect ? [rect.getX(), rect.getY(), rect.getWidth(), rect.getHeight()] : null;
}

function slice(): Slice {
  const s = new Slice();
  s.setProperties(["x", "y", "w", "h"], [100, 50, 80, 40]);
  return s;
}

function editorOf(s: Slice): SliceEditor {
  const editor = ElementEditor.createEditor(s) as SliceEditor;
  editor.setFlag(BaseEditor.Flag.Selected);
  return editor;
}

describe("GSliceEditor", () => {
  it("is the editor of slices and can't rotate", () => {
    const editor = editorOf(slice());
    expect(editor).toBeInstanceOf(SliceEditor);
    expect(editor.hasFlag(BoxEditor.Flag.RotateCorners)).toBe(false);
    expect(editor.hasFlag(BoxEditor.Flag.RotateHandle)).toBe(false);
    expect(editor.hasFlag(BoxEditor.Flag.ResizeEdges)).toBe(true);
  });

  it("writes a box resize preview to x, y, w and h", () => {
    const s = slice();
    const editor = editorOf(s);
    // Twice as wide, anchored at the left edge.
    editor.transformBox(Transform.getResizeTransform(new Rect(100, 50, 80, 40), "rc", 80, 0));
    expect(box(editor.getPaintElement().getGeometryBBox())).toEqual([100, 50, 160, 40]);
    expect(editor.canApplyTransform()).toBeTruthy();
    editor.applyTransform(s);
    expect([
      s.getProperty("x"),
      s.getProperty("y"),
      s.getProperty("w"),
      s.getProperty("h"),
    ]).toEqual([100, 50, 160, 40]);
  });

  it("drops a rotated preview", () => {
    const s = slice();
    const editor = editorOf(s);
    editor.edTransform(new Transform().rotated(Math.PI / 4));
    editor.applyTransform(s);
    expect([
      s.getProperty("x"),
      s.getProperty("y"),
      s.getProperty("w"),
      s.getProperty("h"),
    ]).toEqual([100, 50, 80, 40]);
  });

  it("moves by a plain transform without a preview", () => {
    const s = slice();
    const editor = editorOf(s);
    editor.edTransform(new Transform(1, 0, 0, 1, 7, -3));
    editor.applyTransform(s);
    expect([
      s.getProperty("x"),
      s.getProperty("y"),
      s.getProperty("w"),
      s.getProperty("h"),
    ]).toEqual([107, 47, 80, 40]);
  });

  // Old bug (BUGS-FIXED candidate): without a preview the height is scaled
  // by the transform's matrix[1] (vertical shear), which is 0 for a scale.
  it("sets the height to 0 for a scale without a preview (old bug)", () => {
    const s = slice();
    const editor = editorOf(s);
    editor.edTransform(new Transform(2, 0, 0, 2, 0, 0));
    editor.applyTransform(s);
    expect([s.getProperty("w"), s.getProperty("h")]).toEqual([160, 0]);
  });
});
