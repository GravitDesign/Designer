// Old: designer.browser.dev.js module 1607 (GToggleLayerVisibilityAction).
import { Key } from "../../../engine/core/key.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { Node } from "../../../engine/scene/node.ts";
import { Action, type Shortcut } from "../action.ts";
import { Category } from "../category.ts";
import { leftSidebars, outlineLayerPanel } from "./modify-deps.ts";

/**
 * Cmd+3 (shortcut only): hides or shows the focused row of the layers
 * panel when it is selected and the outline sidebar is active.
 */
export class ToggleLayerVisibilityAction extends Action {
  static ID = "view.toggle-layer-visibility";
  static TITLE = new LocaleKey("GToggleLayerVisibilityAction", "title");

  override getId(): string {
    return ToggleLayerVisibilityAction.ID;
  }

  override getTitle(): LocaleKey {
    return ToggleLayerVisibilityAction.TITLE;
  }

  override getCategory(): Category {
    return Category.CATEGORY_VIEW;
  }

  override getShortcut(): Shortcut {
    return [Key.Constant.META, "3"];
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
      if (item.hasFlag(Node.Flag.Selected as number)) panel.toggleHideStatusOfLayerOrItem(item);
    }
  }

  override toString(): string {
    return "[Object GToggleLayerVisibilityAction]";
  }
}
