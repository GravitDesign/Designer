// Old: designer.browser.dev.js module 44 (GSystemDialog).
/**
 * The app's standard dialogs: alert, confirm, prompt, error, the one-time
 * notice, the v1 info/warning dialogs, custom and advanced. Each builds a
 * Dialog (dialogs/dialog.ts) with the old classes and buttons and opens
 * it right away; the content is React (system-dialog-view.tsx).
 *
 * The methods return the Dialog where the old ones returned the jQuery
 * content element, so callers close it with `dialog.close()` instead of
 * `.gDialog("close")`.
 */
import { createElement, type CSSProperties, type ReactNode } from "react";
import Mousetrap from "mousetrap";
import { Key } from "../../engine/core/key.ts";
import { Locale } from "../../engine/core/locale/locale.ts";
import { Effect } from "../../engine/style/effect.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { container, designer } from "../shell/globals.ts";
import { registerCustomDialogHost } from "../util/designer-util.ts";
import { Dialog } from "./dialog.ts";
import {
  CustomView,
  DialogV1View,
  DontShowAgainLabel,
  MessageView,
  MessageWithInfoView,
  PromptView,
  SpanButton,
  TextButton,
} from "./system-dialog-view.tsx";

function text(className: string, key: string): string {
  return Locale.get(new LocaleKey(className, key)) as string;
}

/** gApi.formatError: a message from a string, an Error or an `errors` list. */
export function formatError(error: unknown): unknown {
  let message: unknown;
  if ("string" == typeof error) message = error;
  const value = error as { message?: unknown; errors?: Iterable<readonly [unknown, unknown]> };
  if (!message && error && value.message) message = value.message;
  if (!message && error && value.errors) {
    const map = new Map(value.errors);
    message = Array.from(map.values()).join("<br>");
  }
  if (!message && error) message = error;
  return message;
}

/** A confirm button label: text, or { text, pro, disabled }. */
export type ConfirmButtonLabel =
  string | null | undefined | { text?: string; pro?: boolean; disabled?: boolean };

/** A button of custom() and advanced(). */
export interface SystemDialogButton {
  label: string;
  onclick?: ((dialog: Dialog) => void) | null;
  highlighted?: boolean;
  className?: string | string[];
  /** CSS float ("left", "right"). */
  position?: string;
  /** A Mousetrap combo that clicks the button while the dialog is open. */
  shortcut?: string;
  closeOnClick?: boolean;
}

export interface CustomDialogOptions {
  title?: string;
  subtitle?: unknown;
  styles?: { dialog?: Record<string, string>; buttons?: CSSProperties };
  footer?: string;
  icon?: string;
  buttons?: SystemDialogButton[];
  openCallback?: (() => void) | null;
  closeCallback?: ((cancelled?: boolean) => void) | null;
  closeable?: boolean;
  className?: string;
  dontShowAgainCb?: ((checked: boolean) => void) | null;
}

export interface DialogV1Options {
  title?: string;
  label?: string;
  message?: string;
  icon?: string;
  closeable?: boolean;
  /** Builds the buttons; `close(cancelled)` closes the dialog. */
  buttons?: (close: (cancelled?: boolean) => void) => ReactNode[];
  details?: { label: string; items: readonly string[]; onClick?: () => void };
  options?: {
    setting?: string;
    values: readonly string[];
    tooltips?: readonly string[];
    onClick?: () => void;
  };
  setting?: string;
  className?: string;
  onCancel?: () => void;
  onSubmit?: () => void;
}

interface Stylable {
  getNodeNameTranslated(): string;
}

/** The Mousetrap combos a dialog bound, unbound together on close. */
function unbindAll(combos: string[]): void {
  if (combos.length) {
    combos.forEach((combo) => Mousetrap.unbind(combo));
    combos.length = 0;
  }
}

function dontShowAgainText(): string {
  return text("GSystemDialog", "text.do-not-show-again");
}

export class SystemDialog {
  static readonly Shortcut = { Esc: "esc", Enter: "enter" } as const;

