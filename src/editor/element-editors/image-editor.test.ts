import { afterEach, describe, expect, it } from "vitest";
import { Point } from "../../engine/math/point.ts";
import { Transform } from "../../engine/math/transform.ts";
import { Image } from "../../engine/scene/image.ts";
import { Cursor } from "../cursor.ts";
import { EditorOptions } from "../editor-options.ts";
import { BaseEditor } from "./base-editor.ts";
import { BoxEditor } from "./box-editor.ts";
import { ElementEditor } from "./element-editor.ts";
import { ImageBoxEditor, ImageEditor, type EditedImage } from "./image-editor.ts";

const identity = new Transform();

/** An image without a bitmap, its frame 100 x 100 at the origin. */
function image(): EditedImage {
  const i = new Image();
  i.setProperty("trf", new Transform(50, 0, 0, 50, 50, 50));
  return i as unknown as EditedImage;
}

function cropEditor(i: EditedImage): ImageEditor {
  const editor = new ImageEditor(i);
  editor.setFlag(BaseEditor.Flag.Selected);
  editor.setEditMode(true);
  return editor;
}

const matrix = (t: Transform | null) => (t ? t.getMatrix() : null);

describe("GImageEditor", () => {
  const cropDistance = EditorOptions.imageCropDistance;
  afterEach(() => {
    EditorOptions.imageCropDistance = cropDistance;
  });

  it("is the editor of images", () => {
    expect(ElementEditor.createEditor(image())).toBeInstanceOf(ImageEditor);
  });

  it("enters the crop mode with a box editor for the bitmap behind the frame", () => {
    const i = image();
    const editor = cropEditor(i);
    expect(i.getProperty("dblMode")).toBe(true);
    expect(i.getProperty("csc")).toBe(false);
    const inner = editor.getEditors()?.[0];
    expect(inner).toBeInstanceOf(ImageBoxEditor);
    expect(inner?.hasFlag(BaseEditor.Flag.BackEditor)).toBe(true);
    expect(inner?.hasFlag(BaseEditor.Flag.Selected)).toBe(true);
    expect(inner?.hasFlag(BoxEditor.Flag.ResizeEdges)).toBe(false);
    expect((inner as ImageBoxEditor)._rotCornerDist).toBe(
      2 * EditorOptions.annotationHandles.resize.rotateDistance,
    );
    // Deselecting leaves the crop mode.
    editor.removeFlag(BaseEditor.Flag.Selected);
    expect(i.getProperty("dblMode")).toBe(false);
    expect(i.getProperty("csc")).toBe(true);
    expect(editor.getEditors()).toEqual([]);
  });

  it("hit tests the crop handles by their shapes", () => {
    const editor = cropEditor(image());
    const x = 0;
    const y = 0;
    const corner = editor._getResizePartInfoAt(new Point(x + 1, y + 1), identity);
    expect(corner?.id).toBe(BoxEditor.RESIZE_HANDLE_PART_ID);
    expect((corner?.data as { side: string }).side).toBe("tl");
    // The bar in the middle of the top edge, 5 px deep.
    const middle = editor._getResizePartInfoAt(new Point(x + 50, y + 2), identity);
    expect((middle?.data as { side: string }).side).toBe("tc");
    expect(editor._getResizePartInfoAt(new Point(x + 50, y + 8), identity)).toBeUndefined();
    // The bottom-right angle is the top-left one turned around.
    const opposite = editor._getResizePartInfoAt(new Point(x + 99, y + 85), identity);
    expect((opposite?.data as { side: string }).side).toBe("br");
  });

  it("drags the frame by its outline and the bitmap from inside", () => {
    const editor = cropEditor(image());
    const frame = editor.getPartInfoAt(new Point(1, 28), identity, null, 2);
    expect(frame?.id).toBe(ImageEditor.CROPFRAME_PART_ID);
    const inside = editor.getPartInfoAt(new Point(50, 50), identity, null, 2);
    expect(inside?.id).toBe(ImageEditor.IMAGEINTERNAL_PART_ID);
    expect(editor.getCursor(inside?.id, inside?.data)).toBe(Cursor.SelectCross);
    expect(editor.getCursor(BoxEditor.ROTATION_HANDLE_PART_ID, { handle: true })).toBe(
      Cursor.SelectSmallRotateRound,
    );
  });

  it("moves the bitmap through the image transform and records it on apply", () => {
    const i = image();
    const editor = cropEditor(i);
    const start = new Point(50, 50);
    const hit = editor.getPartInfoAt(start, identity, null, 2);
    editor.movePart(hit?.id, hit?.data, start.add(new Point(10, 5)), identity, null);
    expect(matrix(i.getImageTransform())).toEqual([1, 0, 0, 1, 10, 5]);
    editor.applyPartMove(hit?.id, hit?.data);
    expect(matrix(i.getImageTransform())).toEqual([1, 0, 0, 1, 10, 5]);
  });

  it("moves the crop frame and applies it as a transform", () => {
    const i = image();
    const editor = cropEditor(i);
    const start = new Point(1, 28);
    const hit = editor.getPartInfoAt(start, identity, null, 2);
    editor.movePart(hit?.id, hit?.data, start.add(new Point(10, 5)), identity, null);
    // Previewed on the frame preview only.
    expect(matrix(i.getTransform())).toEqual([50, 0, 0, 50, 50, 50]);
    expect(matrix(editor.getPaintElement().getTransform())).toEqual([50, 0, 0, 50, 60, 55]);
    editor.applyPartMove(hit?.id, hit?.data);
    expect(matrix(i.getTransform())).toEqual([50, 0, 0, 50, 60, 55]);
    expect(editor.getPaintElement()).toBe(i);
  });

  it("insets an uncropped image by the crop distance when asked", () => {
    EditorOptions.imageCropDistance = 10;
    const uncropped = () => {
      const i = image();
      i.setImageTransform(i.getTransform());
      return i;
    };
    const i = uncropped();
    const editor = new ImageEditor(i);
    editor.setFlag(BaseEditor.Flag.Selected);
    editor.setEditMode(true, false, true, 2);
    // 10 view px at zoom 2 are 5 px on each side of the 100 px frame.
    expect(matrix(i.getTransform())).toEqual([45, 0, 0, 45, 50, 50]);
    // Without the flag nothing changes, nor once the image is cropped.
    const plain = uncropped();
    const plainEditor = new ImageEditor(plain);
    plainEditor.setFlag(BaseEditor.Flag.Selected);
    plainEditor.setEditMode(true);
    expect(matrix(plain.getTransform())).toEqual([50, 0, 0, 50, 50, 50]);
    const cropped = image();
    const croppedEditor = new ImageEditor(cropped);
    croppedEditor.setFlag(BaseEditor.Flag.Selected);
    croppedEditor.setEditMode(true, false, true, 2);
    expect(matrix(cropped.getTransform())).toEqual([50, 0, 0, 50, 50, 50]);
  });
});
