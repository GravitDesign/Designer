// Old: designer.browser.dev.js module 1344 (GCycleThroughLayersAction).
import { Key } from "../../../engine/core/key.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { Node } from "../../../engine/scene/node.ts";
import { Action, type Shortcut } from "../action.ts";
import { Category } from "../category.ts";
import { leftSidebars, outlineLayerPanel, type LayerPanelTreeNode } from "./modify-deps.ts";

const Type = { Next: "next", Previous: "previous" } as const;
const Mode = { Focus: "focus", Level: "level" } as const;

/**
 * Tab / Shift+Tab (shortcut only): moves the layers panel's focus to the
 * next or previous row of the same level (wrapping around), or with
 * Mode.Focus to the next focusable row.
 */
export class CycleThroughLayersAction extends Action {
  static ID = "view.cycle-through-layers";
  static Type = Type;
  static Mode = Mode;

  private readonly _type: string;
  private readonly _title: LocaleKey;

  constructor(type: string) {
    super();
    this._type = type;
    this._title = new LocaleKey("GCycleThroughLayersAction", "title.".concat(this._type));
  }

  override getId(): string {
    return "".concat(CycleThroughLayersAction.ID, ".").concat(this._type);
  }

  override getTitle(): LocaleKey {
    return this._title;
  }

  override getCategory(): Category {
    return Category.CATEGORY_VIEW;
  }

  override getShortcut(): Shortcut | null {
    switch (this._type) {
      case Type.Next:
        return [Key.Constant.TAB];
      case Type.Previous:
        return [Key.Constant.SHIFT, Key.Constant.TAB];
      default:
        return null;
    }
  }

  override isVisible(): boolean {
    return false;
  }

  override execute(...args: unknown[]): void {
    const mode = args.length > 0 && undefined !== args[0] ? args[0] : Mode.Level;
    const activeSidebar = leftSidebars()?.getActiveSidebar();
    const outline = outlineLayerPanel();
    if (!outline) return;
    const panel = outline.panel;
    const focused = panel.getCurrentFocusedNode();
    if (!focused || activeSidebar !== outline.sidebar.getId()) return;
    const next = this._getNextNodeInIteration(mode, focused);
    if (next) {
      const focusedItem = panel.getItem(focused);
      const nextItem = panel.getItem(next);
      focusedItem.removeFlag(Node.Flag.Selected as number);
      nextItem.setFlag(Node.Flag.Selected as number);
      panel.setCurrentFocusedNode(next);
      panel.relayout();
    }
  }

  _getNextNodeInIteration(mode: unknown, node: LayerPanelTreeNode): LayerPanelTreeNode | null {
    switch (mode) {
      case Mode.Level:
        return this._getNextNodeOfCurrentLevel(node);
      case Mode.Focus:
        return this._getNextFocusableNode(node);
      default:
        return null;
    }
  }

  _getNextNodeOfCurrentLevel(node: LayerPanelTreeNode): LayerPanelTreeNode | null {
    switch (this._type) {
      case Type.Next:
        return node.next || (node.parent as LayerPanelTreeNode).firstChild || null;
      case Type.Previous:
        return node.previous || (node.parent as LayerPanelTreeNode).lastChild || null;
      default:
        return null;
    }
  }

  _getNextFocusableNode(node: LayerPanelTreeNode): LayerPanelTreeNode | null {
    switch (this._type) {
      case Type.Next:
        return node.getNextFocusableNode();
      case Type.Previous:
        return node.getPreviousFocusableNode();
      default:
        return null;
    }
  }

  override toString(): string {
    return "[Object GCycleThroughLayersAction]";
  }
}
