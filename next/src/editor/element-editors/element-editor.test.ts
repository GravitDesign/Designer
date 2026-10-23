import { describe, expect, it } from "vitest";
import type { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import { ElementFlag } from "../../engine/scene/element-change.ts";
import { Group } from "../../engine/scene/group.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import { Scene } from "../../engine/scene/scene.ts";
import { Workspace } from "../../engine/scene/workspace.ts";
import { BaseEditor } from "./base-editor.ts";
import { ElementEditor, type EditedElement } from "./element-editor.ts";
import { GroupEditor } from "./group-editor.ts";
import { RectangleEditor } from "./rectangle-editor.ts";

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
  const invalidated: unknown[] = [];
  (scene as unknown as { __graphic_editor__: unknown }).__graphic_editor__ = {
    requestInvalidation: (editor: unknown) => invalidated.push(editor),
  };
  const group = new Group();
  const a = rect(0, 0, 10, 10);
  const b = rect(20, 0, 10, 10);
  const c = rect(40, 0, 10, 10);
  group.appendChild(a);
  group.appendChild(b);
  group.appendChild(c);
  scene.appendChild(group);
  return { scene, group, a, b, c, invalidated };
}

describe("GElementEditor", () => {
  it("creates the editor registered for the exact class", () => {
    expect(ElementEditor.createEditor(new Rectangle())).toBeInstanceOf(RectangleEditor);
    // Group's editor is GroupEditor; a class without one gets none.
    expect(ElementEditor.createEditor(new Group())).toBeInstanceOf(GroupEditor);
    expect(ElementEditor.createEditor(new Workspace() as never)).toBeNull();
  });

  it("refuses to open an editor for a detached element", () => {
    expect(() => ElementEditor.openEditor(new Rectangle())).toThrow(
      "Node is not attached to create an editor for.",
    );
  });

  it("opens the parent editors and keeps the child editors in paint order", () => {
    const { group, a, b, c } = setup();
    const editorC = ElementEditor.openEditor(c) as ElementEditor;
    const groupEditor = ElementEditor.getEditor(group) as GroupEditor;
    expect(groupEditor).toBeInstanceOf(GroupEditor);
    expect(editorC.getParentEditor()).toBe(groupEditor);
    const editorA = ElementEditor.openEditor(a) as ElementEditor;
    const editorB = ElementEditor.openEditor(b) as ElementEditor;
    expect(groupEditor.getEditors()).toEqual([editorA, editorB, editorC]);
    expect(ElementEditor.openEditor(a)).toBe(editorA);
    // `append` puts it at the end whatever the order.
    ElementEditor.closeElementEditor(a);
    expect(ElementEditor.getEditor(a)).toBeNull();
    ElementEditor.openEditor(a, false, true);
    expect(groupEditor.getEditors()?.at(-1)).toBe(ElementEditor.getEditor(a));
  });

  it("closes the editors inside an editor along with it", () => {
    const { group, a, b } = setup();
    ElementEditor.openEditor(a);
    ElementEditor.openEditor(b);
    const groupEditor = ElementEditor.getEditor(group) as GroupEditor;
    ElementEditor.closeElementEditor(group);
    expect(ElementEditor.getEditor(group)).toBeNull();
    expect(ElementEditor.getEditor(a)).toBeNull();
    expect(groupEditor.getEditors()).toEqual([]);
  });

  it("asks the scene's GEditor to repaint", () => {
    const { a, invalidated } = setup();
    const editor = ElementEditor.openEditor(a) as ElementEditor;
    invalidated.length = 0;
    editor.setFlag(BaseEditor.Flag.Selected);
    expect(invalidated).toEqual([editor, editor]);
  });

  it("is empty unless selected or highlighted and maps the source box otherwise", () => {
    const { a } = setup();
    const editor = ElementEditor.openEditor(a) as ElementEditor;
    expect(editor.getBBox(new Transform())).toBeNull();
    editor.setFlag(BaseEditor.Flag.Highlighted);
    // The 10 x 10 box, the 1.5 margin; highlighted shows no handles.
    expect(box(editor.getBBox(new Transform()))).toEqual([-1.5, -1.5, 13, 13]);
  });

  it("applies a previewed transform to the element and resets it", () => {
    const { a } = setup();
    const editor = ElementEditor.openEditor(a) as ElementEditor;
    editor.setFlag(BaseEditor.Flag.Selected);
    editor._setTransform(new Transform(1, 0, 0, 1, 5, 7));
    expect(editor.canApplyTransform()).toBe(true);
    expect(box(editor.getPEGeometryBBox())).toEqual([5, 7, 10, 10]);
    editor.applyTransform(a);
    expect(box(a.getGeometryBBox())).toEqual([5, 7, 10, 10]);
    expect(editor._transform).toBeNull();
    // A partially locked element can't take a transform.
    a.setFlag(ElementFlag.PartialLocked);
    editor._setTransform(new Transform(1, 0, 0, 1, 5, 7));
    expect(editor.canApplyTransform()).toBe(false);
  });

  it("links and unlinks the preview to the element", () => {
    const { a } = setup();
    const editor = ElementEditor.openEditor(a) as ElementEditor;
    const preview = rect(0, 0, 1, 1) as unknown as EditedElement;
    editor._setElementPreview(preview);
    expect(preview._baseElement).toBe(a);
    expect(editor.getPaintElement()).toBe(preview);
    editor.resetTransform();
    expect(preview._baseElement).toBeNull();
    expect(editor.getPaintElement()).toBe(a);
  });
});
