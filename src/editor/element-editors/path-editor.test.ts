import { describe, expect, it, vi } from "vitest";
import { getTypeId } from "../../engine/core/object.ts";
import { Point } from "../../engine/math/point.ts";
import { Transform } from "../../engine/math/transform.ts";
import { GeometryChangeEvent } from "../../engine/scene/element.ts";
import { NodeFlag } from "../../engine/scene/node-change.ts";
import type { Page } from "../../engine/scene/page.ts";
import { AnchorPoint } from "../../engine/scene/path-base.ts";
import { Path } from "../../engine/scene/path.ts";
import { Scene } from "../../engine/scene/scene.ts";
import { Workspace } from "../../engine/scene/workspace.ts";
import { EditorOptions } from "../editor-options.ts";
import { BaseEditor, PartInfo } from "./base-editor.ts";
import { BoxEditor } from "./box-editor.ts";
import { ElementEditor } from "./element-editor.ts";
import {
  PathEditor,
  type EditedPath,
  type PathPartId,
  type SegmentPartData,
} from "./path-editor.ts";

const identity = new Transform();
/** Guides that don't snap. */
const noGuides = { mapPoint: (point: Point) => point };

/** An open path (0,0) (100,0) (100,100) in a scene, with a host that counts repaints. */
function setup(
  points: [number, number][] = [
    [0, 0],
    [100, 0],
    [100, 100],
  ],
) {
  const scene = new Scene(new Workspace());
  const host = { invalidations: 0, requestInvalidation: () => host.invalidations++ };
  (scene as unknown as { __graphic_editor__: unknown }).__graphic_editor__ = host;
  const path = new Path();
  for (const [x, y] of points) {
    const point = new AnchorPoint();
    point.setProperties(["x", "y"], [x, y]);
    path.getAnchorPoints().appendChild(point);
  }
  (scene.getActivePage() as Page).appendChild(path);
  const anchors = path.getAnchorPoints().getChildren() as AnchorPoint[];
  return { scene, host, path, anchors };
}

/** A selected editor showing points (no resize box), as in sub-select mode. */
function pointEditor(path: Path): PathEditor {
  const editor = new PathEditor(path as EditedPath);
  editor.setFlag(BaseEditor.Flag.Selected);
  editor.removeFlag(BoxEditor.Flag.ResizeAll);
  return editor;
}

