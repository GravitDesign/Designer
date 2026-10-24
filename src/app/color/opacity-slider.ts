// Old: designer.browser.dev.js module 857 ($.fn.gInputSlider and its OPACITY_DEFAULT).
/**
 * The horizontal slider of the inspector and the color chooser:
 *
 *     div.g-input-slider.(generic|custom)[.cssClass][value][min][max]
 *       div.g-input-slider-track.(generic|custom)
 *         div.g-input-slider-thumb.(generic|custom)
 *         div.g-input-slider-background   (generic sliders: the filled part)
 *
 * The value lives in the element's "value" attribute, as before. Dragging
 * fires a bubbling DOM "input" event on every move and "change" on mouse
 * up (the old plugin triggered the jQuery events of the same names):
 *
 *     const slider = new InputSlider(element, { min: 0, max: 100 });
 *     element.addEventListener("input", () => use(Number(slider.value())));
 *     slider.value(40);
 *     slider.disabled(true);
 *
 * `custom` sliders (and those with a `background`) have no filled part;
 * a `background` is written as the element's inline background.
 */
import { formatNumber } from "../../engine/core/util.ts";
import { css, width } from "../shell/dom.ts";
import { offset } from "../widgets/dom-helpers.ts";
import { attachRichTooltip } from "../widgets/rich-tooltip.ts";
import type { RichTooltipConfig } from "../widgets/rich-tooltip-config.ts";

export interface InputSliderOptions {
  min: number;
  max: number;
  /** The look without the filled part (`custom` class). */
  custom?: boolean;
  /** An extra class of the slider element. */
  cssClass?: string;
  /** The slider's inline background (a gradient for the color sliders). */
  background?: string;
  /** Sets maxDecimal from its decimals when maxDecimal isn't given. */
  step?: number;
  /** The decimals value() rounds to; 0 when not set. */
  maxDecimal?: number;
  /** A rich tooltip on the thumb. */
  richTooltipConfig?: RichTooltipConfig;
  /** Passed by some old callers ("range"); never read. */
  type?: string;
}

interface ResolvedSliderOptions extends InputSliderOptions {
  generic: boolean;
}

const sliders = new WeakMap<Element, InputSlider>();

/** The options of the opacity sliders (the old prototype member OPACITY_DEFAULT). */
export const OPACITY_DEFAULT: Readonly<InputSliderOptions> = {
  min: 0,
  max: 100,
  custom: true,
  cssClass: "opacity",
};

/** Decimals of a number as the old plugin counted them for `step`. */
function decimalsOf(step: number): number {
  return Math.floor(step) === step ? 0 : (step.toString().split(".")[1] as string).length || 0;
}

function fire(element: HTMLElement, type: "input" | "change"): void {
  element.dispatchEvent(new Event(type, { bubbles: true }));
}

/**
 * `$(el).gInputSlider(options)`: makes `element` a slider. The old plugin
 * also accepted a second element to set up instead; nobody passed one.
 */
export class InputSlider {
  /** The slider set up on an element ($(el).data("options") being there). */
  static of(element: Element): InputSlider | null {
    return sliders.get(element) || null;
  }

  readonly element: HTMLElement;
  readonly options: ResolvedSliderOptions;
  private readonly _track: HTMLElement;
  private readonly _thumb: HTMLElement;

  constructor(element: HTMLElement, options: InputSliderOptions) {
    this.element = element;
    const resolved: ResolvedSliderOptions = {
      ...options,
      generic: !options.background && !options.custom,
    };
    const min = resolved.min;
    const max = resolved.max;
    if (!resolved.maxDecimal && resolved.step) resolved.maxDecimal = decimalsOf(resolved.step);
    this.options = resolved;
    sliders.set(element, this);
    let initial = 50;
    if (initial < min) initial = min;
    else if (initial > max) initial = max;
    // Half the thumb width: where a click puts the thumb's centre.
    const thumbOffset = resolved.generic ? 10 : 8;
    const look = resolved.generic ? "generic" : "custom";
    element.classList.add("g-input-slider");
    element.classList.add(look);
    if (resolved.cssClass) element.classList.add(resolved.cssClass);
    element.setAttribute("value", String(initial));
    element.setAttribute("min", String(min));
    element.setAttribute("max", String(max));
    // Old: .css("background", e.background), a getter (no change) when undefined.
    if (!resolved.generic && resolved.background !== undefined)
      css(element, "background", resolved.background);
    const track = document.createElement("div");
    track.classList.add("g-input-slider-track", look);
    const thumb = document.createElement("div");
    thumb.classList.add("g-input-slider-thumb", look);
    if (resolved.richTooltipConfig) attachRichTooltip(thumb, resolved.richTooltipConfig);
    track.appendChild(thumb);
    this._track = track;
    this._thumb = thumb;

    let dragging = false;
    const moveTo = (event: MouseEvent) => {
      if ("disabled" !== element.getAttribute("disabled")) {
        const x = event.clientX - offset(element).left - thumbOffset / 2;
        this._setFromPosition(x, true);
      }
    };
    // Both the track and the slider take the press, so a press on the
    // track moves the thumb twice (two "input" events), as before. See "A
    // press on the slider track moves the thumb twice" in QUESTIONS.md.
    const press = (event: MouseEvent) => {
      if (0 === event.button) {
        dragging = true;
        thumb.classList.add("active");
        if (event.isTrusted) moveTo(event);
      }
    };
    track.addEventListener("mousedown", press);
    element.addEventListener("mousedown", press);
    let thumbPressed = false;
    thumb.addEventListener("mousedown", () => {
      thumbPressed = true;
    });
    let touchMoved = false;
    element.addEventListener("touchstart", () => {
      touchMoved = false;
    });
    element.addEventListener("touchmove", () => {
      touchMoved = true;
    });
    // Window listeners per slider that are never removed, as before.
    window.addEventListener("mousemove", (event) => {
      if (dragging && (event.isTrusted || thumbPressed)) {
        moveTo(event);
        event.preventDefault();
      }
    });
    window.addEventListener("mouseup", (event) => {
      thumbPressed = false;
      if (dragging) {
        if (!(touchMoved || !event.cancelable)) moveTo(event);
        dragging = false;
        if ("disabled" !== element.getAttribute("disabled")) {
          css(thumb, "left", this._percent(element.getAttribute("value")) + "%");
          fire(element, "change");
        }
        thumb.classList.remove("active");
      }
    });
    element.appendChild(track);
  }

