import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setContainer, setDesigner } from "../shell/globals.ts";
import { SettingsDialogImpl } from "./settings-dialog.ts";
import { Setting, Switch, SettingsRows, type SettingsRowsModel } from "./settings-dialog-view.tsx";
import { ScrubbingSetting } from "./settings-keys.ts";

/** A designer that keeps settings in a map and records setSetting calls. */
function fakeDesigner(settings: Record<string, unknown> = {}) {
  const calls: { keys: string[]; values: unknown[] }[] = [];
  return {
    calls,
    getSetting(key: string, fallback?: unknown): unknown {
      return Object.prototype.hasOwnProperty.call(settings, key) ? settings[key] : fallback;
    },
    setSetting(keys: string[], values: unknown[]): void {
      calls.push({ keys, values });
    },
    getEnv: () => "production",
    isBeta: () => false,
  };
}

/** The dialog content as Save reads it: inputs by data-setting, missing rows absent. */
function fakeContent(rows: Record<string, { checked?: boolean; value?: string }>) {
  return {
    getContent: () => ({
      querySelector(selector: string) {
        const match = /\[data-setting="([^"]+)"\]/.exec(selector);
        const row = match ? rows[match[1] as string] : undefined;
        return row ? { checked: !!row.checked, value: row.value ?? "" } : null;
      },
    }),
    close: vi.fn(),
  };
}

function dialogWith(rows: Record<string, { checked?: boolean; value?: string }>) {
  const dialog = new SettingsDialogImpl();
  const content = fakeContent(rows);
  Object.assign(dialog, { _dialog: content, _theme: "dark" });
  return { dialog, content };
}

/** The rows a production browser build renders, all switched off. */
const PRODUCTION_ROWS = {
  highlight_on_hover: { checked: true },
  auto_expand_layers: { checked: false },
  auto_save: { checked: true },
  auto_save_interval: { value: "2" },
  "autosave-prompt-for-local-files-disabled": { checked: true },
  theme: {},
  ui_toolbar_alignment: { checked: false },
  dont_store_textpath: { checked: true },
  "decimals-num-onoff": { checked: false },
  "decimals-num-val": { value: "2" },
  disable_warning_unsupported_features: { checked: false },
  eps_outline_fonts: { checked: true },
  notifications_disabled: { checked: false },
  scrubbing_flag: { checked: true },
};

beforeEach(() => {
  // Save looks for the symbols panel to redraw it; there is none here.
  vi.stubGlobal("document", { querySelector: () => null });
});

afterEach(() => {
  vi.unstubAllGlobals();
  setDesigner(null);
  setContainer(null);
});

describe("settings dialog save (UI-SETTING-016, UI-SETTING-005, UI-SETTING-009, UI-SETTING-014)", () => {
  it("writes every key in the old order, unrendered rows as undefined, inverted rows inverted", async () => {
    const designer = fakeDesigner();
    setDesigner(designer as never);
    const { dialog, content } = dialogWith(PRODUCTION_ROWS);
    const done = vi.fn();
    await dialog.save(done);
    expect(done).toHaveBeenCalledOnce();
    expect(designer.calls).toHaveLength(1);
    const { keys, values } = designer.calls[0] as { keys: string[]; values: unknown[] };
    expect(Object.fromEntries(keys.map((key, i) => [key, values[i]]))).toEqual({
      highlight_on_hover: true,
      auto_expand_layers: false,
      auto_save: true,
      // Checked means "warn", the key says "disabled".
      "autosave-prompt-for-local-files-disabled": false,
      // No row anywhere.
      system_fonts_enabled: undefined,
      theme: "dark",
      // Checked means "store paths".
      dont_store_textpath: false,
      // Developer rows: not in a production build.
      enable_steps_debug: undefined,
      enable_cache: undefined,
      disable_warning_unsupported_features: false,
      eps_outline_fonts: true,
      ui_toolbar_alignment: false,
      decimals_num: null,
      auto_save_interval: 20,
      // Electron only.
      create_backup_copy: undefined,
      // Checked means "scrubbing off".
      scrubbing_flag: false,
    });
    expect(keys[4]).toBe("system_fonts_enabled");
    expect(content.close).not.toHaveBeenCalled();
  });

  it("stores the rounding only while its switch is on", async () => {
    const designer = fakeDesigner();
    setDesigner(designer as never);
    const { dialog } = dialogWith({ ...PRODUCTION_ROWS, "decimals-num-onoff": { checked: true } });
    Object.assign(dialog, { _decimalsBox: { value: () => "3" } });
    await dialog.save(() => undefined);
    const { keys, values } = designer.calls[0] as { keys: string[]; values: unknown[] };
    expect(values[keys.indexOf("decimals_num")]).toBe(3);
  });

  it("fails after writing the settings when notifications were switched (old bug kept)", async () => {
    const designer = fakeDesigner();
    setDesigner(designer as never);
    const { dialog } = dialogWith({
      ...PRODUCTION_ROWS,
      notifications_disabled: { checked: true },
    });
    const done = vi.fn();
    await expect(dialog.save(done)).rejects.toThrow(/is not valid JSON/);
    expect(designer.calls).toHaveLength(1);
    expect(done).not.toHaveBeenCalled();
  });
});

