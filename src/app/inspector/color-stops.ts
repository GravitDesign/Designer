// Old: designer.browser.dev.js module 1263 (the color stops and $.fn.gColorSlider).
/**
 * Color sliders: an input slider (color-deps.ts) whose background is a
 * gradient through the colors of its range, used by the hue, saturation,
 * brightness and contrast rows of the effect forms. `DefaultStops` gives
 * the color at a slider position.
 */
import { Color } from "../../engine/color/color.ts";
import { inputSlider, setSliderValue, sliderOf, sliderValue } from "./color-deps.ts";
import type { InputSliderOptions } from "./color-deps.ts";

/** The color at position `n` (0, 20, 40, ... from the slider's start). */
export type ColorStop = (n: number) => number[];

export const ColorStops = {
  DefaultStops: {
    Hue: (n: number): number[] => Color.hsvToRGB([n, 1, 1]),
    Saturation:
      (hue: number): ColorStop =>
      (n: number): number[] =>
        Color.hsvToRGB([hue, n / 100, 1]),
    Luminosity: (n: number): number[] => Color.hsvToRGB([0, 0, n / 100]),
  },
};

export interface ColorSliderOptions extends Partial<InputSliderOptions> {
  min?: number;
  max?: number;
  stops?: ColorStop;
}

/** `$(el).gColorSlider(options)`: a slider with a gradient of `stops` from min to max. */
export function initColorSlider<T extends HTMLElement>(element: T, options: ColorSliderOptions): T {
  const resolved = resolveColorSlider(options);
  const sliderOptions = {
    ...resolved,
    background: colorSliderBackground(resolved),
  } as unknown as InputSliderOptions;
  return inputSlider(element, sliderOptions);
}

type ResolvedColorSlider = ColorSliderOptions & { min: number; max: number; stops: ColorStop };

function resolveColorSlider(options: ColorSliderOptions): ResolvedColorSlider {
  return {
    min: 0,
    max: 360,
    stops: ColorStops.DefaultStops.Hue,
    ...stripUndefined(options),
  } as ResolvedColorSlider;
}

/** The slider's background: a stop every 20 units, called with 0, 20, 40, ... */
export function colorSliderBackground(options: ColorSliderOptions): string {
  const resolved = resolveColorSlider(options);
  let stops = "";
  let n = 0;
  const span = Math.abs(resolved.min) + Math.abs(resolved.max);
  for (let a = resolved.min; a <= resolved.max; a += 20) {
    const rgb = resolved.stops.call(null, n);
    n += 20;
    if (stops) stops += ",";
    stops += Color.rgbToHtmlHex(rgb) + " " + (n / span) * 100 + "%";
  }
  return "linear-gradient(90deg," + stops + ")";
}

function stripUndefined(options: ColorSliderOptions): ColorSliderOptions {
  const out: ColorSliderOptions = {};
  for (const key of Object.keys(options) as (keyof ColorSliderOptions)[])
    if (options[key] !== undefined) (out as Record<string, unknown>)[key] = options[key];
  return out;
}

/** `gColorSlider("value")` and `gColorSlider("value", v)`. */
export function colorSliderValue(element: Element, ...value: unknown[]): unknown {
  if (value.length) {
    setSliderValue(element, value[0]);
    return element;
  }
  return sliderValue(element);
}

/** `gColorSlider("minValue")`. */
export function colorSliderMin(element: Element): number {
  const slider = sliderOf(element);
  return slider ? slider.minValue() : NaN;
}

/** `gColorSlider("maxValue")`. */
export function colorSliderMax(element: Element): number {
  const slider = sliderOf(element);
  return slider ? slider.maxValue() : NaN;
}
