import { describe, expect, it } from "vitest";
import { Point } from "../../engine/math/point.ts";
import type { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import { Block } from "../../engine/scene/block.ts";
import { ElementFlag } from "../../engine/scene/element-change.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import { BaseEditor } from "./base-editor.ts";
import { BlockEditor } from "./block-editor.ts";
import { BoxEditor } from "./box-editor.ts";
import type { EditedElement } from "./element-editor.ts";

function box(rect: Rect | null): number[] | null {
  return rect ? [rect.getX(), rect.getY(), rect.getWidth(), rect.getHeight()] : null;
}

function rect(x: number, y: number, w: number, h: number): EditedElement {
  const r = new Rectangle();
  r.setProperty("trf", new Transform(w / 2, 0, 0, h / 2, x + w / 2, y + h / 2));
  return r as unknown as EditedElement;
}

/** A block editor that previews on a clone, as the shape editors do. */
class PreviewingEditor extends BlockEditor {
  override createElementPreview(): void {
    if (!this._elementPreview)
      this._setElementPreview(
        (this._element as unknown as Rectangle).clone() as unknown as EditedElement,
      );
  }

  override canApplyTransform(): unknown {
    return !!this._preTransform;
  }
}

const identity = new Transform();
const noGuides = { mapPoint: (p: Point) => p };

describe("GBlockEditor", () => {
  it("drops the handles the program lock forbids", () => {
    const free = new BlockEditor(rect(0, 0, 10, 10));
    expect(free.hasFlag(BoxEditor.Flag.ResizeAll)).toBe(true);
    const sized = rect(0, 0, 10, 10);
    sized.setProperty("plkt", Block.ProgramLck.NoSizeChanges);
    const noSize = new BlockEditor(sized);
    expect(noSize.hasFlag(BoxEditor.Flag.ResizeEdges)).toBe(false);
    expect(noSize.hasFlag(BoxEditor.Flag.ResizeCenters)).toBe(false);
    expect(noSize.hasFlag(BoxEditor.Flag.RotateHandle)).toBe(true);
    const moved = rect(0, 0, 10, 10);
    moved.setProperty("plkt", Block.ProgramLck.NoMove);
    const noMove = new BlockEditor(moved);
    expect(noMove.hasFlag(BoxEditor.Flag.ResizeEdges)).toBe(true);
    expect(noMove.hasFlag(BoxEditor.Flag.RotateHandle)).toBe(false);
    expect(noMove.hasFlag(BoxEditor.Flag.RotateCorners)).toBe(false);
  });

  it("uses the source box with the element's transform as its box", () => {
    const element = rect(100, 50, 40, 20);
    const editor = new BlockEditor(element);
    expect(box(editor.getBox())).toEqual([-1, -1, 2, 2]);
    expect(editor.getBoxTransform()?.getMatrix()).toEqual([20, 0, 0, 10, 120, 60]);
  });

  it("previews a resize on its preview and applies it as one transform", () => {
    const element = rect(0, 0, 100, 50);
    const editor = new PreviewingEditor(element);
    editor.setFlag(BaseEditor.Flag.Selected);
    const part = editor.getPartInfoAt(new Point(100, 50), identity);
    expect(part?.id).toBe(BoxEditor.RESIZE_HANDLE_PART_ID);
    editor.movePart(part?.id, part?.data, new Point(150, 100), identity, noGuides, false, false);
    expect(box(editor.getPaintElement().getGeometryBBox())).toEqual([0, 0, 150, 100]);
    expect(box(element.getGeometryBBox())).toEqual([0, 0, 100, 50]);
    // The handles follow the preview while painting.
    editor._usePaintElement = true;
    expect(editor.getBoxTransform()?.getMatrix()).toEqual([75, 0, 0, 50, 75, 50]);
    editor._usePaintElement = false;
    editor.applyPartMove(part?.id, part?.data);
    expect(box(element.getGeometryBBox())).toEqual([0, 0, 150, 100]);
    expect(editor.getPaintElement()).toBe(element);
    expect(editor._preTransform).toBeNull();
  });

  it("drops a resize it can't apply", () => {
    const element = rect(0, 0, 100, 50);
    const editor = new BlockEditor(element);
    editor.setFlag(BaseEditor.Flag.Selected);
    editor._setTransform(new Transform(2, 0, 0, 2, 0, 0));
    element.setFlag(ElementFlag.PartialLocked);
    editor.applyPartMove(BoxEditor.RESIZE_HANDLE_PART_ID, null);
    expect(box(element.getGeometryBBox())).toEqual([0, 0, 100, 50]);
    expect(editor._transform).toBeNull();
    expect(editor.hasFlag(BaseEditor.Flag.Outline)).toBe(false);
  });
});