  static error(
    error: unknown,
    { showTitle = true, closeCallback }: { showTitle?: boolean; closeCallback?: () => void } = {},
  ): Dialog {
    return SystemDialog.custom({
      title: showTitle ? text("GCommonNames", "text.something-wrong") : "",
      subtitle: formatError(error),
      closeCallback,
    });
  }

  static externalFileError(fromRecent: unknown): Dialog {
    const message = fromRecent
      ? text("GContainer", "text.load-failed-from-recent")
      : text("GContainer", "text.load-failed-from-link");
    return SystemDialog.custom({ subtitle: message, icon: "error" });
  }

  static splashScreenError(
    message: string,
    buttonText: string,
    onClick?: ((event: unknown) => void) | null,
  ): Dialog {
    const buttons: ReactNode[] = [];
    let dialog: Dialog | null = null;
    if (onClick)
      buttons.push(
        createElement(TextButton, {
          key: 0,
          text: buttonText,
          onClick: () => {
            if (onClick) onClick(undefined);
            if (dialog) dialog.close();
          },
        }),
      );
    dialog = Dialog.create(createElement(MessageView, { html: message }), {
      releaseOnClose: true,
      className: "g-system-dialog g-splash-screen-error-dialog",
      buttons,
    });
    dialog.open(false);
    return dialog;
  }

  /**
   * Asks `message` with Cancel and OK; `done(ok)`. With `setting`, a
   * stored true skips the dialog and a "don't show again" box stores it.
   */
  static async confirm(
    message: string,
    done?: ((ok: boolean) => void) | null,
    cancelLabel?: ConfirmButtonLabel,
    okLabel?: ConfirmButtonLabel,
    closable?: boolean | null,
    enterConfirms?: boolean,
    escapeCancels?: boolean,
    setting?: string,
  ): Promise<void> {
    if (setting) {
      const stored = () => {
        try {
          return container().getProperty(setting);
        } catch {
          return false;
        }
      };
      if (await stored()) return;
    }
    let dialog: Dialog | null = null;
    let keyListener: ((event: KeyboardEvent) => void) | undefined;
    const finish = (ok: boolean) => {
      if (keyListener) document.removeEventListener("keydown", keyListener, true);
      if (dialog) dialog.close();
      if (done) done(ok);
    };
    if (enterConfirms || escapeCancels) {
      keyListener = (event: KeyboardEvent) => {
        if (enterConfirms && Key.translateKey(event.keyCode) === Key.Constant.ENTER) {
          if (dialog && dialog.isOpen()) {
            event.preventDefault();
            event.stopImmediatePropagation();
            finish(true);
          }
        } else if (escapeCancels && Key.translateKey(event.keyCode) === Key.Constant.ESC) {
          if (dialog && dialog.isOpen()) {
            event.preventDefault();
            event.stopImmediatePropagation();
            finish(false);
          }
        }
      };
      document.addEventListener("keydown", keyListener, true);
    }
    const labelOf = (label: ConfirmButtonLabel) =>
      label && "object" == typeof label ? label.text : label;
    const okDisabled = !!okLabel && "object" == typeof okLabel && !!okLabel.disabled;
    // gPro({ pro }) only toggled licence classes; with the licence gone
    // it adds nothing (and a false toggle adds no class attribute).
    dialog = Dialog.create(createElement(MessageView, { html: message }), {
      releaseOnClose: true,
      className: "g-system-dialog g-confirm-dialog" + (setting ? " g-onetime-dialog" : ""),
      buttons: [
        createElement(TextButton, {
          text: labelOf(cancelLabel) || text("GLocale", "cancel"),
          onClick: () => finish(false),
        }),
        createElement(TextButton, {
          text: labelOf(okLabel) || text("GLocale", "ok"),
          primary: true,
          disabled: okDisabled,
          onClick: () => {
            if (!okDisabled) finish(true);
          },
        }),
      ],
      footerStart: setting
        ? createElement(DontShowAgainLabel, {
            text: dontShowAgainText(),
            onChange: (checked: boolean) => container().setProperty(setting, checked),
          })
        : null,
    });
    if (null === closable) closable = false;
    dialog.open(closable);
  }

