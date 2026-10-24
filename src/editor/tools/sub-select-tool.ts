// Old: chunk.vendor.js module 386 (GSubSelectTool).
/**
 * The subselect tool (direct selection): selects the shapes themselves
 * instead of their groups, shows the element editors in detail mode
 * (anchor points, handles) and selects on release only, so a drag on a
 * selected path's point moves that point. A marquee selects points of the
 * selected paths; with nothing selected it selects shapes. Tab on a single
 * selected path switches to the path tool.
 */
import { Key } from "../../engine/core/key.ts";
import type { KeyEvent } from "../../engine/core/key-event.ts";
import type { MouseEvent } from "../../engine/core/mouse-event.ts";
import { registerClass } from "../../engine/core/object.ts";
import { CompoundPath } from "../../engine/scene/compound-path.ts";
import { Element } from "../../engine/scene/element.ts";
import { Group } from "../../engine/scene/group.ts";
import { Item } from "../../engine/scene/item.ts";
import type { Node } from "../../engine/scene/node.ts";
import { Page } from "../../engine/scene/page.ts";
import { Path } from "../../engine/scene/path.ts";
import { Cursor } from "../cursor.ts";
import { EditorOptions } from "../editor-options.ts";
import type { EditorWorkspace } from "../editor-workspace.ts";
import type { AreaSelector } from "./select/area-selector.ts";
import type { ToolManager } from "./tool-manager.ts";
import { SelectTool, type SelectToolView } from "./select-tool.ts";

export class SubSelectTool extends SelectTool {
  static {
    registerClass(this, "GSubSelectTool");
  }

  constructor(areaSelector?: AreaSelector) {
    super(areaSelector);
    this._clickGoDown = false;
  }

  override getCursor(): string {
    const cursor = super.getCursor();
    return cursor === Cursor.Select
      ? Cursor.SelectInverse
      : cursor === Cursor.SelectDot
        ? Cursor.SelectDotInverse
        : cursor === Cursor.SelectPlus
          ? Cursor.SelectPlusInverse
          : cursor;
  }

  override _hasPathResize(): boolean {
    return false;
  }

  override activate(view: SelectToolView, light?: boolean): void {
    super.activate(view, light);
    this._editor.setSelectionDetail(true, true, view);
    this._editor.setPathResize(false, true);
    this._view.setRightDrag(true);
    this._releaseOnlySelection = true;
    if (EditorOptions.styleEditors) {
      this._styleEdManager = (
        view.getScene().getWorkspace() as unknown as EditorWorkspace
      ).getStyleEdManager();
      this._styleEdManager.activate(view);
    }
  }

  override deactivate(view: SelectToolView, light?: boolean): void {
    if (!light) {
      if (this._styleEdManager) this._styleEdManager.deactivate();
      this.setEditMode(SelectTool.EditMode.Select);
      this._editor.setSelectionDetail(false, true);
      this._editor.setPathResize(true);
    }
    if (this._view) this._view.setRightDrag(false);
    super.deactivate(view, light);
  }

  /** A double click not handled otherwise leaves the tool when it was entered by one. */
  override _mouseDblClick(event: MouseEvent): boolean {
    let handled = super._mouseDblClick(event);
    if (!handled) {
      handled = true;
      if (EditorOptions.selectDoubleClickBehavior == SelectTool._DblClick.SubSelectSwitch) {
        (this._manager as ToolManager).notifyJobDone(this);
      }
    }
    return handled;
  }

  /** Parts only while something selectable is selected, else touching shapes. */
  override _getCollisionFlags(): number | null {
    let flags: number | null = null;
    const selection = this._editor.getSelection();
    if (!(selection && selection.length && this._getSelectableElements(selection as Node[]))) {
      flags = Element.CollisionFlag.GeometryBBox | Element.CollisionFlag.Partial;
    }
    return flags;
  }

  override _getSelectableElement(element: Node | null): Element | null {
    return element instanceof Item && !(element instanceof Group) ? element : null;
  }

  override _selectAcceptor(element: Element): boolean {
    return !(element instanceof Group || element instanceof Page);
  }

  override _keyDown(event: KeyEvent): void {
    super._keyDown(event);
    if (
      !this._editor.getCurrentInlineEditorNode() &&
      event.key === Key.Constant.TAB &&
      !this._mode
    ) {
      const selection = this._editor.getSelection();
      if (
        selection &&
        1 === selection.length &&
        (selection[0] instanceof Path || selection[0] instanceof CompoundPath)
      ) {
        (this._manager as ToolManager).activateOldPathTool();
      }
    }
  }

  override toString(): string {
    return "[Object GSubSelectTool]";
  }
}
