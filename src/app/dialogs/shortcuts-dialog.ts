// Old: designer.browser.dev.js module 1644 (GShortcutsDialog).
/**
 * Help > Show Keyboard Shortcuts: every available action with a
 * shortcut, in registration order, then every tool with a key.
 */
import { createElement } from "react";
import { Key } from "../../engine/core/key.ts";
import { Locale } from "../../engine/core/locale/locale.ts";
import type { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { appRegistry, designer } from "../shell/globals.ts";
import type { ToolTableEntry } from "../shell/registry.ts";
import { Dialog } from "./dialog.ts";
import { ShortcutsDialogView, type ShortcutRow } from "./shortcuts-dialog-view.tsx";

/** A tool's tooltip title: the table's data, or a RichTooltipConfig object. */
function toolTitle(entry: ToolTableEntry): string {
  const config = entry.richTooltipConfig as unknown as {
    getConfig?(): { title: string };
    _title: string;
  };
  const title = config.getConfig ? config.getConfig().title : config._title;
  return Locale.get(title) as string;
}

export class ShortcutsDialog {
  private readonly _dialog: Dialog;

  constructor() {
    this._dialog = Dialog.create(
      createElement(ShortcutsDialogView, {
        title: Locale.getValue("GShortcutsDialog", "text.title") as string,
        rows: ShortcutsDialog._rows(),
        onClose: () => this.close(),
      }),
      { releaseOnClose: true, className: "g-shortcuts-dialog" },
    );
  }

  private static _rows(): ShortcutRow[] {
    const rows: ShortcutRow[] = [];
    designer()
      .getActions()
      .forEach((action) => {
        if (!action.isAvailable()) return;
        const shortcut = action.getShortcutHint({ isWordMode: true });
        if (shortcut)
          rows.push({
            title: Locale.get(action.getFullTitle() as LocaleKey) as string,
            shortcut,
          });
      });
    appRegistry().tools.forEach((tool) => {
      if (tool.key) {
        // The key is a string; shortcutToString walks it character by character.
        const shortcut = Key.shortcutToString([...tool.key]);
        if (!shortcut) return;
        rows.push({ title: toolTitle(tool), shortcut });
      }
    });
    return rows;
  }

  open(): void {
    this._dialog.open(true);
  }

  close(): void {
    this._dialog.close();
  }
}