  /**
   * Asks for a text; `done(value)` on OK or Enter, `done()` on Cancel. With
   * an element instead of a value, that element is shown and OK gives true.
   */
  static prompt(
    message: string,
    done?: ((value?: string | boolean) => void) | null,
    value?: string | HTMLElement | null,
    cancelLabel?: string | null,
    okLabel?: string | null,
    className?: string,
  ): void {
    const custom = !!value && "string" != typeof value;
    let dialog: Dialog | null = null;
    let field: HTMLInputElement | null = null;
    const current = () => (field ? field.value : "");
    const onKeyPress = (event: KeyboardEvent, element: HTMLInputElement) => {
      field = element;
      if (13 === event.keyCode || "Enter" === event.key) {
        if (dialog) dialog.close();
        if (done) done(!!custom || current());
      } else if (27 === event.keyCode || "Escape" === event.key) {
        if (dialog) dialog.close();
        if (done) done();
      }
    };
    dialog = Dialog.create(
      createElement(PromptView, {
        html: message,
        value: custom ? "" : (value as string) || "",
        input: custom ? (value as HTMLElement) : null,
        onKeyPress,
      }),
      {
        releaseOnClose: true,
        // The old code appended the class name unchecked: without one the
        // dialog gets an "undefined" class (see "Prompt dialogs get an
        // undefined class" in QUESTIONS.md).
        className: "g-system-dialog g-prompt-dialog " + String(className),
        buttons: [
          createElement(TextButton, {
            text: cancelLabel || text("GLocale", "cancel"),
            onClick: () => {
              if (dialog) dialog.close();
              if (done) done();
            },
          }),
          createElement(TextButton, {
            text: okLabel || text("GLocale", "ok"),
            primary: true,
            onClick: () => {
              if (done) {
                done(!!custom || current());
                if (dialog) dialog.close();
              }
            },
          }),
        ],
      },
    );
    field = dialog.getContent().querySelector<HTMLInputElement>(".input > input.max-width");
    dialog.open(true);
    const first = dialog.getContent().querySelector<HTMLElement>("input:first-child");
    if (first) {
      first.focus();
      if (first instanceof HTMLInputElement) first.select();
    }
  }

  /** Shows `message` with OK; Enter closes it too unless closeByEnter is false. */
  static alert(
    message: string,
    done?: (() => void) | null,
    { closeByEnter = true, className }: { closeByEnter?: boolean; className?: string } = {},
  ): Dialog {
    let dialog: Dialog | null = null;
    const close = () => {
      if (closeByEnter) document.removeEventListener("keypress", onKey, true);
      if (dialog) dialog.close();
      if (done) done();
    };
    const onKey = (event: KeyboardEvent) => {
      if (Key.translateKey(event.keyCode) === Key.Constant.ENTER && dialog && dialog.isOpen()) {
        event.preventDefault();
        event.stopImmediatePropagation();
        close();
      }
    };
    dialog = Dialog.create(createElement(MessageView, { html: message }), {
      releaseOnClose: true,
      className: "g-system-dialog g-alert-dialog" + (className ? " " + className : ""),
      buttons: [
        createElement(TextButton, { text: text("GLocale", "ok"), primary: true, onClick: close }),
      ],
    });
    dialog.open(false);
    if (closeByEnter) document.addEventListener("keypress", onKey, true);
    return dialog;
  }

  /**
   * Shows `message` unless the stored `setting` is true; its checkbox
   * stores the choice right away.
   */
  static showOneTimeDialog(message: string, setting: string): Promise<Dialog | undefined> {
    return container()
      .getProperty(setting)
      .then((stored) => {
        if (!stored) {
          let dialog: Dialog | null = null;
          dialog = Dialog.create(createElement(MessageView, { html: message }), {
            releaseOnClose: true,
            className: "g-system-dialog g-onetime-dialog",
            buttons: [
              createElement(TextButton, {
                text: text("GLocale", "ok"),
                primary: true,
                onClick: () => {
                  if (dialog) dialog.close();
                },
              }),
            ],
            footerStart: createElement(DontShowAgainLabel, {
              text: dontShowAgainText(),
              onChange: (checked: boolean) => container().setProperty(setting, checked),
            }),
          });
          dialog.open(false);
          return dialog;
        }
        return undefined;
      });
  }

