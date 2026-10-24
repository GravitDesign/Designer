// Old: designer.browser.dev.js module 1703 ($.fn.gInputSelect).
/**
 * A number box with a dropdown of presets: `.g-input-select` holding an
 * InputBox `<input>` and a `<button>` that opens a menu of the list. A
 * change of the input is passed on as a change event of the container
 * (which also receives the input's own change by bubbling, so container
 * listeners hear each change twice, as before; see "Input select change
 * fires twice on its container" in QUESTIONS.md). Picking a preset writes
 * it into the input and fires its change.
 */
import { lateExport } from "../shell/late.ts";
import { InputBox, type InputBoxOptions } from "./input-box.ts";
import { Position } from "../shell/alignment-position.ts";

/** A preset: a value shown as itself, or a title with the value to write. */
export type InputSelectItem = string | number | { title: string; data: unknown };

export interface InputSelectOptions extends InputBoxOptions {
  list?: readonly InputSelectItem[];
}

/** GMenu as the select uses it (menus/menu.ts, app-menus-toolbar). */
interface MenuLike {
  createAddItem(title: string): { setData(data: unknown): unknown; getData?(): unknown };
  open(
    target: Element,
    position: number,
    orientation: number,
    callback: (item: { getData(): unknown }) => void,
  ): void;
}

const RIGHT_BOTTOM = Position.Right_Bottom;

const selects = new WeakMap<Element, InputSelect>();

/** The items as { title, data }, as the old init mapped them. */
export function inputSelectItems(
  list: readonly InputSelectItem[],
): { title: string; data: unknown }[] {
  return list.map((item) =>
    "object" != typeof item ? { title: item as unknown as string, data: item } : item,
  );
}

export class InputSelect {
  static of(element: Element): InputSelect | null {
    return selects.get(element) || null;
  }

  readonly element: HTMLElement;
  readonly input: HTMLInputElement;
  readonly button: HTMLButtonElement;
  readonly box: InputBox;
  private _menu: MenuLike | null = null;
  private readonly _forward: () => void;

  /**
   * `$(element).gInputSelect(options)`: appends the input and the button.
   * A component that rendered them passes them in instead.
   */
  constructor(
    element: HTMLElement,
    options: InputSelectOptions = {},
    rendered?: { input: HTMLInputElement; button: HTMLButtonElement },
  ) {
    const list = options.list || [];
    const resolved: InputSelectOptions = { ...options, list };
    this.element = element;
    selects.set(element, this);
    const Menu = lateExport<new () => MenuLike>("menus/menu.ts", "Menu");
    if (Menu) {
      const menu = new Menu();
      for (const { title, data } of inputSelectItems(list)) menu.createAddItem(title).setData(data);
      this._menu = menu;
    }
    if (!rendered) element.classList.add("g-input-select");
    const input = rendered ? rendered.input : document.createElement("input");
    if (!rendered) input.setAttribute("type", "text");
    this.box = new InputBox(input, resolved);
    this._forward = () => {
      element.dispatchEvent(new Event("change", { bubbles: true }));
    };
    input.addEventListener("change", this._forward);
    if (!rendered) element.appendChild(input);
    const button = rendered ? rendered.button : document.createElement("button");
    if (!rendered) button.style.display = list.length ? "" : "none";
    button.addEventListener("click", (event) => this._openMenu(event));
    if (!rendered) element.appendChild(button);
    this.input = input;
    this.button = button;
  }

  /** `gInputSelect("value")`: the input's value. */
  value(): string;
  /** `gInputSelect("value", v)`. */
  value(value: unknown): this;
  value(...args: unknown[]): string | this {
    if (args.length > 0) {
      this.box.value(args[0]);
      return this;
    }
    return this.box.value();
  }

  /** `.find("input").off("change")`: the box's and the forwarding listener. */
  unbindInputChange(): void {
    this.box.unbindChange();
    this.input.removeEventListener("change", this._forward);
  }

  private _openMenu(event: MouseEvent): void {
    const target = event.target as Element;
    if (!this._menu) return;
    this._menu.open(target, RIGHT_BOTTOM, RIGHT_BOTTOM, (item) => {
      const select = target.closest(".g-input-select");
      const input = select ? select.querySelector("input") : null;
      if (!input) return;
      input.value = item.getData() as string;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }
}
