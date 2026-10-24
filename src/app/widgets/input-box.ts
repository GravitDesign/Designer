// Old: designer.browser.dev.js module 1702 ($.fn.gInputBox).
/**
 * The number box behaviour of the inspector fields: value normalising
 * (equations, min/max, the unit postfix), arrow-key and wheel steps, and
 * scrubbing (press and drag up or down). It is attached to an `<input>`;
 * `<InputBoxView>` (input-box-view.tsx) renders one and attaches it.
 *
 * Changes are reported with a native, bubbling "change" event where the
 * old plugin called jQuery's .change(): after a step, on every scrub move,
 * and when the user commits a typed value (blur or Enter). Listeners added
 * after the box was attached run after its own change listener, which
 * normalises the typed text first, as before.
 *
 * The unit and the decimals come from the active document's scene, as the
 * old plugin read them from gDesigner; pass `scene` to use another.
 */
import { Platform } from "../../engine/core/platform.ts";
import { formatNumber, parseNumber } from "../../engine/core/util.ts";
import { Length } from "../../engine/math/length.ts";
import { DocumentTouchTarget } from "../../editor/touch/document-touch-target.ts";
import { designerOrNull } from "../shell/globals.ts";
import { hasFocus, scrollParent } from "./dom-helpers.ts";

/** What the box reads from a scene: its unit ("ut") and its decimals. */
export interface InputBoxScene {
  getProperty(name: string): unknown;
  getOptimalDecimalsCount(unit?: string | null): number;
}

export interface InputBoxOptions {
  /** Select the text on the first click after focusing. */
  selectOnFocus?: boolean;
  /** Enter blurs the box, which commits the value. */
  triggerChangeOnEnter?: boolean;
  keyIncrement?: boolean;
  wheelIncrement?: boolean;
  /** Scrubbing with the mouse. */
  mousemoveIncrement?: boolean;
  incrementValue?: number;
  /** With Shift. */
  fastIncrementValue?: number;
  /** With Alt (not for "%" boxes). */
  slowIncrementValue?: number;
  /** Never read: the old plugin looked for it in the wrong place (see QUESTIONS.md). */
  fixedIncrement?: boolean;
  minValue?: number | null;
  maxValue?: number | null;
  /** Shown after the number unless it is the scene's unit. */
  postfix?: string | null;
  allowEmptyValue?: boolean;
  /** Shows `newValue` instead when the value is `oldValue`. */
  replace?: { oldValue: string | null; newValue: string } | null;
  /** Attach without listeners (the unit box re-attaching to its own input). */
  created?: boolean;
  /** Where unit and decimals come from; default the active document's scene. */
  scene?: (() => InputBoxScene | null) | null;
  /** Whether scrubbing is on; default the "scrubbing_flag" setting. */
  scrubbingEnabled?: (() => boolean) | null;
  /** Whether this is a touch device; default the designer's answer. */
  touchDevice?: (() => boolean) | null;
  /** Other options a wrapping widget keeps here (the unit box's unit and list). */
  [extra: string]: unknown;
}

/** The options with the old defaults filled in. */
export interface ResolvedInputBoxOptions extends InputBoxOptions {
  selectOnFocus: boolean;
  triggerChangeOnEnter: boolean;
  keyIncrement: boolean;
  wheelIncrement: boolean;
  mousemoveIncrement: boolean;
  incrementValue: number;
  fastIncrementValue: number;
  slowIncrementValue: number;
  fixedIncrement: boolean;
  minValue: number | null;
  maxValue: number | null;
  postfix: string | null;
}

/** The scrub cursor and the hover border of the old plugin. */
export const SCRUB_CURSOR = "url(assets/cursor/cursor-scrub.svg) 16 16, auto";
export const HOVER_BORDER = "1px solid rgba(215, 46, 99, 0.3)";

const boxes = new WeakMap<Element, InputBox>();

