// Old: designer.browser.dev.js module 1606 (GLockLayerAction).
import { Key } from "../../../engine/core/key.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { Node } from "../../../engine/scene/node.ts";
import { Action, type Shortcut } from "../action.ts";
import { Category } from "../category.ts";
import { leftSidebars, outlineLayerPanel } from "./modify-deps.ts";

/**
 * Cmd+2 (shortcut only): locks or unlocks the focused row of the layers
 * panel when it is selected and the outline sidebar is active.
 */
export class LockLayerAction extends Action {
  static ID = "modify.lock-layer";
  static TITLE = new LocaleKey("GLockLayerAction", "title");

  override getId(): string {
    return LockLayerAction.ID;
  }

  override getTitle(): LocaleKey {
    return LockLayerAction.TITLE;
  }

  override getCategory(): Category {
    return Category.CATEGORY_MODIFY;
  }

  override getShortcut(): Shortcut {
    return [Key.Constant.META, "2"];
  }

  override isVisible(): boolean {
    return false;
  }

  override execute(): void {
    const activeSidebar = leftSidebars()?.getActiveSidebar();
    const outline = outlineLayerPanel();
    if (!outline) return;
    const panel = outline.panel;
    const focused = panel.getCurrentFocusedNode();
    if (focused && activeSidebar === outline.sidebar.getId()) {
      const item = panel.getItem(focused);
      if (item.hasFlag(Node.Flag.Selected as number)) panel.toggleLockStatusOfLayerOrItem(item);
    }
  }

  override toString(): string {
    return "[Object GLockLayerAction]";
  }
}
