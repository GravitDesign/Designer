// Old: designer.browser.dev.js module 1310 (GCropAction).
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { Image } from "../../../engine/scene/image.ts";
import type { Node } from "../../../engine/scene/node.ts";
import { PointerTool } from "../../../editor/tools/pointer-tool.ts";
import { SelectTool } from "../../../editor/tools/select-tool.ts";
import { SubSelectTool } from "../../../editor/tools/sub-select-tool.ts";
import { Category } from "../category.ts";
import { ElementAction } from "../element-action.ts";
import { gDesigner } from "../host.ts";
import { toolManager } from "./modify-deps.ts";

/** Whether the selection is one loaded image in crop mode (selection detail). */
export function isCroppingImage(): boolean {
  const designerDocument = gDesigner().getActiveDocument();
  if (designerDocument) {
    const editor = designerDocument.getEditor();
    const selection = editor.getIndividualSelection() as Node[] | null;
    if (
      selection &&
      selection.length &&
      selection[0] instanceof Image &&
      editor.hasSelectionDetail()
    ) {
      return !!selection[0].isReady();
    }
  }
  return false;
}

/**
 * Leaves crop mode: back to the pointer tool's Select mode (from the
 * subselect tool, the pointer tool is activated first).
 */
export function leaveCropMode(): void {
  const manager = toolManager();
  if (manager.getActiveTool() instanceof SubSelectTool) {
    manager.activateTool(PointerTool, null, true);
    (manager.getActiveTool() as SelectTool).setEditMode(SelectTool.EditMode.Select);
  } else if (manager.getActiveTool() instanceof PointerTool) {
    (manager.getActiveTool() as SelectTool).setEditMode(SelectTool.EditMode.Select);
  }
}

/** Confirm Cropping: keeps the image's new crop and leaves crop mode. */
export class CropAction extends ElementAction {
  static ID = "modify.crop";
  static TITLE = new LocaleKey("GCropAction", "title");

  override getId(): string {
    return CropAction.ID;
  }

  override getTitle(): LocaleKey {
    return CropAction.TITLE;
  }

  override getIcon(): string {
    return "gravit-icon-crop";
  }

  override getCategory(): Category {
    return Category.CATEGORY_MODIFY;
  }

  override getGroup(): string {
    return "structure-group";
  }

  override isEnabled(): boolean {
    if (!super.isEnabled()) return false;
    return isCroppingImage();
  }

  override execute(): void {
    leaveCropMode();
  }

  override toString(): string {
    return "[Object GCropAction]";
  }
}