/** The scene of the active document, if there is a designer with one. */
export function activeScene(): InputBoxScene | null {
  const designer = designerOrNull();
  const document = designer ? designer.getActiveDocument() : null;
  return document ? (document.getScene() as unknown as InputBoxScene | null) : null;
}

/** GScrubbingSetting.isEnabled (settings-keys.ts): the "scrubbing_flag" setting, on by default. */
export function scrubbingEnabled(): boolean {
  const designer = designerOrNull();
  return designer ? !!designer.getSetting("scrubbing_flag", true) : true;
}

function touchDevice(): boolean {
  const designer = designerOrNull();
  return designer ? designer.isTouchDevice() : false;
}

export function resolveInputBoxOptions(options: InputBoxOptions = {}): ResolvedInputBoxOptions {
  const resolved: ResolvedInputBoxOptions = {
    selectOnFocus: true,
    triggerChangeOnEnter: true,
    keyIncrement: true,
    wheelIncrement: true,
    mousemoveIncrement: true,
    incrementValue: 1,
    fastIncrementValue: 10,
    slowIncrementValue: 0.1,
    fixedIncrement: false,
    minValue: null,
    maxValue: null,
    postfix: null,
  };
  // $.extend: undefined doesn't replace a default.
  for (const key of Object.keys(options)) {
    const value = options[key];
    if (value !== undefined) resolved[key] = value;
  }
  return resolved;
}

/**
 * The value logic of the box, without the element: what the old plugin's
 * value(), increment() and mousemoveIncrement() computed.
 */
export class InputBoxValue {
  constructor(
    public options: ResolvedInputBoxOptions,
    private readonly _scene: () => InputBoxScene | null,
  ) {}

  /** The postfix shown after numbers (none when it is the scene's unit). */
  postfix(): string | null {
    const scene = this._scene();
    const unit = scene ? scene.getProperty("ut") : null;
    return this.options && this.options.postfix !== unit ? this.options.postfix : null;
  }

  /** The text without its postfix. */
  stripPostfix(text: string): string {
    const postfix = this.postfix();
    if (text && text.length && postfix) {
      const index = text.lastIndexOf(postfix);
      if (index >= 0) text = text.substr(0, index);
    }
    return text;
  }

  /** The text clamped to minValue/maxValue (only when one of them is set). */
  clamp(text: string): string {
    text = this.stripPostfix(text);
    const empty = "" === text;
    const value = empty ? null : Length.parseEquationValue(text);
    const min = this.options ? this.options.minValue : null;
    const max = this.options ? this.options.maxValue : null;
    if ("number" == typeof min || "number" == typeof max) {
      if (
        ("number" == typeof value && isFinite(value)) ||
        (empty && this.options.allowEmptyValue)
      ) {
        if ("number" == typeof min && null !== value && value < min) text = min.toString();
        else if ("number" == typeof max && null !== value && value > max) text = max.toString();
      } else {
        text = "number" == typeof min ? min.toString() : (max as number).toString();
      }
    }
    return text;
  }

  /** The text to show for a value set from outside (value(v)). */
  display(value: unknown): string {
    let text = value as string;
    if (value || 0 === value) text = String(value).replace(",", ".");
    text = this.clamp(text);
    if (!this.options.allowEmptyValue && !text) text = "0";
    const replace = this.options.replace;
    if (replace && null !== replace.oldValue && text === replace.oldValue) return replace.newValue;
    const postfix = this.postfix();
    if (text && text.length && postfix && text.substr(text.length - postfix.length) !== postfix)
      text += postfix;
    return text;
  }

  /** The value of the text in the box, as value() returned it. */
  read(raw: string): string {
    let text = this.stripPostfix(raw);
    const empty = "" === text;
    const value = empty ? null : Length.parseEquationValue(text);
    text = this.clamp(text);
    if (!(this.options.allowEmptyValue || (text && null !== value && isFinite(value)))) text = "0";
    return text;
  }

