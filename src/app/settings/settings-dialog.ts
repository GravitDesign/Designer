// Old: designer.browser.dev.js module 1275 (GSettingsDialog).
/**
 * Edit > Settings...: one row per setting, Cancel and Save Changes. The
 * switches start from the current settings and nothing is applied until
 * Save, which reads every row back from the dialog and writes them with
 * one setSetting call. Escape doesn't close it (opened not closable).
 *
 * Old behaviour kept on purpose (BUGS-FIXED candidates, see the report):
 *
 * - Save writes keys whose row isn't in the dialog: "system_fonts_enabled"
 *   has no row at all, the developer rows ("enable_steps_debug",
 *   "enable_cache") only exist outside production and "create_backup_copy"
 *   only in Electron. Reading a missing row gives undefined, so Save sets
 *   them to undefined and they drop out of the stored settings.
 * - Three rows are shown inverted: "Save text layers as paths" is checked
 *   when dont_store_textpath is false, the scrubbing row when scrubbing is
 *   off, the auto-save warning row when its "disabled" key is false. Save
 *   inverts them back.
 * - "Disable notifications" was a setting of the cloud account. The
 *   dialog asked the account service for it (getting the default, false)
 *   and Save sent a change there; the local server answers that request
 *   with its HTML page, so a change made Save fail after the local
 *   settings were written and the dialog stayed open. Fixed (BUGS-FIXED
 *   BUG-131): it is a local setting now, written on its own after the
 *   other rows when it changed.
 */
import { createElement, type ReactNode } from "react";
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { LocaleLanguage } from "../../engine/core/locale/locale-language.ts";
import { formatNumber, parseNumber } from "../../engine/core/util.ts";
import { EditorOptions } from "../../editor/editor-options.ts";
import { RendererConfig } from "../../engine/paint/renderer-config.ts";
import { Scene } from "../../engine/scene/scene.ts";
import { Text } from "../../engine/text/text.ts";
import { brandString } from "../brand/brand-strings.ts";
import { isNextBranding } from "../brand/branding.ts";
import { config } from "../config.ts";
import { Dialog } from "../dialogs/dialog.ts";
import { Overlay } from "../dialogs/dialog-container.ts";
import { Runtime } from "../shell/container.ts";
import { container, designer } from "../shell/globals.ts";
import { renderInto } from "../state/islands.tsx";
import type { InputBox } from "../widgets/input-box.ts";
import { ScrubbingSetting } from "./settings-keys.ts";
import {
  SETTINGS_TEXT_KEYS,
  SettingsRows,
  ThemeRows,
  type SettingsRowsModel,
} from "./settings-dialog-view.tsx";

/** The cloud auto-save names (module 1276). */
const AUTO_SAVE_SETTING = "auto_save";
const AUTO_SAVE_INTERVAL_SETTING = "auto_save_interval";
const DISABLE_WARNING_SETTING_NAME = "autosave-prompt-for-local-files-disabled";

interface Theme {
  name: string;
  /** Absent for the next look's "Device setting", which has no old string. */
  localeClass?: LocaleKey;
  key: string;
}

let themes: Theme[] | null = null;

/**
 * The next look's themes: the device's ("default", what an unset theme
 * means there, see themes/theme.ts), then light and dark.
 */
function nextThemes(): Theme[] {
  return [
    {
      name:
        brandString("settings.theme-device") +
        " (" +
        text("GCommonNames", "text.default").toLowerCase() +
        ")",
      key: "default",
    },
    {
      name: settingText("text.light-theme"),
      localeClass: new LocaleKey("GSettingsDialog", "text.light-theme"),
      key: "light",
    },
    {
      name: settingText("text.dark-theme"),
      localeClass: new LocaleKey("GSettingsDialog", "text.dark-theme"),
      key: "dark",
    },
  ];
}

/** The themes the selector lists. */
function themeList(): Theme[] {
  return isNextBranding() ? nextThemes() : (themes as Theme[]);
}

function text(className: string, key: string): string {
  return Locale.get(new LocaleKey(className, key)) as string;
}

function settingText(key: string): string {
  return text("GSettingsDialog", key);
}

/** The dialog itself; `new SettingsDialog()` gives a promise of a built one. */
export class SettingsDialogImpl {
  private _dialog: Dialog | null = null;
  /** The theme the selector shows ($(".g-theme-selector").data("theme")). */
  private _theme = "light";
  private _themeName = "";
  private _decimalsShown = false;
  private _decimalsBox: InputBox | null = null;
  /** Whether the decimals box got its first value (on its first attach). */
  private _decimalsInitialised = false;
  /**
   * The box's ref, made once: a new callback on every render would make
   * React detach and re-attach the box, and the re-attach would put the
   * stored value back over a typed one.
   */
  private readonly _decimalsBoxRef = (box: InputBox | null): void => {
    // The box's first value, once it is attached (.gInputBox("value", ...)).
    if (box && !this._decimalsInitialised) {
      this._decimalsInitialised = true;
      const stored = designer().getSetting("decimals_num", Scene.decimalsNum) as number | null;
      box.value(null !== stored ? formatNumber(stored, 0) : "2");
    }
    this._decimalsBox = box;
  };
  private _notificationsDisabled = false;

