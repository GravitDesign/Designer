// Old: designer.browser.dev.js module 219.
/**
 * A message with an OK button. The dialog is built at construction and
 * opened closable; close() runs the callback.
 *
 *     new MessageDialog(text, () => ...).open();
 */
import { createElement } from "react";
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { Dialog } from "./dialog.ts";
import { MessageDialogButton, MessageDialogView } from "./message-dialog-view.tsx";

export class MessageDialog {
  private readonly _cb: (() => void) | null;
  private readonly _dialog: Dialog;

  constructor(message: string, callback?: (() => void) | null) {
    this._cb = callback || null;
    this._dialog = Dialog.create(createElement(MessageDialogView, { html: message }), {
      releaseOnClose: true,
      buttons: [
        createElement(MessageDialogButton, {
          html: Locale.get(new LocaleKey("GLocale", "ok")) as string,
          onClick: () => this.close(),
        }),
      ],
    });
  }

  /** The dialog, for callers that need its elements. */
  getDialog(): Dialog {
    return this._dialog;
  }

  open(): void {
    this._dialog.open(true);
  }

  close(): void {
    this._dialog.close();
    if (this._cb) this._cb();
  }
}
