// Old: designer.browser.dev.js module 1605 (GEnterLayerGroupAction).
import { Key } from "../../../engine/core/key.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { Node } from "../../../engine/scene/node.ts";
import { Action, type Shortcut } from "../action.ts";
import { Category } from "../category.ts";
import { outlineLayerPanel, type LayerPanelTreeNode } from "./modify-deps.ts";

/**
 * Enter / Shift+Enter (shortcut only): moves the layers panel's focus into
 * the focused group (its first child) or out of it (its parent row).
 */
export class EnterLayerGroupAction extends Action {
  static ID = "view.enter-layer-group";
  static ID_REVERSE = "view.enter-layer-group.reverse";

  private readonly _isReverse: boolean;
  private readonly _title: LocaleKey;

  constructor(isReverse: boolean = false) {
    super();
    this._isReverse = isReverse;
    this._title = new LocaleKey(
      "GEnterLayerGroupAction",
      "title".concat(this._isReverse ? ".reverse" : ""),
    );
  }

  override getId(): string {
    return this._isReverse ? EnterLayerGroupAction.ID_REVERSE : EnterLayerGroupAction.ID;
  }

  override getTitle(): LocaleKey {
    return this._title;
  }

  override getCategory(): Category {
    return Category.CATEGORY_VIEW;
  }

  override getShortcut(): Shortcut {
    return this._isReverse ? [Key.Constant.SHIFT, Key.Constant.ENTER] : [Key.Constant.ENTER];
  }

  override isVisible(): boolean {
    return false;
  }

  override execute(): void {
    // Unlike the other layer actions this one doesn't check that the
    // outline sidebar is the active one.
    const outline = outlineLayerPanel();
    if (!outline) return;
    const panel = outline.panel;
    const { vtree, currentFocus } = panel.data();
    if (!currentFocus) return;
    let target: LayerPanelTreeNode | undefined;
    if (!this._isReverse && currentFocus.firstChild) target = currentFocus.firstChild;
    else if (this._isReverse && currentFocus.parent && currentFocus.parent.row) {
      target = currentFocus.parent;
    }
    if (target) {
      const focusedItem = panel.getItem(currentFocus);
      const targetItem = panel.getItem(target);
      focusedItem.removeFlag(Node.Flag.Selected as number);
      targetItem.setFlag(Node.Flag.Selected as number);
      vtree.expandAndFocus(targetItem);
    }
  }

  override toString(): string {
    return "[Object GEnterLayerGroupAction]";
  }
}
