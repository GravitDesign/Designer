// Old: designer.browser.dev.js module 31 (GAction).
/**
 * The base of every action: menu entries, toolbar buttons, context menu
 * items and keyboard shortcuts all run an action by its id through the
 * designer (executeAction, canExecuteAction).
 *
 * Subclasses override getId, getTitle and execute, and whatever else
 * differs from the defaults here. A title is a LocaleKey or a resolved
 * string; the menus resolve it with Locale.get.
 */
import { Key, type KeyValue } from "../../engine/core/key.ts";
import type { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { GObject } from "../../engine/core/object.ts";
import { actionIcons } from "./deps.ts";
import type { Category } from "./category.ts";

/** A shortcut: key constants and characters, e.g. [Key.Constant.META, "S"]. */
export type Shortcut = readonly KeyValue[];

/** What getTitle returns: a key to resolve or a ready string. */
export type ActionTitle = LocaleKey | string | null;

/** Options of Key.shortcutToString (isWordMode). */
export type ShortcutHintOptions = { isWordMode?: boolean };

/* eslint-disable @typescript-eslint/no-unused-vars -- the defaults take the arguments their overrides use */
export class Action extends GObject {
  /** How long a main action waits for the second key of a sub-action shortcut (ms). */
  static SHORTCUT_DELAY = 500;

  /** A shortcut as the menus show it, or null without one. */
  static getActionShortcutHint(
    shortcut: Shortcut | null,
    options?: ShortcutHintOptions,
  ): string | null {
    return shortcut ? Key.shortcutToString(shortcut, options) : null;
  }

  getId(): string {
    throw new Error("Not Supported");
  }

  getTitle(): ActionTitle {
    throw new Error("Not Supported");
  }

  /** The title the shortcuts dialog lists. */
  getFullTitle(): ActionTitle {
    return this.getTitle();
  }

  getInfo(): ActionTitle {
    return null;
  }

  /** Icon class name (or inline SVG) from the shared icon table. */
  getIcon(): string | null {
    return actionIcons()[this.getId()] || null;
  }

  getCategory(): Category | null {
    return null;
  }

  /** Menu group id; entries of one group sit between separators. */
  getGroup(): string | null {
    return null;
  }

  getGroupIcon(): string | null {
    return null;
  }

  getShortcut(): Shortcut | null {
    return null;
  }

  getShortcutHint(options?: ShortcutHintOptions): string | null {
    return Action.getActionShortcutHint(this.getShortcut(), options);
  }

  /** Whether the shortcut also fires while a text input has the focus. */
  isShortcutGlobal(): boolean {
    return false;
  }

  /** null: register the shortcut when the action is in the menu (the default). */
  isRegisterShortcut(): boolean | null {
    return null;
  }

  getAdditionalShortcuts(): Shortcut[] | null {
    return null;
  }

  // The arguments are the ones executeAction passes on; most actions ignore them.
  isEnabled(..._args: unknown[]): boolean {
    return true;
  }

  /** Whether executeFromShortcut needs the keyboard event (it reads the key). */
  isKeyBoardEventRequiredToExecute(): boolean {
    return false;
  }

  isCheckable(): boolean {
    return false;
  }

  isChecked(): boolean {
    return false;
  }

  /** `context` is where the action would show, e.g. "context.menu". */
  isAvailable(_context?: string): boolean {
    return true;
  }

  execute(..._args: unknown[]): unknown {
    throw new Error("Not Supported");
  }

  /**
   * Runs the action for its shortcut. Returning false lets the browser
   * handle the key as well (cut, copy and paste use that).
   */
  executeFromShortcut(...args: unknown[]): unknown {
    return this.execute(...args);
  }

  isPro(): boolean {
    return false;
  }

  getTooltipArea(): string | null {
    return null;
  }

  getTooltipConfig(_area?: string): unknown {
    return null;
  }

  /** false: shortcut only, not shown in the menus. */
  isVisible(): boolean {
    return true;
  }

  noHover(): boolean {
    return false;
  }

  getStyleClass(): string | null {
    return null;
  }

  statsValue(): string | null {
    return null;
  }

  override toString(): string {
    return "[Object GAction]";
  }
}
/* eslint-enable @typescript-eslint/no-unused-vars */
