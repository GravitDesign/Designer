// Old: designer.browser.dev.js module 1282 (GOriginalViewAction).
import { Key } from "../../../engine/core/key.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { Rect } from "../../../engine/math/rect.ts";
import { Action, type Shortcut } from "../action.ts";
import { Category } from "../category.ts";
import { activeViewDocument, documentView, viewDesigner, known } from "./view-host.ts";

/**
 * View > Actual Size: 100% centred on the active page of a fixed-size
 * document (at its place in the multi-page view), otherwise on everything
 * painted.
 */
export class OriginalViewAction extends Action {
  static ID = "view.zoom.original";
  static TITLE = new LocaleKey("GOriginalViewAction", "title");

  override getId(): string {
    return OriginalViewAction.ID;
  }

  override getTitle(): LocaleKey {
    return OriginalViewAction.TITLE;
  }

  override getCategory(): Category {
    return Category.CATEGORY_VIEW;
  }

  override getGroup(): string {
    return "zoom";
  }

  override getShortcut(): Shortcut {
    return [Key.Constant.META, "0"];
  }

  override isEnabled(): boolean {
    return !!viewDesigner().getActiveDocument();
  }

  override execute(): void {
    const document = activeViewDocument();
    const multiPageView = documentView(document).getViewConfiguration().multiPageView;
    const scene = known(document.getScene());
    let box: Rect | null;
    if (scene.isFixedSized()) {
      const page = known(scene.getActivePage());
      box = new Rect(0, 0, page.getProperty("w") as number, page.getProperty("h") as number);
      if (multiPageView) {
        const position = page.getPosition(true);
        if (position) box = box.translated(position.getX(), position.getY());
      }
    } else box = scene.getPaintBBox(multiPageView);
    if (box && !box.isEmpty())
      documentView(document).zoomAtCenter(box.getSide(Rect.Side.CENTER), 1);
  }

  override toString(): string {
    return "[Object GOriginalViewAction]";
  }
}
