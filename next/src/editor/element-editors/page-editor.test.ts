import { afterEach, describe, expect, it } from "vitest";
import { Point } from "../../engine/math/point.ts";
import { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import type { Page } from "../../engine/scene/page.ts";
import { Scene } from "../../engine/scene/scene.ts";
import { Workspace } from "../../engine/scene/workspace.ts";
import { EditorOptions } from "../editor-options.ts";
import { BaseEditor } from "./base-editor.ts";
import { LabelHolder } from "./block-editor.ts";
import { BoxEditor } from "./box-editor.ts";
import { ElementEditor } from "./element-editor.ts";
import { PageEditor } from "./page-editor.ts";
import "./scene-editor.ts";

function setup(width = 300, height = 200): { scene: Scene; page: Page; editor: PageEditor } {
  const scene = new Scene(new Workspace());
  (scene as unknown as { __graphic_editor__: unknown }).__graphic_editor__ = {
    requestInvalidation: () => undefined,
    getIndividualSelection: () => null,
  };
  const page = scene.getActivePage() as Page;
  page.setProperties(["w", "h"], [width, height]);
  const editor = ElementEditor.openEditor(page) as PageEditor;
  return { scene, page, editor };
}

const matrix = (value: unknown) => (value as Transform | null)?.getMatrix() ?? null;
const selectable = EditorOptions.pageSelectable;

afterEach(() => {
  EditorOptions.pageSelectable = selectable;
});

describe("GPageEditor", () => {
  it("opens inside the scene editor with resize handles only", () => {
    const { scene, editor } = setup();
    expect(editor).toBeInstanceOf(PageEditor);
    expect(editor.getParentEditor()).toBe(ElementEditor.getEditor(scene));
    expect(editor.hasFlag(BoxEditor.Flag.ResizeAll)).toBe(true);
    expect(editor.hasFlag(BoxEditor.Flag.RotateCorners)).toBe(false);
    expect(editor.hasFlag(BoxEditor.Flag.RotateHandle)).toBe(false);
    expect(editor.allowPartSelection()).toBe(true);
  });

  it("hits the label above a fixed-size page", () => {
    const { scene, editor } = setup();
    const labelHeight = scene.getLabelBBox(1).getHeight();
    const label = editor._getLabelBBox(new Transform()) as Rect;
    expect([label.getX(), label.getY(), label.getWidth(), label.getHeight()]).toEqual([
      0,
      -labelHeight - 1,
      300,
      labelHeight + 1,
    ]);
    const hit = editor._getPartInfoAt(new Point(10, -2), new Transform(), 0);
    expect(hit?.id).toBe(LabelHolder.LABEL_PART_ID);
    expect(hit?.isolated).toBe(true);
    expect(hit?.selectable).toBe(true);
    expect(editor._getPartInfoAt(new Point(10, 5), new Transform(), 0)).toBeNull();
    EditorOptions.pageSelectable = false;
    expect(editor._getPartInfoAt(new Point(10, -2), new Transform(), 0)).toBeNull();
  });

  it("has no label on an infinite page", () => {
    const { editor } = setup(0, 0);
    expect(editor._getPartInfoAt(new Point(10, -2), new Transform(), 0)).toBeNull();
  });

  it("applies a resize as new width, height and offset", () => {
    const { page, editor } = setup();
    const resize = Transform.getResizeTransform(
      new Rect(0, 0, 300, 200),
      Rect.Side.TOP_LEFT,
      -30,
      -20,
    );
    editor._transform = resize;
    const after = resize.mapRect(new Rect(0, 0, 300, 200));
    editor.applyPartMove(BoxEditor.RESIZE_HANDLE_PART_ID, {});
    expect([page.getProperty("w"), page.getProperty("h")]).toEqual([
      300 * (after.getWidth() / 300),
      200 * (after.getHeight() / 200),
    ]);
    expect(after.getWidth()).toBe(330);
    expect(matrix(page.getProperty("off"))).toEqual([1, 0, 0, 1, after.getX(), after.getY()]);
    expect(after.getX()).toBe(-30);
    expect(editor._transform).toBeNull();
  });

  it("moves the page by its label through its offset", () => {
    const { page, editor } = setup();
    editor._transform = new Transform(1, 0, 0, 1, 15, 5);
    editor.applyPartMove(LabelHolder.LABEL_PART_ID, { point: new Point(0, 0) });
    expect(matrix(page.getProperty("off"))).toEqual([1, 0, 0, 1, 15, 5]);
    expect(page.getProperty("trf") ?? null).toBeNull();
    // applyTransform adds the move to the offset as well.
    editor._transform = new Transform(1, 0, 0, 1, 1, 2);
    editor.applyTransform(page);
    expect(matrix(page.getProperty("off"))).toEqual([1, 0, 0, 1, 16, 7]);
  });

  it("paints only the active page outside the multi-page view", () => {
    const { scene, page, editor } = setup();
    const other = scene.insertPage() as Page;
    const otherEditor = ElementEditor.openEditor(other) as PageEditor;
    const painted: unknown[] = [];
    for (const target of [editor, otherEditor]) {
      target._paintChildren = () => painted.push(target);
    }
    const context = { configuration: { multiPageView: false } } as never;
    editor.paint(new Transform(), context);
    otherEditor.paint(new Transform(), context);
    expect(painted).toEqual([editor, editor]);
    painted.length = 0;
    otherEditor.paint(new Transform(), { configuration: { multiPageView: true } } as never);
    expect(painted).toEqual([otherEditor, otherEditor]);
    expect(page).toBe(scene.getActivePage());
  });

  it("reads edTransform options unchecked without collision-less transforms", () => {
    const { editor } = setup();
    editor.setCollisionlessTransform(false);
    expect(() => editor.edTransform(new Transform(1, 0, 0, 1, 5, 5))).toThrow(TypeError);
    const options = new BoxEditor.EdTransformOptions();
    editor.edTransform(new Transform(1, 0, 0, 1, 5, 5), null, null, options);
    expect(matrix(editor._transform)).toEqual([1, 0, 0, 1, 5, 5]);
  });

  it("is not a page editor of a non-selectable page", () => {
    const { editor } = setup();
    editor.setFlag(BaseEditor.Flag.Selected);
    expect(editor._showEditor()).toBe(true);
    EditorOptions.pageSelectable = false;
    expect(editor._showEditor()).toBe(false);
  });
});
