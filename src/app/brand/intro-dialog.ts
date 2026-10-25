/**
 * The introduction of GravitDesign Next: a dialog that says plainly that
 * this is a community rebuild, not the Gravit Designer people know, what
 * that means for their files and what's gone. It opens once, on the
 * first start in the "next" look (after the desktop app's migration, on
 * top of the welcome screen); localStorage "designer.next-intro-shown"
 * remembers that it was closed. That first time it only closes once the
 * box under it is ticked: "Got it" is disabled and Escape and the
 * backdrop do nothing until then. Help > About GravitDesign Next
 * (show-intro-action.ts) opens it again, closable and without the box.
 */
import { createElement } from "react";
import { Dialog } from "../dialogs/dialog.ts";
import { containerOrNull } from "../shell/globals.ts";
import { LocalStorageKeys } from "../storage/local-storage.ts";
import { isNextBranding } from "./branding.ts";
import { IntroDialogFooter, IntroDialogView } from "./intro-dialog-view.tsx";

export const INTRO_SHOWN_KEY = LocalStorageKeys.NextIntroShown;

export function introWasShown(storage: Storage = window.localStorage): boolean {
  try {
    return storage.getItem(INTRO_SHOWN_KEY) === "true";
  } catch {
    return false;
  }
}

function markIntroShown(storage: Storage = window.localStorage): void {
  try {
    // JSON, like the container's setProperty.
    storage.setItem(INTRO_SHOWN_KEY, JSON.stringify(true));
  } catch {
    // Storage blocked: it shows again next time, which is harmless.
  }
}

export class IntroDialog {
  /** The open introduction. */
  private static _current: IntroDialog | null = null;
  private readonly _dialog: Dialog;
  private readonly _needsConfirm: boolean;

  /** `needsConfirm`: closable only once the box is ticked (first start). */
  constructor({ needsConfirm = false }: { needsConfirm?: boolean } = {}) {
    this._needsConfirm = needsConfirm;
    this._dialog = Dialog.create(
      createElement(IntroDialogView, {
        onLink: (event, url) => {
          const container = containerOrNull();
          if (container) container.openExternalLink(event, url);
        },
      }),
      {
        className: "gd-intro-dialog",
        releaseOnClose: true,
        closeTimeout: 0,
        buttons: [
          createElement(IntroDialogFooter, {
            needsConfirm,
            onConfirm: (confirmed) => this.confirm(confirmed),
            onClick: () => this.close(),
          }),
        ],
        closeCallback: () => {
          markIntroShown();
          if (IntroDialog._current === this) IntroDialog._current = null;
        },
      },
    );
  }

  /** The dialog, for tests and the parity scenarios. */
  getDialog(): Dialog {
    return this._dialog;
  }

  /** Opens it, closable by Escape and a click beside it unless the box has to be ticked first. */
  open(): this {
    IntroDialog._current = this;
    this._dialog.open(!this._needsConfirm);
    return this;
  }

  /** The box was ticked (or unticked again): Escape and the backdrop close it only while it is ticked. */
  confirm(confirmed = true): void {
    this._dialog.closable = confirmed;
  }

  close(): void {
    this._dialog.close(false);
  }

  isOpen(): boolean {
    return IntroDialog._current === this;
  }

  /** The open introduction, if any. */
  static current(): IntroDialog | null {
    return IntroDialog._current;
  }

  /** Opens the introduction, or leaves the open one alone. */
  static show(options?: { needsConfirm?: boolean }): IntroDialog {
    return IntroDialog._current ?? new IntroDialog(options).open();
  }

  /**
   * On the first start in the "next" look: opens it, closable only once the
   * box is ticked. Returns it, or null when it wasn't due.
   */
  static showOnFirstStart(): IntroDialog | null {
    if (!isNextBranding() || introWasShown()) return null;
    return IntroDialog.show({ needsConfirm: true });
  }
}
