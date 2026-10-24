import { describe, expect, it } from "vitest";
import { GMath } from "../../engine/math/math.ts";
import { Point } from "../../engine/math/point.ts";
import { Transform } from "../../engine/math/transform.ts";
import { PaintCanvas } from "../../engine/paint/paint-canvas.ts";
import { Ellipse } from "../../engine/scene/ellipse.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import { BorderPaintLayer } from "../../engine/style/border-paint-layer.ts";
import { FillPaintLayer } from "../../engine/style/fill-paint-layer.ts";
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { BaseEditor } from "./base-editor.ts";
import { ElementEditor } from "./element-editor.ts";
import { EllipseEditor, type EditedEllipse } from "./ellipse-editor.ts";

const identity = new Transform();

/** A circle of radius 50 around (200, 200), its arc from 0 to PI. */
function ellipse(): EditedEllipse {
  const e = new Ellipse();
  e.setProperties(["trf", "sa", "ea"], [new Transform(50, 0, 0, 50, 200, 200), 0, Math.PI]);
  return e as unknown as EditedEllipse;
}

function detailEditor(e: EditedEllipse): EllipseEditor {
  const editor = new EllipseEditor(e);
  editor.setFlag(BaseEditor.Flag.Selected);
  editor.setFlag(BaseEditor.Flag.Detail);
  return editor;
}

describe("GEllipseEditor", () => {
  it("is the editor of ellipses", () => {
    expect(ElementEditor.createEditor(ellipse())).toBeInstanceOf(EllipseEditor);
  });

  it("has start and end handles in detail mode", () => {
    const editor = detailEditor(ellipse());
    const start = editor._getPartInfoAt(new Point(250, 200), identity, 0);
    expect(start?.id).toBe(EllipseEditor.START_ANGLE_PART_ID);
    expect(start?.selectable).toBe(true);
    expect(editor._getPartInfoAt(new Point(150, 201), identity, 0)?.id).toBe(
      EllipseEditor.END_ANGLE_PART_ID,
    );
    const plain = new EllipseEditor(ellipse());
    plain.setFlag(BaseEditor.Flag.Selected);
    expect(plain._getPartInfoAt(new Point(250, 200), identity, 0)?.id).not.toBe(
      EllipseEditor.START_ANGLE_PART_ID,
    );
  });

  it("turns the selected angles by the angle the pointer moved", () => {
    const e = ellipse();
    const editor = detailEditor(e);
    const id = EllipseEditor.START_ANGLE_PART_ID;
    editor.updatePartSelection(false, [id]);
    editor.movePart(id, null, new Point(200, 250), identity, null);
    expect(editor.getPaintElement().getProperty("sa")).toBeCloseTo(Math.PI / 2, 12);
    expect(editor.getPaintElement().getProperty("ea")).toBe(Math.PI);
    expect(e.getProperty("sa")).toBe(0);
    editor.applyPartMove(id, null);
    expect(e.getProperty("sa")).toBeCloseTo(Math.PI / 2, 12);
    expect(e.getProperty("ea")).toBe(Math.PI);
    expect(editor.getPaintElement()).toBe(e);
  });

  it("turns both angles when both ends are selected", () => {
    const e = ellipse();
    const editor = detailEditor(e);
    editor.updatePartSelection(false, [
      EllipseEditor.START_ANGLE_PART_ID,
      EllipseEditor.END_ANGLE_PART_ID,
    ]);
    editor.movePart(EllipseEditor.START_ANGLE_PART_ID, null, new Point(200, 250), identity, null);
    const preview = editor.getPaintElement();
    expect(preview.getProperty("sa")).toBeCloseTo(Math.PI / 2, 12);
    expect(preview.getProperty("ea")).toBe(GMath.normalizeAngleRadians(Math.PI + Math.atan2(1, 0)));
  });

  it("throws on a handle drag without a part selection, as the old code did", () => {
    const editor = detailEditor(ellipse());
    expect(() =>
      editor.movePart(EllipseEditor.START_ANGLE_PART_ID, null, new Point(200, 250), identity, null),
    ).toThrow(TypeError);
  });

  it("gives a new ellipse butt caps without a source, from a non-ellipse source with a border or without layers", () => {
    const withBorder = (): EditedEllipse => {
      const e = ellipse();
      e.getPaintLayers().appendChild(new BorderPaintLayer());
      return e;
    };
    const caps = (e: EditedEllipse) =>
      e
        .getPaintLayers()
        .getLayers()
        .filter((l) => l instanceof BorderPaintLayer)
        .map((l) => l.getProperty("_blc"));

    // No source (and no scene, so no default style).
    let e = withBorder();
    new EllipseEditor(e).initialSetup(undefined);
    expect(caps(e)).toEqual([PaintCanvas.LineCap.Butt]);

    // A rectangle source with only a fill: its fill is copied, caps stay.
    e = withBorder();
    const filled = new Rectangle();
    filled.getPaintLayers()?.appendChild(new FillPaintLayer(new RGBColor([255, 0, 0])));
    const before = caps(e);
    new EllipseEditor(e).initialSetup(filled);
    expect(caps(e)).toEqual(before);
    expect(before[0]).not.toBe(PaintCanvas.LineCap.Butt);

    // A rectangle source with a border: all borders get butt caps.
    e = withBorder();
    const bordered = new Rectangle();
    bordered.getPaintLayers()?.appendChild(new BorderPaintLayer());
    new EllipseEditor(e).initialSetup(bordered);
    expect(caps(e)).toEqual([PaintCanvas.LineCap.Butt, PaintCanvas.LineCap.Butt]);

    // An ellipse source, even with a border: the caps stay as they are.
    e = withBorder();
    const round = withBorder();
    const roundCaps = caps(e);
    new EllipseEditor(e).initialSetup(round);
    expect(caps(e)).toEqual([...roundCaps, ...caps(round)]);
    expect(caps(e)).not.toContain(PaintCanvas.LineCap.Butt);

    // A source that has no paint layers: butt caps.
    e = withBorder();
    new EllipseEditor(e).initialSetup({ getPaintLayers: () => null });
    expect(caps(e)).toEqual([PaintCanvas.LineCap.Butt]);
  });
});
