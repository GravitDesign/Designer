// Old: designer.browser.dev.js module 566 (GFitSelectionAction).
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { Action } from "../action.ts";
import { Category } from "../category.ts";
import { activeViewDocument, documentView, viewDesigner, known } from "./view-host.ts";

/** View > Fit Selection: zooms the selection into the view, relative to its page. */
export class FitSelectionAction extends Action {
  static ID = "view.zoom.fit-selection";
  static TITLE = new LocaleKey("GFitSelectionAction", "title");

  override getId(): string {
    return FitSelectionAction.ID;
  }

  override getTitle(): LocaleKey {
    return FitSelectionAction.TITLE;
  }

  override getCategory(): Category {
    return Category.CATEGORY_VIEW;
  }

  override getGroup(): string {
    return "zoom";
  }

  override isEnabled(): boolean {
    const document = viewDesigner().getActiveDocument();
    const editor = document ? document.getEditor() : null;
    return !!editor && !!editor.hasSelection();
  }

  override execute(): void {
    const document = activeViewDocument();
    const box = known(document.getEditor()).getSelectionBBox();
    if (box && !box.isEmpty()) documentView(document).zoomAll(box, false, true);
  }

  override toString(): string {
    return "[Object GFitSelectionAction]";
  }
}
