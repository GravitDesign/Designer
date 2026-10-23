// Old: chunk.vendor.js module 334 (GSelectTool._keyDown, the arrow keys).
/**
 * The arrow keys move the selection by cursorDistanceSmall (Shift:
 * cursorDistanceBig). With + or - held they resize it from the side the
 * arrow points to (or the opposite side for -) instead. The deltas add
 * up while the keys repeat and are applied when the key is released
 * (_applyKeyTransformation), so a held key makes one undo step.
 */
import { Platform } from "../../../engine/core/platform.ts";
import { Key } from "../../../engine/core/key.ts";
import { Point } from "../../../engine/math/point.ts";
import { Rect } from "../../../engine/math/rect.ts";
import { EditorOptions } from "../../editor-options.ts";
import { type BaseEditor, PartInfo } from "../../element-editors/base-editor.ts";
import { BoxEditor } from "../../element-editors/box-editor.ts";
import type { SelectTool } from "../select-tool.ts";

const modifiers = Platform.modifiers;

export function isArrowKey(key: unknown): boolean {
  return (
    key === Key.Constant.UP ||
    key === Key.Constant.DOWN ||
    key === Key.Constant.LEFT ||
    key === Key.Constant.RIGHT
  );
}

/** A resize part for the side, set the first time +/- and an arrow come together. */
function resizePart(tool: SelectTool, side: string): void {
  if (!tool._editorMovePartInfo) {
    tool._editorMovePartInfo = new PartInfo(
      // The old code made a part info with the editor (not an element
      // editor) as its owner; PartInfo is typed with BaseEditor.
      tool._editor as unknown as BaseEditor,
      BoxEditor.RESIZE_HANDLE_PART_ID,
      { side },
      undefined,
      undefined,
    );
  }
}

export function handleArrowKey(tool: SelectTool, key: unknown): void {
  const Mode = (tool.constructor as typeof SelectTool)._Mode;
  if (!(tool._editor.hasSelection() && (!tool._mode || tool._mode === Mode.Moving))) return;
  if (tool._mode !== Mode.Moving) tool._updateMode(Mode.Moving);
  const step = modifiers.shiftKey
    ? EditorOptions.cursorDistanceBig
    : EditorOptions.cursorDistanceSmall;
  const resizing = modifiers.plusKey || modifiers.minusKey;
  let dx = 0;
  let dy = 0;
  switch (key) {
    case Key.Constant.UP:
      if (resizing) {
        resizePart(tool, Rect.Side.TOP_CENTER);
        dy = modifiers.plusKey ? dy - step : dy + step;
      } else dy -= step;
      break;
    case Key.Constant.DOWN:
      if (resizing) {
        resizePart(tool, Rect.Side.BOTTOM_CENTER);
        dy = modifiers.plusKey ? dy + step : dy - step;
      } else dy += step;
      break;
    case Key.Constant.LEFT:
      if (resizing) {
        resizePart(tool, Rect.Side.LEFT_CENTER);
        dx = modifiers.plusKey ? dx - step : dx + step;
      } else dx -= step;
      break;
    case Key.Constant.RIGHT:
      if (resizing) {
        resizePart(tool, Rect.Side.RIGHT_CENTER);
        dx = modifiers.plusKey ? dx + step : dx - step;
      } else dx += step;
  }
  tool._keyDelta = tool._keyDelta ? tool._keyDelta.add(new Point(dx, dy)) : new Point(dx, dy);
  if (
    resizing &&
    tool._editorMovePartInfo &&
    tool._editorMovePartInfo.id === BoxEditor.RESIZE_HANDLE_PART_ID
  ) {
    tool._editor.resizeSelection(
      (tool._editorMovePartInfo.data as { side: string }).side,
      tool._keyDelta,
      tool._view.getViewConfiguration().multiPageView,
    );
  } else {
    tool._editor.moveSelection(
      tool._keyDelta,
      false,
      null,
      null,
      null,
      null,
      tool._view.getViewConfiguration().multiPageView,
      modifiers.metaKey,
    );
  }
  if (
    modifiers.optionKey &&
    tool._allowDistanceHelper &&
    tool._editor.getDistanceHelper().isActivated() &&
    tool._editor.getSelection() &&
    (tool._editor.getSelection() as unknown[]).length
  ) {
    tool._updateDistanceHelper();
  }
}