  /** The value's place between min and max, in percent. */
  private _percent(value: unknown): number {
    const min = this.options.min;
    return (((value as number) - min) / (this.options.max - min)) * 100;
  }

  /**
   * Takes the value from a thumb position `x` (pixels from the track's
   * left; 0 or none reads the thumb's current place), fires "input".
   */
  private _setFromPosition(x: number | null, moveThumb: boolean): void {
    const min = this.options.min;
    const max = this.options.max;
    const trackWidth = width(this._track);
    if (!x) x = offset(this._thumb).left - offset(this._track).left;
    let percent = (100 * x) / trackWidth;
    if (percent < 0) percent = 0;
    else if (percent > 100) percent = 100;
    if (moveThumb) css(this._thumb, "left", percent + "%");
    let value = (percent * (max - min)) / 100 + min;
    if (value > max) value = max;
    else if (value < min) value = min;
    this.element.setAttribute("value", String(value));
    this._updateBackground(this._percent(value));
    fire(this.element, "input");
  }

  /** Generic sliders: redraws the filled part up to `percent`. */
  private _updateBackground(percent: number): void {
    if (!this.options.generic) return;
    for (const old of this._track.querySelectorAll(".g-input-slider-background")) old.remove();
    const background = document.createElement("div");
    background.classList.add("g-input-slider-background");
    css(background, "width", percent + "%");
    this._track.appendChild(background);
  }

  /**
   * `gInputSlider("value")`: the value rounded to maxDecimal, as a string
   * (the old plugin returned formatNumber's string; parseFloat when the
   * attribute isn't numeric, which gives NaN).
   */
  value(): string | number;
  /** `gInputSlider("value", v)`: rounds, clamps and shows `v`. */
  value(value: unknown): this;
  value(...args: unknown[]): string | number | this {
    const min = this.options.min;
    const max = this.options.max;
    const decimals = this.options.maxDecimal ? this.options.maxDecimal : 0;
    const attribute = this.element.getAttribute("value");
    // Old: `void 0 === e` made value(undefined) a getter too.
    if (args.length === 0 || args[0] === undefined) {
      return isNaN(attribute as unknown as number)
        ? parseFloat(attribute as string)
        : formatNumber(attribute as unknown as number, decimals);
    }
    let value = args[0] as string | number;
    if (!isNaN(value as number)) value = formatNumber(value as number, decimals);
    // Old: compared formatNumber's string with the numbers (JS converts it).
    if ((value as number) > max) value = max;
    else if ((value as number) < min) value = min;
    const percent = this._percent(value);
    css(this._thumb, "left", percent + "%");
    this._updateBackground(percent);
    this.element.setAttribute("value", String(value));
    return this;
  }

  minValue(): number {
    return this.options.min;
  }

  maxValue(): number {
    return this.options.max;
  }

  /** `gInputSlider("disabled")`: "disabled" or null. */
  disabled(): string | null;
  /** `gInputSlider("disabled", state)`: jQuery attr: true sets disabled="disabled", false removes it. */
  disabled(state: boolean | string | null): this;
  disabled(...args: (boolean | string | null)[]): string | null | this {
    if (!args.length) return this.element.getAttribute("disabled");
    const state = args[0];
    if (state === false || state === null) this.element.removeAttribute("disabled");
    else this.element.setAttribute("disabled", state === true ? "disabled" : String(state));
    return this;
  }
}
