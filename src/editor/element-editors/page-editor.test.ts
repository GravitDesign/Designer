import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, onTestFinished } from "vitest";
import { Platform } from "../../engine/core/platform.ts";
import { Point } from "../../engine/math/point.ts";
import { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import type { Page } from "../../engine/scene/page.ts";
import { Scene } from "../../engine/scene/scene.ts";
import { SceneOptions } from "../../engine/scene/scene-options.ts";
import { Workspace } from "../../engine/scene/workspace.ts";
import { EditorOptions } from "../editor-options.ts";
import { BaseEditor } from "./base-editor.ts";
import { LabelHolder } from "./block-editor.ts";
import { BoxEditor } from "./box-editor.ts";
import { ElementEditor } from "./element-editor.ts";
import { PageEditor, type EditedPage } from "./page-editor.ts";
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

const here = dirname(fileURLToPath(import.meta.url));
/** Recorded from the old app: getCustomBBox of a 300 x 200 page. */
const oldCustomBBox = JSON.parse(
  readFileSync(resolve(here, "__fixtures__", "old-page-editor-custom-bbox.json"), "utf8"),
) as unknown;

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

  it("grows its box up by the label, or is the label, as the old app did", () => {
    // Recorded with the engine defaults; key: selected, scaleLabel, scale.
    onTestFinished(() => {
      SceneOptions.scaleLabel = true;
    });
    const { editor } = setup();
    const boxes: Record<string, number[] | null> = {};
    for (const selected of [true, false]) {
      if (selected) editor.setFlag(BaseEditor.Flag.Selected);
      else editor.removeFlag(BaseEditor.Flag.Selected);
      for (const scaleLabel of [true, false]) {
        SceneOptions.scaleLabel = scaleLabel;
        for (const m of [
          [1, 0, 0, 1, 0, 0],
          [2, 0, 0, 2, 10, 20],
        ] as const) {
          const box = editor.getCustomBBox(new Transform(...m));
          boxes[[selected, scaleLabel, m[0]].join(",")] = box
            ? [box.getX(), box.getY(), box.getWidth(), box.getHeight()]
            : null;
        }
      }
    }
    expect(boxes).toEqual(oldCustomBBox);
  });

  it("hits the label of a linked page only while MOVE_MASTER is on", () => {
    const { scene, editor } = setup();
    let linked = true;
    (scene as unknown as { hasLinks(node: unknown): boolean }).hasLinks = () => linked;
    expect(editor._getPartInfoAt(new Point(10, -2), new Transform(), 0)?.id).toBe(
      LabelHolder.LABEL_PART_ID,
    );
    PageEditor.MOVE_MASTER = false;
    try {
      expect(editor._getPartInfoAt(new Point(10, -2), new Transform(), 0)).toBeNull();
      linked = false;
      expect(editor._getPartInfoAt(new Point(10, -2), new Transform(), 0)?.id).toBe(
        LabelHolder.LABEL_PART_ID,
      );
    } finally {
      PageEditor.MOVE_MASTER = true;
    }
  });

  describe("label drag in the multi-page view", () => {
    function drag(shift: boolean, collisionless: boolean) {
      const { page, editor } = setup();
      const calls: unknown[][] = [];
      (page as unknown as EditedPage).doCollisionlessTransform = (
        transform: Transform,
        ...rest: unknown[]
      ) => {
        calls.push([transform.getMatrix(), ...rest]);
        return transform.translated(1, 1);
      };
      editor.setCollisionlessTransform(collisionless);
      Platform.modifiers.shiftKey = shift;
      try {
        editor.movePart(
          LabelHolder.LABEL_PART_ID,
          { point: new Point(10, -2), origTrf: new Transform() },
          new Point(40, 18),
          new Transform(),
          { mapPoint: (p: Point) => p },
          shift,
          "option",
          true,
        );
      } finally {
        Platform.modifiers.shiftKey = false;
      }
      return { calls, transform: matrix(editor._transform) };
    }

    it("moves by the plain offset", () => {
      expect(drag(false, false)).toEqual({ calls: [], transform: [1, 0, 0, 1, 30, 20] });
    });

    it("moves around the other pages with shift, passing the option along", () => {
      expect(drag(true, false)).toEqual({
        calls: [[[1, 0, 0, 1, 30, 20], "option"]],
        transform: [1, 0, 0, 1, 31, 21],
      });
    });

    it("moves around the other pages with collision-less transforms on", () => {
      // The preview goes through BlockEditor's edTransform, so only once.
      expect(drag(false, true)).toEqual({
        calls: [[[1, 0, 0, 1, 30, 20]]],
        transform: [1, 0, 0, 1, 31, 21],
      });
    });
  });

  it("relayouts its contents only for a scale", () => {
    const { page, editor } = setup();
    const target = page as unknown as EditedPage;
    editor._transform = new Transform(1, 0, 0, 1, 30, 40);
    editor._prepareApplyTransform(page);
    expect([target._layoutTransform, target._relayout]).toEqual([null, false]);
    editor._transform = new Transform(2, 0, 0, 1, 30, 40);
    editor._prepareApplyTransform(page);
    expect([matrix(target._layoutTransform), target._relayout]).toEqual([[2, 0, 0, 1, 0, 0], true]);
  });

  it("moves another page by its own offset plus the move and the distance", () => {
    const { scene, page, editor } = setup();
    const other = scene.insertPage() as Page;
    page.setProperty("off", new Transform(1, 0, 0, 1, 5, 0));
    page.getPosition = () => new Point(100, 0);
    other.getPosition = () => new Point(400, 50);
    editor._transform = new Transform(1, 0, 0, 1, 10, 20);
    editor.applyTransform(other);
    expect(matrix(other.getProperty("off"))).toEqual([1, 0, 0, 1, 5 + 10 - 300, 20 - 50]);
    // This page's own offset is left alone.
    expect(matrix(page.getProperty("off"))).toEqual([1, 0, 0, 1, 5, 0]);
    expect(editor._transform).toBeNull();
  });

  it("swaps places with the nearest page when SWITCH_ORDER is on", () => {
    const { scene, page, editor } = setup();
    const selections: unknown[][] = [];
    (scene as unknown as { __graphic_editor__: Record<string, unknown> }).__graphic_editor__[
      "updateSelection"
    ] = (toggle: unknown, nodes: unknown) => selections.push([toggle, nodes]);
    // Page boxes are in page coordinates, so only their sizes set the centres apart.
    const second = scene.insertPage() as Page;
    second.setProperties(["w", "h"], [1000, 1000]);
    const third = scene.insertPage() as Page;
    third.setProperties(["w", "h"], [2000, 2000]);
    const order = () => [page, second, third].map((p) => scene.getIndexOfChild(p));
    const before = order();
    const offBefore = matrix(page.getProperty("off"));
    const centre = (p: Page) => (p.getGeometryBBox() as Rect).getSide(Rect.Side.CENTER);
    const toThird = centre(third).subtract(centre(page));
    PageEditor.SWITCH_ORDER = true;
    try {
      editor._transform = new Transform(1, 0, 0, 1, toThird.getX(), toThird.getY());
      editor.applyPartMove(LabelHolder.LABEL_PART_ID, { point: new Point(0, 0) });
    } finally {
      PageEditor.SWITCH_ORDER = false;
    }
    // Moved after the third page; the second moves up.
    expect(order()).toEqual([before[2], (before[1] as number) - 1, (before[2] as number) - 1]);
    expect(selections).toEqual([[false, [page]]]);
    // The page swaps instead of moving.
    expect(matrix(page.getProperty("off"))).toEqual(offBefore);
  });
});
