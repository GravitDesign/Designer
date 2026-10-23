/**
 * The settings object the app keeps in localStorage "designer.settings"
 * (GDesigner._settings, designer.browser.dev.js module 1491), typed.
 * docs/rewrite/UI.md, section 12.
 */
import { BBoxGuide } from "../../editor/guides/bbox-guide.ts";
import { FullPixelsGuide } from "../../editor/guides/full-pixels-guide.ts";
import { GridGuide } from "../../editor/guides/grid-guide.ts";
import { GuideLinesGuide } from "../../editor/guides/guide-lines-guide.ts";
import { PageGuide } from "../../editor/guides/page-guide.ts";
import { PointsGuide } from "../../editor/guides/points-guide.ts";

/** The localStorage key (GContainer property) of the settings object. */
export const SETTINGS_PROPERTY = "designer.settings";

/** GConfig.AUTOSAVE_INTERVAL_DEFAULT (module 10). */
const AUTOSAVE_INTERVAL_DEFAULT = 5;

/** Every setting the app reads or writes, with its type. */
export interface DesignerSettings {
  theme: string;
  snap_disabled: boolean;
  snap_zones: boolean;
  snap_guides: string[];
  rulers_visible: boolean;
  guide_lines_visible: boolean;
  symbol_labels_visible: boolean;
  grid_visible: boolean;
  page_labels_visible: boolean;
  highlight_on_hover: boolean;
  invert_selection: boolean;
  auto_expand_layers: boolean;
  system_fonts_enabled: boolean;
  symbols_panel_shown: boolean;
  decimals_num: number | null;
  enable_steps_debug: boolean;
  enable_cache: boolean;
  ui_toolbar_alignment: boolean;
  eps_outline_fonts: boolean;
  /** The dropped cloud auto-save; the default is still written (module 1276 names). */
  auto_save: boolean;
  auto_save_interval: number;
  notifications_disabled: boolean;
  touch: boolean;
  sidebars_left_active: boolean | string | null;
  sidebars_right_active: boolean | string | null;
  /** Set only by the language switch of older builds (QUESTIONS.md Q-001). */
  language?: string;
  /** Welcome screen "don't show again" (app-welcome-settings). */
  show_welcome_screen?: boolean;
  dont_store_textpath?: boolean;
  webcdr_choice?: string;
  /** Sidebar widths after a resize, per sidebar id. */
  [width: `sidebars_width_${string}`]: number | undefined;
}

export type SettingKey = keyof DesignerSettings & string;

/**
 * The defaults the GDesigner constructor set, in its order: start()
 * restores the stored object, adds the missing defaults in this order
 * and triggers one SettingChangedEvent per key in the resulting order.
 */
export function defaultSettings(): DesignerSettings {
  return {
    theme: "light",
    snap_disabled: false,
    snap_zones: false,
    snap_guides: [
      GuideLinesGuide.ID,
      FullPixelsGuide.ID,
      PointsGuide.ID,
      BBoxGuide.ID,
      PageGuide.ID,
      GridGuide.ID,
    ],
    rulers_visible: false,
    guide_lines_visible: true,
    symbol_labels_visible: true,
    grid_visible: true,
    page_labels_visible: true,
    highlight_on_hover: true,
    invert_selection: false,
    auto_expand_layers: true,
    system_fonts_enabled: true,
    symbols_panel_shown: false,
    decimals_num: null,
    enable_steps_debug: false,
    // "function" == typeof gdb_loaddesign: a debug hook no build defines.
    enable_cache: false,
    ui_toolbar_alignment: true,
    eps_outline_fonts: true,
    auto_save: false,
    auto_save_interval: AUTOSAVE_INTERVAL_DEFAULT,
    notifications_disabled: false,
    touch: false,
    sidebars_left_active: true,
    sidebars_right_active: true,
  };
}
