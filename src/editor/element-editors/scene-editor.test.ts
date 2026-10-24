import { describe, expect, it } from "vitest";
import { Point } from "../../engine/math/point.ts";
import type { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import { Element } from "../../engine/scene/element.ts";
import { NodeFlag } from "../../engine/scene/node-change.ts";
import type { Node } from "../../engine/scene/node.ts";
import type { Page } from "../../engine/scene/page.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import { Scene } from "../../engine/scene/scene.ts";
import { Workspace } from "../../engine/scene/workspace.ts";
import { Cursor } from "../cursor.ts";
import { EditorOptions } from "../editor-options.ts";
import { EditorAnnotation } from "../handles/editor-annotation.ts";
import { BaseEditor, PartInfo } from "./base-editor.ts";
import { ElementEditor } from "./element-editor.ts";
import { SceneEditor } from "./scene-editor.ts";
import { TransformBox } from "./transform-box.ts";

const H = TransformBox.Handles;
const Mode = SceneEditor.TBoxMode;

interface Setup {
  scene: Scene;
  rect: Rectangle;
  editor: SceneEditor;
  selectionEditor: BaseEditor;
  log: unknown[][];
}

/**
 * A scene with one 100 x 50 rectangle at (20, 30), selected through a fake
 * GEditor; the active page can be placed at `position`, and the guides
 * report `zones` as snap zones.
 */
function setup(position?: Point, zones?: [Point, Point][]): Setup {
  const scene = new Scene(new Workspace());
  if (position) (scene.getActivePage() as Page).getPosition = () => position;
  const rect = new Rectangle();
  rect.setProperty("trf", new Transform(50, 0, 0, 25, 70, 55));
  (scene.getActivePage() as unknown as { appendChild(n: Node): void }).appendChild(rect);
  const log: unknown[][] = [];
  const selectionEditor = new BaseEditor();
  const host = {
    getScene: () => scene,
    requestInvalidation: (editor: unknown, args?: unknown) =>
      log.push(["invalidate", editor, args]),
    beginTransaction: () => log.push(["begin"]),
    commitTransaction: (name: unknown) => log.push(["commit", typeof name]),
    getSelection: () => [rect],
    updateSelection: () => undefined,
    clearSelection: () => undefined,
    isTransformBoxActive: () => false,
    getTransformBox: () => null,
    getTBoxMode: () => 0,
    getIndividualSelection: () => [rect],
    getSelectionEditor: () => selectionEditor,
    addEventListener: () => log.push(["listen"]),
    removeEventListener: () => log.push(["unlisten"]),
    getGuides: () => ({
      useExclusions: () => undefined,
      beginMap: () => undefined,
      finishMap: () => undefined,
      mapPoint: (p: Point) => p,
      invalidate: () => log.push(["guides-invalidate"]),
      getBBoxSnapZones: (area: Rect, location: Point) => {
        log.push([
          "zones",
          [area.getX(), area.getY(), area.getWidth(), area.getHeight()],
          location,
        ]);
        return zones ?? null;
      },
    }),
    getAlignExclusions: () => null,
    getMappingScopes: () => null,
    transformSelection: (
      transform: Transform,
      a: unknown,
      b: unknown,
      options: { fullContentsTransform: boolean },
    ) => log.push(["transform", transform.getMatrix().slice(), options.fullContentsTransform]),
    applySelectionTransform: (...args: unknown[]) => log.push(["apply", ...args]),
  };
  (scene as unknown as { __graphic_editor__: unknown }).__graphic_editor__ = host;
  const editor = ElementEditor.openEditor(scene, true) as SceneEditor;
  return { scene, rect, editor, selectionEditor, log };
}

const part = (id: unknown, data?: unknown) => new PartInfo(new BaseEditor(), id, data, null, null);

describe("GSceneEditor", () => {
  it("is the scene's editor", () => {
    const { scene, editor } = setup();
    expect(editor).toBeInstanceOf(SceneEditor);
    expect(ElementEditor.getEditor(scene)).toBe(editor);
    expect(editor.isRelativeToPage()).toBe(false);
    expect(editor.getTBoxMode()).toBe(Mode.NA);
  });

  it("gives each transform box part its cursor", () => {
    const { editor } = setup();
    expect(editor.getCursor(TransformBox.INSIDE)).toBe(Cursor.SelectCross);
    expect(editor.getCursor(H.ROTATE)).toBe(Cursor.SelectRotateRound);
    expect(editor.getCursor(TransformBox.OUTLINE, 1)).toBe(Cursor.SelectSkewHoriz);
    expect(editor.getCursor(TransformBox.OUTLINE, 0)).toBe(Cursor.SelectSkewVert);
    expect(editor.getCursor(H.TOP_CENTER)).toBe(Cursor.SelectResizeVert);
    expect(editor.getCursor(H.LEFT_CENTER)).toBe(Cursor.SelectResizeHoriz);
    expect(editor.getCursor(H.BOTTOM_RIGHT)).toBe(Cursor.SelectResizeUpLeftDownRight);
    expect(editor.getCursor(H.BOTTOM_LEFT)).toBe(Cursor.SelectResizeUpRightDownLeft);
    expect(editor.getCursor(H.ROTATION_CENTER)).toBe(Cursor.SelectArrowOnly);
    expect(editor.getCursor(TransformBox.FAR_OUTSIDE)).toBe(Cursor.Select);
  });

  it("shows the round rotate cursor outside the box (old missing break)", () => {
    // OUTSIDE falls through to ROTATE, so the rotation segment's cursor is
    // never shown; see "Scene editor rotation zone shows the plain rotate
    // cursor" in QUESTIONS.md.
    const { editor } = setup();
    expect(editor.getCursor(TransformBox.OUTSIDE, { rotationSegment: 2 })).toBe(
      Cursor.SelectRotateRound,
    );
    expect(editor.getCursor(TransformBox.OUTSIDE, { rotationSegment: 2 })).not.toBe(
      Cursor.SelectRotate[2],
    );
    // The segment lookup still runs, so missing part data throws.
    expect(() => editor.getCursor(TransformBox.OUTSIDE)).toThrow(TypeError);
  });

  it("builds the transform box around the selection and hides the selection editor", () => {
    const { editor, selectionEditor, log } = setup();
    editor.setTransformBoxActive(true);
    const box = editor.getTransformBox() as TransformBox;
    expect(editor.isTransformBoxActive()).toBe(true);
    expect([box.tlx, box.tly, box.brx, box.bry, box.cx, box.cy]).toEqual([20, 30, 120, 80, 70, 55]);
    expect(editor.getTBoxMode()).toBe(Mode.PASSIVE);
    expect(selectionEditor.hasFlag(BaseEditor.Flag.HideEditor)).toBe(true);
    expect(log.filter((e) => e[0] === "listen").length).toBe(1);
    // Rebuilt with a given centre.
    editor.setTransformBoxActive(true, new Point(5, 6));
    expect(editor.getTransformBoxCenter()?.getX()).toBe(5);
    expect(log.filter((e) => e[0] === "listen").length).toBe(1);
    editor.setTransformBoxActive(false);
    expect(editor.getTransformBox()).toBeNull();
    expect(editor.getTBoxMode()).toBe(Mode.NA);
    expect(selectionEditor.hasFlag(BaseEditor.Flag.HideEditor)).toBe(false);
    expect(log.filter((e) => e[0] === "unlisten").length).toBe(1);
  });

  it("picks the drag mode from the part", () => {
    const { editor } = setup();
    editor.setTransformBoxActive(true);
    const modes: [unknown, number][] = [
      [TransformBox.OUTLINE, Mode.SKEW],
      [H.SKEW_VERTICAL, Mode.SKEW],
      [TransformBox.OUTSIDE, Mode.ROTATE],
      [H.ROTATE, Mode.ROTATE],
      [H.TOP_LEFT, Mode.RESIZE],
      [H.LEFT_CENTER, Mode.RESIZE],
      [H.ROTATION_CENTER, Mode.CNTRMOVE],
      [TransformBox.INSIDE, Mode.TBOXMOVE],
    ];
    for (const [id, mode] of modes) {
      editor.startTBoxTransform(part(id));
      expect(editor.getTBoxMode()).toBe(mode);
    }
    expect((editor.getTransformBox() as TransformBox)._centerOnly).toBe(true);
  });

  it("previews a resize on the selection and a pivot move on the box", () => {
    const { editor, log } = setup();
    editor.setTransformBoxActive(true);
    // Passive: nothing happens.
    expect(editor.transformTBox(new Point(0, 0), new Point(1, 1), new Transform())).toBeNull();
    editor.startTBoxTransform(part(TransformBox.INSIDE));
    const move = editor.transformTBox(new Point(70, 55), new Point(80, 60), new Transform());
    expect(move?.getMatrix()).toEqual([1, 0, 0, 1, 10, 5]);
    expect(log.find((e) => e[0] === "transform")).toEqual(["transform", [1, 0, 0, 1, 10, 5], true]);
    expect((editor.getTransformBox() as TransformBox).trf).toBe(move);
    editor.applyTBoxTransform("arg");
    expect(log.find((e) => e[0] === "apply")).toEqual(["apply", "arg", false, false, true]);
    expect(editor.getTBoxMode()).toBe(Mode.PASSIVE);

    const pivotLog = setup();
    pivotLog.editor.setTransformBoxActive(true);
    pivotLog.editor.startTBoxTransform(part(H.ROTATION_CENTER));
    pivotLog.editor.transformTBox(new Point(70, 55), new Point(75, 50), new Transform());
    const pivotBox = pivotLog.editor.getTransformBox() as TransformBox;
    expect(pivotBox.cTrf?.getMatrix()).toEqual([1, 0, 0, 1, 5, -5]);
    expect(pivotLog.log.some((e) => e[0] === "transform")).toBe(false);
    pivotLog.editor.applyTBoxTransform();
    expect([pivotBox.cx, pivotBox.cy]).toEqual([75, 50]);
    expect(pivotLog.log.filter((e) => e[0] === "begin" || e[0] === "commit")).toEqual([
      ["begin"],
      ["commit", "string"],
    ]);
    expect(pivotBox._centerOnly).toBe(false);
  });

  it("hit tests the box and keeps the dragged part under the mouse", () => {
    const { editor } = setup();
    editor.setTransformBoxActive(true);
    const view = {
      getViewConfiguration: () => ({ multiPageView: false }),
      getViewTransform: () => new Transform(),
    };
    const first = editor.updateTBoxUnderMouse(new Point(21, 31), new Transform(), view);
    expect(first.newPInfo).toBe(true);
    expect(first.partInfo?.id).toBe(H.TOP_LEFT);
    expect(first.partInfo?.editor).toBe(editor);
    // A handle's data is a new point each time, so it always counts as new;
    // the inside (no data) doesn't.
    expect(editor.updateTBoxUnderMouse(new Point(21, 31), new Transform(), view).newPInfo).toBe(
      true,
    );
    expect(editor.updateTBoxUnderMouse(new Point(60, 50), new Transform(), view).newPInfo).toBe(
      true,
    );
    const again = editor.updateTBoxUnderMouse(new Point(61, 51), new Transform(), view);
    expect(again.newPInfo).toBe(false);
    expect(again.partInfo?.id).toBe(TransformBox.INSIDE);
    editor.startTBoxTransform(editor.getTBoxPartInfoAt(new Point(200, 55), new Transform(), 4));
    const dragging = editor.updateTBoxUnderMouse(new Point(70, 200), new Transform(), view);
    expect(dragging.partInfo?.id).toBe(TransformBox.OUTSIDE);
    expect((dragging.partInfo?.data as { rotationSegment: number }).rotationSegment).toBe(
      (editor.getTransformBox() as TransformBox).getRotationSegment(
        new Point(70, 200),
        new Transform(),
      ),
    );
  });

  it("asks GEditor to repaint itself", () => {
    const { editor, log } = setup();
    log.length = 0;
    editor.requestInvalidation();
    expect(log).toEqual([["invalidate", editor, undefined]]);
  });

  describe("with the active page away from the origin", () => {
    const at = new Point(300, 40);
    const view = (multiPageView: boolean) => ({
      getViewConfiguration: () => ({ multiPageView }),
      getViewTransform: () => new Transform(),
    });

    it("repaints with the page offset, but not for a page at the origin", () => {
      const { editor, log } = setup(at);
      log.length = 0;
      editor.requestInvalidation();
      const given = { area: 1 };
      editor.requestInvalidation(given);
      const matrices = log.map((e) =>
        (e[2] as { pageTransform: Transform }).pageTransform.getMatrix().slice(),
      );
      expect(matrices).toEqual([
        [1, 0, 0, 1, 300, 40],
        [1, 0, 0, 1, 300, 40],
      ]);
      expect(log[1]?.[2]).toBe(given);
      // Within epsilon of the origin counts as the origin.
      const origin = setup(new Point(1e-15, 0));
      origin.log.length = 0;
      origin.editor.requestInvalidation();
      expect(origin.log).toEqual([["invalidate", origin.editor, undefined]]);
    });

    it("builds the box in page coordinates and hit tests it through the page offset", () => {
      const { editor } = setup(at);
      editor.setTransformBoxActive(true);
      // GEditor.getGroupTransformBBox adds the page position; the box takes it off again.
      const box = editor.getTransformBox() as TransformBox;
      expect([box.tlx, box.tly, box.brx, box.bry, box.cx, box.cy]).toEqual([
        20, 30, 120, 80, 70, 55,
      ]);
      const identity = new Transform();
      expect(editor.getTBoxPartInfoAt(new Point(321, 71), identity, 4, true).id).toBe(H.TOP_LEFT);
      expect(editor.getTBoxPartInfoAt(new Point(321, 71), identity, 4, false).id).not.toBe(
        H.TOP_LEFT,
      );
      expect(
        editor.updateTBoxUnderMouse(new Point(321, 71), identity, view(true)).partInfo?.id,
      ).toBe(H.TOP_LEFT);
      // While rotating, the segment is measured through the page offset.
      editor.startTBoxTransform(editor.getTBoxPartInfoAt(new Point(500, 95), identity, 4, true));
      const dragging = editor.updateTBoxUnderMouse(new Point(70, 200), identity, view(true));
      const paged = new Transform(1, 0, 0, 1, 300, 40);
      const segment = (dragging.partInfo?.data as { rotationSegment: number }).rotationSegment;
      expect(segment).toBe(box.getRotationSegment(new Point(70, 200), paged));
      expect(segment).not.toBe(box.getRotationSegment(new Point(70, 200), identity));
    });

    it("asks for snap zones of the page-relative selection box over the inside", () => {
      const zones: [Point, Point][] = [[new Point(1.2, 2.7), new Point(10.5, 3)]];
      const { editor, log } = setup(at, zones);
      editor.setTransformBoxActive(true);
      editor.updateTBoxUnderMouse(new Point(700, 180), new Transform(2, 0, 0, 2, 0, 0), view(true));
      const asked = log.filter((e) => e[0] === "zones");
      expect(asked.map((e) => e[1])).toEqual([[40, 60, 200, 100]]);
      expect(editor._visuals).toBe(zones);
      const area = editor._visualsArea as Rect;
      expect([area.getX(), area.getY(), area.getWidth(), area.getHeight()]).toEqual([
        38, 58, 204, 104,
      ]);
    });

    it("paints the box with the canvas origin moved by the page, then the snap zones", () => {
      const { editor } = setup(at);
      editor.setTransformBoxActive(true);
      let origin = new Point(7, 9);
      const origins: number[][] = [];
      const lines: unknown[][] = [];
      const canvas = {
        getOrigin: () => origin,
        setOrigin: (p: Point) => void (origin = p),
        strokeLine: (...args: unknown[]) => void lines.push(args.slice(0, 5)),
      };
      const box = editor.getTransformBox() as TransformBox;
      box.paint = () => void origins.push([origin.getX(), origin.getY()]);
      editor._visuals = [[new Point(1.2, 2.7), new Point(10.5, 3)]];
      const scale = new Transform(2, 0, 0, 2, 0, 0);
      editor.paint(scale, { canvas, configuration: { multiPageView: true } } as never);
      expect(origins).toEqual([[7 - 600, 9 - 80]]);
      expect([origin.getX(), origin.getY()]).toEqual([7, 9]);
      expect(EditorOptions.outlineWidth).toBe(1);
      expect(lines).toEqual([[1.5, 2.5, 10.5, 3.5, 1]]);
      expect(editor._visuals).toBeNull();
      // Without the multi-page view the origin stays.
      editor.paint(scale, { canvas, configuration: { multiPageView: false } } as never);
      expect(origins[1]).toEqual([7, 9]);
    });
  });

  it("grows its bbox by the transform box area and the annotation margin", () => {
    const { editor } = setup();
    editor.setTransformBoxActive(true);
    const area = (editor.getTransformBox() as TransformBox)._calculateGeometryBBox();
    const margin = EditorAnnotation.getAnnotationPaintMargin(
      EditorOptions.annotationHandles.tranformBox.size,
    );
    expect(margin).toBeGreaterThan(0);
    const scale = new Transform(2, 0, 0, 2, 0, 0);
    const expected = scale.mapRect(area).expanded(margin, margin, margin, margin);
    const box = editor.getBBox(scale) as Rect;
    expect([box.getX(), box.getY(), box.getWidth(), box.getHeight()]).toEqual([
      expected.getX(),
      expected.getY(),
      expected.getWidth(),
      expected.getHeight(),
    ]);
  });

  it("applies a pending pivot move before rebuilding the box on a geometry change", () => {
    const { editor, rect } = setup();
    editor.setTransformBoxActive(true);
    editor.startTBoxTransform(part(H.ROTATION_CENTER));
    editor.transformTBox(new Point(70, 55), new Point(75, 50), new Transform());
    rect.setFlag(NodeFlag.Selected);
    editor._geometryChange({ element: rect, type: Element.GeometryChangeEvent.Type.After });
    const box = editor.getTransformBox() as TransformBox;
    expect([box.cx, box.cy, box.cTrf ?? null]).toEqual([75, 50, null]);
    expect(editor.getTBoxMode()).toBe(Mode.PASSIVE);
    // Before-changes and unselected elements leave the box alone.
    editor._geometryChange({ element: rect, type: Element.GeometryChangeEvent.Type.Before });
    rect.removeFlag(NodeFlag.Selected);
    editor._geometryChange({ element: rect, type: Element.GeometryChangeEvent.Type.After });
    expect(editor.getTransformBox()).toBe(box);
  });

  it("tells the transaction recorder about every new box", () => {
    const { scene, editor } = setup();
    const changes: unknown[][] = [];
    const workspace = scene.getWorkspace() as unknown as { getTransactionRecorder(): unknown };
    workspace.getTransactionRecorder = () => ({
      afterTBoxChange: (target: unknown, oldBox: unknown, newBox: unknown) =>
        void changes.push([target, oldBox, newBox]),
    });
    editor.setTransformBoxActive(true);
    const first = editor.getTransformBox();
    editor.setTransformBoxActive(true);
    expect(editor.getTransformBox()).not.toBe(first);
    expect(changes).toEqual([
      [scene, null, first],
      [scene, first, editor.getTransformBox()],
    ]);
  });
});
