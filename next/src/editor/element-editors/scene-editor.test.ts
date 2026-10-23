import { describe, expect, it } from "vitest";
import { Point } from "../../engine/math/point.ts";
import { Transform } from "../../engine/math/transform.ts";
import type { Node } from "../../engine/scene/node.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import { Scene } from "../../engine/scene/scene.ts";
import { Workspace } from "../../engine/scene/workspace.ts";
import { Cursor } from "../cursor.ts";
import { BaseEditor, PartInfo } from "./base-editor.ts";
import { ElementEditor } from "./element-editor.ts";
import { SceneEditor } from "./scene-editor.ts";
import { TransformBox } from "./transform-box.ts";

const H = TransformBox.Handles;
const Mode = SceneEditor.TBoxMode;

interface Setup {
  scene: Scene;
  editor: SceneEditor;
  selectionEditor: BaseEditor;
  log: unknown[][];
}

/** A scene with one 100 x 50 rectangle at (20, 30), selected through a fake GEditor. */
function setup(): Setup {
  const scene = new Scene(new Workspace());
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
      getBBoxSnapZones: () => null,
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
  return { scene, editor, selectionEditor, log };
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
    // BUGS-FIXED candidate: OUTSIDE falls through to ROTATE, so the
    // rotation segment's cursor is never shown.
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
});
