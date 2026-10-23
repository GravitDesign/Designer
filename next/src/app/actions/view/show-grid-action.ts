// Old: designer.browser.dev.js module 1285 (GShowGridAction).
import { Key } from "../../../engine/core/key.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { Scene } from "../../../engine/scene/scene.ts";
import { Action, type Shortcut } from "../action.ts";
import { Category } from "../category.ts";
import { activeViewDocument, viewDesigner, known } from "./view-host.ts";

/**
 * View > Show Grid. The grid is a document property ("gm", the grid
 * mode), so the toggle is saved with the document and undoable. Turning
 * it on restores the last grid mode ("lgm"), boxed by default.
 */
export class ShowGridAction extends Action {
  static ID = "view.canvas.show-grid";
  static TITLE = new LocaleKey("GShowGridAction", "title");

  override getId(): string {
    return ShowGridAction.ID;
  }

  override getTitle(): LocaleKey {
    return ShowGridAction.TITLE;
  }

  override getCategory(): Category {
    return Category.CATEGORY_VIEW_CANVAS;
  }

  override getGroup(): string {
    return "show/canvas";
  }

  override getShortcut(): Shortcut {
    return [Key.Constant.META, Key.Constant.OPTION, "G"];
  }

  override isEnabled(): boolean {
    return !!viewDesigner().getActiveDocument();
  }

  override isCheckable(): boolean {
    return true;
  }

  override isChecked(): boolean {
    const document = viewDesigner().getActiveDocument();
    return !!document && !!known(document.getScene()).getProperty("gm");
  }

  override execute(): void {
    const scene = known(activeViewDocument().getScene());
    if (scene.getProperty("gm")) scene.setProperty("gm", null);
    else scene.setProperty("gm", scene.getProperty("lgm") || Scene.GridMode.Boxed);
  }

  override toString(): string {
    return "[Object GShowGridAction]";
  }
}