  constructor() {
    if (!themes)
      themes = [
        {
          name:
            settingText("text.light-theme") +
            " (" +
            text("GCommonNames", "text.default").toLowerCase() +
            ")",
          localeClass: new LocaleKey("GSettingsDialog", "text.light-theme"),
          key: "light",
        },
        {
          name: settingText("text.dark-theme"),
          localeClass: new LocaleKey("GSettingsDialog", "text.dark-theme"),
          key: "dark",
        },
      ];
  }

  async _buildDialog(): Promise<void> {
    this._notificationsDisabled = !!designer().getSetting("notifications_disabled", false);
    const list = themeList();
    // The next look lists the device's theme as "default", also for an unset one.
    const stored = isNextBranding()
      ? designer().getSetting("theme") || "default"
      : designer().getSetting("theme", "light");
    let current: Theme | undefined;
    for (let i = 0; i < list.length; ++i)
      if ((list[i] as Theme).key === stored) {
        current = list[i];
        break;
      }
    current = current || (list[0] as Theme);
    this._theme = current.key;
    this._themeName = current.name;
    this._decimalsShown = null !== designer().getSetting("decimals_num", Scene.decimalsNum);
    const content = document.createElement("div");
    this._dialog = new Dialog(content, {
      releaseOnClose: true,
      className: "g-settings-dialog",
      buttons: [
        createElement(
          "button",
          { key: "cancel", className: "settings-button", onClick: () => this.close() },
          text("GLocale", "cancel"),
        ),
        createElement(
          "button",
          {
            key: "save",
            className: "settings-button",
            onClick: () => {
              void this.save(this.close.bind(this));
            },
          },
          settingText("action.save-changes"),
        ),
      ],
    });
    this._render();
  }

  private _render(): void {
    if (this._dialog) this._dialog.renderContent(this._rows());
  }

  /** The rows in the old order; some only in some builds. */
  private _rows(): ReactNode {
    const d = designer();
    const env = d.getEnv();
    const texts: Record<string, string> = {};
    for (const key of SETTINGS_TEXT_KEYS) texts[key] = settingText(key);
    const developer = !("production" === env || d.isBeta() || "lts" === env || "rc" === env);
    const model: SettingsRowsModel = {
      texts,
      highlightOnHover: !!d.getSetting("highlight_on_hover"),
      autoExpandLayers: !!d.getSetting("auto_expand_layers"),
      // GConfig (module 10): false on Safari, which then has neither row.
      autoSave: config.AUTO_SAVE_ENABLED
        ? {
            checked: !!d.getSetting("auto_save", true),
            intervals: config.AUTOSAVE_INTERVALS,
            selected: config.AUTOSAVE_INTERVALS.indexOf(
              d.getSetting(AUTO_SAVE_INTERVAL_SETTING, config.AUTOSAVE_INTERVAL_DEFAULT) as number,
            ),
            warningSetting: DISABLE_WARNING_SETTING_NAME,
            warningChecked: !d.getSetting(DISABLE_WARNING_SETTING_NAME, false),
          }
        : null,
      developer: developer
        ? {
            stepsDebug: !!d.getSetting("enable_steps_debug", EditorOptions.debugTransactions),
            cache: !!d.getSetting("enable_cache", RendererConfig.ENABLE_CACHE),
          }
        : null,
      themeName: this._themeName,
      onThemeClick: (event) => this._openThemeSelector(event.target as Element),
      toolbarAlignment: !!d.getSetting("ui_toolbar_alignment", false),
      storeTextPath: !d.getSetting("dont_store_textpath", Text.dontStorePaths),
      decimals: this._decimals(),
      disableUnsupportedWarning: !!d.getSetting("disable_warning_unsupported_features", false),
      epsOutlineFonts: !!d.getSetting("eps_outline_fonts", true),
      notificationsDisabled: this._notificationsDisabled,
      scrubbingSetting: ScrubbingSetting.getSetting(),
      scrubbingOff: !ScrubbingSetting.isEnabled(),
      backupCopy:
        container().getRuntime() === Runtime.Electron
          ? !!d.getSetting("create_backup_copy", false)
          : null,
    };
    return createElement(SettingsRows, { model });
  }

  private _decimals(): SettingsRowsModel["decimals"] {
    const stored = designer().getSetting("decimals_num", Scene.decimalsNum) as number | null;
    return {
      on: null !== stored,
      valueShown: this._decimalsShown,
      boxRef: this._decimalsBoxRef,
      onToggle: (input) => {
        const current = designer().getSetting("decimals_num", Scene.decimalsNum) as number | null;
        let value = "2";
        if (null !== current) value = formatNumber(current, 0);
        this._decimalsShown = input.checked;
        this._render();
        if (this._decimalsBox) this._decimalsBox.value(value);
      },
      onBoxChange: (box) => {
        let value = parseNumber(box.value());
        if ((value as number) < 0) value = 0;
        if ((value as number) > 6) value = 6;
        box.value(null !== value ? formatNumber(value as number, 0) : "2");
      },
    };
  }

