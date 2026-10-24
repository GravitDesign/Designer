import { describe, expect, it } from "vitest";
import { Point } from "../../engine/math/point.ts";
import { Transform } from "../../engine/math/transform.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import { BaseEditor } from "./base-editor.ts";
import { ElementEditor } from "./element-editor.ts";
import { RectangleEditor, type EditedRectangle, type ShoulderPartId } from "./rectangle-editor.ts";

/** A 100 x 60 rectangle at (100, 100), not in a scene. */
function rectangle(): EditedRectangle {
  const r = new Rectangle();
  r.setProperty("trf", new Transform(50, 0, 0, 30, 150, 130));
  return r as unknown as EditedRectangle;
}

/** The editor of `r`, selected and in detail mode. */
function detailEditor(r: EditedRectangle): RectangleEditor {
  const editor = new RectangleEditor(r);
  editor.setFlag(BaseEditor.Flag.Selected);
  editor.setFlag(BaseEditor.Flag.Detail);
  return editor;
}

const identity = new Transform();

describe("GRectangleEditor", () => {
  it("is the editor of rectangles", () => {
    const editor = ElementEditor.createEditor(rectangle());
    expect(editor).toBeInstanceOf(RectangleEditor);
    expect(String(editor)).toBe("[Object GRectangleEditor]");
  });

  it("puts a shoulder handle a margin inside each sharp corner", () => {
    const r = rectangle();
    const editor = detailEditor(r);
    // Sharp corner at (100, 100): 10 px (the margin) along both edges.
    const hit = editor._getPartInfoAt(new Point(110, 110), identity, 0);
    expect(hit).not.toBeNull();
    const id = hit?.id as ShoulderPartId;
    expect(id.id).toBe(RectangleEditor.SHOULDER_PART_ID);
    expect(id.side).toBe("tl");
    expect(id.ap).toBe(r.getAnchorPoints().getFirstChild());
    expect([id.point?.getX(), id.point?.getY()]).toEqual([110, 110]);
    expect(hit?.selectable).toBe(true);
    const opposite = editor._getPartInfoAt(new Point(190, 150), identity, 0);
    expect((opposite?.id as ShoulderPartId).side).toBe("br");
    // Nothing between the handles.
    expect(editor._getPartInfoAt(new Point(130, 130), identity, 0)).toBeNull();
  });

  it("has no shoulder handles outside detail mode or while previewing", () => {
    const r = rectangle();
    const editor = new RectangleEditor(r);
    editor.setFlag(BaseEditor.Flag.Selected);
    expect(editor._getPartInfoAt(new Point(110, 110), identity, 0)).toBeNull();
    editor.setFlag(BaseEditor.Flag.Detail);
    editor.createElementPreview();
    expect(editor._getPartInfoAt(new Point(110, 110), identity, 0)).toBeNull();
  });

  it("compares shoulder part ids by id and side", () => {
    const editor = detailEditor(rectangle());
    const id = RectangleEditor.SHOULDER_PART_ID;
    expect(editor._partIdAreEqual({ id, side: "tl" }, { id, side: "tl" })).toBe(true);
    expect(editor._partIdAreEqual({ id, side: "tl" }, { id, side: "tr" })).toBe(false);
    editor.updatePartSelection(false, [{ id, side: "br", ap: null }]);
    expect(editor.isPartSelected({ id, side: "br" })).toBe(true);
    expect(editor.isPartSelected({ id, side: "bl" })).toBe(false);
  });

  it("previews the corner radii of a shoulder drag and commits them", () => {
    const r = rectangle();
    r.setProperties(["uf", "tl_uf"], [false, false]);
    const editor = detailEditor(r);
    const hit = editor._getPartInfoAt(new Point(110, 110), identity, 0);
    const part = hit?.id as ShoulderPartId;
    editor.updatePartSelection(false, [part]);
    editor.movePart(part, null, new Point(120, 120), identity, null, false, false);
    const preview = editor.getPaintElement();
    expect(preview).not.toBe(r);
    // Without uniform corners a shoulder travels the whole edge (60 px
    // down, 100 px right) minus the margin and handle (18 px). The pointer
    // is 20 px down and 20 px right, 10 of each the margin.
    const radiusX = (20 - 10) / ((60 - 18) / 60);
    const radiusY = (20 - 10) / ((100 - 18) / 100);
    expect(preview.getProperty("tl_sx")).toBeCloseTo(radiusX, 9);
    expect(preview.getProperty("tl_sy")).toBeCloseTo(radiusY, 9);
    expect(r.getProperty("tl_sx")).toBe(0);
    editor.applyPartMove(part, null);
    expect(r.getProperty("tl_sx")).toBeCloseTo(radiusX, 9);
    expect(r.getProperty("tl_sy")).toBeCloseTo(radiusY, 9);
    expect(r.getProperty("tr_sx")).toBe(0);
    expect(editor.getPaintElement()).toBe(r);
    // Applying toggles the moved shoulders out of the part selection.
    expect(editor.getPartSelection()).toBeNull();
  });

  it("gives a uniform corner the larger radius, Shift the smaller one", () => {
    const radiusX = (20 - 10) / ((60 - 18) / 60);
    const radiusY = (20 - 10) / ((100 - 18) / 100);
    for (const [shift, expected] of [
      [false, radiusX],
      [true, radiusY],
    ] as const) {
      const r = rectangle();
      r.setProperty("uf", false);
      const editor = detailEditor(r);
      const part = editor._getPartInfoAt(new Point(110, 110), identity, 0)?.id as ShoulderPartId;
      editor.updatePartSelection(false, [part]);
      editor.movePart(part, null, new Point(120, 120), identity, null, shift, false);
      expect(editor.getPaintElement().getProperty("tl_sx")).toBeCloseTo(expected, 9);
      expect(editor.getPaintElement().getProperty("tl_sy")).toBeCloseTo(expected, 9);
    }
  });

  it("limits the shoulders to half an edge with uniform corners (uf)", () => {
    const r = rectangle();
    const editor = detailEditor(r);
    const part = editor._getPartInfoAt(new Point(110, 110), identity, 0)?.id as ShoulderPartId;
    editor.updatePartSelection(false, [part]);
    editor.movePart(part, null, new Point(120, 120), identity, null, false, false);
    // 30 px down, 50 px right; the corner is uniform, so the larger radius.
    expect(editor.getPaintElement().getProperty("tl_sx")).toBeCloseTo(
      (20 - 10) / ((30 - 18) / 30),
      9,
    );
    expect(editor.getPaintElement().getProperty("tl_sy")).toBeCloseTo(25, 9);
  });

  it("resets the preview when the move is dropped", () => {
    const r = rectangle();
    const editor = detailEditor(r);
    const part = editor._getPartInfoAt(new Point(110, 110), identity, 0)?.id as ShoulderPartId;
    editor.updatePartSelection(false, [part]);
    editor.movePart(part, null, new Point(120, 120), identity, null, false, false);
    editor.resetPartMove(part, null);
    expect(editor.getPaintElement()).toBe(r);
    expect(r.getProperty("tl_sx")).toBe(0);
  });
});