  /** The step size and the decimals for a step from `base`, or null. */
  private _step(size: number): { size: number; decimals: number } {
    let decimals = 2;
    const scene = this._scene();
    let unit: unknown;
    if (scene) {
      unit = scene.getProperty("ut");
      decimals = scene.getOptimalDecimalsCount();
    }
    // The old code read fixedIncrement from the box's data instead of its
    // options, so it never applied (see "fixedIncrement is never read" in
    // QUESTIONS.md).
    const fixedIncrement = undefined;
    if (!(
      (unit !== Length.Unit.IN && unit !== Length.Unit.CM) ||
      (this.options.postfix !== unit && null !== this.options.postfix) ||
      fixedIncrement
    ))
      size *= 0.1;
    // Also for zero and negative scrub moves (see "Scrubbing without
    // decimals always steps up" in QUESTIONS.md).
    if (size < 1 && 0 == decimals) size = 1;
    return { size, decimals };
  }

  /** The text after an arrow or wheel step from `raw`, or null when it isn't a number. */
  increment(raw: string, fast: boolean, slow: boolean, down: boolean): string | null {
    let value = parseFloat(parseNumber(this.read(raw)) as unknown as string);
    if ("number" != typeof value || isNaN(value)) return null;
    const options = this.options;
    const { size, decimals } = this._step(
      fast
        ? options.fastIncrementValue
        : slow && "%" !== options.postfix
          ? options.slowIncrementValue
          : options.incrementValue,
    );
    if (down) value -= size;
    else value += size;
    return formatNumber(value, decimals);
  }

  /**
   * One scrub move: the new value and its text from `base` moved by
   * `delta` pixels, or null when `base` isn't a number.
   */
  scrub(
    base: number | undefined,
    fast: boolean,
    slow: boolean,
    delta: number,
  ): { value: number; text: string } | null {
    if ("number" != typeof base || isNaN(base)) return null;
    const options = this.options;
    const { size, decimals } = this._step(
      fast
        ? options.fastIncrementValue * delta
        : slow && "%" !== options.postfix
          ? delta * options.slowIncrementValue
          : delta,
    );
    const value = base + size;
    return { value, text: formatNumber(value, decimals) };
  }
}