  static showCDRWarning(): Promise<unknown> {
    return designer().getSetting("disable_cdr_warning", false)
      ? Promise.resolve()
      : SystemDialog.info({
          className: "g-cdr-warning",
          setting: "disable_cdr_warning",
          title: text("GSystemDialog", "text.cdr-warning-title"),
          label: text("GSystemDialog", "text.cdr-warning-label"),
          message: text("GSystemDialog", "text.cdr-warning-message"),
        });
  }

  static showCDRUnsupportedObjectWarning(node?: unknown): Promise<unknown> {
    if (
      !SystemDialog.isDialogOpen(".g-system-dialog.g-dialog-v1") &&
      !designer().getSetting("disable_cdr_unsupported_effect", false)
    ) {
      const name = isEffect(node)
        ? text("GSystemDialog", "text.cdr-unsupported-object-warning-effect-name").replace(
            "%name",
            node.getNodeNameTranslated(),
          )
        : text("GSystemDialog", "text.cdr-unsupported-object-warning-generic-name");
      return SystemDialog.info({
        setting: "disable_cdr_unsupported_effect",
        title: text("GSystemDialog", "text.cdr-warning-title"),
        label: text("GSystemDialog", "text.cdr-unsupported-objects-warning-label"),
        message: text("GSystemDialog", "text.cdr-unsupported-object-warning-message").replace(
          "%name",
          name,
        ),
      });
    }
    return Promise.resolve();
  }

  static showCDRUnsupportedObjectsWarning(items: readonly string[] = []): Promise<unknown> {
    const d = designer();
    if (d.getSetting("disable_cdr_unsupported_effects", false))
      return Promise.resolve(d.getSetting("default_cdr_unsupported_effects", 1));
    d.stats("unsupported-dialog_open");
    const key = (name: string) =>
      text("GSystemDialog", "text.cdr-unsupported-objects-warning-" + name);
    return SystemDialog.warning({
      setting: "disable_cdr_unsupported_effects",
      title: key("title"),
      label: key("label"),
      message: key("message"),
      options: {
        setting: "default_cdr_unsupported_effects",
        values: [key("option-0"), key("option-1"), key("option-2"), key("option-3")],
        tooltips: [key("option-0-tooltip"), key("option-1-tooltip"), "", key("option-3-tooltip")],
        onClick: () => {
          d.stats("unsupported-dialog_click_option");
        },
      },
      details: {
        label: key("details-label"),
        onClick: () => {
          d.stats("unsupported-dialog_click_details");
        },
        items,
      },
      onCancel: () => {
        d.stats("unsupported-dialog_click_cancel");
      },
      onSubmit: () => {
        d.stats("unsupported-dialog_click_submit");
      },
    }).then((value) => {
      d.setSetting("default_cdr_unsupported_effects", value);
      return value;
    });
  }

  /** A v1 dialog with the warning icon, Cancel and OK. */
  static warning(options: DialogV1Options): Promise<unknown> {
    return SystemDialog._dialogV1({
      icon: "assets/icon/dialog/warning.svg",
      buttons: (close) => [
        createElement(TextButton, {
          key: 0,
          text: text("GLocale", "cancel"),
          title: text("GFilesPanel", "action.cancel-tooltip"),
          onClick: () => {
            if (options.onCancel) options.onCancel.call(SystemDialog);
            close(true);
          },
        }),
        createElement(TextButton, {
          key: 1,
          text: text("GLocale", "ok"),
          primary: true,
          onClick: () => {
            if (options.onSubmit) options.onSubmit.call(SystemDialog);
            close();
          },
        }),
      ],
      ...options,
    });
  }

