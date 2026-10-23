import { describe, expect, it } from "vitest";
import type { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import { ImageGrid } from "../../engine/scene/image-grid.ts";
import { BaseEditor } from "./base-editor.ts";
import { ElementEditor } from "./element-editor.ts";
import { ImageGridEditor } from "./image-grid-editor.ts";

function box(rect: Rect | null): number[] | null {
  return rect ? [rect.getX(), rect.getY(), rect.getWidth(), rect.getHeight()] : null;
}

describe("GImageGridEditor", () => {
  it("uses the geometry box without a box transform", () => {
    const grid = new ImageGrid(true);
    grid.setProperty("trf", new Transform(2, 0, 0, 3, 10, 20));
    const editor = ElementEditor.createEditor(grid) as ImageGridEditor;
    expect(editor).toBeInstanceOf(ImageGridEditor);
    expect(box(editor.getBox())).toEqual(box(grid.getGeometryBBox()));
    expect(editor.getBoxTransform()).toBeNull();
  });

  it("resets the child editors' transforms with its own", () => {
    const grid = new ImageGrid(true);
    const editor = ElementEditor.createEditor(grid) as ImageGridEditor;
    const child = new BaseEditor();
    const resets: unknown[] = [];
    child.resetTransform = () => resets.push("base");
    editor.appendEditor(child);
    editor.edTransform(new Transform(1, 0, 0, 1, 5, 5));
    editor.resetTransform();
    // Only element editors are reset.
    expect(resets).toEqual([]);
    expect(editor._transform).toBeNull();
  });
});