function fireChange(input: HTMLInputElement): void {
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

export class InputBox {
  /** The box attached to an input (`$(el).data("ginputbox")`), or null. */
  static of(input: Element): InputBox | null {
    return boxes.get(input) || null;
  }

  /** `gInputBox("isInit")`. */
  static isInit(input: Element): boolean {
    return boxes.has(input);
  }

  readonly input: HTMLInputElement;
  readonly logic: InputBoxValue;
  receivingFocus = false;
  enterKeyValue: string | undefined = undefined;
  insideClicked = false;
  leftMouseMoved = false;
  strValue: string | undefined = undefined;
  private readonly _removers: (() => void)[] = [];
  private _clickListeners: (() => void)[] = [];
  private _changeListeners: (() => void)[] = [];

  /** `$(input).gInputBox(options)`. */
  constructor(input: HTMLInputElement, options: InputBoxOptions = {}) {
    const resolved = resolveInputBoxOptions(options);
    this.input = input;
    this.logic = new InputBoxValue(resolved, () =>
      resolved.scene ? resolved.scene() : activeScene(),
    );
    boxes.set(input, this);
    input.draggable = false;
    if (!resolved.created) this._listen();
  }

  get options(): ResolvedInputBoxOptions {
    return this.logic.options;
  }

  /** `gInputBox("value")`: the normalised value. */
  value(): string;
  /** `gInputBox("value", v)`: shows `v` (normalised, with postfix). */
  value(value: unknown): this;
  value(...args: unknown[]): string | this {
    if (args.length) {
      const text = this.logic.display(args[0]);
      this.input.value = text;
      return this;
    }
    return this.logic.read(this.input.value);
  }

  /** An arrow or wheel step; fires change. */
  increment(fast: boolean, slow: boolean, down: boolean): void {
    const text = this.logic.increment(this.input.value, fast, slow, down);
    if (text === null) return;
    this.value(text);
    fireChange(this.input);
  }

  /** One scrub move from `base` by `delta` pixels; fires change, returns the new base. */
  mousemoveIncrement(
    fast: boolean,
    slow: boolean,
    base: number | undefined,
    delta: number,
  ): number | undefined {
    const result = this.logic.scrub(base, fast, slow, delta);
    if (!result) return undefined;
    this.value(result.text);
    fireChange(this.input);
    return result.value;
  }

  onFocusIn(): void {
    this.receivingFocus = true;
    this.input.style.border = HOVER_BORDER;
  }

  onFocusOut(): void {
    this.insideClicked = false;
    this.leftMouseMoved = false;
    this.input.style.border = "";
  }

  /** Selects the text on the first click after focusing. */
  requestFocus(): void {
    if (this.receivingFocus) {
      if (this.options.selectOnFocus) this.input.select();
      this.receivingFocus = false;
    }
  }

  onMouseEnter(): void {
    if (!this.insideClicked && this.options.mousemoveIncrement) {
      this.input.style.cursor = SCRUB_CURSOR;
      this.input.style.border = HOVER_BORDER;
    }
  }

  onMouseLeave(): void {
    if (this.leftMouseMoved || this.insideClicked || !this.options.mousemoveIncrement) return;
    this.input.style.cursor = "";
    this.input.style.border = "";
  }

  /** Starts scrubbing: html listens for moves until the button goes up. */
  leftMouseDown(): void {
    const input = this.input;
    this.strValue = input.value;
    if (this.insideClicked || !this.options.mousemoveIncrement) return;
    input.style.border = HOVER_BORDER;
    this.leftMouseMoved = false;
    let base: number | undefined = parseFloat(parseNumber(this.value()) as unknown as string);
    if ("" === this.strValue && isNaN(base)) base = 0;
    let lastY: number | null = null;
    const scroller = scrollParent(input);
    const isTouch = this.options.touchDevice ? this.options.touchDevice() : touchDevice();
    if (scroller instanceof HTMLElement && isTouch) scroller.style.overflowY = "hidden";
    const html = document.documentElement;
    const move = (event: MouseEvent | TouchEvent) => {
      if (event.cancelable) event.preventDefault();
      let delta = 0;
      const touches = (event as TouchEvent).changedTouches;
      const touch = touches ? touches[0] : undefined;
      const y = (event as MouseEvent).pageY || (touches && touch && touch.pageY);
      if (null === lastY) {
        html.style.cursor = SCRUB_CURSOR;
        html.style.userSelect = "none";
        document.body.style.pointerEvents = "none";
        this.leftMouseMoved = true;
        lastY = y as number;
      } else {
        delta = lastY - (y as number);
        lastY = y as number;
      }
      base = this.mousemoveIncrement(
        Platform.modifiers.shiftKey || event.shiftKey,
        Platform.modifiers.optionKey || event.altKey,
        base,
        delta,
      );
    };
    const up = () => {
      document.body.style.pointerEvents = "";
      html.style.cursor = "";
      html.style.userSelect = "";
      html.removeEventListener("mousemove", move);
      html.removeEventListener("mouseup", up);
      input.removeEventListener("touchmove", move);
      const touch = this.options.touchDevice ? this.options.touchDevice() : touchDevice();
      if (!touch && this.leftMouseMoved) input.blur();
      if (touch) {
        if (scroller instanceof HTMLElement) scroller.style.overflowY = "auto";
        if (!hasFocus(input)) input.style.border = "";
      }
    };
    input.addEventListener("touchmove", move);
    html.addEventListener("mousemove", move);
    html.addEventListener("mouseup", up);
  }

  leftMouseUp(): void {
    if (!this.options.mousemoveIncrement) return;
    if (!this.leftMouseMoved) {
      this.insideClicked = true;
      this.input.style.cursor = "";
    }
    const touch = this.options.touchDevice ? this.options.touchDevice() : touchDevice();
    if (touch && this.leftMouseMoved && this.strValue === this.input.value) {
      this.input.focus();
    }
  }

  /** Removes the listeners (the old plugin never did; React unmounts need it). */
  detach(): void {
    for (const remove of this._removers.splice(0)) remove();
    boxes.delete(this.input);
  }

  /** `$(input).unbind("click")` for the box's own click listener (the unit box list replaces it). */
  unbindClick(): void {
    for (const remove of this._clickListeners.splice(0)) remove();
  }

  /** `$(input).off("change")` for the box's own change listener (it normalises the text). */
  unbindChange(): void {
    for (const remove of this._changeListeners.splice(0)) remove();
  }

  private _scrubbing(): boolean {
    return this.options.scrubbingEnabled ? this.options.scrubbingEnabled() : scrubbingEnabled();
  }

  private _on<K extends keyof HTMLElementEventMap>(
    type: K,
    listener: (event: HTMLElementEventMap[K]) => void,
  ): void {
    this.input.addEventListener(type, listener);
    this._removers.push(() => this.input.removeEventListener(type, listener));
  }

  private _listen(): void {
    const input = this.input;
    const change = () => {
      this.value(input.value);
    };
    this._on("change", change);
    this._changeListeners.push(() => input.removeEventListener("change", change));
    this._on("focusin", () => this.onFocusIn());
    this._on("focusout", () => this.onFocusOut());
    const click = () => this.requestFocus();
    this._on("click", click);
    this._clickListeners.push(() => input.removeEventListener("click", click));
    this._on("wheel", (event) => {
      if (this.options.wheelIncrement && hasFocus(input)) {
        event.preventDefault();
        const delta = 0 != event.deltaX ? event.deltaX : event.deltaY;
        this.increment(
          Platform.modifiers.shiftKey || event.shiftKey,
          Platform.modifiers.optionKey || event.altKey,
          delta > 0,
        );
      }
    });
    this._on("keydown", (event) => {
      if ((38 == event.keyCode || 40 === event.keyCode) && this.options.keyIncrement) {
        event.preventDefault();
        this.increment(
          Platform.modifiers.shiftKey || event.shiftKey,
          Platform.modifiers.optionKey || event.altKey,
          40 === event.keyCode,
        );
        // jQuery's trigger("focus") only focused an element that wasn't.
        if (!hasFocus(input)) input.focus();
      }
      if (13 === event.keyCode && this.options.triggerChangeOnEnter) input.blur();
    });
    this._on("mouseenter", (event) => {
      if (this._scrubbing()) {
        event.preventDefault();
        this.onMouseEnter();
      }
    });
    this._on("mouseleave", () => {
      if (this._scrubbing()) this.onMouseLeave();
    });
    this._on("mousedown", (event) => {
      if (this._scrubbing() && 1 === event.which) {
        this.leftMouseDown();
        for (let p = input.parentElement; p; p = p.parentElement)
          if (p.classList.contains("properties-panel")) p.classList.add("noscroll");
      }
    });
    this._on("mouseup", (event) => {
      if (this._scrubbing() && 1 === event.which) {
        this.leftMouseUp();
        for (let p = input.parentElement; p; p = p.parentElement)
          if (p.classList.contains("properties-panel")) p.classList.remove("noscroll");
      }
    });
  }
}

// The touch handler asked jQuery for an element's "ginputbox" data; the
// editor can't import the app, so the app tells it what an input box is.
DocumentTouchTarget.isInputBox = (element) =>
  element instanceof Element && InputBox.isInit(element);
