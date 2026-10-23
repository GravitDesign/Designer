// Old: designer.browser.dev.js module 1556 (GNewFilePrompt).
/**
 * Asks for the name of a new file: Create (or Enter) passes the name to
 * `onCreate` unless it is blank or the validator rejects it, which shows
 * the validator's message instead. Only the dropped cloud files panel
 * opened it.
 */
import { createElement } from "react";
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { Dialog } from "./dialog.ts";
import { NewFilePromptView, PromptButton } from "./new-file-prompt-view.tsx";
import { SystemDialog } from "./system-dialog.ts";

export interface NewFileValidator {
  fn?: (name: string) => boolean;
  /** "%fileName%" is replaced by the quoted name. */
  errorMessage?: string;
}

export class NewFilePrompt {
  private readonly _dialog: Dialog;

  constructor(
    onCreate: (name: string) => void,
    closeCallback?: ((cancelled?: boolean) => void) | null,
    createButtonClass?: string,
    name?: string,
    validator: NewFileValidator = {},
  ) {
    const nameInput = (): HTMLInputElement =>
      this._dialog.getContent().querySelector(".name") as HTMLInputElement;
    const submit = (): void => {
      if (!nameInput().value.trim()) return;
      const value = nameInput().value;
      if (validator && validator.fn && !validator.fn(value))
        SystemDialog.alert(
          (validator.errorMessage as string).replace("%fileName%", '"'.concat(value, '"')),
        );
      else {
        onCreate(value);
        this.close();
      }
    };
    const onKeyPress = (event: KeyboardEvent): void => {
      if (13 === event.which) {
        submit();
        event.stopPropagation();
      }
    };
    this._dialog = Dialog.create(
      createElement(NewFilePromptView, {
        labelHtml: Locale.get(new LocaleKey("GNewFilePrompt", "text.name-document")) as string,
        value: name || "",
        onKeyPress,
      }),
      {
        className: "g-new-file-prompt-dialog",
        releaseOnClose: false,
        closeCallback,
        buttons: [
          createElement(PromptButton, {
            key: "create",
            label: Locale.get(new LocaleKey("GNewFilePrompt", "action.create")) as string,
            className: createButtonClass || undefined,
            onClick: submit,
          }),
          createElement(PromptButton, {
            key: "cancel",
            label: Locale.get(new LocaleKey("GLocale", "cancel")) as string,
            onClick: () => this.close(),
          }),
        ],
      },
    );
  }

  open(): void {
    this._dialog.open(true);
    (this._dialog.getContent().querySelector(".name") as HTMLInputElement).focus();
  }

  close(): void {
    this._dialog.close();
  }
}
