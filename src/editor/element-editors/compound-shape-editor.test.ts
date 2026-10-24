import { describe, expect, it } from "vitest";
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import type { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import { CompoundShape } from "../../engine/scene/compound-shape.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import { Scene } from "../../engine/scene/scene.ts";
import { Workspace } from "../../engine/scene/workspace.ts";
import { BaseEditor } from "./base-editor.ts";
import { CompoundShapeEditor } from "./compound-shape-editor.ts";
import { ElementEditor } from "./element-editor.ts";
import "./rectangle-editor.ts";

function box(rect: Rect | null): number[] | null {
  return rect ? [rect.getX(), rect.getY(), rect.getWidth(), rect.getHeight()] : null;
}

function rect(x: number, y: number, w: number, h: number): Rectangle {
  const r = new Rectangle();
  r.setProperty("trf", new Transform(w / 2, 0, 0, h / 2, x + w / 2, y + h / 2));
  return r;
}

function setup() {
  const scene = new Scene(new Workspace());
  const log: unknown[] = [];
  (scene as unknown as { __graphic_editor__: unknown }).__graphic_editor__ = {
    requestInvalidation: () => {},
    beginTransaction: () => log.push("begin"),
    commitTransaction: (name: unknown) => log.push(["commit", name]),
  };
  const shape = new CompoundShape();
  const a = rect(0, 0, 100, 50);
  const b = rect(50, 25, 100, 50);
  shape.appendChild(a);
  shape.appendChild(b);
  scene.appendChild(shape);
  const editor = ElementEditor.openEditor(shape) as CompoundShapeEditor;
  expect(editor).toBeInstanceOf(CompoundShapeEditor);
  editor.setFlag(BaseEditor.Flag.Selected);
  return { scene, shape, a, b, editor, log };
}

describe("GCompoundShapeEditor", () => {
  it("sets the boolean operation of the children with editors in one transaction", () => {
    const { a, b, editor, log } = setup();
    // No child editors yet: nothing to set.
    expect(editor.setBooleanOp(3)).toBe(false);
    expect(log).toEqual([]);
    ElementEditor.openEditor(a);
    ElementEditor.openEditor(b);
    expect(editor.setBooleanOp(3)).toBe(true);
    expect(a.getProperty("bool")).toBe(3);
    expect(b.getProperty("bool")).toBe(3);
    // The transaction carries the drop-pattern name (see QUESTIONS.md).
    expect(log).toEqual([
      "begin",
      ["commit", Locale.get(new LocaleKey("GCompoundShapeEditor", "action.drop-pattern"))],
    ]);
  });

  it("does nothing without a GEditor", () => {
    const { scene, a, editor } = setup();
    ElementEditor.openEditor(a);
    delete (scene as unknown as { __graphic_editor__?: unknown }).__graphic_editor__;
    expect(editor.setBooleanOp(2)).toBe(false);
    expect(a.getProperty("bool")).not.toBe(2);
  });

  it("has its geometry box as box, without a box transform", () => {
    const { shape, editor } = setup();
    expect(box(editor.getBox())).toEqual(box(shape.getGeometryBBox()));
    expect(editor.getBoxTransform()).toBeNull();
  });

  it("previews a transform through the children and resets them", () => {
    const { a, editor } = setup();
    editor.edTransform(new Transform(1, 0, 0, 1, 10, 0));
    const child = ElementEditor.getEditor(a) as ElementEditor;
    expect(child).not.toBeNull();
    expect(box(child.getPaintElement().getGeometryBBox())).toEqual([10, 0, 100, 50]);
    editor.resetTransform();
    expect(child.getPaintElement()).toBe(a);
  });
});
