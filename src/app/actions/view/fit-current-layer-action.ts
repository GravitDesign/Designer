// Old: designer.browser.dev.js module 1598 (GFitCurrentLayerAction).
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import type { Rect } from "../../../engine/math/rect.ts";
import { Action } from "../action.ts";
import { Category } from "../category.ts";
import { activeViewDocument, documentView, viewDesigner, known } from "./view-host.ts";

/** View > Fit Current Layer: zooms what the active layer paints into the view. */
export class FitCurrentLayerAction extends Action {
  static ID = "view.zoom.fit-current-layer";
  static TITLE = new LocaleKey("GFitCurrentLayerAction", "title");

  override getId(): string {
    return FitCurrentLayerAction.ID;
  }

  override getTitle(): LocaleKey {
    return FitCurrentLayerAction.TITLE;
  }

  override getCategory(): Category {
    return Category.CATEGORY_VIEW;
  }

  override getGroup(): string {
    return "zoom";
  }

  override isEnabled(): boolean {
    const document = viewDesigner().getActiveDocument();
    const layer = document ? known(document.getScene()).getActiveLayer() : null;
    const box = layer ? layer.getPaintBBox() : null;
    return !!box && !box.isEmpty();
  }

  override execute(): void {
    const document = activeViewDocument();
    const layer = known(known(document.getScene()).getActiveLayer());
    documentView(document).zoomAll(layer.getPaintBBox() as Rect, false, true);
  }

  override toString(): string {
    return "[Object GFitCurrentLayerAction]";
  }
}
