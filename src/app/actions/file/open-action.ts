// Old: designer.browser.dev.js module 813 (GOpenAction).
import { Key } from "../../../engine/core/key.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { Platform, WebBrowser } from "../../../engine/core/platform.ts";
import { FileTypes } from "../../document/file-types.ts";
import { Action, type Shortcut } from "../action.ts";
import { Category } from "../category.ts";
import { applicationManager, gDesigner, type ActionStorage } from "../host.ts";

/**
 * File > Open: the storage's open prompt for every type the app loads;
 * each chosen file is opened as a document. Not offered in Safari, which
 * gets file.open.safari (another shortcut) instead.
 *
 * The old action ran behind the sign-in gate (dropped with the accounts;
 * without a sign-in requirement it ran the action at once).
 */
export class OpenAction extends Action {
  static ID = "file.open";
  static TITLE = new LocaleKey("GOpenAction", "title");

  override getId(): string {
    return OpenAction.ID;
  }

  override getTitle(): LocaleKey {
    return OpenAction.TITLE;
  }

  override getCategory(): Category {
    return Category.CATEGORY_FILE;
  }

  override getGroup(): string {
    return "file-open";
  }

  override getShortcut(): Shortcut | null {
    return [Key.Constant.META, "O"];
  }

  override isEnabled(storage?: ActionStorage | null): boolean {
    const designer = gDesigner();
    storage = storage || designer.getDefaultStorage();
    return storage.canPromptOpen() && applicationManager().isOpenFilesFromLocalEnabled();
  }

  override isAvailable(): boolean {
    return Platform.webBrowser !== WebBrowser.Safari;
  }

  /** Arguments as executeAction passes them: storage, done. */
  override execute(storage?: ActionStorage | null, done?: (() => void) | null): void {
    const designer = gDesigner();
    storage = storage || designer.getDefaultStorage();
    storage.openPrompt(
      FileTypes.getFileTypesArray().filter((type) => type.load),
      (item) => {
        designer.openDocument(item);
        if (done) done();
      },
      true,
    );
  }

  override getIcon(): string {
    return gDesigner().isTouchEnabled() ? "gravit-icon-touch-file-open" : "";
  }

  override toString(): string {
    return "[Object GOpenAction]";
  }
}
