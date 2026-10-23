// Old: designer.browser.dev.js module 1474 (GConfirmationDialog).
/**
 * "Thanks" confirmation that runs a save or export action again, naming
 * the signed-in user's e-mail. Only the dropped purchase flow opened it;
 * the class is kept with its old behaviour.
 */
import { createElement } from "react";
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { designer } from "../shell/globals.ts";
import { sleep } from "../util/designer-util.ts";
import { ConfirmationDialogView } from "./confirmation-dialog-view.tsx";
import { Dialog } from "./dialog.ts";

function text(className: string, key: string): string {
  return Locale.get(new LocaleKey(className, key)) as string;
}

export class ConfirmationDialog {
  private readonly _dialog: Dialog;

  constructor(
    private readonly _document: unknown,
    private readonly _user: { email: string },
    private readonly _action = "file.save",
  ) {
    const action = designer().getAction(this._action);
    if (!action) throw new TypeError(`no action ${this._action}`);
    let buttonText: string;
    let kind = "save";
    if (action.getId().includes("save"))
      buttonText = text("GConfirmationDialog", "text.confirm-save");
    else if (action.getId().includes("export")) {
      buttonText = text("GConfirmationDialog", "text.confirm-export");
      kind = "export";
    } else {
      const title = action.getTitle();
      buttonText = title instanceof LocaleKey ? (Locale.get(title) as string) : String(title);
    }
    const info = text("GConfirmationDialog", "text.confirm-info-" + kind).replace(
      "%email",
      this._user.email,
    );
    this._dialog = Dialog.create(
      createElement(ConfirmationDialogView, {
        info,
        buttonText,
        onConfirm: () => {
          let args: unknown[] = [];
          if ("file.save" === this._action) args = [undefined, true];
          designer().executeAction(this._action, args, "confirmationdialog");
          this.close();
        },
      }),
      { releaseOnClose: true, className: "g-confirmation-dialog" },
    );
  }

  async open(): Promise<void> {
    this._dialog.open(true);
    await sleep(100);
    this._dialog.getElement().classList.add("slide-up");
  }

  close(): void {
    this._dialog.close();
    this._dialog.getElement().classList.remove("slide-up");
  }
}
