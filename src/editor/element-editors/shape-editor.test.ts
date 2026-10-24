import { describe, expect, it } from "vitest";
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { HitResult } from "../../engine/geometry/hit-result.ts";
import { Point } from "../../engine/math/point.ts";
import { Transform } from "../../engine/math/transform.ts";
import { Image } from "../../engine/scene/image.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import { Scene } from "../../engine/scene/scene.ts";
import { Shape } from "../../engine/scene/shape.ts";
import { Workspace } from "../../engine/scene/workspace.ts";
import { BorderPaintLayer } from "../../engine/style/border-paint-layer.ts";
import type { PaintLayers } from "../../engine/style/paint-layers.ts";
import { FillPaintLayer } from "../../engine/style/fill-paint-layer.ts";
import { ShapeEditor, type EditedShape } from "./shape-editor.ts";

function setup() {
  const scene = new Scene(new Workspace());
  const log: unknown[] = [];
  (scene as unknown as { __graphic_editor__: unknown }).__graphic_editor__ = {
    requestInvalidation: () => {},
    beginTransaction: () => log.push("begin"),
    commitTransaction: (name: unknown) => log.push(["commit", name]),
  };
  const shape = new Rectangle();
  shape.setProperty("trf", new Transform(50, 0, 0, 30, 100, 100));
  (scene.getFirstChild() as unknown as { appendChild(node: unknown): void }).appendChild(shape);
  const editor = new ShapeEditor(shape as unknown as EditedShape);
  return { shape, editor, log };
}

const layers = (shape: Rectangle) =>
  (shape.getPaintLayers() as PaintLayers)
    .getLayers()
    .map((l) => [
      l instanceof BorderPaintLayer ? "border" : "fill",
      (l.getProperty("_pt") as RGBColor).toScreen(),
    ]);

const hit = (type: number) => new Shape.HitResult(type, new HitResult());

describe("GShapeEditor", () => {
  it("drops a pattern on the stroke as the only border, elsewhere as the only fill", () => {
    const { shape, editor, log } = setup();
    (shape.getPaintLayers() as PaintLayers).appendChild(
      new FillPaintLayer(new RGBColor([1, 2, 3])),
    );
    (shape.getPaintLayers() as PaintLayers).appendChild(
      new BorderPaintLayer(new RGBColor([4, 5, 6])),
    );
    const red = new RGBColor([255, 0, 0]);
    expect(editor.acceptDrop(new Point(0, 0), 0, red, hit(Shape.HitResult.Type.Stroke))).toBe(true);
    expect(layers(shape)).toEqual([
      ["fill", [1, 2, 3]],
      ["border", [255, 0, 0]],
    ]);
    const green = new RGBColor([0, 255, 0]);
    expect(editor.acceptDrop(new Point(0, 0), 0, green, hit(Shape.HitResult.Type.Fill))).toBe(true);
    expect(layers(shape)).toEqual([
      ["border", [255, 0, 0]],
      ["fill", [0, 255, 0]],
    ]);
    expect(log).toEqual(["begin", ["commit", "Drop Pattern"], "begin", ["commit", "Drop Pattern"]]);
  });

  it("ignores drops that are not a pattern on a shape hit", () => {
    const { editor, log } = setup();
    expect(editor.acceptDrop(new Point(0, 0), 0, "text", hit(0))).toBe(false);
    expect(editor.acceptDrop(new Point(0, 0), 0, new RGBColor([1, 1, 1]), null)).toBe(false);
    expect(log).toEqual([]);
  });

  it("copies the style of a source shape, but not of an image", () => {
    const { shape, editor } = setup();
    const source = new Rectangle();
    (source.getPaintLayers() as PaintLayers).appendChild(
      new FillPaintLayer(new RGBColor([9, 8, 7])),
    );
    source.setProperty("_stop", 0.5);
    editor.initialSetup(source);
    expect(layers(shape)).toEqual([["fill", [9, 8, 7]]]);
    expect(shape.getProperty("_stop")).toBe(0.5);
    const second = setup();
    const image = new Image();
    (image.getPaintLayers() as PaintLayers).appendChild(
      new FillPaintLayer(new RGBColor([9, 8, 7])),
    );
    second.editor.initialSetup(image);
    expect(layers(second.shape)).not.toContainEqual(["fill", [9, 8, 7]]);
  });

  it("gets the transform from the element to its preview", () => {
    const { shape, editor } = setup();
    expect(editor._getTransformFromPreview()).toBeNull();
    const preview = shape.clone() as unknown as EditedShape;
    preview.setTransform(new Transform(100, 0, 0, 30, 110, 100));
    editor._setElementPreview(preview);
    const delta = editor._getTransformFromPreview() as Transform;
    const mapped = delta.mapPoint(new Point(150, 130));
    expect([mapped.getX(), mapped.getY()]).toEqual([210, 130]);
  });
});
