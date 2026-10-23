// Old: designer.browser.dev.js module 1288 (GToggleSnapAction).
import { Key } from "../../../engine/core/key.ts";
import { Locale } from "../../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { Action, type Shortcut } from "../action.ts";
import { Category } from "../category.ts";
import { richTooltipConfig, TOOLTIP_AREA } from "../deps.ts";
import { viewDesigner } from "./view-host.ts";

/** A GRichTooltipConfig as this action changes it. */
interface SettableTooltipConfig {
  setConfig?(fields: { title: unknown }): void;
}

/**
 * View > Snap > Enable Snapping (Shift+F10): flips the snap_disabled
 * setting. The designer copies it into Guides.options.disabled when it
 * changes, so dragging snaps (or not) right away.
 */
export class ToggleSnapAction extends Action {
  static ID = "view.toggle-snap";
  static TITLE = new LocaleKey("GToggleSnapAction", "title");
  static SHORTCUT: Shortcut = [Key.Constant.SHIFT, Key.Constant.F10];
  static TOOLTIP_CONFIG: Record<string, unknown> | null = null;

  constructor() {
    super();
    ToggleSnapAction.TOOLTIP_CONFIG = {
      [TOOLTIP_AREA.TOOLBAR]: richTooltipConfig({
        title: Locale.get(new LocaleKey("GToggleSnapAction", "tooltip-title")),
        description: Locale.get(new LocaleKey("GToggleSnapAction", "tooltip-description")),
        shortcut: ToggleSnapAction.SHORTCUT,
        middle: false,
        learnMore: "",
      }),
    };
  }

  override getId(): string {
    return ToggleSnapAction.ID;
  }

  override getTitle(): LocaleKey {
    return ToggleSnapAction.TITLE;
  }

  override getCategory(): Category {
    return Category.CATEGORY_VIEW_SNAP;
  }

  override getGroup(): string {
    return "snap/enable";
  }

  override getShortcut(): Shortcut {
    return ToggleSnapAction.SHORTCUT;
  }

  override isCheckable(): boolean {
    return true;
  }

  override isChecked(): boolean {
    return !viewDesigner().getSetting("snap_disabled");
  }

  override execute(): void {
    viewDesigner().setSetting("snap_disabled", !viewDesigner().getSetting("snap_disabled"));
  }

  /**
   * The toolbar tooltip, retitled every time it is asked for. The key has
   * the old typo ("tootlip").
   */
  override getTooltipConfig(area?: string): unknown {
    if (!area) return null;
    const config = (ToggleSnapAction.TOOLTIP_CONFIG as Record<string, unknown>)[
      area
    ] as SettableTooltipConfig;
    // Until widgets/rich-tooltip-config.ts exists the config is the plain fields.
    if (config.setConfig)
      config.setConfig({
        title: Locale.get(new LocaleKey("GToggleSnapAction", "tootlip-title-action")),
      });
    return config;
  }

  override toString(): string {
    return "[Object GToggleSnapAction]";
  }
}
