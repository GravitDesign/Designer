// Old: designer.browser.dev.js module 1727 ($.fn.gDialog).
/**
 * Modal dialogs. A dialog wraps a content element:
 *
 *     body > .g-dialog-container.<className>-container.visible
 *       > .g-dialog.<className>
 *         > .g-dialog-content (the content element)
 *         > .g-dialog-footer > [footerStart] .buttons > buttons
 *
 * The container is created on open and removed (with the dialog when
 * releaseOnClose) after the close animation, 250 ms by default. Open
 * dialogs form a stack: Escape and a mousedown on the bare container
 * close the top one if it was opened closable. The Escape listener is
 * added when this module loads, as the old module did.
 *
 * The frame is plain DOM like the old jQuery-built one; what goes inside
 * (content, buttons, footerStart) is React, rendered synchronously into
 * its own root (state/islands.tsx), or plain elements the caller built:
 *
 *     const dialog = Dialog.create(<MyContent />, { className: "g-my-dialog", buttons: [...] });
 *     dialog.open(true);
 */
import { createElement, Fragment, type ReactNode } from "react";
import { renderInto, type Island } from "../state/islands.tsx";
import { Listeners } from "../widgets/dom-helpers.ts";

/** A footer button: a React element, or an element the caller built. */
export type DialogButton = ReactNode | HTMLElement;

export interface DialogOptions {
  /** Remove the dialog when closed (true, the default) or keep it for another open. */
  releaseOnClose?: boolean;
  /** Classes of `.g-dialog`; each also gets a `-container` twin on the container. */
  className?: string;
  buttons?: readonly DialogButton[] | null;
  /** Rendered in the footer before `.buttons` (the old code prepended a label there). */
  footerStart?: ReactNode;
  openCallback?: ((this: Dialog) => void) | null;
  /** Called on close; `cancelled` is true for Escape, the close button and the backdrop. */
  closeCallback?: ((cancelled?: boolean) => void) | null;
  /** The content is the `.g-dialog` itself (it must have that class). */
  nowrap?: boolean;
  closeTimeout?: number | null;
  /** May be closed while not on top of the stack. */
  alwaysCloseable?: boolean;
}

interface ResolvedOptions {
  releaseOnClose: boolean;
  className: string;
  buttons: readonly DialogButton[] | null;
  footerStart: ReactNode;
  openCallback: ((this: Dialog) => void) | null;
  closeCallback: ((cancelled?: boolean) => void) | null;
  nowrap: boolean;
  closeTimeout: number | null;
  alwaysCloseable: boolean;
}

/** The open dialogs' content elements, oldest first. */
const stack: HTMLElement[] = [];
const dialogs = new WeakMap<Element, Dialog>();

/** Closes the top dialog if it was opened closable (Escape, backdrop click). */
function closeTop(): void {
  if (stack.length > 0) {
    const dialog = dialogs.get(stack[stack.length - 1] as HTMLElement);
    if (dialog && dialog.closable) dialog.close(true);
  }
}

if (typeof document !== "undefined") {
  document.addEventListener("keydown", (event) => {
    if (27 === event.keyCode) closeTop();
  });
}

function isElement(value: unknown): value is HTMLElement {
  return typeof HTMLElement !== "undefined" && value instanceof HTMLElement;
}

export class Dialog {
  /** The dialog of a content element ($(el).data("gdialog")). */
  static of(content: Element): Dialog | null {
    return dialogs.get(content) || null;
  }

  /** The content elements of the open dialogs, oldest first. */
  static openContents(): readonly HTMLElement[] {
    return stack;
  }

  /** Whether any element matches a selector (GSystemDialog.isDialogOpen). */
  static isDialogOpen(selector: string): boolean {
    return document.querySelectorAll(selector).length > 0;
  }

  /**
   * A dialog around a new `<div>` whose children React renders from
   * `content`; `contentClassName` are classes the div has before
   * `g-dialog-content`.
   */
  static create(content: ReactNode, options: DialogOptions = {}, contentClassName = ""): Dialog {
    const element = document.createElement("div");
    if (contentClassName) element.className = contentClassName;
    const dialog = new Dialog(element, options);
    dialog.renderContent(content);
    return dialog;
  }

  readonly options: ResolvedOptions;
  /** Set by open(): whether Escape and the backdrop may close it. */
  closable = false;
  private readonly _content: HTMLElement;
  private readonly _dialog: HTMLElement;
  private _container: HTMLElement | null = null;
  private _islands: Island[] = [];
  private _contentIsland: Island | null = null;
  private readonly _openListeners = new Listeners<[]>();

