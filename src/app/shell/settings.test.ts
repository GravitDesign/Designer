import { describe, expect, it } from "vitest";
import { defaultSettings } from "./settings.ts";

describe("defaultSettings", () => {
  it("has the GDesigner constructor's defaults in its order", () => {
    // start() triggers one restoring event per key in this order.
    expect(Object.keys(defaultSettings())).toEqual([
      "theme",
      "snap_disabled",
      "snap_zones",
      "snap_guides",
      "rulers_visible",
      "guide_lines_visible",
      "symbol_labels_visible",
      "grid_visible",
      "page_labels_visible",
      "highlight_on_hover",
      "invert_selection",
      "auto_expand_layers",
      "system_fonts_enabled",
      "symbols_panel_shown",
      "decimals_num",
      "enable_steps_debug",
      "enable_cache",
      "ui_toolbar_alignment",
      "eps_outline_fonts",
      "auto_save",
      "auto_save_interval",
      "notifications_disabled",
      "touch",
      "sidebars_left_active",
      "sidebars_right_active",
    ]);
    const settings = defaultSettings();
    expect(settings.theme).toBe("light");
    expect(settings.rulers_visible).toBe(false);
    expect(settings.ui_toolbar_alignment).toBe(true);
  });

  it("gives a fresh object every time", () => {
    const a = defaultSettings();
    a.snap_guides.push("x");
    expect(defaultSettings().snap_guides).not.toContain("x");
  });
});
