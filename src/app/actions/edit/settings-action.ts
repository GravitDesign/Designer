// Old: designer.browser.dev.js module 1613 (GSettingsAction).
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { SettingsActionId } from "../../settings/settings-action-id.ts";
import { lateExport } from "../../shell/late.ts";
import { Action } from "../action.ts";
import { Category } from "../category.ts";
import { gDesigner } from "../host.ts";

/** Edit > Settings: opens the settings dialog. */
export class SettingsAction extends Action {
  static ID = SettingsActionId.ID;
  static TITLE = new LocaleKey("GSettingsAction", "title");

  override getId(): string {
    return SettingsAction.ID;
  }

  override getTitle(): LocaleKey {
    return SettingsAction.TITLE;
  }

  override getCategory(): Category {
    return Category.CATEGORY_EDIT;
  }

  override getGroup(): string {
    return "settings";
  }

  override getIcon(): string {
    return gDesigner().isTouchEnabled() ? "gravit-icon-setting-touch" : "";
  }

  /** The dialog object is a promise of the built dialog (`new SettingsDialog().then(open)`). */
  override async execute(): Promise<void> {
    const SettingsDialog = lateExport<new () => Promise<{ open(): void }>>(
      "settings/settings-dialog.ts",
      "SettingsDialog",
    );
    if (!SettingsDialog) throw new Error("settings/settings-dialog.ts is not ported yet");
    void new SettingsDialog().then((dialog) => dialog.open());
  }

  override toString(): string {
    return "[Object GSettingsAction]";
  }
}