  /** `$(content).gDialog(options)`. */
  constructor(content: HTMLElement, options: DialogOptions = {}) {
    const resolved: ResolvedOptions = {
      releaseOnClose: true,
      className: "",
      buttons: null,
      footerStart: null,
      openCallback: null,
      closeCallback: null,
      nowrap: false,
      closeTimeout: null,
      alwaysCloseable: false,
    };
    for (const key of Object.keys(options) as (keyof DialogOptions)[]) {
      const value = options[key];
      if (value !== undefined) (resolved as unknown as Record<string, unknown>)[key] = value;
    }
    this.options = resolved;
    this._content = content;
    dialogs.set(content, this);
    let dialog: HTMLElement;
    if (resolved.nowrap) {
      dialog = content;
    } else {
      content.classList.add("g-dialog-content");
      dialog = document.createElement("div");
      dialog.classList.add("g-dialog");
      addClasses(dialog, resolved.className || "");
      if (content.parentNode) content.parentNode.insertBefore(dialog, content);
      dialog.appendChild(content);
    }
    this._dialog = dialog;
    const buttons = resolved.buttons;
    if (buttons && buttons.length) {
      const footer = document.createElement("div");
      footer.className = "g-dialog-footer";
      dialog.appendChild(footer);
      if (buttons.every(isElement) && !resolved.footerStart) {
        const box = document.createElement("div");
        box.className = "buttons";
        footer.appendChild(box);
        for (const button of buttons) box.appendChild(button as HTMLElement);
      } else {
        // One root for the footer: the label the old code prepended,
        // then .buttons with the buttons.
        this._islands.push(
          renderInto(
            footer,
            createElement(
              Fragment,
              null,
              resolved.footerStart,
              createElement(
                "div",
                { className: "buttons" },
                ...buttons.map((button, index) =>
                  createElement(Fragment, { key: index }, button as ReactNode),
                ),
              ),
            ),
          ),
        );
      }
    }
  }

  /** The content element (`.g-dialog-content`). */
  getContent(): HTMLElement {
    return this._content;
  }

  /** The `.g-dialog` element. */
  getElement(): HTMLElement {
    return this._dialog;
  }

  /** The `.g-dialog-container` while open, else null. */
  getContainer(): HTMLElement | null {
    return this._container;
  }

  /** Renders (again) the React content of the content element. */
  renderContent(content: ReactNode): void {
    if (this._contentIsland) this._contentIsland.render(content);
    else {
      this._contentIsland = renderInto(this._content, content);
      this._islands.push(this._contentIsland);
    }
  }

  /** `.on("open", ...)`. */
  onOpen(listener: () => void): void {
    this._openListeners.add(listener);
  }

  /** Shows the dialog on top of the others. */
  open(closable?: boolean): this {
    const options = this.options;
    this.closable = closable || false;
    const dialog = this._dialog.closest(".g-dialog") || this._dialog;
    const container = document.createElement("div");
    container.className = "g-dialog-container";
    container.addEventListener("mousedown", (event) => {
      const target = event.target as Element;
      if (target.classList.contains("g-dialog-container") && !target.querySelector(".g-overlay"))
        closeTop();
    });
    container.appendChild(dialog);
    document.body.appendChild(container);
    if (options.className) addClasses(container, options.className + "-container");
    this._container = container;
    stack.push(this._content);
    this._openListeners.fire();
    container.classList.add("visible");
    if (options.openCallback) options.openCallback.call(this);
    return this;
  }

  /** Whether it is the top dialog. */
  isOpen(): boolean {
    return stack.length > 0 && stack[stack.length - 1] === this._content;
  }

  /**
   * Closes the dialog if it is on top (or anywhere, with alwaysCloseable).
   * `cancelled` goes to the closeCallback; `timeout` replaces the delay
   * before the container is removed.
   */
  close(cancelled?: boolean, timeout?: number): this {
    const options = this.options;
    if (
      (options.alwaysCloseable && stack.indexOf(this._content) >= 0) ||
      (stack.length && stack[stack.length - 1] === this._content)
    ) {
      const container = this._container;
      if (container) container.classList.remove("visible");
      const delay = parseInt(
        String(
          isNaN(timeout as number)
            ? isNaN(options.closeTimeout as number)
              ? 250
              : options.closeTimeout
            : timeout,
        ),
      );
      setTimeout(() => {
        const dialog = this._dialog.closest(".g-dialog") || this._dialog;
        dialog.remove();
        if (options.releaseOnClose) this._release();
        if (container) container.remove();
        if (this._container === container) this._container = null;
      }, delay);
      if (options.alwaysCloseable) stack.splice(stack.indexOf(this._content), 1);
      else stack.pop();
      if (options.closeCallback) options.closeCallback(cancelled);
    }
    return this;
  }

  private _release(): void {
    for (const island of this._islands) island.unmount();
    this._islands = [];
    this._contentIsland = null;
  }
}

function addClasses(element: Element, names: string): void {
  for (const name of names.split(/\s+/)) if (name) element.classList.add(name);
}
