import { describe, expect, it } from "vitest";
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { Point } from "../../engine/math/point.ts";
import { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import type { PaintLayers } from "../../engine/style/paint-layers.ts";
import { FillPaintLayer } from "../../engine/style/fill-paint-layer.ts";
import { BaseEditor, PartInfo, type EditorPaintContext } from "./base-editor.ts";

/** An editor with a fixed box whose own parts are hits anywhere in it. */
class BoxedEditor extends BaseEditor {
  constructor(
    private readonly box: Rect,
    private readonly label: string,
  ) {
    super();
  }

  override getBBox(transform: Transform): Rect | null {
    return transform.mapRect(this.box);
  }

  override _getPartInfoAt(): PartInfo | null {
    return new PartInfo(this, this.label, null, false, true);
  }
}

/** A paint context whose canvas reads every pixel through `read`. */
function context(read: (x: number, y: number) => number[]): EditorPaintContext {
  return {
    computedBackgroundColor: null,
    canvas: {
      getWidth: () => 200,
      getHeight: () => 100,
      getBitmap: () => ({ getPixelValue: (x: number, y: number) => read(x, y).concat([255]) }),
    },
  } as unknown as EditorPaintContext;
}

const blue = new RGBColor([40, 128, 230]);

describe("GBaseEditor", () => {
  it("sets and removes its own flags with a repaint request around each change", () => {
    const editor = new BaseEditor();
    let requests = 0;
    editor.requestInvalidation = () => void requests++;
    editor.setFlag(BaseEditor.Flag.Selected);
    expect(editor.hasFlag(BaseEditor.Flag.Selected)).toBe(true);
    expect(requests).toBe(2);
    editor.setFlag(BaseEditor.Flag.Selected);
    expect(requests).toBe(2);
    editor.removeFlag(BaseEditor.Flag.Selected, true);
    expect(editor.hasFlag(BaseEditor.Flag.Selected)).toBe(false);
    expect(requests).toBe(2);
  });

  it("inserts child editors before a reference and refuses a second parent", () => {
    const parent = new BaseEditor();
    const a = new BaseEditor();
    const b = new BaseEditor();
    const c = new BaseEditor();
    parent.appendEditor(a);
    parent.appendEditor(c);
    parent.insertEditor(b, c);
    expect(parent.getEditors()).toEqual([a, b, c]);
    expect(b.getParentEditor()).toBe(parent);
    expect(() => parent.appendEditor(b)).toThrow("Editor already appended.");
    expect(() => parent.insertEditor(new BaseEditor(), new BaseEditor())).toThrow(
      "Unknown reference editor.",
    );
    BaseEditor.closeEditor(b);
    expect(parent.getEditors()).toEqual([a, c]);
    expect(b.getParentEditor()).toBeNull();
  });

  it("toggles parts in and out of the selection only while selected", () => {
    const editor = new BaseEditor();
    editor.updatePartSelection(false, ["a"]);
    expect(editor.getPartSelection()).toBeNull();
    editor.setFlag(BaseEditor.Flag.Selected);
    editor.updatePartSelection(false, ["a", "b"]);
    expect(editor.getPartSelection()).toEqual(["a", "b"]);
    editor.updatePartSelection(true, ["b", "c"]);
    expect(editor.getPartSelection()).toEqual(["a", "c"]);
    editor.updatePartSelection(true, ["a", "c"]);
    expect(editor.getPartSelection()).toBeNull();
    expect(editor.isPartSelected("a")).toBe(false);
  });

  it("hit tests the topmost child first and back editors last", () => {
    const root = new BoxedEditor(new Rect(0, 0, 100, 100), "root");
    const below = new BoxedEditor(new Rect(0, 0, 50, 50), "below");
    const above = new BoxedEditor(new Rect(0, 0, 50, 50), "above");
    const back = new BoxedEditor(new Rect(150, 0, 50, 50), "back");
    back.setFlag(BaseEditor.Flag.BackEditor);
    root.appendEditor(below);
    root.appendEditor(above);
    root.appendEditor(back);
    const at = (x: number, y: number, tolerance?: number) =>
      root.getPartInfoAt(new Point(x, y), new Transform(), null, tolerance)?.id ?? null;
    expect(at(10, 10)).toBe("above");
    expect(at(80, 80)).toBe("root");
    expect(at(160, 10)).toBe("back");
    expect(at(103, 80)).toBeNull();
    expect(at(103, 80, 5)).toBe("root");
    // The filter only decides about the editor's own parts.
    expect(root.getPartInfoAt(new Point(80, 80), new Transform(), (e) => e !== root)).toBeNull();
  });

  it("previews a transform with a temporary outline and drops both on reset", () => {
    const editor = new BaseEditor();
    editor._setTransform(new Transform(1, 0, 0, 1, 5, 0));
    expect(editor.hasFlag(BaseEditor.Flag.Outline)).toBe(true);
    expect(editor.canApplyTransform()).toBe(true);
    editor.resetTransform();
    expect(editor.hasFlag(BaseEditor.Flag.Outline)).toBe(false);
    expect(editor.canApplyTransform()).toBeFalsy();
  });

  it("BUG-055: reads the outline background at x and y, clamped to the canvas", () => {
    const reads: number[][] = [];
    const ctx = context((x, y) => {
      reads.push([x, y]);
      return [255, 255, 255];
    });
    // The old code read the bottom-right pixel (199, 99) whatever x and y.
    BaseEditor.getOutlineColor(ctx, 10.6, 20.2, blue, null);
    expect(reads).toEqual([[10, 20]]);
    const clamped: number[][] = [];
    const outside = context((x, y) => {
      clamped.push([x, y]);
      return [255, 255, 255];
    });
    BaseEditor.getOutlineColor(outside, -5, 500, blue, null);
    expect(clamped).toEqual([[0, 99]]);
    // The background is cached on the context.
    BaseEditor.getOutlineColor(ctx, 10, 20, blue, null);
    expect(reads).toHaveLength(1);
  });

  it("switches to white on a background close to the outline colour, dark blue over white fills", () => {
    const onBlue = () => context(() => [33, 130, 226]);
    expect(
      BaseEditor.getOutlineColor(
        context(() => [255, 255, 255]),
        0,
        0,
        blue,
        null,
      ),
    ).toBe(blue);
    expect(BaseEditor.getOutlineColor(onBlue(), 0, 0, blue, null).toScreen()).toEqual([
      255, 255, 255,
    ]);
    const shape = new Rectangle();
    shape.setProperty("trf", new Transform(10, 0, 0, 10, 50, 50));
    const fill = new FillPaintLayer(new RGBColor([250, 250, 250]));
    (shape.getPaintLayers() as PaintLayers).appendChild(fill);
    expect(BaseEditor.getOutlineColor(onBlue(), 0, 0, blue, shape).toScreen()).toEqual([0, 0, 40]);
    fill.setProperty("_op", 0.5);
    expect(BaseEditor.getOutlineColor(onBlue(), 0, 0, blue, shape).toScreen()).toEqual([
      255, 255, 255,
    ]);
  });
});