describe("settings dialog rows (UI-SETTING-001)", () => {
  it("builds a row with label, description and editor", () => {
    expect(
      renderToStaticMarkup(
        createElement(Setting, { label: "Label", description: "Text", children: "editor" }),
      ),
    ).toBe(
      '<div class="setting"><div class="form"><div class="text-description">' +
        '<div class="label">Label</div><div class="description">Text</div></div>' +
        '<div class="editor">editor</div></div></div>',
    );
  });

  it("aligns a row without description to the middle", () => {
    expect(
      renderToStaticMarkup(
        createElement(Setting, { label: null, description: null, children: "x" }),
      ),
    ).toContain(
      '<div class="text-description" style="vertical-align:middle"><div class="label"></div></div>',
    );
  });

  it("renders a switch as label.g-switch with the setting on the input", () => {
    expect(
      renderToStaticMarkup(createElement(Switch, { setting: "auto_save", checked: true })),
    ).toBe(
      '<label class="g-switch"><input type="checkbox" data-setting="auto_save" checked=""/><div></div></label>',
    );
  });

  it("leaves out the developer and Electron rows when the model has none", () => {
    const model = {
      texts: {},
      highlightOnHover: true,
      autoExpandLayers: true,
      autoSave: null,
      developer: null,
      themeName: "Light",
      onThemeClick: () => undefined,
      toolbarAlignment: true,
      storeTextPath: true,
      decimals: {
        on: false,
        valueShown: false,
        boxRef: null,
        onToggle: () => undefined,
        onBoxChange: () => undefined,
      },
      disableUnsupportedWarning: false,
      epsOutlineFonts: true,
      notificationsDisabled: false,
      scrubbingSetting: "scrubbing_flag",
      scrubbingOff: false,
      backupCopy: null,
    } satisfies SettingsRowsModel;
    const html = renderToStaticMarkup(createElement(SettingsRows, { model }));
    expect(html).not.toContain("enable_steps_debug");
    expect(html).not.toContain("create_backup_copy");
    expect(html).toContain('data-setting="notifications_disabled"');
    expect(html).toContain('class="g-switch test"');
    // The toolbar row sits inside the theme row.
    expect(html).toMatch(/g-theme-selector[^]*<div class="setting sub-setting">/);
    const withBoth = renderToStaticMarkup(
      createElement(SettingsRows, {
        model: { ...model, developer: { stepsDebug: true, cache: false }, backupCopy: false },
      }),
    );
    expect(withBoth).toContain('data-setting="enable_steps_debug"');
    expect(withBoth).toContain("Enable cached rendering");
    expect(withBoth).toContain('data-setting="create_backup_copy"');
  });
});

describe("scrubbing setting (UI-FIELD-173)", () => {
  it("is on unless the setting is false", () => {
    setDesigner(fakeDesigner() as never);
    expect(ScrubbingSetting.isEnabled()).toBe(true);
    setDesigner(fakeDesigner({ scrubbing_flag: false }) as never);
    expect(ScrubbingSetting.isEnabled()).toBe(false);
    expect(ScrubbingSetting.getSetting()).toBe("scrubbing_flag");
  });
});
