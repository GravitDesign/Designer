// Old: chunk.vendor.js module 334 (GSelectTool._updateResizeHint and the
// position hint of _updateSelectionTransform).
/**
 * The inline hints next to the pointer while dragging: "w × h" (or the
 * length of a single line) while resizing, the angle while rotating, and
 * the position while moving. GEditorOptions switches each one on or off
 * (the app turns the size and angle hints off).
 */
import { Platform } from "../../../engine/core/platform.ts";
import { formatNumber } from "../../../engine/core/util.ts";
import type { Point } from "../../../engine/math/point.ts";
import { Rect } from "../../../engine/math/rect.ts";
import type { Transform } from "../../../engine/math/transform.ts";
import { Path } from "../../../engine/scene/path.ts";
import { Editor } from "../../editor.ts";
import { EditorOptions } from "../../editor-options.ts";
import { BoxEditor } from "../../element-editors/box-editor.ts";
import type { PartInfo } from "../../element-editors/base-editor.ts";
import { PathEditor, type PathPartId } from "../../element-editors/path-editor.ts";
import { SceneEditor } from "../../element-editors/scene-editor.ts";
import type { SelectTool } from "../select-tool.ts";
import { isPathsGraphPart } from "./paths-graph.ts";
import { partData } from "./select-types.ts";

const modifiers = Platform.modifiers;

/** The hint after a resize, rotation or transform box drag; `transform` is what the drag applied. */
export function updateResizeHint(tool: SelectTool, transform: unknown): void {
  const Mode = (tool.constructor as typeof SelectTool)._Mode;
  let box: Rect | null = null;
  let side: string | null = null;
  let angle: number | null = null;
  if (!(tool._moveCurrent && EditorOptions.showTooltips)) return;
  const info = tool._editorMovePartInfo;
  if (transform && info && info.editor instanceof BoxEditor) {
    if (info.id === BoxEditor.RESIZE_HANDLE_PART_ID) {
      box = (transform as Transform).mapRect(info.editor.getBox() as Rect);
      const boxTransform = (
        info.editor.getBoxTransform as (multiPage?: unknown) => Transform | null
      ).call(info.editor, tool._view.getViewConfiguration().multiPageView);
      if (boxTransform) box = boxTransform.mapRect(box);
      side = (partData(info) as { side: string }).side;
    } else if (info.id === BoxEditor.ROTATION_HANDLE_PART_ID) {
      angle = (180 * info.editor.getRotationAngle()) / Math.PI;
      if (EditorOptions.snapRotate || modifiers.shiftKey) angle = Math.round(angle);
    }
  }
  if (tool._mode == Mode.Transforming && transform) {
    const sceneEditor = tool._sceneEditor();
    if (sceneEditor && sceneEditor.isTransformBoxActive() && tool._moveStart) {
      if (sceneEditor.getTBoxMode() === SceneEditor.TBoxMode.RESIZE) {
        // _calculateGeometryBBox is internal to the transform box and not typed.
        box = (
          sceneEditor.getTransformBox() as unknown as { _calculateGeometryBBox(): Rect | null }
        )._calculateGeometryBBox();
      } else if (sceneEditor.getTBoxMode() === SceneEditor.TBoxMode.ROTATE) {
        const rotate = (
          (transform as Transform).decomposed() as NonNullable<ReturnType<Transform["decomposed"]>>
        ).rotate as Transform;
        angle = (180 * rotate.getRotationFactor()) / Math.PI;
        if (EditorOptions.snapRotate || modifiers.shiftKey) angle = Math.round(angle);
      }
    }
  }
  if (!(
    (EditorOptions.angleTooltip || null === angle) &&
    (EditorOptions.sizeTooltip || !box) &&
    (null !== angle || box)
  )) {
    return;
  }
  tool._scene.getProperty("ut");
  let width = 0;
  let height = 0;
  const at = tool._view
    .getViewTransform(tool._view.getScene().getActivePage())
    .mapPoint(tool._moveCurrent);
  if (box) {
    width = box.getWidth();
    height = box.getHeight();
  }
  const selection = tool._editor.getSelection() as unknown[];
  if (1 === selection.length && selection[0] instanceof Path && selection[0].isLine() && box) {
    const length = tool._scene.pointToString(
      Math.sqrt(width * width + height * height),
      EditorOptions.tooltipDecimalPlaces,
    );
    tool.updateInlineHint(length, at, Rect.Side.BOTTOM_LEFT);
  } else if (box) {
    let text = "";
    if (side !== Rect.Side.TOP_CENTER && side !== Rect.Side.BOTTOM_CENTER) {
      text = tool._scene.pointToString(width, EditorOptions.tooltipDecimalPlaces);
    }
    if (side !== Rect.Side.LEFT_CENTER && side !== Rect.Side.RIGHT_CENTER) {
      if (text) text += " × ";
      text += tool._scene.pointToString(height, EditorOptions.tooltipDecimalPlaces);
    }
    if (text) tool.updateInlineHint(text, at, Rect.Side.BOTTOM_LEFT);
  } else {
    tool.updateInlineHint(
      formatNumber(angle as number, EditorOptions.tooltipDecimalPlaces) + "°",
      at,
      Rect.Side.BOTTOM_LEFT,
    );
  }
}

