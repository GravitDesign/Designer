// Old: designer.browser.dev.js module 1289 (GToggleSnapZonesAction).
import { Locale } from "../../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { Action } from "../action.ts";
import { Category } from "../category.ts";
import { richTooltipConfig, TOOLTIP_AREA } from "../deps.ts";
import { viewDesigner } from "./view-host.ts";

/**
 * View > Snap > Snap Zones: flips the snap_zones setting, which the
 * designer copies into Guides.options.zones. Only registered when the
 * build has snap zones (HAS_SNAPZONES).
 */
export class ToggleSnapZonesAction extends Action {
  static ID = "view.toggle-snapzones";
  static TITLE = new LocaleKey("GToggleSnapZonesAction", "title");
  static TOOLTIP_CONFIG: Record<string, unknown> | null = null;

  constructor() {
    super();
    ToggleSnapZonesAction.TOOLTIP_CONFIG = {
      [TOOLTIP_AREA.TOOLBAR]: richTooltipConfig({
        title: Locale.get(new LocaleKey("GToggleSnapZonesAction", "tooltip-title")),
        description: Locale.get(new LocaleKey("GToggleSnapZonesAction", "tooltip-description")),
        middle: false,
        learnMore: "",
      }),
    };
  }

  override getId(): string {
    return ToggleSnapZonesAction.ID;
  }

  override getTitle(): LocaleKey {
    return ToggleSnapZonesAction.TITLE;
  }

  override getCategory(): Category {
    return Category.CATEGORY_VIEW_SNAP;
  }

  override getGroup(): string {
    return "snap/enable";
  }

  override isCheckable(): boolean {
    return true;
  }

  override isChecked(): boolean {
    return viewDesigner().getSetting("snap_zones") as boolean;
  }

  override execute(): void {
    viewDesigner().setSetting("snap_zones", !viewDesigner().getSetting("snap_zones"));
  }

  override getTooltipConfig(area?: string): unknown {
    return (
      (area &&
        ToggleSnapZonesAction.TOOLTIP_CONFIG &&
        ToggleSnapZonesAction.TOOLTIP_CONFIG[area]) ||
      null
    );
  }

  override toString(): string {
    return "[Object GToggleSnapZonesAction]";
  }
}
