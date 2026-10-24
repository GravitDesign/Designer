// Old: designer.browser.dev.js module 1624 (GOpenWelcomeScreenAction).
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { Action } from "../action.ts";
import { Category } from "../category.ts";
import { applicationManager } from "../host.ts";
import { viewDesigner } from "../view/view-host.ts";

/** Help > Show Welcome Screen: opens the welcome screen (new document dialog), closable. */
export class OpenWelcomeScreenAction extends Action {
  static ID = "open-welcome-screen";
  static TITLE = new LocaleKey("GOpenWelcomeScreenAction", "title");

  override getId(): string {
    return OpenWelcomeScreenAction.ID;
  }

  override getTitle(): LocaleKey {
    return OpenWelcomeScreenAction.TITLE;
  }

  override getCategory(): Category {
    return Category.CATEGORY_HELP;
  }

  override getGroup(): string {
    return "help";
  }

  /** Disabled while the welcome screen is open. */
  override isEnabled(): boolean {
    const designer = viewDesigner();
    // The old action read the designer's _newDocumentDialog field.
    const dialog = designer.getNewDocumentDialog();
    return (
      (!dialog || !(dialog.isOpen && dialog.isOpen())) &&
      applicationManager().isCreatingNewDocumentEnabled() &&
      designer.getLicense().canAccessFreemium()
    );
  }

  override execute(): void {
    viewDesigner().openNewDocumentDialog({ closable: true });
  }

  override toString(): string {
    return "[Object GOpenWelcomeScreenAction]";
  }
}
