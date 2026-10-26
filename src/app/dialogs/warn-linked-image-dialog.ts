// Old: designer.browser.dev.js module 1511 (GWarnLinkedImageDialog).
/**
 * Asked before saving a document with linked images to the desktop
 * storage: proceed (optionally never asking again) or cancel. When the
 * user chose "never remind" before, `agree` runs right away instead.
 *
 * The dialog is built only after the stored choice has been read (a
 * promise), but the save action calls open() right after construction.
 * The old open() then threw a TypeError, the dialog never appeared and the
 * save did nothing (BUGS-FIXED BUG-145). open() before the dialog is built
 * now opens it once it is; with "never remind" stored it does nothing.
 */
import { createElement } from "react";
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { container } from "../shell/globals.ts";
import { Dialog } from "./dialog.ts";
import { HtmlButton, WarnLinkedImageDialogView } from "./warn-linked-image-dialog-view.tsx";

const NEVER_REMIND = "designer.settings.warn-linked-image-dialog.never-remind";

function text(key: string): string {
  return Locale.get(new LocaleKey("GWarnLinkedImageDialog", key)) as string;
}

export class WarnLinkedImageDialog {
  private _neverRemind = false;
  private readonly _agreeCb: () => void;
  private readonly _rejectCb: () => void;
  private _dialog: Dialog | undefined;
  /** open() was called before the dialog was built. */
  private _openWhenBuilt = false;

  constructor(agree: () => void, reject?: () => void) {
    this._agreeCb = agree;
    this._rejectCb = reject || (() => this.close());
    void container()
      .getProperty(NEVER_REMIND)
      .then((stored) => {
        if (stored || false) agree();
        else this._init();
      });
  }

  private _init(): void {
    this._dialog = Dialog.create(
      createElement(WarnLinkedImageDialogView, {
        message: text("warn-linked-image.text"),
        neverRemindHtml: text("warn-linked-image.never-remind"),
        neverRemind: this._neverRemind,
        onToggle: () => {
          this._neverRemind = !this._neverRemind;
        },
        onClose: () => this.close(),
      }),
      {
        releaseOnClose: true,
        className: "g-warn-linked-image-dialog",
        buttons: [
          createElement(HtmlButton, {
            key: "proceed",
            html: text("warn-linked-image.proceed"),
            type: "submit",
            onClick: () => this.save(),
          }),
          createElement(HtmlButton, {
            key: "cancel",
            html: text("warn-linked-image.cancel"),
            onClick: () => this._rejectCb.call(this),
          }),
        ],
      },
      "container",
    );
    if (this._openWhenBuilt) this.open();
  }

  save(): void {
    if (this._neverRemind) container().setProperty(NEVER_REMIND, true);
    this.close();
    this._agreeCb();
  }

  open(): void {
    this._openWhenBuilt = !this._dialog;
    if (this._dialog) this._dialog.open(true);
  }

  close(): void {
    this._openWhenBuilt = false;
    if (this._dialog) this._dialog.close();
  }
}
