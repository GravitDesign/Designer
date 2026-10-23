// Old: designer.browser.dev.js module 1695 ($.fn.gAutoEdit).
/**
 * In-place renaming (layer and page names): a double click puts a text
 * field (or a textarea) over the element, with its text selected. Enter
 * or blur submits a changed, non-empty value, Escape cancels, Tab submits
 * and moves the layer focus to the next or previous layer and renames it.
 *
 * The field is appended to body, absolutely placed over the element, as
 * the old plugin did; it is plain DOM because nothing renders into it.
 */
import { Key } from "../../engine/core/key.ts";
import { designerOrNull } from "../shell/globals.ts";
import { offset } from "./dom-helpers.ts";
import { outerHeight, outerWidth } from "../shell/dom.ts";

/** GRenameLayerAction.ID (actions/modify/rename-layer-action.ts, module 1340). */
const RENAME_LAYER_ACTION = "edit.rename-layer";
/** GCycleThroughLayersAction (actions/modify/cycle-through-layers-action.ts, module 1344). */
const CYCLE_LAYERS_ACTION = "view.cycle-through-layers";
const CYCLE_NEXT = "next";
const CYCLE_PREVIOUS = "previous";
const CYCLE_MODE_FOCUS = "focus";

export interface AutoEditOptions {
  /** Unused by the plugin itself; kept for callers that pass it. */
  selector?: string | null;
  /** Called with the new value instead of a "submitvalue" event. */
  submitCallback?: ((this: HTMLElement, value: string) => void) | null;
  /** Don't open on double click (open() is called by code). */
  noDblClickEdit?: boolean;
  /** The part whose box the field covers (a selector in the element). */
  containerSelector?: string;
  getContainer?: () => HTMLElement;
  /** The part whose text is edited. */
  textSelector?: string;
  textarea?: boolean;
  textareaResizable?: boolean;
  /** Extra inline styles of the field. */
  style?: Record<string, string>;
}

/**
 * The "submitvalue" event the element gets without a submitCallback;
 * `detail` is the value.
 */
export const SUBMIT_VALUE_EVENT = "submitvalue";

const editors = new WeakMap<Element, AutoEdit>();

export class AutoEdit {
  static of(element: Element): AutoEdit | null {
    return editors.get(element) || null;
  }

  readonly element: HTMLElement;
  readonly options: AutoEditOptions;
  input: HTMLInputElement | HTMLTextAreaElement | null = null;
  value: string | null = null;

  /** `$(element).gAutoEdit(options)`. */
  constructor(element: HTMLElement, options: AutoEditOptions = {}) {
    this.options = { selector: null, submitCallback: null, noDblClickEdit: false, ...options };
    this.element = element;
    editors.set(element, this);
    if (!this.options.noDblClickEdit) element.addEventListener("dblclick", () => this.open());
  }

  /** Puts the field over the element and selects its text. */
  open(): void {
    const options = this.options;
    const element = this.element;
    if (this.input) this.close();
    const box: HTMLElement = options.containerSelector
      ? ((element.querySelector(options.containerSelector) as HTMLElement | null) ?? element)
      : options.getContainer && "function" == typeof options.getContainer
        ? options.getContainer()
        : element;
    const textElement = options.textSelector ? element.querySelector(options.textSelector) : box;
    const text = textElement ? textElement.textContent || "" : "";
    const position = offset(box);
    this.value = text;
    let input: HTMLInputElement | HTMLTextAreaElement;
    if (options.textarea) {
      input = document.createElement("textarea");
      if (!options.textareaResizable) input.style.resize = "none";
    } else {
      input = document.createElement("input");
      input.setAttribute("type", "text");
    }
    if (options.style && "object" == typeof options.style)
      for (const name of Object.keys(options.style))
        input.style.setProperty(
          name.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase()),
          options.style[name] as string,
        );
    const designer = designerOrNull();
    if (designer && designer.isTouchEnabled()) {
      const outside = (event: MouseEvent) => {
        if (!(event.target instanceof Element && event.target.classList.contains("g-auto-edit"))) {
          document.removeEventListener("click", outside, true);
          this.submit();
        }
      };
      document.addEventListener("click", outside, true);
    }
    input.style.position = "absolute";
    input.style.left = position.left + "px";
    input.style.top = position.top + "px";
    input.style.width = outerWidth(box) + "px";
    input.style.height = outerHeight(box) + "px";
    input.classList.add("g-auto-edit");
    input.value = this.value;
    input.addEventListener("blur", () => this.submit());
    input.addEventListener("keydown", (event) => {
      if (Key.translateCode((event as KeyboardEvent).code) === Key.Constant.TAB) {
        this.submit();
        const type = (event as KeyboardEvent).shiftKey ? CYCLE_PREVIOUS : CYCLE_NEXT;
        const current = designerOrNull();
        if (current) {
          current.executeAction(CYCLE_LAYERS_ACTION + "." + type, [CYCLE_MODE_FOCUS]);
          current.executeAction(RENAME_LAYER_ACTION);
        }
        event.preventDefault();
        event.stopPropagation();
      }
    });
    input.addEventListener("keyup", (event) => {
      switch (Key.translateKey((event as KeyboardEvent).keyCode)) {
        case Key.Constant.ENTER:
          this.submit();
          break;
        case Key.Constant.ESC:
          this.close();
      }
    });
    document.body.appendChild(input);
    input.focus();
    input.select();
    this.input = input;
  }

  /** Closes the field and reports a changed, non-empty value. */
  submit(): void {
    const value = this.input ? this.input.value : null;
    // close() forgets the original text first, so unchanged names are
    // submitted too (see "Renaming submits unchanged names" in QUESTIONS.md).
    this.close();
    if (value && this.value !== value) {
      if (this.options.submitCallback) this.options.submitCallback.call(this.element, value);
      else
        this.element.dispatchEvent(
          new CustomEvent(SUBMIT_VALUE_EVENT, { bubbles: true, detail: value }),
        );
    }
  }

  close(): void {
    if (this.input) {
      const input = this.input;
      this.input = null;
      this.value = null;
      input.remove();
    }
  }
}