  private _openThemeSelector(target: Element): void {
    const list = themeList();
    const content = document.createElement("div");
    const overlay = new Overlay(content, {
      padding: false,
      releaseOnClose: true,
      clazz: "theme-selector",
      // Enter picks the row under the mouse.
      enterCallback: () => {
        const hovered = document.querySelector<HTMLElement>(
          ".g-overlay.theme-selector .g-theme-row:hover",
        );
        if (hovered) hovered.click();
      },
    });
    renderInto(
      content,
      createElement(ThemeRows, {
        themes: list,
        onPick: (index) => {
          const theme = list[index] as Theme;
          // Old: stats with the English theme name (dropped).
          if (theme.localeClass)
            void Locale.get(theme.localeClass, undefined, LocaleLanguage.English);
          this._theme = theme.key;
          this._themeName = theme.name;
          this._render();
          overlay.close();
        },
      }),
    );
    overlay.open(target);
  }

  open(): void {
    (this._dialog as Dialog).open(false);
  }

  close(): void {
    (this._dialog as Dialog).close();
  }

  /** Writes the rows, then the notification setting, then runs `done`. */
  async save(done: () => void): Promise<void> {
    this._saveBasicSettings();
    this._saveNotificationSetting();
    done();
    // Old: $(".symbols-container").triggerHandler("scroll"), to redraw the
    // symbols panel previews with the new settings.
    const symbols = document.querySelector(".symbols-container");
    if (symbols) symbols.dispatchEvent(new Event("scroll"));
  }

  private _find(setting: string): HTMLInputElement | null {
    return (this._dialog as Dialog)
      .getContent()
      .querySelector<HTMLInputElement>('[data-setting="' + setting + '"]');
  }

  /** `.prop("checked")` of the row: undefined when the row isn't there. */
  private _checked(setting: string): boolean | undefined {
    const input = this._find(setting);
    return input ? input.checked : undefined;
  }

  /**
   * Old: updateUserSettings({ notifications_disabled }) on the cloud
   * account when the switch changed. Stored locally now (BUG-131).
   */
  private _saveNotificationSetting(): void {
    const disabled = this._checked("notifications_disabled");
    if (disabled === undefined) return;
    if (!!designer().getSetting("notifications_disabled", false) !== disabled)
      designer().setSetting(["notifications_disabled"], [disabled]);
  }

  private _saveBasicSettings(): void {
    const interval = this._find(AUTO_SAVE_INTERVAL_SETTING);
    const autoSaveInterval = config.AUTOSAVE_INTERVALS[parseInt(interval ? interval.value : "")];
    let decimals: number | null = null;
    if (this._checked("decimals-num-onoff")) {
      const value = parseNumber((this._decimalsBox as InputBox).value());
      if (typeof value === "number" && !isNaN(value)) decimals = value;
    }
    designer().setSetting(
      [
        "highlight_on_hover",
        "auto_expand_layers",
        AUTO_SAVE_SETTING,
        DISABLE_WARNING_SETTING_NAME,
        "system_fonts_enabled",
        "theme",
        "dont_store_textpath",
        "enable_steps_debug",
        "enable_cache",
        "disable_warning_unsupported_features",
        "eps_outline_fonts",
        "ui_toolbar_alignment",
        "decimals_num",
        AUTO_SAVE_INTERVAL_SETTING,
        "create_backup_copy",
        ScrubbingSetting.getSetting(),
      ],
      [
        this._checked("highlight_on_hover"),
        this._checked("auto_expand_layers"),
        this._checked(AUTO_SAVE_SETTING),
        !this._checked(DISABLE_WARNING_SETTING_NAME),
        this._checked("system_fonts_enabled"),
        this._find("theme") ? this._theme : undefined,
        !this._checked("dont_store_textpath"),
        this._checked("enable_steps_debug"),
        this._checked("enable_cache"),
        this._checked("disable_warning_unsupported_features"),
        this._checked("eps_outline_fonts"),
        this._checked("ui_toolbar_alignment"),
        decimals,
        autoSaveInterval,
        this._checked("create_backup_copy"),
        !this._checked(ScrubbingSetting.getSetting()),
      ],
    );
  }
}

/**
 * `new SettingsDialog()` is a promise of the built dialog, as the old
 * constructor returned one (the settings action opens it when it resolves).
 */
export const SettingsDialog = function SettingsDialog(): Promise<SettingsDialogImpl> {
  const dialog = new SettingsDialogImpl();
  return new Promise((resolve, reject) => {
    dialog
      ._buildDialog()
      .then(() => resolve(dialog))
      .catch(() => reject(false));
  });
} as unknown as new () => Promise<SettingsDialogImpl>;