/**
 * The position hint while moving: the left end of a dragged segment, or
 * the top left of the selection box (page relative in the multi-page
 * view). `point` is the dragged point position when a path point moves;
 * `delta` is the move applied.
 */
export function updateMoveHint(tool: SelectTool, point: Point | null, delta: Point | null): void {
  if (!(
    EditorOptions.showTooltips &&
    (EditorOptions.coordinatesTooltip || EditorOptions.bboxPositionTooltip)
  )) {
    return;
  }
  const info = tool._editorMovePartInfo as PartInfo | null;
  if (EditorOptions.coordinatesTooltip && info && isSegmentPart(info)) {
    const editor = info.editor as PathEditor;
    const id = info.id as PathPartId;
    // The part may also be a paths graph segment, whose ends are graph
    // points, not AnchorPoints; both editors have getPointCoord.
    const left = editor.getPointCoord(id.apLeft as never) as Point;
    const right = editor.getPointCoord(id.apRight as never) as Point;
    point =
      left.getX() < right.getX() || (left.getX() == right.getX() && left.getY() < right.getY())
        ? left.add(delta as Point)
        : right.add(delta as Point);
  } else if (EditorOptions.bboxPositionTooltip) {
    if (!point) {
      const individual = tool._editor.getIndividualSelection();
      if (individual) {
        const multiPage = tool._view.getViewConfiguration().multiPageView;
        const bbox = Editor.getGroupGeometryBBox(individual, multiPage);
        if (bbox) {
          let topLeft = bbox.getSide(Rect.Side.TOP_LEFT).add(delta as Point);
          if (multiPage) {
            topLeft = topLeft.subtract(
              (
                tool._scene.getActivePage() as NonNullable<
                  ReturnType<typeof tool._scene.getActivePage>
                >
              ).getPosition(true),
            );
          }
          point = topLeft;
        }
      }
    }
  } else point = null;
  if (point) {
    const x = tool._scene.pointToString(point.getX(), EditorOptions.tooltipDecimalPlaces);
    const y = tool._scene.pointToString(point.getY(), EditorOptions.tooltipDecimalPlaces);
    tool.updateInlineHint(x + ", " + y, point, Rect.Side.BOTTOM_RIGHT);
  }
}

/** A path or paths graph segment part. */
function isSegmentPart(info: PartInfo): boolean {
  return (
    (info.editor instanceof PathEditor &&
      (info.id as PathPartId).type == PathEditor.PartType.Segment) ||
    isPathsGraphPart(info, "Segment")
  );
}
