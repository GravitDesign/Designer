/**
 * The color UI the paint and effect panels use, from the app-color-ui
 * cluster: the paint field (old $.fn.gPatternChooser, module 1150), the
 * input slider (old $.fn.gInputSlider, module 857) and the shared pattern
 * chooser popup (old window.gPatternChooser).
 *
 * The panels reach them through this file, in the old plugin call shape.
 * Events follow the old jQuery triggers: a CustomEvent on the element
 * whose `detail` is the array of extra arguments jQuery passed
 * (`patternchange` [pattern, opacity, temporary, fromChooser, stopIndex],
 * `chooserclose` [preventClose, closeEvent], `chooseropen` []), and native
 * "input"/"change" events for the slider.
 */
import {
  patternChooser as currentPatternChooser,
  PatternChooserWidget,
  type PatternChooserWidgetOptions,
} from "../color/color-chooser.ts";
import {
  InputSlider,
  OPACITY_DEFAULT as SLIDER_OPACITY_DEFAULT,
  type InputSliderOptions as SliderOptions,
} from "../color/opacity-slider.ts";

export type InputSliderOptions = SliderOptions;
export type InputSliderHandle = InputSlider;
export type PatternChooserOptions = PatternChooserWidgetOptions;
export type PatternChooserHandle = PatternChooserWidget;

/** GInputSlider.prototype.OPACITY_DEFAULT (module 857). */
export const OPACITY_DEFAULT: Readonly<InputSliderOptions> = SLIDER_OPACITY_DEFAULT;

/** `$(el).gInputSlider(options)`; returns the element. */
export function inputSlider<T extends HTMLElement>(element: T, options: InputSliderOptions): T {
  new InputSlider(element, options);
  return element;
}

/** The slider attached to `element`, or null. */
export function sliderOf(element: Element | null | undefined): InputSlider | null {
  return element ? InputSlider.of(element) : null;
}

/** `$(el).gInputSlider("value")`. */
export function sliderValue(element: Element | null | undefined): number | string {
  const slider = sliderOf(element);
  return slider ? slider.value() : NaN;
}

/** `$(el).gInputSlider("value", v)`. */
export function setSliderValue(element: Element | null | undefined, value: unknown): void {
  const slider = sliderOf(element);
  if (slider) slider.value(value);
}

/** `$(el).gPatternChooser(options)`; returns the element. */
export function patternChooser<T extends HTMLElement>(
  element: T,
  options: PatternChooserOptions,
): T {
  new PatternChooserWidget(element, options);
  return element;
}

/** The paint field set up on `element`, or null. */
export function chooserOf(element: Element | null | undefined): PatternChooserWidget | null {
  return element ? PatternChooserWidget.of(element) : null;
}

/**
 * `$(preview).trigger("click", stopIndex)`: opens the chooser of the field
 * whose preview this is, at a gradient stop (null: none).
 */
export function clickPreview(preview: Element, stopIndex: number | null): void {
  const field = preview.parentElement ? PatternChooserWidget.of(preview.parentElement) : null;
  if (field && field.preview === preview) field.open(stopIndex);
}

/** The shared popup (window.gPatternChooser). */
export interface PatternChooserPopup {
  getPattern(): unknown;
  isOpenned(element?: HTMLElement | null): boolean;
}

export function patternChooserPopup(): PatternChooserPopup | null {
  return currentPatternChooser();
}

/** The extra arguments of a jQuery-style triggered event (empty for a native one). */
export function eventArgs(event: Event): unknown[] {
  return event instanceof CustomEvent && Array.isArray(event.detail)
    ? (event.detail as unknown[])
    : [];
}
