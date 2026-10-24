// Old: chunk.vendor.js module 548 (GPointerTool).
/**
 * The default tool: the select tool with the style editors (gradient
 * handles) on and a double click that, depending on
 * EditorOptions.selectDoubleClickBehavior, switches into edit mode or to
 * the subselect tool. EditorOptions.toolExitKey returns to select mode.
 */
import type { KeyEvent } from "../../engine/core/key-event.ts";
import type { MouseEvent } from "../../engine/core/mouse-event.ts";
import { registerClass } from "../../engine/core/object.ts";
import { NodeFlag } from "../../engine/scene/node-change.ts";
import type { Workspace } from "../../engine/scene/workspace.ts";
import { EditorOptions } from "../editor-options.ts";
import type { EditorWorkspace } from "../editor-workspace.ts";
import { BaseEditor } from "../element-editors/base-editor.ts";
import { GradientStyleEditor } from "../element-editors/gradient-style-editor.ts";
import type { EditorWidget } from "../view/editor-widget.ts";
import { SelectTool } from "./select-tool.ts";
import { SubSelectTool } from "./sub-select-tool.ts";
import type { ToolManager } from "./tool-manager.ts";

export class PointerTool extends SelectTool {
  static {
    registerClass(this, "GPointerTool");
  }

  override activate(view: EditorWidget, light?: boolean): void {
    super.activate(view, light);
    this._editor.setSelectionDetail(false, true);
    if (EditorOptions.styleEditors) {
      this._styleEdManager = (
        view.getScene().getWorkspace() as Workspace as EditorWorkspace
      ).getStyleEdManager();
      this._styleEdManager.activate(view);
    }
    this._allowDistanceHelper = EditorOptions.showDistance;
  }

  override deactivate(view: EditorWidget, light?: boolean): void {
    if (!light) {
      this.setEditMode(SelectTool.EditMode.Select);
      if (this._styleEdManager) this._styleEdManager.deactivate();
    }
    super.deactivate(view, light);
  }

  /**
   * A double click the select tool didn't handle, on a selected element
   * (or a selected editor that doesn't handle double clicks itself, and
   * not a gradient handle): switches between select and edit mode, or to
   * the subselect tool.
   */
  override _mouseDblClick(event: MouseEvent): boolean {
    let handled = super._mouseDblClick(event);
    const underMouse = this._editorUnderMouseInfo;
    if (
      !handled &&
      !(underMouse && underMouse.editor instanceof GradientStyleEditor) &&
      ((this._clickedElement && this._clickedElement.hasFlag(NodeFlag.Selected)) ||
        (underMouse &&
          (underMouse.editor as BaseEditor).hasFlag(BaseEditor.Flag.Selected) &&
          !(underMouse.editor as BaseEditor).canHandleDblClick()))
    ) {
      if (EditorOptions.selectDoubleClickBehavior == SelectTool._DblClick.EditModeSwitch) {
        if (
          (this._clickedElement && this._clickedElement.hasFlag(NodeFlag.Selected)) ||
          this._editMode === SelectTool.EditMode.Edit
        )
          this.setEditMode(
            this._editMode === SelectTool.EditMode.Edit
              ? SelectTool.EditMode.Select
              : SelectTool.EditMode.Edit,
          );
        handled = true;
      } else if (EditorOptions.selectDoubleClickBehavior == SelectTool._DblClick.SubSelectSwitch) {
        handled = true;
        (this._manager as ToolManager).activateTool(SubSelectTool);
      }
    }
    return handled;
  }

  override _keyDown(event: KeyEvent): void {
    if (EditorOptions.toolExitKey && event.key === EditorOptions.toolExitKey)
      this.setEditMode(SelectTool.EditMode.Select);
    super._keyDown(event);
  }

  override toString(): string {
    return "[Object GPointerTool]";
  }
}
