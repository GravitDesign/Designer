import { describe, expect, it } from "vitest";
import { Point } from "../../engine/math/point.ts";
import { Transform } from "../../engine/math/transform.ts";
import { Polygon } from "../../engine/scene/polygon.ts";
import { BaseEditor } from "./base-editor.ts";
import { ElementEditor } from "./element-editor.ts";
import { PolygonEditor, type EditedPolygon } from "./polygon-editor.ts";

const identity = new Transform();

/** A star around (100, 100): outer radius 50, inner 25. */
function star(points = 6): EditedPolygon {
  const p = new Polygon();
  p.setProperties(["pts", "cx", "cy", "or", "ir"], [points, 100, 100, 50, 25]);
  return p as unknown as EditedPolygon;
}

function detailEditor(p: EditedPolygon): PolygonEditor {
  const editor = new PolygonEditor(p);
  editor.setFlag(BaseEditor.Flag.Selected);
  editor.setFlag(BaseEditor.Flag.Detail);
  return editor;
}

/** The first outer and first inner point with their angles. */
function firstPoints(p: EditedPolygon): { outer: [Point, number]; inner: [Point, number] } {
  const found: { outer?: [Point, number]; inner?: [Point, number] } = {};
  p.iterateSegments((point, inner, angle) => {
    if (inner && !found.inner) found.inner = [point, angle];
    if (!inner && !found.outer) found.outer = [point, angle];
    return undefined;
  }, true);
  return found as { outer: [Point, number]; inner: [Point, number] };
}

describe("GPolygonEditor", () => {
  it("is the editor of polygons", () => {
    expect(ElementEditor.createEditor(star())).toBeInstanceOf(PolygonEditor);
  });

  it("has a handle on every outer and inner point, carrying its angle", () => {
    const p = star();
    const editor = detailEditor(p);
    const { outer, inner } = firstPoints(p);
    const outerHit = editor._getPartInfoAt(outer[0], identity, 0);
    expect(outerHit?.id).toBe(PolygonEditor.OUTSIDE_PART_ID);
    expect(outerHit?.data).toBe(outer[1]);
    const innerHit = editor._getPartInfoAt(inner[0], identity, 0);
    expect(innerHit?.id).toBe(PolygonEditor.INSIDE_PART_ID);
    expect(innerHit?.data).toBe(inner[1]);
    expect(editor._getPartInfoAt(new Point(100, 100), identity, 0)).toBeNull();
  });

  it("drags the outer radius and angle; Shift keeps the angle", () => {
    const p = star();
    const { outer } = firstPoints(p);
    const target = new Point(100 + 80 * Math.cos(0.2), 100 + 80 * Math.sin(0.2));
    for (const shift of [false, true]) {
      const editor = detailEditor(p);
      editor.updatePartSelection(false, [PolygonEditor.OUTSIDE_PART_ID]);
      editor.movePart(PolygonEditor.OUTSIDE_PART_ID, outer[1], target, identity, null, shift);
      const preview = editor.getPaintElement();
      expect(preview.getProperty("or")).toBeCloseTo(80, 9);
      expect(preview.getProperty("oa")).toBeCloseTo(shift ? 0 : 0.2, 9);
      expect(preview.getProperty("ir")).toBe(25);
      editor.resetPartMove(PolygonEditor.OUTSIDE_PART_ID, outer[1]);
    }
    expect(p.getProperty("or")).toBe(50);
  });

  it("moves the other kind of point along when both are selected", () => {
    const p = star();
    const editor = detailEditor(p);
    const { outer, inner } = firstPoints(p);
    editor.updatePartSelection(false, [
      PolygonEditor.OUTSIDE_PART_ID,
      PolygonEditor.INSIDE_PART_ID,
    ]);
    const target = outer[0].add(new Point(10, 20));
    editor.movePart(PolygonEditor.OUTSIDE_PART_ID, outer[1], target, identity, null);
    editor.applyPartMove(PolygonEditor.OUTSIDE_PART_ID, outer[1]);
    const after = firstPoints(p);
    expect(after.outer[0].getX()).toBeCloseTo(target.getX(), 9);
    expect(after.outer[0].getY()).toBeCloseTo(target.getY(), 9);
    // The inner point moved by the same offset.
    expect(after.inner[0].getX()).toBeCloseTo(inner[0].getX() + 10, 9);
    expect(after.inner[0].getY()).toBeCloseTo(inner[0].getY() + 20, 9);
    expect(editor.getPaintElement()).toBe(p);
  });

  it("keeps an odd star as it is on a drag that doesn't move", () => {
    // The angles and radii are measured from cx/cy (GPolygon.getCenter).
    const p = star(5);
    const editor = detailEditor(p);
    const { outer } = firstPoints(p);
    editor.updatePartSelection(false, [PolygonEditor.OUTSIDE_PART_ID]);
    editor.movePart(PolygonEditor.OUTSIDE_PART_ID, outer[1], outer[0], identity, null);
    expect(editor.getPaintElement().getProperty("or")).toBeCloseTo(50, 9);
    expect(editor.getPaintElement().getProperty("oa")).toBeCloseTo(0, 9);
  });
});