  /** A v1 dialog with the info icon and OK. */
  static info(options: DialogV1Options): Promise<unknown> {
    return SystemDialog._dialogV1({
      icon: "assets/icon/dialog/info.svg",
      buttons: (close) => [
        createElement(TextButton, {
          key: 0,
          text: text("GLocale", "ok"),
          primary: true,
          onClick: () => close(),
        }),
      ],
      ...options,
    });
  }

  static isDialogOpen(selector: string): boolean {
    return Dialog.isDialogOpen(selector);
  }

  /**
   * The v1 dialog: resolves on OK (with the chosen option's index when
   * there are options), rejects on cancel.
   */
  static _dialogV1({
    title = "",
    label = "",
    message = "",
    icon = "assets/icon/dialog/info.svg",
    closeable = true,
    buttons = () => [],
    details,
    options,
    setting,
    className = "",
  }: DialogV1Options = {}): Promise<unknown> {
    let resolve: (value?: unknown) => void = () => undefined;
    let reject: () => void = () => undefined;
    const promise = new Promise<unknown>((ok, fail) => {
      resolve = ok;
      reject = fail;
    });
    let dialog: Dialog | null = null;
    const close = (cancelled?: boolean) => {
      if (dialog) dialog.close(cancelled);
    };
    dialog = new Dialog(document.createElement("div"), {
      releaseOnClose: true,
      className: "g-system-dialog g-dialog-v1 " + className,
      closeCallback: (cancelled) => {
        if (cancelled) {
          reject();
          return;
        }
        const content = (dialog as Dialog).getContent();
        if (setting) {
          const box = content.querySelector<HTMLInputElement>(`input[data-property="${setting}"]`);
          designer().setSetting(setting, !!box && box.checked);
        }
        if (options) {
          const checked = content.querySelector<HTMLInputElement>('input[name="options"]:checked');
          resolve(parseInt(checked ? checked.value : "") || 0);
        } else resolve();
      },
    });
    const checked = options
      ? 0 === (options.setting ? designer().getSetting(options.setting, 0) : 0)
      : false;
    dialog.renderContent(
      createElement(DialogV1View, {
        title,
        label,
        message,
        icon,
        closeable,
        onClose: () => close(true),
        details,
        options: options
          ? {
              values: options.values,
              tooltips: options.tooltips,
              checked,
              onChange: () => {
                if (options.onClick) options.onClick.call(SystemDialog);
              },
            }
          : undefined,
        setting,
        dontShowAgainText: dontShowAgainText(),
        buttons: buttons(close),
      }),
    );
    dialog.open(closeable);
    return promise;
  }

  static messageWithInfo({
    mainMessage,
    infoMessage,
  }: {
    mainMessage?: string;
    infoMessage?: string;
  }): Dialog {
    let dialog: Dialog | null = null;
    dialog = Dialog.create(createElement(MessageWithInfoView, { mainMessage, infoMessage }), {
      releaseOnClose: true,
      className: "g-system-dialog g-message-with-info-dialog",
      buttons: [
        createElement(TextButton, {
          text: text("GLocale", "ok"),
          primary: true,
          onClick: () => {
            if (dialog) dialog.close();
          },
        }),
      ],
    });
    return dialog.open(true);
  }

