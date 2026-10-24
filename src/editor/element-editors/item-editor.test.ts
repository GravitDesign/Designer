import { describe, expect, it } from "vitest";
import { Point } from "../../engine/math/point.ts";
import { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import { Ellipse } from "../../engine/scene/ellipse.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import { Scene } from "../../engine/scene/scene.ts";
import { Workspace } from "../../engine/scene/workspace.ts";
import { BaseEditor } from "./base-editor.ts";
import { ItemEditor, type EditedItem } from "./item-editor.ts";

function box(rect: Rect | null): number[] | null {
  return rect ? [rect.getX(), rect.getY(), rect.getWidth(), rect.getHeight()] : null;
}

function rect(x: number, y: number, w: number, h: number): Rectangle {
  const r = new Rectangle();
  r.setProperty("trf", new Transform(w / 2, 0, 0, h / 2, x + w / 2, y + h / 2));
  return r;
}

const identity = new Transform();

describe("GItemEditor", () => {
  function pastedInside() {
    const scene = new Scene(new Workspace());
    (scene as unknown as { __graphic_editor__: unknown }).__graphic_editor__ = {
      requestInvalidation: () => {},
    };
    const container = new Ellipse();
    container.setProperty("trf", new Transform(100, 0, 0, 100, 100, 100));
    const content = rect(60, 80, 40, 20);
    container.appendChild(content);
    (scene.getFirstChild() as unknown as { appendChild(node: unknown): void }).appendChild(
      container,
    );
    const editor = new ItemEditor(content as unknown as EditedItem);
    editor.setFlag(BaseEditor.Flag.Selected);
    return { container, content, editor };
  }

  it("has a catch handle at the centre of content pasted inside a shape", () => {
    const { editor } = pastedInside();
    const hit = editor._getPartInfoAt(new Point(80, 90), identity, 0);
    expect(hit?.id).toBe(ItemEditor.CATCH_HANDLE_PART_ID);
    expect(box(Rect.fromPoints((hit?.data as { point: Point }).point))).toEqual([80, 90, 0, 0]);
    // Not over the handle: the box editor's parts (here nothing).
    expect(editor._getPartInfoAt(new Point(65, 85), identity, 0)?.id).not.toBe(
      ItemEditor.CATCH_HANDLE_PART_ID,
    );
  });

  it("has no catch handle outside a shape", () => {
    const editor = new ItemEditor(rect(60, 80, 40, 20) as unknown as EditedItem);
    editor.setFlag(BaseEditor.Flag.Selected);
    expect(editor._getPartInfoAt(new Point(80, 90), identity, 0)?.id).not.toBe(
      ItemEditor.CATCH_HANDLE_PART_ID,
    );
  });
});
