// Old: designer.browser.dev.js modules 1595 (Mousetrap 1.6.5) and 1596
// (its global-bind plugin).
/**
 * The shortcut binder Designer.registerShortcut uses (shell/shortcut-binder.ts),
 * backed by the npm Mousetrap the old app bundled.
 *
 * Module 1596 is Mousetrap's global-bind plugin (bindGlobal, which also
 * fires inside text fields, and the `paused` check), not the pause
 * plugin: same code as plugins/global-bind in the npm package.
 *
 * Mousetrap puts itself on window.Mousetrap; the plugin finds it there.
 */
import Mousetrap from "mousetrap";
import "mousetrap/plugins/global-bind/mousetrap-global-bind.js";
import {
  setShortcutBinder,
  type ShortcutBinder,
  type ShortcutCallback,
  type ShortcutPhase,
} from "../shell/shortcut-binder.ts";

/** Mousetrap with the global-bind plugin's method. */
type MousetrapWithGlobal = typeof Mousetrap & {
  bindGlobal(keys: string | string[], callback: ShortcutCallback, action?: string): void;
};

export class MousetrapBinder implements ShortcutBinder {
  bind(combo: string, callback: ShortcutCallback, phase?: ShortcutPhase): void {
    Mousetrap.bind(combo, callback, phase);
  }

  bindGlobal(combo: string, callback: ShortcutCallback, phase?: ShortcutPhase): void {
    (Mousetrap as MousetrapWithGlobal).bindGlobal(combo, callback, phase);
  }

  reset(): void {
    Mousetrap.reset();
  }
}

/**
 * Makes Mousetrap the app's shortcut binder. boot() calls it before the
 * designer binds the first shortcut; until then shortcutBinder() is the
 * single-key fallback, which drops every combo.
 */
export function installMousetrapBinder(): void {
  setShortcutBinder(new MousetrapBinder());
}
