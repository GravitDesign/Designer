// Old: designer.browser.dev.js module 1342 (GEnhancedTooltipsAction).
import { Locale } from "../../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { Action } from "../action.ts";
import { Category } from "../category.ts";
import { gContainer } from "../host.ts";

const STORAGE_PROPERTY_NAME = "designer.settings.enhanced-tooltips.enabled";

/** Whether the rich tooltips show; shared by every instance, as in the old module. */
let enabled = true;

/**
 * Help > Enhanced Tooltips: switches the rich tooltips on or off. The
 * state is stored under its own localStorage key, not in the designer
 * settings, and read once when the action is created.
 */
export class EnhancedTooltipsAction extends Action {
  static ID = "help.tooltip-visibility";
  static TITLE = new LocaleKey("GEnhancedTooltipsAction", "title");
  static GroupID = "help/learn";
  static StoragePropertyName = STORAGE_PROPERTY_NAME;

  constructor() {
    super();
    void gContainer()
      .getProperty(STORAGE_PROPERTY_NAME)
      .then((value: unknown) => {
        if ("boolean" == typeof value) enabled = value;
      });
  }

  override getId(): string {
    return EnhancedTooltipsAction.ID;
  }

  override getTitle(): string {
    return Locale.get(EnhancedTooltipsAction.TITLE) as string;
  }

  override getCategory(): Category {
    return Category.CATEGORY_HELP_LEARN;
  }

  override getGroup(): string {
    return EnhancedTooltipsAction.GroupID;
  }

  override isCheckable(): boolean {
    return true;
  }

  override isChecked(): boolean {
    return enabled;
  }

  override isEnabled(): boolean {
    return true;
  }

  override execute(): void {
    enabled = !enabled;
    gContainer().setProperty(STORAGE_PROPERTY_NAME, enabled);
  }

  override statsValue(): string {
    return "".concat(EnhancedTooltipsAction.ID, ".").concat(enabled ? "on" : "off");
  }

  override toString(): string {
    return "[Object GEnhancedTooltipsAction]";
  }
}
