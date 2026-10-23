import { describe, expect, it } from "vitest";
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { Point } from "../../engine/math/point.ts";
import type { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import { Scene } from "../../engine/scene/scene.ts";
import { Symbol } from "../../engine/scene/symbol.ts";
import { Workspace } from "../../engine/scene/workspace.ts";
import { BaseEditor } from "./base-editor.ts";
import { LabelHolder } from "./block-editor.ts";
import { ElementEditor } from "./element-editor.ts";
import "./rectangle-editor.ts";
import { SymbolEditor } from "./symbol-editor.ts";

function box(rect: Rect | null): number[] | null {
  return rect ? [rect.getX(), rect.getY(), rect.getWidth(), rect.getHeight()] : null;
}

function setup() {
  const scene = new Scene(new Workspace());
  (scene as unknown as { __graphic_editor__: unknown }).__graphic_editor__ = {
    requestInvalidation: () => {},
  };
  const a = new Rectangle();
  a.setProperty("trf", new Transform(50, 0, 0, 25, 150, 125));
  scene.appendChild(a);
  const master = Symbol.create([a], scene.getActivePage() as never, "Badge");
  const editor = ElementEditor.openEditor(master) as SymbolEditor;
  return { scene, a, master, editor };
}

const guides = { mapPoint: (p: Point) => p };

describe("GSymbolEditor", () => {
  it("is the symbol's editor and shows while attached", () => {
    const { editor } = setup();
    expect(editor).toBeInstanceOf(SymbolEditor);
    expect(editor._isAttached).toBe(true);
    // Not selected, but attached: it still has a box and shows.
    expect(editor._isBBoxEmpty()).toBe(false);
    expect(editor._showEditor()).toBe(true);
  });

  it("has the symbol colour only for masters and instances", () => {
    const { editor } = setup();
    expect(editor.getColor()).toEqual(new RGBColor([132, 102, 176]));
    const loose = new SymbolEditor(new Symbol() as never);
    expect(loose.getColor()).toBeNull();
  });

  it("hits the label over the symbol", () => {
    const { master, editor } = setup();
    const top = (master.getGeometryBBox() as Rect).getY();
    const left = (master.getGeometryBBox() as Rect).getX();
    const hit = editor.getPartInfoAt(new Point(left + 15, top - 3), new Transform());
    expect(hit && hit.id).toBe(LabelHolder.LABEL_PART_ID);
    expect(hit && hit.selectable).toBe(true);
    // Below the symbol there is no label.
    expect(editor.getPartInfoAt(new Point(left + 15, top + 200), new Transform())).toBeNull();
  });

  it("moves the symbol by a label drag", () => {
    const { master, a, editor } = setup();
    editor.setFlag(BaseEditor.Flag.Selected);
    const before = box(master.getGeometryBBox()) as number[];
    const start = new Point((before[0] as number) + 15, (before[1] as number) - 3);
    const data = { point: start, origTrf: new Transform() };
    editor.movePart(
      LabelHolder.LABEL_PART_ID,
      data,
      start.add(new Point(30, 10)),
      new Transform(),
      guides,
    );
    expect(Transform.serialize(editor._transform as Transform)).toEqual([1, 0, 0, 1, 30, 10]);
    editor.applyPartMove(LabelHolder.LABEL_PART_ID, data);
    expect(box(master.getGeometryBBox())).toEqual([
      (before[0] as number) + 30,
      (before[1] as number) + 10,
      before[2],
      before[3],
    ]);
    expect(box(a.getGeometryBBox())).toEqual([130, 110, 100, 50]);
    expect(editor._transform).toBeNull();
  });
});