describe("GPathEditor", () => {
  it("is the editor of paths and starts with the selected points as parts", () => {
    const { path, anchors } = setup();
    anchors[1]?.setFlag(NodeFlag.Selected);
    expect(ElementEditor.createEditor(path)).toBeInstanceOf(PathEditor);
    const editor = new PathEditor(path as EditedPath);
    expect(editor.getPartSelection()).toBeNull(); // the resize box hides it
    editor.removeFlag(BoxEditor.Flag.ResizeAll);
    expect(editor.getPartSelection()).toEqual([
      { type: PathEditor.PartType.Point, point: anchors[1] },
    ]);
  });

  it("hits anchor points and segments", () => {
    const { path, anchors } = setup();
    const editor = pointEditor(path);
    const onPoint = editor.getPartInfoAt(new Point(100, 0), identity) as PartInfo;
    expect(onPoint.id).toEqual({ type: PathEditor.PartType.Point, point: anchors[1] });
    expect([onPoint.isolated, onPoint.selectable]).toEqual([false, true]);
    const onSegment = editor.getPartInfoAt(new Point(50, 0), identity) as PartInfo;
    const id = onSegment.id as PathPartId;
    expect(id.type).toBe(PathEditor.PartType.Segment);
    expect([id.apLeft, id.apRight]).toEqual([anchors[0], anchors[1]]);
    expect((onSegment.data as SegmentPartData).hitRes.slope).toBeCloseTo(0.5, 10);
    expect(editor.getCursor(onSegment.id)).toBe("select-curve");
    expect(editor.getPartInfoAt(new Point(50, 50), identity)).toBeNull();
  });

  it("keeps the anchor points' Selected flag in step with the part selection", () => {
    const { path, anchors } = setup();
    const editor = pointEditor(path);
    editor.selectOnePoint(anchors[1] as AnchorPoint);
    expect(anchors.map((a) => a.hasFlag(NodeFlag.Selected))).toEqual([false, true, false]);
    editor.selectOnePoint(anchors[2] as AnchorPoint);
    expect(anchors.map((a) => a.hasFlag(NodeFlag.Selected))).toEqual([false, false, true]);
    expect(editor.getPointsSelectionType()).toBe(PathEditor.PointsSelectionType.Last);
  });

  it("moves selected points on the preview and writes them back on apply", () => {
    const { path, anchors } = setup();
    const editor = pointEditor(path);
    editor.selectOnePoint(anchors[1] as AnchorPoint);
    editor.edTransform(new Transform(1, 0, 0, 1, 10, 5));
    const preview = editor.getPathPointPreview(anchors[1]) as AnchorPoint;
    expect([preview.getProperty("x"), preview.getProperty("y")]).toEqual([110, 5]);
    expect(anchors[1]?.getProperty("x")).toBe(100);
    expect(editor.canApplyTransform()).toBeTruthy();
    editor.applyTransform(path);
    expect([anchors[1]?.getProperty("x"), anchors[1]?.getProperty("y")]).toEqual([110, 5]);
    expect(editor.getPaintElement()).toBe(path);
    expect(editor.getPartSelection()).toEqual([
      { type: PathEditor.PartType.Point, point: anchors[1] },
    ]);
  });

  it("bends a straight segment by dragging it", () => {
    const { path, anchors } = setup();
    const editor = pointEditor(path);
    const hit = editor.getPartInfoAt(new Point(50, 0), identity) as PartInfo;
    const drag = editor.selectToolDragStartAction(hit) as PartInfo;
    const data = drag.data as SegmentPartData;
    expect(data.type).toBe(PathEditor.SegmentData.Handles);
    expect(data.cL).toBeCloseTo(4 / 3, 10);
    expect(data.apLhr?.getX()).toBeCloseTo(100 / 3, 10);
    expect(data.apRhl?.getX()).toBeCloseTo(200 / 3, 10);
    editor.movePart(drag.id, drag.data, new Point(50, 30), identity, noGuides);
    editor.applyPartMove(drag.id, drag.data);
    const [left, right] = anchors as [AnchorPoint, AnchorPoint];
    expect(left.getProperty("hrx")).toBeCloseTo(100 / 3, 10);
    expect(left.getProperty("hry")).toBeCloseTo(40, 10);
    // The right handle moves 0.01 further than the left one (old quirk).
    expect(right.getProperty("hlx")).toBeCloseTo(200 / 3 + 0.01, 10);
    expect(right.getProperty("hly")).toBeCloseTo(40.01, 10);
    expect(editor.getPaintElement()).toBe(path);
  });

  it("builds a part without a type for a segment drag at slope 0 or 1 (old bug)", () => {
    const { path, anchors } = setup();
    const editor = pointEditor(path);
    for (const [slope, point] of [
      [0, anchors[0]],
      [1, anchors[1]],
    ] as const) {
      const part = new PartInfo(
        editor,
        { type: PathEditor.PartType.Segment, point: null, apLeft: anchors[0], apRight: anchors[1] },
        { type: PathEditor.SegmentData.HitRes, hitRes: { slope, x: 0, y: 0, segment: 1 } },
        true,
        false,
      );
      const drag = editor.selectToolDragStartAction(part) as PartInfo;
      // Kept old bug: the type is undefined (see "Segment drag at slope 0 or
      // 1 builds a part id without a type" in QUESTIONS.md).
      expect(drag.id).toEqual({ type: undefined, point });
      expect(drag.data).toEqual({ apSelected: false });
    }
  });

  it("opens a corner shoulder on a right-button drag of a corner point", () => {
    const { path, anchors } = setup();
    const editor = pointEditor(path);
    const part = editor.getPartInfoAt(new Point(100, 0), identity) as PartInfo;
    const drag = editor.selectToolDragStartAction(part, true) as PartInfo;
    expect(drag.id).toEqual({ type: PathEditor.PartType.RightShoulder, point: anchors[1] });
    // cl and cr default to 0, which counts as set: the preview keeps them.
    const preview = editor.getPathPointPreview(anchors[1]) as AnchorPoint;
    expect([preview.getProperty("cl"), preview.getProperty("cr")]).toEqual([0, 0]);
  });

  it("starts unset shoulders at the handle size plus the pick distance", () => {
    const { path, anchors } = setup();
    anchors[1]?.setProperties(["cl", "cr"], [null, null]);
    const editor = pointEditor(path);
    const part = editor.getPartInfoAt(new Point(100, 0), identity) as PartInfo;
    const drag = editor.selectToolDragStartAction(part, true) as PartInfo;
    expect(drag.id).toEqual({ type: PathEditor.PartType.RightShoulder, point: anchors[1] });
    const minimum =
      EditorOptions.annotationHandles.path.corner.size + EditorOptions.annotPickDistance;
    const preview = editor.getPathPointPreview(anchors[1]) as AnchorPoint;
    expect([preview.getProperty("cl"), preview.getProperty("cr")]).toEqual([minimum, minimum]);
  });

  it("BUG-044: starts the right shoulder from cr when Shift drags a shoulder in detail mode", () => {
    const { path, anchors } = setup();
    const corner = anchors[1] as AnchorPoint;
    // Non-uniform corners (cu false), else setting cl sets cr too and the
    // detail branch is skipped (it needs cu != 1).
    corner.setProperties(["cu", "cl", "cr"], [false, 10, 20]);
    const editor = pointEditor(path);
    editor.setFlag(BaseEditor.Flag.Detail);
    const move = editor._movePreviewPointShoulders(
      { type: PathEditor.PartType.LeftShoulder, point: corner },
      new Point(70, 5),
      true,
    );
    const preview = editor.getPathPointPreview(corner) as AnchorPoint;
    // Left grows from 10 to 30; the right shoulder shrinks from 20 to 0
    // (translation 20). The old code took cl (10) as cr: translation 10.
    expect(preview.getProperty("cl")).toBeCloseTo(30, 10);
    expect(preview.getProperty("cr")).toBe(0);
    expect(move.getMatrix()[5]).toBeCloseTo(20, 10);
    expect(move.getMatrix()[4]).toBeCloseTo(-20, 10);
    // Left grows from 10 to 15: the right shoulder gives up 5 of its 20
    // (the old code gave 5, from 10 - 5).
    editor._movePreviewPointShoulders(
      { type: PathEditor.PartType.LeftShoulder, point: corner },
      new Point(85, 5),
      true,
    );
    expect(preview.getProperty("cl")).toBeCloseTo(15, 10);
    expect(preview.getProperty("cr")).toBeCloseTo(15, 10);
  });

  it("toggles a point between asymmetric and symmetric on a double click in detail mode", () => {
    const { path, anchors } = setup();
    const editor = pointEditor(path);
    const part = { type: PathEditor.PartType.Point, point: anchors[1] };
    expect(editor.handleDblClick(part)).toBe(false);
    editor.setFlag(BaseEditor.Flag.Detail);
    anchors[1]?.setProperty("tp", AnchorPoint.Type.Asymmetric);
    expect(editor.handleDblClick(part)).toBe(true);
    expect([anchors[1]?.getProperty("tp"), anchors[1]?.getProperty("ah")]).toEqual([
      AnchorPoint.Type.Symmetric,
      true,
    ]);
  });

  it("allows deleting points while one would stay", () => {
    const { path, anchors } = setup([
      [0, 0],
      [100, 0],
    ]);
    const editor = pointEditor(path);
    editor.updatePartSelection(false, [{ type: PathEditor.PartType.Point, point: anchors[0] }]);
    expect(editor.isDeletePartsAllowed()).toBe(true);
    editor.updatePartSelection(true, [{ type: PathEditor.PartType.Point, point: anchors[1] }]);
    expect(editor.isDeletePartsAllowed()).toBe(false);
  });
});

