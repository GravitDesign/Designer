// Old: designer.browser.dev.js module 1634 (GToggleTouchAction).
import { Locale } from "../../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { baseConfig } from "../../file-formats.ts";
import { Runtime } from "../../shell/container.ts";
import { RichTooltipConfig, TOOLTIP_AREA } from "../../widgets/rich-tooltip-config.ts";
import { Action } from "../action.ts";
import { Category } from "../category.ts";
import { gContainer } from "../host.ts";
import { viewDesigner } from "./view-host.ts";

/**
 * View > Touch interface: switches the touch layout on and off (the
 * "touch" setting). The title and icon follow the current state.
 *
 * Not available on the iPad runtime, which is always in touch mode. The
 * old action also hid itself for guests (not logged in); the account is
 * dropped, so that check is gone.
 */
export class ToggleTouchAction extends Action {
  static ID = "view.toggle-touch";
  static TITLE = new LocaleKey("GToggleTouchAction", "title");
  static TITLE_DISABLE = new LocaleKey("GToggleTouchAction", "title-disable");
  /** Built by the first constructor call, as before (the strings are read then). */
  static TOOLTIP_CONFIG: Record<string, RichTooltipConfig> | null = null;

  constructor() {
    super();
    ToggleTouchAction.TOOLTIP_CONFIG = {
      [TOOLTIP_AREA.MAIN_MENU.TRY_PRO_COMMON]: RichTooltipConfig.from({
        title: Locale.get(
          new LocaleKey("GToggleTouchAction", "text.try-this-feature-pro-tooltip-title"),
        ) as string,
        description: Locale.get(
          new LocaleKey("GToggleTouchAction", "text.try-this-feature-pro-tooltip-description"),
        ) as string,
        learnMore: "",
        upgradeToProStatsValue: "view.toggle-touch",
        middle: false,
        side: true,
      }),
    };
  }

  override getId(): string {
    return ToggleTouchAction.ID;
  }

  override getTitle(): LocaleKey {
    return viewDesigner().isTouchEnabled()
      ? ToggleTouchAction.TITLE_DISABLE
      : ToggleTouchAction.TITLE;
  }

  override getGroup(): string {
    return "touch";
  }

  override getCategory(): Category {
    return Category.CATEGORY_VIEW;
  }

  override isCheckable(): boolean {
    return true;
  }

  override getIcon(): string | null {
    return viewDesigner().isTouchEnabled() ? "gravit-icon-touch-disable" : null;
  }

  override execute(): void {
    const designer = viewDesigner();
    designer.setTouchEnabled(!designer.isTouchEnabled());
  }

  override getTooltipArea(): string {
    return TOOLTIP_AREA.MAIN_MENU.TRY_PRO_COMMON;
  }

  override getTooltipConfig(area?: string): unknown {
    return (
      (area && ToggleTouchAction.TOOLTIP_CONFIG && ToggleTouchAction.TOOLTIP_CONFIG[area]) || null
    );
  }

  override isAvailable(): boolean {
    return !!baseConfig.TOUCH_LAYOUT && gContainer().getRuntime() !== Runtime.IPad;
  }

  override statsValue(): string {
    return ToggleTouchAction.ID + "." + (viewDesigner().isTouchEnabled() ? "on" : "off");
  }

  override toString(): string {
    return "[Object GToggleTouchAction]";
  }
}
