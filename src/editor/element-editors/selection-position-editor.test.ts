import { describe, expect, it, vi } from "vitest";
import { Point } from "../../engine/math/point.ts";
import { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import type { Node } from "../../engine/scene/node.ts";
import { Page } from "../../engine/scene/page.ts";
import { AnchorPoint, PathBase } from "../../engine/scene/path-base.ts";
import { Scene } from "../../engine/scene/scene.ts";
import { Workspace } from "../../engine/scene/workspace.ts";
import { Text } from "../../engine/text/text.ts";
import { Editor } from "../editor.ts";
import { EditorWorkspace } from "../editor-workspace.ts";
import { BaseEditor } from "./base-editor.ts";
import { BoxEditor, EdTransformOptions } from "./box-editor.ts";
import { ElementEditor } from "./element-editor.ts";
import "./layer-editor.ts";
import "./page-editor.ts";
import "./path-base-editor.ts";
import "./scene-editor.ts";
import "./text-editor.ts";
import { SelectionPositionEditor, type SelectionHost } from "./selection-position-editor.ts";

function square(x: number, y: number, size: number): PathBase {
  const path = new PathBase();
  for (const [px, py] of [
    [x, y],
    [x + size, y],
    [x + size, y + size],
    [x, y + size],
  ]) {
    const point = new AnchorPoint();
    point.setProperties(["x", "y"], [px, py]);
    path.getAnchorPoints().appendChild(point);
  }
  return path;
}

function setup(lockSecond = false, withText = false) {
  const scene = new Scene(new Workspace());
  const a = square(0, 0, 40);
  const b: PathBase | Text = withText ? new Text() : square(60, 20, 40);
  if (lockSecond) b.setProperty("plkt", 2);
  const page = scene.getActivePage() as unknown as { appendChild(n: Node): void };
  page.appendChild(a);
  page.appendChild(b);
  const log: unknown[][] = [];
  const host = {
    requestInvalidation: (editor: unknown) => log.push(["invalidate", editor]),
    getIndividualSelection: () => [a, b],
  } as unknown as SelectionHost;
  (scene as unknown as { __graphic_editor__: unknown }).__graphic_editor__ = host;
  const editor = new SelectionPositionEditor();
  editor.activate(scene, host);
  return { scene, a, b, editor, log };
}

/** A rectangle plus a text whose editor reports `textBox` as its bbox. */
function setupWithText(textBox: Rect) {
  const result = setup(false, true);
  const textEditor = ElementEditor.getEditor(result.b) as ElementEditor;
  const asked: unknown[][] = [];
  textEditor._getBBox = (transform: Transform, includeTransform?: unknown) => {
    asked.push([transform.getMatrix().slice(), includeTransform]);
    return textBox;
  };
  return { ...result, asked };
}

const rect = (r: Rect | null) => (r ? [r.getX(), r.getY(), r.getWidth(), r.getHeight()] : null);

describe("GSelectionPositionEditor", () => {
  it("boxes the whole selection and outlines each element's editor", () => {
    const { a, b, editor } = setup();
    expect(rect(editor.getBox())).toEqual([0, 0, 100, 60]);
    for (const element of [a, b]) {
      expect(ElementEditor.getEditor(element)?.hasFlag(BaseEditor.Flag.Outline)).toBe(true);
    }
    expect(editor.hasFlag(BoxEditor.Flag.ResizeAll)).toBe(true);
    expect(editor.hasFlag(BoxEditor.Flag.RotateHandle)).toBe(true);
    expect(editor.getObjectNameModified()).toBe("Selection");
    expect(editor.isRelativeToPage()).toBe(false);
  });

  it("drops all handles when one element has NoSizeChanges", () => {
    const { editor } = setup(true);
    expect(editor.hasFlag(BoxEditor.Flag.ResizeEdges)).toBe(false);
    expect(editor.hasFlag(BoxEditor.Flag.ResizeCenters)).toBe(false);
    expect(editor.hasFlag(BoxEditor.Flag.RotateCorners)).toBe(false);
    expect(editor.hasFlag(BoxEditor.Flag.RotateHandle)).toBe(false);
  });

  it("hands previews to the element editors and applies through them", () => {
    const { a, b, editor } = setup();
    const calls: unknown[][] = [];
    for (const element of [a, b]) {
      const child = ElementEditor.getEditor(element) as ElementEditor;
      child.edTransform = (t: Transform) =>
        void calls.push(["preview", element, t.getMatrix().slice()]);
      child.applyTransform = (target: unknown, rotate: unknown, exceptions: unknown) =>
        void calls.push(["apply", target, rotate, exceptions]);
    }
    const move = new Transform(1, 0, 0, 1, 10, 0);
    editor.edTransform(move);
    expect(calls).toEqual([
      ["preview", a, [1, 0, 0, 1, 10, 0]],
      ["preview", b, [1, 0, 0, 1, 10, 0]],
    ]);
    expect(editor._transform).toBe(move);
    calls.length = 0;
    editor.applyPartMove(BoxEditor.ROTATION_HANDLE_PART_ID, {}, null, [b]);
    expect(calls).toEqual([["apply", a, true, [b]]]);
    expect(editor._transform).toBeNull();
    // Nothing previewed: nothing applied.
    calls.length = 0;
    editor.applyPartMove(BoxEditor.RESIZE_HANDLE_PART_ID, {});
    expect(calls).toEqual([]);
  });

  it("hit tests only its own handles", () => {
    const { editor } = setup();
    editor.setFlag(BaseEditor.Flag.Selected);
    const corner = editor.getPartInfoAt(new Point(100, 60), new Transform());
    expect(corner?.id).toBe(BoxEditor.RESIZE_HANDLE_PART_ID);
    expect(editor.getPartInfoAt(new Point(100, 60), new Transform(), () => false)).toBeNull();
    expect(editor.getPartInfoAt(new Point(500, 500), new Transform())).toBeNull();
  });

  it("asks the scene's GEditor to repaint itself", () => {
    const { editor, log } = setup();
    log.length = 0;
    editor.requestInvalidation();
    expect(log).toEqual([["invalidate", editor]]);
  });

  it("unites the text editors' boxes into its bbox", () => {
    const textBox = new Rect(200, 150, 30, 10);
    const { editor, asked } = setupWithText(textBox);
    editor.setFlag(BaseEditor.Flag.Selected);
    const view = new Transform(2, 0, 0, 2, 5, 5);
    const own = BoxEditor.prototype._getBBox.call(editor, view, true) as Rect;
    expect(rect(editor._getBBox(view, true))).toEqual(rect(own.united(textBox)));
    expect(asked).toEqual([[[2, 0, 0, 2, 5, 5], true]]);
  });

  it("draws the box outline untransformed around the box and the text boxes", () => {
    const textBox = new Rect(200, 150, 30, 10);
    const { editor, asked } = setupWithText(textBox);
    const drawn: unknown[][] = [];
    editor._paintTransformedQuadrilateral = (transform: Transform, box: Rect) =>
      void drawn.push([transform.getMatrix().slice(), rect(box)]);
    const view = new Transform(2, 0, 0, 2, 5, 5);
    editor._paintResizeBoxOutline(view, {} as never, false, null);
    const viewBox = view.mapRect(editor.getBox() as Rect).united(textBox);
    expect(drawn).toEqual([[[1, 0, 0, 1, 0, 0], rect(viewBox)]]);
    expect(asked).toEqual([[[2, 0, 0, 2, 5, 5], false]]);
    // Without a text the box is drawn through the view transform.
    const plain = setup().editor;
    const plainDrawn: unknown[][] = [];
    plain._paintTransformedQuadrilateral = (transform: Transform, box: Rect) =>
      void plainDrawn.push([transform.getMatrix().slice(), rect(box)]);
    plain._paintResizeBoxOutline(view, {} as never, false, null);
    expect(plainDrawn).toEqual([
      [
        [2, 0, 0, 2, 5, 5],
        [0, 0, 100, 60],
      ],
    ]);
  });

  describe("with the active page away from the origin", () => {
    /** a on the active page at (300, 40), b on a second page at (500, 100). */
    function paged() {
      const scene = new Scene(new Workspace());
      const active = scene.getActivePage() as Page;
      const other = new Page();
      scene.appendChild(other);
      const a = square(0, 0, 40);
      const b = square(60, 20, 40);
      active.appendChild(a);
      other.appendChild(b);
      active.getPosition = () => new Point(300, 40);
      other.getPosition = () => new Point(500, 100);
      const log: unknown[][] = [];
      const host = {
        requestInvalidation: (editor: unknown, args: unknown) => log.push([editor, args]),
        getIndividualSelection: () => [a, b],
      } as unknown as SelectionHost;
      (scene as unknown as { __graphic_editor__: unknown }).__graphic_editor__ = host;
      const editor = new SelectionPositionEditor();
      editor.activate(scene, host);
      return { scene, a, b, editor, log };
    }

    const pageTransform = (args: unknown) =>
      (args as { pageTransform: Transform }).pageTransform.getMatrix().slice();

    it("repaints with the page offset", () => {
      const { editor, log } = paged();
      log.length = 0;
      editor.requestInvalidation();
      const given = { area: 1 };
      editor.requestInvalidation(given);
      expect(log.map(([, args]) => pageTransform(args))).toEqual([
        [1, 0, 0, 1, 300, 40],
        [1, 0, 0, 1, 300, 40],
      ]);
      expect(log[1]?.[1]).toBe(given);
    });

    it("maps a multi-page preview into each element's page", () => {
      const { a, b, editor } = paged();
      const calls: unknown[][] = [];
      for (const element of [a, b]) {
        const child = ElementEditor.getEditor(element) as ElementEditor;
        child.edTransform = (t: Transform) => void calls.push([element, t.getMatrix().slice()]);
      }
      const scale = new Transform(2, 0, 0, 2, 0, 0);
      const options = new EdTransformOptions();
      options.isMultiPage = true;
      editor.edTransform(scale, null, null, options);
      // b's page sits at (200, 60) from the active page.
      expect(calls).toEqual([
        [a, [2, 0, 0, 2, 0, 0]],
        [b, [2, 0, 0, 2, 200, 60]],
      ]);
      calls.length = 0;
      editor.edTransform(scale, null, null, new EdTransformOptions());
      expect(calls).toEqual([
        [a, [2, 0, 0, 2, 0, 0]],
        [b, [2, 0, 0, 2, 0, 0]],
      ]);
    });

    it("paints shifted by the active page only in the multi-page view", () => {
      const { editor } = paged();
      const painted: number[][] = [];
      const spy = vi
        .spyOn(BoxEditor.prototype, "paint")
        .mockImplementation((transform: Transform) => void painted.push(transform.getMatrix()));
      const view = new Transform(2, 0, 0, 2, 5, 5);
      editor.paint(view, { configuration: { multiPageView: true } } as never);
      editor.paint(view, { configuration: { multiPageView: false } } as never);
      spy.mockRestore();
      expect(painted).toEqual([
        [2, 0, 0, 2, 605, 85],
        [2, 0, 0, 2, 5, 5],
      ]);
    });

    it("measures again when a selected element leaves its page", () => {
      const { b, editor } = paged();
      const before = rect(editor.getBox());
      (b.getParent() as unknown as { removeChild(n: Node): void }).removeChild(b);
      expect(rect(editor.getBox())).toEqual(rect(measured(editor)));
      expect(rect(editor.getBox())).not.toEqual(before);
    });
  });

  describe("keeps its box between reads", () => {
    it("measures the page's grid position once per read, not once per element", () => {
      const { scene, editor } = setup();
      const spy = vi.spyOn(scene.getActivePage() as Page, "getPosition");
      expect(rect(editor.getBox())).toEqual([0, 0, 100, 60]);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(rect(editor.getBox())).toEqual([0, 0, 100, 60]);
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it("measures again when a selected element moves or is resized", () => {
      const { a, b, editor } = setup();
      let before = rect(editor.getBox());
      a.transform(new Transform(1, 0, 0, 1, -20, -5));
      expect(rect(editor.getBox())).toEqual(rect(measured(editor)));
      expect(rect(editor.getBox())).not.toEqual(before);
      before = rect(editor.getBox());
      b.transform(new Transform(2, 0, 0, 2, 0, 0));
      expect(rect(editor.getBox())).toEqual(rect(measured(editor)));
      expect(rect(editor.getBox())).not.toEqual(before);
    });

    it("measures again when the selection changes", () => {
      const { a, b, editor } = setup();
      expect(rect(editor.getBox())).toEqual([0, 0, 100, 60]);
      const host = editor._graphicEditor as SelectionHost;
      host.getIndividualSelection = () => [b];
      editor.updateFromSelection();
      expect(rect(editor.getBox())).toEqual([60, 20, 40, 40]);
      // The same list, changed in place.
      const list = [a, b];
      host.getIndividualSelection = () => list;
      editor.updateFromSelection();
      expect(rect(editor.getBox())).toEqual([0, 0, 100, 60]);
      list.pop();
      expect(rect(editor.getBox())).toEqual([0, 0, 40, 40]);
      list[0] = b;
      expect(rect(editor.getBox())).toEqual([60, 20, 40, 40]);
    });

    it("measures again when a page moves in the page grid", () => {
      const scene = new Scene(new Workspace());
      const first = scene.getActivePage() as Page;
      const second = new Page();
      scene.appendChild(second);
      first.setProperties(["w", "h"], [800, 600]);
      second.setProperties(["w", "h"], [800, 600]);
      const a = square(0, 0, 40);
      const b = square(60, 20, 40);
      first.appendChild(a);
      second.appendChild(b);
      const host = {
        requestInvalidation: () => undefined,
        getIndividualSelection: () => [a, b],
      } as unknown as SelectionHost;
      (scene as unknown as { __graphic_editor__: unknown }).__graphic_editor__ = host;
      const editor = new SelectionPositionEditor();
      editor.activate(scene, host);
      const before = rect(editor.getBox());
      const at = second.getPosition(true).getX();
      second.setProperty("off", new Transform(1, 0, 0, 1, 2000, 0));
      expect(second.getPosition(true).getX()).not.toBe(at);
      expect(rect(editor.getBox())).toEqual(rect(measured(editor)));
      expect(rect(editor.getBox())).not.toEqual(before);
    });

    it("measures again after a move is undone and redone", () => {
      const scene = new Scene(new EditorWorkspace());
      const graphic = new Editor(scene);
      const a = square(0, 0, 40);
      const b = square(60, 20, 40);
      graphic.insertElements([a, b], true);
      const box = () => {
        const editor = graphic.getSelectionEditor() as unknown as SelectionPositionEditor;
        expect(editor).toBeInstanceOf(SelectionPositionEditor);
        const result = rect(editor.getBox());
        expect(result).toEqual(rect(measured(editor)));
        return result;
      };
      const before = box();
      graphic.beginTransaction();
      a.transform(new Transform(1, 0, 0, 1, -30, -10));
      graphic.commitTransaction("Move");
      const moved = box();
      expect(moved).not.toEqual(before);
      graphic.undoState();
      expect(box()).toEqual(before);
      graphic.redoState();
      expect(box()).toEqual(moved);
    });
  });
});

/** The box measured from scratch, as getBox did before it kept its box. */
function measured(editor: SelectionPositionEditor): Rect | null {
  let box = Editor.getGroupGeometryBBox(editor._selection, true);
  const page = (editor._scene as unknown as Scene).getActivePage();
  if (box && page) {
    const position = page.getPosition(true);
    box = box.translated(-position.getX(), -position.getY());
  }
  return box;
}