describe("GPathEditor geometry changes in the scene", () => {
  /** Paths p0, p1, ... on one page, without editors yet. */
  function scenePaths(count: number) {
    const scene = new Scene(new Workspace());
    const host = { requestInvalidation: () => undefined };
    (scene as unknown as { __graphic_editor__: unknown }).__graphic_editor__ = host;
    const paths: Path[] = [];
    for (let i = 0; i < count; i++) {
      const path = new Path();
      for (const [x, y] of [
        [i * 20, 0],
        [i * 20 + 10, 10],
      ]) {
        const point = new AnchorPoint();
        point.setProperties(["x", "y"], [x, y]);
        path.getAnchorPoints().appendChild(point);
      }
      (scene.getActivePage() as Page).appendChild(path);
      paths.push(path);
    }
    return { scene, paths };
  }

  const open = (path: Path): PathEditor => ElementEditor.openEditor(path) as PathEditor;
  const move = (path: Path): void => path.transform(new Transform(1, 0, 0, 1, 5, 0));
  /** The scene's listeners for geometry changes. */
  const listeners = (scene: Scene): number =>
    scene._listeners?.get(getTypeId(GeometryChangeEvent))?.listeners.length ?? 0;

  it("drops the preview of the changed path's editor only", () => {
    const { paths } = scenePaths(2);
    const [first, second] = paths.map(open) as [PathEditor, PathEditor];
    first.getPathPreview(true);
    second.getPathPreview(true);
    move(paths[0] as Path);
    expect(first._elementPreview).toBeNull();
    expect(second._elementPreview).not.toBeNull();
  });

  it("gives editors opened one after another one listener on the scene", () => {
    const { scene, paths } = scenePaths(4);
    const before = listeners(scene);
    paths.forEach(open);
    expect(listeners(scene)).toBe(before + 1);
  });

  it("keeps each editor's place among the scene's other listeners", () => {
    const { scene, paths } = scenePaths(3);
    const log: string[] = [];
    const editors = [open(paths[0] as Path), open(paths[1] as Path)];
    scene.addEventListener(GeometryChangeEvent, () => void log.push("other"));
    editors.push(open(paths[2] as Path));
    editors.forEach((editor, i) => {
      vi.spyOn(editor, "_geometryChange").mockImplementation(() => void log.push("p" + i));
    });
    for (const path of paths) {
      scene.trigger(new GeometryChangeEvent(path, GeometryChangeEvent.Type.After));
    }
    // p2 was opened after the other listener, so it hears of changes after it.
    expect(log).toEqual(["p0", "other", "p1", "other", "other", "p2"]);
  });

  it("lets a closed editor go, and the listener with the last one", () => {
    const { scene, paths } = scenePaths(3);
    const before = listeners(scene);
    const editors = paths.map(open);
    ElementEditor.closeElementEditor(paths[1] as Path);
    expect(listeners(scene)).toBe(before + 1);
    const closed = vi.spyOn(editors[1] as PathEditor, "_geometryChange");
    move(paths[1] as Path);
    expect(closed).not.toHaveBeenCalled();
    ElementEditor.closeElementEditor(paths[0] as Path);
    ElementEditor.closeElementEditor(paths[2] as Path);
    expect(listeners(scene)).toBe(before);
    // Opened again, it hears of its path's changes.
    const reopened = open(paths[1] as Path);
    expect(listeners(scene)).toBe(before + 1);
    reopened.getPathPreview(true);
    move(paths[1] as Path);
    expect(reopened._elementPreview).toBeNull();
  });
});