  /** A dialog with a title, subtitle, icon and buttons of its own. */
  static custom({
    title = "",
    subtitle = "",
    styles = {},
    footer,
    icon,
    buttons = [],
    openCallback,
    closeCallback,
    closeable = true,
    className = "",
    dontShowAgainCb,
  }: CustomDialogOptions): Dialog {
    const combos: string[] = [];
    let dialog: Dialog | null = null;
    dialog = new Dialog(document.createElement("div"), {
      releaseOnClose: true,
      className: "g-system-dialog g-custom-dialog " + className,
      closeCallback: (cancelled) => {
        unbindAll(combos);
        if (closeCallback) closeCallback(cancelled);
      },
      openCallback,
    });
    const content = dialog.getContent();
    if (styles.dialog)
      for (const name of Object.keys(styles.dialog))
        content.style.setProperty(
          name.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase()),
          styles.dialog[name] as string,
        );
    const buttonNodes =
      buttons && buttons.length
        ? buttons.map((button, index) => {
            const {
              label,
              onclick,
              highlighted,
              className: extra,
              position,
              shortcut,
              closeOnClick = false,
            } = button;
            let clicked = false;
            const click = () => {
              if (clicked) return;
              clicked = true;
              if (shortcut) {
                Mousetrap.unbind(shortcut);
                combos.splice(combos.indexOf(shortcut), 1);
              }
              unbindAll(combos);
              if (closeOnClick && dialog) dialog.close();
              if (onclick && dialog) onclick(dialog);
            };
            if (shortcut) {
              Mousetrap.bind(shortcut, () => {
                click();
              });
              combos.push(shortcut);
            }
            const classes = ["g-pro-button", ...(highlighted ? ["highlighted"] : [])];
            if (extra)
              for (const name of extra instanceof Array ? extra : [extra]) classes.push(name);
            return createElement(SpanButton, {
              key: index,
              label,
              className: classes.join(" "),
              float: position,
              onClick: click,
            });
          })
        : null;
    dialog.renderContent(
      createElement(CustomView, {
        closeable,
        onClose: () => {
          if (dialog) dialog.close();
        },
        icon,
        title,
        subtitle: String(subtitle ?? ""),
        footer,
        buttons: buttonNodes,
        buttonsStyle: styles.buttons,
        dontShowAgain:
          buttonNodes && dontShowAgainCb
            ? createElement(DontShowAgainLabel, {
                text: dontShowAgainText(),
                spanClassName: "dont-show-this-again-message",
                onChange: dontShowAgainCb,
              })
            : null,
      }),
    );
    return dialog.open(closeable);
  }

  /** A message with buttons in the dialog footer. */
  static advanced({
    title = "",
    buttons = [],
    closeCallback,
    closeable = true,
  }: {
    title?: string;
    buttons?: SystemDialogButton[];
    closeCallback?: ((cancelled?: boolean) => void) | null;
    closeable?: boolean;
  }): Dialog {
    const combos: string[] = [];
    let dialog: Dialog | null = null;
    const buttonNodes = buttons.map((button, index) => {
      const {
        label,
        onclick,
        highlighted,
        className: extra,
        position,
        shortcut,
        closeOnClick = false,
      } = button;
      let clicked = false;
      const click = () => {
        if (clicked) return;
        clicked = true;
        if (shortcut) {
          Mousetrap.unbind(shortcut);
          combos.splice(combos.indexOf(shortcut), 1);
        }
        unbindAll(combos);
        if (dialog && onclick) onclick(dialog);
        if (closeOnClick && dialog) dialog.close(false);
      };
      if (shortcut) {
        Mousetrap.bind(shortcut, () => {
          click();
        });
        combos.push(shortcut);
      }
      const classes = highlighted ? ["primary"] : [];
      if (extra) for (const name of extra instanceof Array ? extra : [extra]) classes.push(name);
      return createElement(SpanButton, {
        key: index,
        label,
        className: classes.join(" "),
        float: position,
        onClick: click,
      });
    });
    dialog = Dialog.create(createElement(MessageView, { html: title }), {
      releaseOnClose: true,
      className: "g-system-dialog g-advanced-dialog",
      closeCallback: (cancelled) => {
        unbindAll(combos);
        if (closeCallback) closeCallback(cancelled);
      },
      buttons: buttonNodes,
    });
    return dialog.open(closeable);
  }

  toString(): string {
    return "[Object GSystemDialog]";
  }
}

function isEffect(node: unknown): node is Stylable {
  return node instanceof Effect;
}

// The "has a newer version" dialog of saving (util/designer-util.ts) needs
// custom(); registering is all this module does at load.
registerCustomDialogHost({
  custom: (options) => SystemDialog.custom(options as CustomDialogOptions),
  Shortcut: SystemDialog.Shortcut,
  updateToolbarActions: () => {
    const toolbar = designer().getToolbar() as { _updateActions?: () => void } | null;
    if (toolbar && toolbar._updateActions) toolbar._updateActions();
  },
});
