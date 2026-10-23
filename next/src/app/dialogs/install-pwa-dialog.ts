// Old: designer.browser.dev.js module 1562 (GInstallPwaDialog).
/**
 * Offers to install the app as a PWA: Install runs file.install-to-desktop
 * (or the prompt directly when the action can't run), "Not now" stores
 * when it was dismissed so the designer waits before offering it again.
 * Browsers without the install prompt get a "requires Chromium" note
 * instead of the buttons. Escape closes it.
 */
import { createElement } from "react";
import { Key } from "../../engine/core/key.ts";
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import {
  InstallToDesktopAction,
  isPwaSupported,
} from "../actions/file/install-to-desktop-action.ts";
import { container, designer } from "../shell/globals.ts";
import { Dialog } from "./dialog.ts";
import { InstallPwaDialogView } from "./install-pwa-dialog-view.tsx";

function text(key: string): string {
  return Locale.get(new LocaleKey("GInstallPwaDialog", key)) as string;
}

export class InstallPwaDialog {
  private readonly _dialog: Dialog;

  /** `dark` uses the dark variant (class g-install-pwa-dialog-dark). */
  constructor(dark?: boolean) {
    const onKeyDown = (event: KeyboardEvent): boolean | undefined => {
      if (Key.translateKey(event.keyCode) === Key.Constant.ESC) {
        event.preventDefault();
        event.stopPropagation();
        document.removeEventListener("keydown", onKeyDown);
        this._dialog.close();
        return false;
      }
      return undefined;
    };
    let className = "g-install-pwa-dialog";
    if (dark) className += "-dark";
    this._dialog = Dialog.create(
      createElement(InstallPwaDialogView, {
        texts: {
          title: text("text.title"),
          description: text("text.description-text"),
          proLink: text("text.description-pro-link"),
          dot: text("text.end-sentence-dot"),
          install: text("action.install-button"),
          notNow: text("action.not-now-button"),
          requires: text("text.pwa-requires"),
          footerMain: text("text.footer-main-text"),
          footerLink: text("action.footer-link-text"),
          moreInformation: text("action.footer-more-information"),
        },
        supported: isPwaSupported(),
        onClose: () => this.close(),
        onInstall: () => {
          try {
            designer().executeAction(InstallToDesktopAction.ID);
          } catch {
            InstallToDesktopAction.install();
          }
          this.close();
        },
        onNotNow: () => {
          // Old: gDesigner.now().getTime(); the new now() is already the time stamp.
          const now = designer().now();
          container().setProperty(InstallToDesktopAction.closedInstallPWADialogDatePropName, now);
          this.close();
        },
      }),
      {
        releaseOnClose: true,
        className,
        alwaysCloseable: true,
        closeCallback: () => document.removeEventListener("keydown", onKeyDown),
      },
    );
    document.addEventListener("keydown", onKeyDown);
  }

  open(): void {
    this._dialog.open(false);
  }

  close(): void {
    this._dialog.close();
  }

  toString(): string {
    return "[Object GInstallPwaDialog]";
  }
}
