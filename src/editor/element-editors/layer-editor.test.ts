import { describe, expect, it } from "vitest";
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import type { PaintContext } from "../../engine/paint/paint-context.ts";
import { Layer } from "../../engine/scene/layer.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import { Scene } from "../../engine/scene/scene.ts";
import { Workspace } from "../../engine/scene/workspace.ts";
import { BaseEditor } from "./base-editor.ts";
import { ElementEditor } from "./element-editor.ts";
import { LayerEditor } from "./layer-editor.ts";
import "./rectangle-editor.ts";

function box(rect: Rect | null): number[] | null {
  return rect ? [rect.getX(), rect.getY(), rect.getWidth(), rect.getHeight()] : null;
}

function setup() {
  const scene = new Scene(new Workspace());
  (scene as unknown as { __graphic_editor__: unknown }).__graphic_editor__ = {
    requestInvalidation: () => {},
  };
  const layer = new Layer();
  const child = new Rectangle();
  child.setProperty("trf", new Transform(50, 0, 0, 25, 50, 25));
  layer.appendChild(child);
  scene.appendChild(layer);
  const editor = ElementEditor.openEditor(layer) as LayerEditor;
  expect(editor).toBeInstanceOf(LayerEditor);
  return { layer, child, editor };
}

describe("GLayerEditor", () => {
  it("paints with the layer colour as selection colour and restores it", () => {
    const { layer, editor } = setup();
    layer.setProperty("cls", new RGBColor([200, 0, 200]));
    editor.setFlag(BaseEditor.Flag.Highlighted);
    const original = new RGBColor([1, 2, 3]);
    const context = { selectionOutlineColor: original } as unknown as PaintContext;
    const seen: unknown[] = [];
    editor._paintOutline = () => {
      seen.push(context.selectionOutlineColor);
    };
    editor.paint(new Transform(), context);
    expect(seen).toEqual([layer.getProperty("cls")]);
    expect(context.selectionOutlineColor).toBe(original);
  });

  it("applies a transform through the children without a frame", () => {
    const { layer, child, editor } = setup();
    editor.edTransform(new Transform(1, 0, 0, 1, 10, 20));
    editor.applyTransform(layer);
    expect(box(child.getGeometryBBox())).toEqual([10, 20, 100, 50]);
  });

  it("moves only the frame when there is one", () => {
    const { layer, child, editor } = setup();
    layer.setProperty("frm", new Rect(0, 0, 300, 200));
    editor.edTransform(new Transform(1, 0, 0, 1, 10, 20));
    // The frame keeps the children's editors closed.
    expect(ElementEditor.getEditor(child)).toBeNull();
    editor.applyTransform(layer);
    expect(box(layer.getProperty("frm") as Rect)).toEqual([10, 20, 300, 200]);
    expect(box(child.getGeometryBBox())).toEqual([0, 0, 100, 50]);
  });

  it("closes the children's editors in a reset", () => {
    const { child, editor } = setup();
    editor.edTransform(new Transform(1, 0, 0, 1, 10, 20));
    expect(ElementEditor.getEditor(child)).not.toBeNull();
    editor.resetTransform();
    expect(ElementEditor.getEditor(child)).toBeNull();
    expect(editor.getEditors()).toEqual([]);
  });
});
