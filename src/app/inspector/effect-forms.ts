// Old: designer.browser.dev.js module 1262 (GEffectProperties), the
// settings forms and the effect table (the module's locals P, D, L, I, k,
// O, F, R, M, N, B, U and H).
/**
 * The settings form of each effect in the effects panel. Most effects
 * (the WebGL ones) get the generic form built from the effect's `shp`
 * parameters and its class's RANGES (`webGLForm`); the shadows, the
 * canvas blur, overlay, mirror, color grading and the multi effect have
 * their own forms. `effectTable()` is the old list of effects with their
 * category, icon and form, in the order the add panel lists them.
 *
 * A form gets the effect, the `assign` function of its row (which writes
 * through a transaction to every equal effect of the selection, or
 * temporarily while a slider moves) and, for the parts of a multi effect,
 * the part to read from.
 */
import type { Pattern } from "../../engine/style/pattern.ts";
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import type { ClassId } from "../../engine/core/locale/locale-runtime.ts";
import { getTypeId } from "../../engine/core/object.ts";
import { formatNumber, formatOpacity } from "../../engine/core/util.ts";
import { Color } from "../../engine/color/color.ts";
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { Length } from "../../engine/math/length.ts";
import { GMath } from "../../engine/math/math.ts";
import { Node } from "../../engine/scene/node.ts";
import type { Effect } from "../../engine/style/effect.ts";
import { AdjustMultiEffect } from "../../engine/style/effects/adjust-multi-effect.ts";
import { BlurEffect } from "../../engine/style/effects/blur-effect.ts";
import { ColorAdjustMultiEffect } from "../../engine/style/effects/color-adjust-multi-effect.ts";
import { ColorGradingEffect } from "../../engine/style/effects/color-grading-effect.ts";
import { ContactShadowEffect } from "../../engine/style/effects/contact-shadow-effect.ts";
import { CurvedShadowEffect } from "../../engine/style/effects/curved-shadow-effect.ts";
import { DropShadowEffect } from "../../engine/style/effects/drop-shadow-effect.ts";
import { InnerShadowEffect } from "../../engine/style/effects/inner-shadow-effect.ts";
import { LongShadowEffect } from "../../engine/style/effects/long-shadow-effect.ts";
import { MirrorEffect } from "../../engine/style/effects/mirror-effect.ts";
import type { MultiEffect } from "../../engine/style/effects/multi-effect.ts";
import { OverlayEffect } from "../../engine/style/effects/overlay-effect.ts";
import { Gradient } from "../../engine/style/gradient.ts";
import { LinearGradient } from "../../engine/style/linear-gradient.ts";
import { GLBendBlurEffect } from "../../engine/style/webgl/effects/gl-bend-blur-effect.ts";
import { GLBendEffect } from "../../engine/style/webgl/effects/gl-bend-effect.ts";
import { GLBloomEffect } from "../../engine/style/webgl/effects/gl-bloom-effect.ts";
import { GLBlurEffect } from "../../engine/style/webgl/effects/gl-blur-effect.ts";
import { GLBrightnessContrastEffect } from "../../engine/style/webgl/effects/gl-brightness-contrast-effect.ts";
import { GLBulgePinchEffect } from "../../engine/style/webgl/effects/gl-bulge-pinch-effect.ts";
import { GLColorAdjustEffect } from "../../engine/style/webgl/effects/gl-color-adjust-effect.ts";
import { GLColorHalfToneEffect } from "../../engine/style/webgl/effects/gl-color-half-tone-effect.ts";
import { GLDenoiseEffect } from "../../engine/style/webgl/effects/gl-denoise-effect.ts";
import { GLDotScreenEffect } from "../../engine/style/webgl/effects/gl-dot-screen-effect.ts";
import { GLDrunkEffect } from "../../engine/style/webgl/effects/gl-drunk-effect.ts";
import { GLEdgeWorkEffect } from "../../engine/style/webgl/effects/gl-edge-work-effect.ts";
import { GLFisheyeEffect } from "../../engine/style/webgl/effects/gl-fisheye-effect.ts";
import { GLHexagonalEffect } from "../../engine/style/webgl/effects/gl-hexagonal-effect.ts";
import { GLHueSaturationEffect } from "../../engine/style/webgl/effects/gl-hue-saturation-effect.ts";
import { GLInkEffect } from "../../engine/style/webgl/effects/gl-ink-effect.ts";
import { GLInnerGlowEffect } from "../../engine/style/webgl/effects/gl-inner-glow-effect.ts";
import { GLLensBlurEffect } from "../../engine/style/webgl/effects/gl-lens-blur-effect.ts";
import { GLNoiseEffect } from "../../engine/style/webgl/effects/gl-noise-effect.ts";
import { GLOuterGlowEffect } from "../../engine/style/webgl/effects/gl-outer-glow-effect.ts";
import { GLRecolourEffect } from "../../engine/style/webgl/effects/gl-recolour-effect.ts";
import { GLSepiaEffect } from "../../engine/style/webgl/effects/gl-sepia-effect.ts";
import { GLSketchEffect } from "../../engine/style/webgl/effects/gl-sketch-effect.ts";
import { GLStrokeLayerEffect } from "../../engine/style/webgl/effects/gl-stroke-layer-effect.ts";
import { GLSwirlEffect } from "../../engine/style/webgl/effects/gl-swirl-effect.ts";
import { GLTiltShiftEffect } from "../../engine/style/webgl/effects/gl-tilt-shift-effect.ts";
import { GLToonEffect } from "../../engine/style/webgl/effects/gl-toon-effect.ts";
import { GLTrueBlurEffect } from "../../engine/style/webgl/effects/gl-true-blur-effect.ts";
import { GLUnsharpMaskEffect } from "../../engine/style/webgl/effects/gl-unsharp-mask-effect.ts";
import { GLVibranceEffect } from "../../engine/style/webgl/effects/gl-vibrance-effect.ts";
import { GLVignetteEffect } from "../../engine/style/webgl/effects/gl-vignette-effect.ts";
import { GLZoomBlurEffect } from "../../engine/style/webgl/effects/gl-zoom-blur-effect.ts";
import type { WebGLEffect } from "../../engine/style/webgl/webgl-effect.ts";
import type { Document } from "../document/document.ts";
import { designer } from "../shell/globals.ts";
import { readACVFile } from "../util/download.ts";
import { InputBox, type InputBoxOptions } from "../widgets/input-box.ts";
import { UnitBox, type UnitBoxOptions } from "../widgets/unit-box.ts";
import { ColorStops, initColorSlider } from "./color-stops.ts";
import {
  chooserOf,
  eventArgs,
  inputSlider,
  patternChooser,
  sliderOf,
  type InputSliderOptions,
} from "./color-deps.ts";
import { append, attrs, el, propertyRow, setValue, triggerChange } from "./paint-dom.ts";

/**
 * Writes properties of the effect (and the equal effects of the other
 * selected elements): `temporary` while dragging a slider, `related` is
 * the undo data that reopens the color chooser on undo.
 */
export type EffectAssign = (
  names: string[],
  values: unknown[],
  temporary?: boolean,
  related?: Record<string, unknown> | null,
) => void;

/** What the forms use of the panel (the old `this` of the form functions). */
export interface EffectFormHost {
  _document: Document | null;
  _chooserElem: HTMLElement | null;
  _styleEdOn: boolean;
}

export type CreateSettings = (
  host: EffectFormHost,
  effect: Effect,
  assign: EffectAssign,
  part?: Effect,
) => HTMLElement;

/** An effect class as the table and the panel use it. */
export type EffectClass = (new () => Effect) & { RANGES?: Record<string, unknown> };

/** An entry of the effect table (old H()). */
export interface EffectEntry {
  clazz: EffectClass;
  i18n: string;
  group: string;
  category?: string;
  createSettings: CreateSettings;
  icon?: string;
  mostUsed?: boolean;
  hidden?: boolean;
  /** Set by the add panel: adds the effect. */
  cb?: (clazz: EffectClass, entry: EffectEntry) => void;
}

/** The localized category names (old module locals v, _, b, w, C, x, S). */
export interface EffectCategories {
  mostUsed: string;
  blur: string;
  artistic: string;
  adjust: string;
  distortion: string;
  other: string;
  shadow: string;
}

const text = (className: string, key: string): string =>
  Locale.get(new LocaleKey(className, key)) as string;

function get(effect: Effect, part?: Effect): (name: string) => unknown {
  const source = part || effect;
  return (name) => source.getProperty(name);
}

// ---------------------------------------------------------------------------
// The jQuery widget calls of the forms.

function inputBox<T extends HTMLInputElement>(input: T, options?: InputBoxOptions): T {
  new InputBox(input, options);
  return input;
}

function unitBox<T extends HTMLInputElement>(input: T, options?: UnitBoxOptions): T {
  new UnitBox(input, options);
  return input;
}

/** `gInputBox("value")`. */
export function boxValue(input: Element | null | undefined): string {
  const box = input ? InputBox.of(input) : null;
  return box ? box.value() : "";
}

/** `gInputBox("value", v)` on every element. */
export function setBoxValue(inputs: Iterable<Element>, value: unknown): void {
  for (const input of inputs) {
    const box = InputBox.of(input);
    if (box) box.value(value);
  }
}

/** `gUnitBox("value")`. */
function unitValue(input: Element): Length {
  return (UnitBox.of(input) as UnitBox).value();
}

/** `gUnitBox("value", length)` on every element. */
export function setUnitValue(inputs: Iterable<Element>, value: Length | null): void {
  for (const input of inputs) {
    const box = UnitBox.of(input);
    if (box) box.value(value);
  }
}

/** Makes `input` a text box (the old `<input type="text">`). */
function textInput(input: HTMLInputElement): HTMLInputElement {
  input.setAttribute("type", "text");
  return input;
}

function input(property?: string): HTMLInputElement {
  const element = el("input");
  if (property !== undefined) element.setAttribute("data-property", property);
  return element;
}

/** `$(el).closest(".effect-settings").find(selector)`. */
function inSettings(from: Element, selector: string): HTMLElement[] {
  const settings = from.closest(".effect-settings");
  return settings ? Array.from(settings.querySelectorAll<HTMLElement>(selector)) : [];
}

/** `.val(value)` and, with `change`, `.trigger("change")` on each element. */
function valAll(elements: HTMLElement[], value: unknown, change: boolean): void {
  for (const element of elements) setValue(element as HTMLInputElement, value);
  if (change) for (const element of elements) triggerChange(element);
}

/** A slider (gInputSlider) on a new div. */
function slider(options: InputSliderOptions): HTMLDivElement {
  return inputSlider(el("div"), options);
}

function sliderValueOf(element: Element | null | undefined): string | number {
  const handle = sliderOf(element);
  return handle ? (handle.value() as string | number) : NaN;
}

function setSlider(elements: Iterable<Element>, value: unknown): void {
  for (const element of elements) {
    const handle = sliderOf(element);
    if (handle) handle.value(value as Pattern | null);
  }
}

/**
 * Hides the selection while the mouse is down on `element` (the sliders),
 * with the editor read when the form was made.
 */
function hideSelectionWith(element: HTMLElement, host: EffectFormHost): void {
  const editor = (host._document as Document).getEditor();
  element.addEventListener("mousedown", () => {
    if (!editor) return;
    editor.hideSelection();
    document.addEventListener("mouseup", () => editor.resetHideSelection(), { once: true });
  });
}

function switchBox(checkbox: HTMLInputElement): HTMLLabelElement {
  return append(el("label", "g-switch"), checkbox, el("div"));
}

function checkbox(checked: unknown): HTMLInputElement {
  const box = el("input");
  box.setAttribute("type", "checkbox");
  box.checked = !!checked;
  return box;
}

/** A pattern chooser whose open/close hide the selection and remember it as the open chooser. */
function chooser(host: EffectFormHost, types: unknown[], property?: string): HTMLDivElement {
  const element = el("div");
  if (property) element.setAttribute("data-property", property);
  patternChooser(element, { types });
  element.addEventListener("chooseropen", () => {
    const editor = (host._document as Document).getEditor();
    if (editor) editor.hideSelection();
    host._chooserElem = element;
  });
  element.addEventListener("chooserclose", () => {
    if (host._document) {
      const editor = host._document.getEditor();
      if (editor) editor.resetHideSelection();
    }
    host._chooserElem = null;
  });
  return element;
}

function chooserSet(element: HTMLElement, value: unknown, opacity: unknown): void {
  const handle = chooserOf(element);
  if (!handle) return;
  handle.value(value as Pattern | null);
  handle.opacity(opacity as number);
}

/** The opacity box of the shadow forms; writes `opc` and the chooser's opacity. */
function opacityInput(
  assign: EffectAssign,
  opacity: unknown,
  increment: boolean,
): HTMLInputElement {
  const element = textInput(input("opc"));
  element.addEventListener("change", (event) => {
    const value = (Length.parseEquationValue(boxValue(event.target as Element)) as number) / 100;
    assign(["opc"], [value]);
    for (const target of inSettings(event.target as Element, '[data-property="pat"]')) {
      const handle = chooserOf(target);
      if (handle) handle.opacity(value);
    }
  });
  inputBox(
    element,
    increment
      ? {
          minValue: 0,
          maxValue: 100,
          incrementValue: designer().getOpacityIncrement(),
          postfix: "%",
        }
      : { minValue: 0, maxValue: 100, postfix: "%" },
  );
  setBoxValue([element], formatOpacity(100 * (opacity as number)));
  return element;
}

/**
 * The patternchange handler of the shadow forms: writes `pat` and `opc`,
 * shows the opacity in the box and, from the chooser, remembers it for
 * undo (with the active gradient stop when `withStop`).
 */
function onShadowPattern(
  element: HTMLElement,
  assign: EffectAssign,
  showOpacity: boolean,
  withStop: boolean,
): void {
  element.addEventListener("patternchange", (event) => {
    const [pattern, opacity, temporary, fromChooser, stop] = eventArgs(event);
    const names: string[] = [];
    const values: unknown[] = [];
    if (undefined !== pattern) {
      names.push("pat");
      values.push(pattern);
    }
    if ("number" == typeof opacity) {
      names.push("opc");
      values.push(opacity);
      if (showOpacity)
        setBoxValue(
          inSettings(event.target as Element, '[data-property="opc"]'),
          formatOpacity(100 * opacity),
        );
    }
    let related: Record<string, unknown> | null = null;
    if (fromChooser) {
      related = { chooserOn: true };
      if (withStop && null != stop) related.activeStopIdx = stop;
    }
    assign(names, values, temporary as boolean, related);
  });
}

// ---------------------------------------------------------------------------
// The forms.

/** A copy of `shp` with one value changed (the old JSON round trip). */
function withParameter(
  parameters: unknown,
  change: (copy: Record<string, unknown>) => void,
): Record<string, unknown> {
  const copy = JSON.parse(JSON.stringify(parameters)) as Record<string, unknown>;
  change(copy);
  return copy;
}

/** Old P: the generic form of the WebGL effects, one row per `shp` parameter. */
export const webGLForm: CreateSettings = (host, effect, assign, part) => {
  const source = (part || effect) as WebGLEffect;
  const read = get(effect, part);
  const editor = (host._document as Document).getEditor();
  const parameters = read("shp") as Record<string, unknown>;
  const ranges = (Node.getClassFromId(getTypeId(source) as number) as unknown as EffectClass)
    .RANGES;
  if (!ranges) throw new ReferenceError("fxRanges is not defined");
  const form = el("div");
  // The old `var h`: one variable for the whole loop, so the handlers of
  // the color rows read the range of the last row that set it. Every
  // effect's color rows share one range, so it doesn't show.
  let range: unknown = undefined;
  const lastRange = (): [number, number] => range as [number, number];
  for (const name in parameters) {
    const value = parameters[name];
    const label = text("GWebGLEffect", name);
    if (-1 !== ["contrast", "brightness", "hue", "saturation"].indexOf(name)) {
      range = ranges[name];
      const created = lastRange();
      let shown: number | string = 100 * (value as number);
      if (!isNaN(shown)) shown = formatNumber(shown, 0);
      let min = 100 * created[0];
      let max = 100 * created[1];
      let stops: (value: number) => number[] = ColorStops.DefaultStops.Hue;
      if ("hue" === name) {
        if (source instanceof GLRecolourEffect) {
          min = 0;
          max = 360;
        } else {
          min = -180;
          max = 180;
        }
        stops = ColorStops.DefaultStops.Hue;
        shown = GMath.normalizeValue(value as number, created[0], created[1], min, max);
      } else if (-1 !== ["contrast", "brightness"].indexOf(name)) {
        stops = ColorStops.DefaultStops.Luminosity;
      } else if ("saturation" === name) {
        stops = ColorStops.DefaultStops.Saturation(0);
        if (source instanceof GLRecolourEffect) {
          const hue = GMath.normalizeValue(
            parameters.hue as number,
            created[0],
            created[1],
            0,
            360,
          );
          stops = ColorStops.DefaultStops.Saturation(hue);
        }
      }
      // A new hue of the recolour effect recolours its saturation slider.
      const hueChanged = (hue: unknown, property: string, from: Element) => {
        if ("hue" === property && source instanceof GLRecolourEffect) {
          for (const saturation of inSettings(
            from,
            '.g-input-slider[data-property="saturation"]',
          )) {
            const previous = sliderValueOf(saturation);
            saturation.replaceChildren();
            initColorSlider(saturation, {
              min: 100 * lastRange()[0],
              max: 100 * lastRange()[1],
              stops: ColorStops.DefaultStops.Saturation(hue as number),
            });
            setSlider([saturation], previous);
            saturation.dispatchEvent(new Event("input", { bubbles: true }));
          }
        }
      };
      const colorSlider = el("div");
      colorSlider.setAttribute("data-property", name);
      initColorSlider(colorSlider, { min, max, stops, maxDecimal: 0 });
      setSlider([colorSlider], shown);
      colorSlider.addEventListener("input", (event) => {
        const target = event.target as HTMLElement;
        const property = target.getAttribute("data-property") as string;
        const raw = sliderValueOf(target);
        const handle = sliderOf(target);
        const sliderMin = handle ? handle.minValue() : NaN;
        const sliderMax = handle ? handle.maxValue() : NaN;
        const normalized = GMath.normalizeValue(
          raw as number,
          sliderMin,
          sliderMax,
          lastRange()[0],
          lastRange()[1],
        );
        hueChanged(raw, property, target);
        const current = read("shp") as Record<string, unknown>;
        if (current[property] !== normalized)
          assign(["shp"], [withParameter(current, (copy) => (copy[property] = normalized))]);
        valAll(
          inSettings(target, "[data-property=" + property + "]:not(.g-input-slider)"),
          raw,
          true,
        );
      });
      const box = textInput(input(name));
      setValue(box, shown);
      box.addEventListener("change", (event) => {
        const target = event.target as HTMLInputElement;
        const property = target.getAttribute("data-property") as string;
        let next = Number(
          source.propertyInverseTransform(property, parseFloat(boxValue(target))).toFixed(3),
        );
        const current = read("shp") as Record<string, unknown>;
        const sliders = inSettings(target, ".g-input-slider[data-property=" + property + "]");
        if (sliderValueOf(sliders[0]) != next) setSlider(sliders, next);
        hueChanged(next, property, target);
        const handle = sliderOf(sliders[0]);
        const sliderMin = handle ? handle.minValue() : NaN;
        const sliderMax = handle ? handle.maxValue() : NaN;
        next = GMath.normalizeValue(next, sliderMin, sliderMax, lastRange()[0], lastRange()[1]);
        if (current && current[property] !== next)
          assign(["shp"], [withParameter(current, (copy) => (copy[property] = next))]);
      });
      inputBox(box, {
        minValue: min,
        maxValue: max,
        postfix: "hue" === name ? "°" : "%",
        incrementValue: 1,
      });
      form.appendChild(
        propertyRow(el("div"), {
          label,
          columns: [
            { width: "75%", content: colorSlider },
            { width: "40px", content: box },
          ],
        }),
      );
    } else if ("number" == typeof value) {
      const length = new Length(value, Length.Unit.PT);
      range = ranges[name];
      const bounds = lastRange();
      const numberSlider = slider({
        min: bounds[0],
        max: bounds[1],
        step: 0.002 * Math.abs(bounds[1] - bounds[0]),
      });
      numberSlider.setAttribute("data-property", name);
      numberSlider.addEventListener("mousedown", () => {
        if (!editor) return;
        editor.hideSelection();
        document.addEventListener("mouseup", () => editor.resetHideSelection(), { once: true });
      });
      setSlider([numberSlider], Number(source.propertyInverseTransform(name, value).toFixed(3)));
      numberSlider.addEventListener("input", (event) => {
        const target = event.target as HTMLElement;
        const property = target.getAttribute("data-property") as string;
        const parsed = Length.parseEquation(String(sliderValueOf(numberSlider)));
        let next = 0;
        if (parsed) next = parsed.toPoint();
        next = Number(source.propertyTransform(property, next).toFixed(3));
        const current = read("shp") as Record<string, unknown>;
        if (null !== next && "number" == typeof next && current[property] !== next)
          assign(["shp"], [withParameter(current, (copy) => (copy[property] = next))], true);
        valAll(
          inSettings(target, "[data-property=" + property + "]:not(.g-input-slider)"),
          next,
          true,
        );
      });
      numberSlider.addEventListener("change", (event) => {
        const target = event.target as HTMLElement;
        const property = target.getAttribute("data-property") as string;
        const parsed = Length.parseEquation(String(sliderValueOf(numberSlider)));
        let next = 0;
        if (parsed) next = parsed.toPoint();
        next = Number(source.propertyTransform(property, next).toFixed(3));
        valAll(
          inSettings(target, "[data-property=" + property + "]:not(.g-input-slider)"),
          next,
          true,
        );
      });
      const box = input(name);
      // Before the unit box attaches, so it runs before the box's own handler.
      box.addEventListener("change", (event) => {
        const target = event.target as HTMLInputElement;
        const property = target.getAttribute("data-property") as string;
        const typed = unitValue(target);
        let points = 0;
        if (typed) points = typed.toPoint();
        const inverse = Number(source.propertyInverseTransform(property, points).toFixed(3));
        const current = read("shp") as Record<string, unknown>;
        const sliders = inSettings(target, "[data-property=" + property + "].g-input-slider");
        if (sliderValueOf(sliders[0]) != inverse) setSlider(sliders, inverse);
        if (null !== points && "number" == typeof points && current[property] !== points)
          assign(["shp"], [withParameter(current, (copy) => (copy[property] = points))]);
      });
      unitBox(box, {
        minValue: bounds[0],
        maxValue: bounds[1],
        incrementValue: 0.002 * Math.abs(bounds[1] - bounds[0]),
        source: "effects",
      });
      setUnitValue([box], length);
      form.appendChild(
        propertyRow(el("div"), {
          label,
          columns: [
            { width: "75%", content: numberSlider },
            { width: "40px", content: box },
          ],
        }),
      );
    } else if (value instanceof Array && 3 === value.length) {
      let opacity: unknown = undefined;
      const types: unknown[] = [Color];
      const opacityParameter = parameters.opacity as { type?: string; value?: unknown } | undefined;
      if (
        opacityParameter &&
        "object" == typeof opacityParameter &&
        "opacity" === opacityParameter.type
      ) {
        opacity = opacityParameter.value;
      }
      const colorChooser = chooser(host, types);
      chooserSet(colorChooser, new RGBColor(value as number[]), opacity);
      colorChooser.addEventListener("patternchange", (event) => {
        const [pattern, newOpacity, temporary, fromChooser] = eventArgs(event);
        const current = read("shp") as Record<string, unknown>;
        const copy = JSON.parse(JSON.stringify(current)) as Record<string, unknown>;
        if (undefined !== pattern) copy.color = (pattern as { getValue(): unknown }).getValue();
        const currentOpacity = current.opacity as { type?: string } | undefined;
        if (
          "number" == typeof newOpacity &&
          currentOpacity &&
          "object" == typeof currentOpacity &&
          "opacity" === currentOpacity.type
        )
          (copy.opacity as { value: unknown }).value = newOpacity;
        let related: Record<string, unknown> | null = null;
        if (fromChooser) related = { chooserOn: true };
        assign(["shp"], [copy], temporary as boolean, related);
      });
      form.appendChild(
        propertyRow(el("div"), { label, columns: [{ width: "50px", content: colorChooser }] }),
      );
    } else if (
      value &&
      "object" == typeof value &&
      "dropdown" === (value as { type?: string }).type
    ) {
      range = ranges[name];
      const options = range as unknown[];
      const select = el("select");
      select.setAttribute("data-property", name);
      select.addEventListener("change", (event) => {
        const target = event.target as HTMLSelectElement;
        const property = target.getAttribute("data-property") as string;
        const picked = target.value;
        const current = read("shp") as Record<string, { value: unknown }> | null;
        if (current && (!current[property] || current[property].value !== picked)) {
          const copy = JSON.parse(JSON.stringify(current)) as Record<string, { value: unknown }>;
          (copy[property] as { value: unknown }).value = picked;
          assign(["shp"], [copy]);
        }
      });
      for (let n = 0; n < options.length; n++) {
        const option = el("option");
        option.setAttribute("value", String(n));
        const caption = options[n];
        option.textContent = String(caption instanceof LocaleKey ? Locale.get(caption) : caption);
        select.appendChild(option);
      }
      setValue(select, (value as { value: unknown }).value);
      form.appendChild(
        propertyRow(el("div"), { label, columns: [{ width: "100%", content: select }] }),
      );
    } else if ("boolean" == typeof value) {
      const box = checkbox(value);
      box.setAttribute("data-property", name);
      box.addEventListener("change", (event) => {
        const target = event.target as HTMLInputElement;
        const property = target.getAttribute("data-property") as string;
        const checked = box.checked;
        const current = read("shp") as Record<string, unknown>;
        if (current[property] !== checked)
          assign(["shp"], [withParameter(current, (copy) => (copy[property] = checked))]);
      });
      // The old code set type after data-property; the order doesn't show.
      attrs(box, { type: "checkbox" });
      form.appendChild(
        propertyRow(el("div"), {
          label,
          columns: [{ width: "20px", content: switchBox(box) }],
        }),
      );
    }
  }
  return form;
};

/** Old D: drop and inner shadow (x, y, blur, opacity, color). */
export const shadowForm: CreateSettings = (host, effect, assign, part) => {
  const read = get(effect, part);
  const x = read("x") as number;
  const y = read("y") as number;
  const radius = new Length(read("r") as number, Length.Unit.PT);
  const pattern = read("pat");
  const opacity = read("opc");
  let range: unknown[] = [0, 200];
  // The instance has no RANGES (the class has); kept, see "Shadow blur
  // ranges are never read" in QUESTIONS.md.
  const ranges = (effect as unknown as { RANGES?: { r?: unknown[] } }).RANGES;
  if (ranges && ranges.r) range = ranges.r;
  const lengthBox = (property: string, value: Length, options: UnitBoxOptions) => {
    const box = textInput(input(property));
    unitBox(box, options);
    setUnitValue([box], value);
    return box;
  };
  const xBox = lengthBox("x", new Length(x, Length.Unit.PT), { source: "effects" });
  xBox.addEventListener("change", () => {
    const typed = unitValue(xBox);
    const points = typed ? typed.toUnit(Length.Unit.PT) : null;
    if (null !== points && "number" == typeof points) assign(["x"], [points]);
  });
  const yBox = lengthBox("y", new Length(y, Length.Unit.PT), { source: "effects" });
  yBox.addEventListener("change", () => {
    const typed = unitValue(yBox);
    const points = typed ? typed.toUnit(Length.Unit.PT) : null;
    if (null !== points && "number" == typeof points) assign(["y"], [points]);
  });
  const blurBox = lengthBox("r", radius, {
    minValue: range[0] as number,
    maxValue: range[1] as number,
    source: "effects",
  });
  blurBox.addEventListener("change", () => {
    const typed = unitValue(blurBox);
    const points = typed ? typed.toUnit(Length.Unit.PT) : null;
    if (null !== points) assign(["r"], [points]);
  });
  const color = chooser(host, [Color, Gradient], "pat");
  chooserSet(color, pattern, opacity);
  onShadowPattern(color, assign, true, true);
  return append(
    el("div"),
    propertyRow(el("div", "touch-effects-shadow"), {
      columns: [
        { width: "20%", label: "X", content: xBox },
        { width: "20%", label: "Y", content: yBox },
        { width: "20%", label: text("GEffectProperties", "text.blur"), content: blurBox },
        {
          width: "20%",
          label: text("GCommonNames", "text.opacity"),
          content: opacityInput(assign, opacity, true),
        },
        { width: "20%", label: text("GCommonNames", "text.color"), content: color },
      ],
    }),
  );
};

/** Old L: curved shadow (bend, softness, radius, coverage, angle, opacity, color). */
export const curvedShadowForm: CreateSettings = (host, effect, assign, part) => {
  const read = get(effect, part);
  const angle = read("a");
  const softness = read("s");
  const radius = read("l");
  const bend = read("b");
  const coverage = read("c");
  const pattern = read("pat");
  const opacity = read("opc");
  const editor = (host._document as Document).getEditor();
  const form = el("div");
  const row = (
    caption: string,
    property: string,
    value: unknown,
    isLength: boolean,
    min: number,
    max: number,
    step: number | null,
    postfix: string,
    decimals: number,
  ): HTMLDivElement => {
    const box = textInput(input(property));
    setValue(box, value);
    box.addEventListener("change", (event) => {
      let typed = Length.parseEquationValue(boxValue(event.target as Element));
      if (isLength) typed = unitValue(box).toUnit(Length.Unit.PT);
      const sliders = inSettings(box, '[data-property="' + property + '"].g-input-slider');
      if (sliderValueOf(sliders[0]) != typed) setSlider(sliders, typed);
      if (null !== typed && "number" == typeof typed && typed >= min && typed <= max)
        assign([property], [typed]);
    });
    if (isLength) {
      unitBox(box, { minValue: min, maxValue: max, source: "effects" });
      setUnitValue([box], new Length(value as number, Length.Unit.PT));
    } else {
      inputBox(box, {
        minValue: min,
        maxValue: max,
        postfix: postfix || "",
        incrementValue: (max - min) / 100,
      });
      setBoxValue([box], value);
    }
    const valueSlider = slider({
      type: "range",
      maxDecimal: decimals,
      min,
      max,
      step: step || (max - min) / 100,
    });
    setSlider([valueSlider], value);
    valueSlider.setAttribute("data-property", property);
    valueSlider.addEventListener("mousedown", () => {
      if (!editor) return;
      editor.hideSelection();
      document.addEventListener("mouseup", () => editor.resetHideSelection(), { once: true });
    });
    valueSlider.addEventListener("input", () => {
      const next = parseFloat(String(sliderValueOf(valueSlider)));
      assign([property], [next], true);
      valAll(
        inSettings(valueSlider, '[data-property="' + property + '"]:not(.g-input-slider)'),
        sliderValueOf(valueSlider),
        false,
      );
    });
    valueSlider.addEventListener("change", () => {
      const next = sliderValueOf(valueSlider);
      valAll(
        inSettings(valueSlider, '[data-property="' + property + '"]:not(.g-input-slider)'),
        next,
        true,
      );
    });
    return propertyRow(el("div"), {
      columns: [
        { label: caption, width: "75%", content: valueSlider },
        { width: "25%", content: box },
      ],
    });
  };
  form.appendChild(
    row(text("GEffectProperties", "text.bend"), "b", bend, true, -60, 60, null, "", 1),
  );
  form.appendChild(
    row(text("GEffectProperties", "text.softness"), "s", softness, false, 0, 1, null, "", 2),
  );
  form.appendChild(
    row(text("GCommonNames", "text.radius"), "l", radius, false, 0, 50, null, "", 1),
  );
  form.appendChild(
    row(text("GEffectProperties", "text.coverage"), "c", coverage, false, 0, 1, null, "", 2),
  );
  form.appendChild(row(text("GCommonNames", "text.angle"), "a", angle, false, 0, 360, 1, "°", 0));
  const color = chooser(host, [Color, Gradient], "pat");
  chooserSet(color, pattern, opacity);
  onShadowPattern(color, assign, true, true);
  form.appendChild(
    propertyRow(el("div", "touch-effects-shadow"), {
      columns: [
        {
          width: "50%",
          label: text("GCommonNames", "text.opacity"),
          content: opacityInput(assign, opacity, true),
        },
        { width: "20%", label: text("GCommonNames", "text.color"), content: color },
      ],
    }),
  );
  return form;
};

/** Old I: contact shadow (offset, angle, blur, opacity, color). */
export const contactShadowForm: CreateSettings = (host, effect, assign, part) => {
  const read = get(effect, part);
  const angle = read("a");
  const radius = new Length(read("r") as number, Length.Unit.PT);
  const offset = new Length(read("o") as number, Length.Unit.PT);
  const pattern = read("pat");
  const opacity = read("opc");
  let range: unknown[] = [5, 200];
  const ranges = (effect as unknown as { RANGES?: { r?: unknown[] } }).RANGES;
  if (ranges && ranges.r) range = ranges.r;
  const field = (name: string): HTMLElement => {
    if ("r" === name) {
      const box = textInput(el("input"));
      unitBox(box, {
        minValue: range[0] as number,
        maxValue: range[1] as number,
        source: "effects",
      });
      setUnitValue([box], radius);
      box.addEventListener("change", () => assign(["r"], [unitValue(box).toUnit(Length.Unit.PT)]));
      return box;
    }
    if ("a" === name) {
      const box = textInput(el("input"));
      inputBox(box, { minValue: 5, maxValue: 35, postfix: "°" });
      setBoxValue([box], angle);
      box.addEventListener("change", (event) =>
        assign(["a"], [Length.parseEquationValue(boxValue(event.target as Element))]),
      );
      return box;
    }
    if ("o" === name) {
      const box = textInput(el("input"));
      unitBox(box, { source: "effects" });
      setUnitValue([box], offset);
      box.addEventListener("change", () => assign(["o"], [unitValue(box).toUnit(Length.Unit.PT)]));
      return box;
    }
    if ("opc" === name) return opacityInput(assign, opacity, true);
    const color = chooser(host, [Color], "pat");
    chooserSet(color, pattern, opacity);
    onShadowPattern(color, assign, true, false);
    return color;
  };
  return append(
    el("div"),
    propertyRow(el("div"), {
      columns: [
        { width: "20%", label: text("GEffectProperties", "text.offset"), content: field("o") },
        { width: "20%", label: text("GCommonNames", "text.angle"), content: field("a") },
        { width: "20%", label: text("GEffectProperties", "text.blur"), content: field("r") },
        { width: "20%", label: text("GCommonNames", "text.opacity"), content: field("opc") },
        { width: "20%", label: text("GCommonNames", "text.color"), content: field("pat") },
      ],
    }),
  );
};

/** Old k: long shadow (angle, length, density, color, opacity, fade). */
export const longShadowForm: CreateSettings = (host, effect, assign, part) => {
  const read = get(effect, part);
  const angle = read("a") as number;
  const length = new Length(read("l") as number, Length.Unit.PT);
  const pattern = read("pat");
  const opacity = read("opc");
  const density = read("den") as number;
  const fade = read("fdm");
  const field = (name: string): HTMLElement => {
    if ("l" === name) {
      const box = textInput(el("input"));
      unitBox(box, { minValue: 0, source: "effects" });
      setUnitValue([box], length);
      box.addEventListener("change", () => assign(["l"], [unitValue(box).toUnit(Length.Unit.PT)]));
      return box;
    }
    if ("a" === name) {
      const box = textInput(el("input"));
      inputBox(box, { minValue: -180, maxValue: 180, postfix: "°" });
      setBoxValue([box], formatNumber(Math.round(GMath.toDegrees(angle)), 1));
      box.addEventListener("change", (event) =>
        assign(
          ["a"],
          [GMath.toRadians(Length.parseEquationValue(boxValue(event.target as Element)) as number)],
        ),
      );
      return box;
    }
    if ("opc" === name) return opacityInput(assign, opacity, false);
    if ("den" === name) {
      const box = textInput(el("input"));
      box.addEventListener("change", (event) => {
        const value = (boxValue(event.target as Element) as unknown as number) / 100;
        assign(["den"], [value]);
      });
      inputBox(box, { minValue: 5, maxValue: 100, incrementValue: 1, postfix: "%" });
      setBoxValue([box], formatNumber(100 * density));
      return box;
    }
    if ("fdm" === name) {
      const box = checkbox(fade);
      box.addEventListener("change", () => assign(["fdm"], [box.checked]));
      return switchBox(box);
    }
    const color = chooser(host, [Color, Gradient], "pat");
    chooserSet(color, pattern, opacity);
    onShadowPattern(color, assign, true, true);
    return color;
  };
  return append(
    el("div"),
    propertyRow(el("div"), {
      columns: [
        { width: "33%", label: text("GCommonNames", "text.angle"), content: field("a") },
        { width: "33%", label: text("GEffectProperties", "text.length"), content: field("l") },
        { width: "33%", label: text("GEffectProperties", "text.density"), content: field("den") },
      ],
    }),
    propertyRow(el("div"), {
      columns: [
        { width: "33%", label: text("GCommonNames", "text.color"), content: field("pat") },
        { width: "33%", label: text("GCommonNames", "text.opacity"), content: field("opc") },
        { width: "33%", label: text("GEffectProperties", "text.fade"), content: field("fdm") },
      ],
    }),
  );
};

let webGLContext: unknown = undefined;

/**
 * Whether WebGL is there (old module local K, probed once when the module
 * loaded; here on first use). It sets the canvas blur slider's maximum.
 */
function hasWebGL(): boolean {
  if (webGLContext === undefined) {
    const canvas = document.createElement("canvas");
    try {
      webGLContext =
        canvas.getContext("webgl", { premultipliedAlpha: false }) ||
        canvas.getContext("experimental-webgl");
    } catch {
      webGLContext = null;
    }
  }
  return !!webGLContext;
}

/** Old O: the canvas blur (radius, clip). */
export const blurForm: CreateSettings = (host, effect, assign, part) => {
  const read = get(effect, part);
  const editor = (host._document as Document).getEditor();
  const radius = new Length(read("r") as number, Length.Unit.PT);
  const clip = read("b");
  const form = el("div");
  const radiusSlider = slider({
    maxDecimal: 1,
    // Strings in the old code; the slider computes with them as numbers.
    min: "0" as unknown as number,
    max: new Length(hasWebGL() ? 50 : 10, Length.Unit.PT).toUnit(Length.Unit.PX),
    step: "0.1" as unknown as number,
  });
  setSlider([radiusSlider], read("r"));
  radiusSlider.setAttribute("data-property", "r");
  radiusSlider.addEventListener("mousedown", () => {
    if (!editor) return;
    editor.hideSelection();
    document.addEventListener("mouseup", () => editor.resetHideSelection(), { once: true });
  });
  radiusSlider.addEventListener("input", () => {
    const next = parseFloat(String(sliderValueOf(radiusSlider)));
    assign(["r"], [next], true);
    valAll(
      inSettings(radiusSlider, '[data-property="r"]:not(.g-input-slider)'),
      sliderValueOf(radiusSlider),
      false,
    );
  });
  radiusSlider.addEventListener("change", () => {
    const next = parseFloat(String(sliderValueOf(radiusSlider)));
    valAll(inSettings(radiusSlider, '[data-property="r"]:not(.g-input-slider)'), next, true);
  });
  const box = input("r");
  unitBox(box, { source: "effects" });
  setUnitValue([box], radius);
  box.addEventListener("change", () => {
    const typed = unitValue(box);
    const points = typed ? typed.toUnit(Length.Unit.PT) : null;
    const sliders = inSettings(box, '[data-property="r"].g-input-slider');
    if (parseFloat(String(sliderValueOf(sliders[0]))) != points) setSlider(sliders, points);
    if (null !== points && "number" == typeof points && points >= 0 && points <= 254)
      assign(["r"], [points]);
  });
  form.appendChild(
    propertyRow(el("div"), {
      columns: [
        { label: text("GCommonNames", "text.radius"), width: "75%", content: radiusSlider },
        { width: "25%", content: box },
      ],
    }),
  );
  const clipBox = checkbox(clip);
  clipBox.addEventListener("change", () => assign(["b"], [clipBox.checked]));
  form.appendChild(
    propertyRow(el("div"), {
      columns: [{ label: text("GWebGLEffect", "clip"), width: "25%", content: switchBox(clipBox) }],
    }),
  );
  return form;
};

/** Old F: the overlay effect (color, opacity, blend as a fading mask). */
export const overlayForm: CreateSettings = (host, effect, assign, part) => {
  const editor = (host._document as Document).getEditor();
  const read = get(effect, part);
  const pattern = read("pat");
  const opacity = read("opc");
  const mask = read("alm");
  const color = el("div");
  color.setAttribute("data-property", "pat");
  patternChooser(color, { types: [Color, Gradient] });
  chooserSet(color, pattern, opacity);
  const styleEditors = () => designer().getWorkspace().getStyleEdManager();
  color.addEventListener("chooseropen", () => {
    if (editor) editor.hideSelection();
    styleEditors().updateEditor(effect as never, "pat", false);
    host._styleEdOn = true;
    host._chooserElem = color;
  });
  color.addEventListener("chooserclose", (event) => {
    const [prevent, closeEvent] = eventArgs(event);
    if (styleEditors().getOverlayLock(closeEvent)) (prevent as () => void)();
    else {
      host._styleEdOn = false;
      styleEditors().deactivateEditor();
      if (editor) editor.resetHideSelection();
    }
    host._chooserElem = null;
  });
  onShadowPattern(color, assign, false, true);
  const opacityBox = textInput(input("opc"));
  opacityBox.addEventListener("change", (event) => {
    const value = (boxValue(event.target as Element) as unknown as number) / 100;
    assign(["opc"], [value]);
  });
  inputBox(opacityBox, {
    minValue: 0,
    maxValue: 100,
    incrementValue: designer().getOpacityIncrement(),
    postfix: "%",
  });
  setBoxValue([opacityBox], formatOpacity(100 * (opacity as number)));
  const maskBox = checkbox(mask);
  maskBox.addEventListener("change", () => {
    if (maskBox.checked) {
      const fade = new LinearGradient([
        { color: RGBColor.BLACK, position: 0, opacity: 1 },
        { color: RGBColor.WHITE, position: 1, opacity: 0 },
      ]);
      assign(["alm", "opc", "pat"], [true, 1, fade]);
    } else assign(["alm"], [false]);
  });
  const maskSwitch = switchBox(maskBox);
  maskSwitch.style.setProperty("width", "20px");
  maskSwitch.style.setProperty("align-self", "center");
  const centered = el("div");
  centered.style.setProperty("display", "flex");
  centered.style.setProperty("justify-content", "center");
  centered.appendChild(maskSwitch);
  return append(
    el("div"),
    propertyRow(el("div", "touch-effects-overlay"), {
      columns: [
        { width: "20%", label: text("GCommonNames", "text.color"), content: color },
        { width: "20%" },
        { width: "20%", label: text("GCommonNames", "text.opacity"), content: opacityBox },
        { width: "20%" },
        { width: "20%", label: text("GEffectProperties", "text.blend"), content: centered },
      ],
    }),
  );
};

/** The presets of the color grading select: [value, caption] (old R, value and text as written). */
function gradingPresets(): [string, string][] {
  const t = (key: string) => text("GEffectProperties", "text.color.gradient.opt." + key);
  return [
    ["1977", t("1977")],
    // The old code swapped value and caption for this one.
    [t("brannan"), "Brannan"],
    ["Gotham", t("gotham")],
    ["Hefe", t("hefe")],
    ["Lord Kelvin", t("lord-kelvin")],
    ["Nashville", t("nashville")],
    ["X-PRO II", t("x-pro-ii")],
  ];
}

/** Old R: color grading (a preset or an .acv file). */
export const colorGradingForm: CreateSettings = (_host, _effect, assign) => {
  const file = el("input");
  file.setAttribute("type", "file");
  file.setAttribute("accept", ".acv");
  file.style.setProperty("position", "absolute");
  file.style.setProperty("left", "-10000px");
  file.addEventListener("change", (event) => {
    designer().stats("effects_change_colorgrading");
    const files = (event.target as HTMLInputElement).files;
    const first: unknown = files && files[0];
    if (files && files.length && (first instanceof File || first instanceof Blob)) {
      const reader = new FileReader();
      reader.onload = () => {
        const curves = readACVFile(reader.result as ArrayBuffer);
        if (curves) assign(["cp"], [curves]);
      };
      reader.readAsArrayBuffer(first);
    }
  });
  const select = el("select");
  const none = el("option");
  none.setAttribute("value", "");
  none.textContent = text("GCommonNames", "text.none");
  select.appendChild(none);
  const group = el("optgroup");
  group.setAttribute("label", text("GEffectProperties", "text.color.gradient.grp.instagram"));
  for (const [value, caption] of gradingPresets()) {
    const option = el("option");
    option.setAttribute("value", value);
    option.textContent = caption;
    group.appendChild(option);
  }
  select.appendChild(group);
  select.addEventListener("change", (event) => {
    const name = (event.target as HTMLSelectElement).value;
    designer().stats("effects_change_grading", name || "none");
    if (name) {
      const request = new XMLHttpRequest();
      request.addEventListener("load", () => {
        if (200 == request.status && request.response) {
          const curves = readACVFile(request.response as ArrayBuffer);
          if (curves) assign(["cp"], [curves]);
        }
      });
      request.open("GET", "assets/data/acv/" + name + ".acv");
      request.responseType = "arraybuffer";
      request.send(null);
    } else assign(["cp"], [null]);
  });
  const load = el("button");
  load.textContent = text("GEffectProperties", "text.load-acv") + "...";
  load.addEventListener("click", (event) => {
    designer().stats("effects_choose_acv");
    for (const target of inSettings(event.target as Element, 'input[type="file"]')) {
      target.focus();
      target.click();
    }
  });
  return append(el("div"), file, select, load);
};

/**
 * The old sort of the add panel's categories. Sic: not a consistent
 * order ("Other" is greater than everything, and everything is smaller
 * than "Other"); the engine's sort decides where Other ends up (see
 * "Effect categories sort" in QUESTIONS.md).
 */
export function compareCategories(other: string): (left: string, right: string) => number {
  return (left, right) =>
    left === other || left > right ? 1 : right === other || right > left ? -1 : 0;
}

/** Old B: an assign that prefixes every name with the part's node name ("name&prop"). */
export function partAssign(nodeName: string, assign: EffectAssign): EffectAssign {
  return (names, values, temporary) => {
    const prefixed = names.slice();
    const copied = values.slice();
    for (let s = 0; s < prefixed.length; s++) {
      prefixed[s] = nodeName + "&" + prefixed[s];
      copied[s] = values[s];
    }
    assign(prefixed, copied, temporary);
  };
}

/** Old M: a multi effect shows the form of each of its parts. */
export const multiForm: CreateSettings = (host, effect, assign) => {
  const parts = (effect as MultiEffect).getFXArray();
  const form = el("div");
  const table = effectTable();
  for (let r = 0; r < parts.length; r++) {
    const part = parts[r] as Effect;
    const clazz = Node.getClassFromId(getTypeId(part) as number);
    const nodeName = Node.getName(clazz);
    for (let d = 0; d < table.length; d++) {
      const entry = table[d] as EffectEntry;
      if ((entry.clazz as unknown) === clazz) {
        const settings = entry.createSettings(host, effect, partAssign(nodeName, assign), part);
        settings.style.setProperty("margin-top", "7px");
        form.appendChild(settings);
        break;
      }
    }
  }
  return form;
};

/** Old N: mirror (opacity, padding, height). */
export const mirrorForm: CreateSettings = (host, effect, assign, part) => {
  const read = get(effect, part);
  const opacity = read("opc") as number;
  const padding = new Length(read("pad") as number);
  const height = read("rfh") as number;
  const field = (name: string): HTMLElement => {
    if ("rfh" === name) {
      const box = textInput(input(name));
      box.addEventListener("change", (event) => {
        const value =
          (Length.parseEquationValue(boxValue(event.target as Element)) as number) / 100;
        assign([name], [value]);
      });
      inputBox(box, {
        minValue: 0,
        maxValue: 100,
        incrementValue: 10,
        slowIncrementValue: 1,
        postfix: "%",
      });
      setBoxValue([box], 100 * height);
      return box;
    }
    if ("pad" === name) {
      const box = textInput(input(name));
      box.addEventListener("change", (event) => {
        const value = unitValue(event.target as Element).getValue();
        assign([name], [value]);
      });
      unitBox(box, { minValue: 0, incrementValue: 1, source: "effects" });
      setUnitValue([box], padding);
      return box;
    }
    if ("opacity-slider" === name) {
      const opacitySlider = el("div");
      opacitySlider.setAttribute("data-property", "opc");
      inputSlider(opacitySlider, { type: "range", min: 0, max: 100 });
      hideSelectionWith(opacitySlider, host);
      opacitySlider.addEventListener("input", (event) => {
        const value = parseInt(String(sliderValueOf(event.target as Element))) / 100;
        assign(["opc"], [value]);
        setBoxValue(
          inSettings(event.target as Element, '[type="text"][data-property="opc"]'),
          formatOpacity(100 * value),
        );
      });
      opacitySlider.addEventListener("change", () => {
        assign(["opc"], [parseFloat(String(sliderValueOf(opacitySlider))) / 100]);
      });
      setSlider([opacitySlider], 100 * opacity);
      return opacitySlider;
    }
    const box = textInput(input("opc"));
    box.addEventListener("change", () => {
      const value = boxValue(box);
      setSlider(inSettings(box, '[data-property="opc"].g-input-slider'), value);
      assign(["opc"], [(Length.parseEquationValue(boxValue(box)) as number) / 100]);
    });
    inputBox(box, { minValue: 0, maxValue: 100, incrementValue: 5, postfix: "%" });
    setBoxValue([box], formatOpacity(100 * opacity));
    return box;
  };
  const narrow = document.body.classList.contains("g-touch") ? "60px" : "40px";
  return propertyRow(el("div"), {
    columns: [
      {
        width: "auto",
        label: text("GCommonNames", "text.opacity"),
        content: propertyRow(el("div"), {
          columns: [
            { width: "auto", content: field("opacity-slider") },
            {
              width: document.body.classList.contains("g-touch") ? "60px" : "40px",
              content: field("opacity-input"),
            },
          ],
        }),
      },
      { width: narrow, label: text("GEffectProperties", "text.padding"), content: field("pad") },
      { width: narrow, label: text("GEffectProperties", "text.height"), content: field("rfh") },
    ],
  });
};

let table: EffectEntry[] | null = null;

/**
 * The effect table (old V, built by H() in the first panel's
 * constructor), with the category names of that moment.
 */
export function effectTable(categories?: EffectCategories): EffectEntry[] {
  if (table) return table;
  if (!categories) throw new Error("the effect table is made by the first EffectProperties");
  const { blur, artistic, adjust, distortion, other, shadow } = categories;
  const entry = (
    clazz: unknown,
    i18n: string,
    group: string,
    category: string | undefined,
    createSettings: CreateSettings,
    icon: string | undefined,
    extra: { mostUsed?: boolean; hidden?: boolean } = {},
  ): EffectEntry => {
    const out: EffectEntry = { clazz: clazz as EffectClass, i18n, group, createSettings };
    if (category !== undefined) out.category = category;
    if (extra.hidden) out.hidden = true;
    if (icon !== undefined) out.icon = icon;
    if (extra.mostUsed) out.mostUsed = true;
    return out;
  };
  const most = { mostUsed: true };
  const hidden = { hidden: true };
  table = [
    entry(GLBlurEffect, "GGLBlurEffect", "raster", undefined, webGLForm, "gravit-icon-blur-effect"),
    entry(BlurEffect, "GBlurEffect", "raster", blur, blurForm, "gravit-icon-blur-effect", most),
    entry(
      GLVignetteEffect,
      "GGLVignetteEffect",
      "webgl",
      artistic,
      webGLForm,
      "gravit-icon-vignette-effect",
      most,
    ),
    entry(
      GLColorAdjustEffect,
      "GGLColorAdjustEffect",
      "webgl",
      adjust,
      webGLForm,
      "gravit-icon-adjust-effect",
      most,
    ),
    entry(
      GLRecolourEffect,
      "GGLRecolourEffect",
      "webgl",
      adjust,
      webGLForm,
      "gravit-icon-recolour-effect",
      most,
    ),
    entry(
      OverlayEffect,
      "GOverlayEffect",
      "filter",
      adjust,
      overlayForm,
      "gravit-icon-overlay-effect",
      most,
    ),
    entry(
      MirrorEffect,
      "GMirrorEffect",
      "mirror",
      other,
      mirrorForm,
      "gravit-icon-mirror-effect",
      most,
    ),
    entry(
      CurvedShadowEffect,
      "GCurvedShadowEffect",
      "raster",
      shadow,
      curvedShadowForm,
      "gravit-icon-curved-shadow-effect",
      most,
    ),
    entry(
      DropShadowEffect,
      "GDropShadowEffect",
      "raster",
      shadow,
      shadowForm,
      "gravit-icon-drop-shadow-effect",
      most,
    ),
    entry(
      InnerShadowEffect,
      "GInnerShadowEffect",
      "raster",
      shadow,
      shadowForm,
      "gravit-icon-inner-shadow-effect",
      most,
    ),
    entry(
      GLBulgePinchEffect,
      "GGLBulgePinchEffect",
      "webgl",
      distortion,
      webGLForm,
      "gravit-icon-bulge-effect",
    ),
    entry(
      GLColorHalfToneEffect,
      "GGLColorHalfToneEffect",
      "webgl",
      adjust,
      webGLForm,
      "gravit-icon-half-tone-effect",
    ),
    entry(
      GLDotScreenEffect,
      "GGLDotScreenEffect",
      "webgl",
      artistic,
      webGLForm,
      "gravit-icon-dotscreen-effect",
    ),
    entry(
      GLBrightnessContrastEffect,
      "GGLBrightnessContrastEffect",
      "webgl",
      adjust,
      webGLForm,
      undefined,
      hidden,
    ),
    entry(
      GLFisheyeEffect,
      "GGLFisheyeEffect",
      "webgl",
      distortion,
      webGLForm,
      "gravit-icon-fisheye-effect",
    ),
    entry(GLBendEffect, "GGLBendEffect", "webgl", distortion, webGLForm, "gravit-icon-bend-effect"),
    entry(
      GLDenoiseEffect,
      "GGLDenoiseEffect",
      "webgl",
      adjust,
      webGLForm,
      "gravit-icon-denoise-effect",
    ),
    entry(
      GLEdgeWorkEffect,
      "GGLEdgeWorkEffect",
      "webgl",
      artistic,
      webGLForm,
      "gravit-icon-edge-work-effect",
    ),
    entry(
      GLHexagonalEffect,
      "GGLHexagonalEffect",
      "webgl",
      artistic,
      webGLForm,
      "gravit-icon-hexagonal-effect",
    ),
    entry(
      GLHueSaturationEffect,
      "GGLHueSaturationEffect",
      "webgl",
      adjust,
      webGLForm,
      undefined,
      hidden,
    ),
    entry(
      ColorAdjustMultiEffect,
      "GColorAdjustMultiEffect",
      "webgl",
      adjust,
      multiForm,
      undefined,
      hidden,
    ),
    entry(GLInkEffect, "GGLInkEffect", "webgl", artistic, webGLForm, "gravit-icon-ink-effect"),
    entry(
      GLLensBlurEffect,
      "GGLLensBlurEffect",
      "webgl",
      blur,
      webGLForm,
      "gravit-icon-lens-blur-effect",
    ),
    entry(GLNoiseEffect, "GGLNoiseEffect", "webgl", adjust, webGLForm, "gravit-icon-noise-effect"),
    entry(GLSepiaEffect, "GGLSepiaEffect", "webgl", adjust, webGLForm, "gravit-icon-sepia-effect"),
    entry(
      GLSwirlEffect,
      "GGLSwirlEffect",
      "webgl",
      distortion,
      webGLForm,
      "gravit-icon-swirl-effect",
    ),
    entry(
      GLTiltShiftEffect,
      "GGLTiltShiftEffect",
      "webgl",
      blur,
      webGLForm,
      "gravit-icon-tilt-shift-effect",
    ),
    entry(
      GLDrunkEffect,
      "GGLDrunkEffect",
      "webgl",
      artistic,
      webGLForm,
      "gravit-icon-alcohol-effect",
    ),
    entry(
      GLUnsharpMaskEffect,
      "GGLUnsharpMaskEffect",
      "webgl",
      adjust,
      webGLForm,
      "gravit-icon-unsharp-mask-effect",
    ),
    entry(
      GLVibranceEffect,
      "GGLVibranceEffect",
      "webgl",
      adjust,
      webGLForm,
      "gravit-icon-vibrance-effect",
    ),
    entry(GLBloomEffect, "GGLBloomEffect", "webgl", adjust, webGLForm, "gravit-icon-bloom-effect"),
    entry(
      GLSketchEffect,
      "GGLSketchEffect",
      "webgl",
      artistic,
      webGLForm,
      "gravit-icon-sketch-effect",
    ),
    entry(GLToonEffect, "GGLToonEffect", "webgl", artistic, webGLForm, "gravit-icon-toon-effect"),
    entry(
      GLZoomBlurEffect,
      "GGLZoomBlurEffect",
      "webgl",
      blur,
      webGLForm,
      "gravit-icon-zoom-blur-effect",
    ),
    entry(
      GLStrokeLayerEffect,
      "GGLStrokeLayerEffect",
      "raster",
      other,
      webGLForm,
      "gravit-icon-stroke-effect",
    ),
    entry(
      GLInnerGlowEffect,
      "GGLInnerGlowEffect",
      "raster",
      other,
      webGLForm,
      "gravit-icon-inner-glow-effect",
    ),
    entry(
      GLOuterGlowEffect,
      "GGLOuterGlowEffect",
      "raster",
      other,
      webGLForm,
      "gravit-icon-outer-glow-effect",
    ),
    entry(
      ContactShadowEffect,
      "GContactShadowEffect",
      "raster",
      shadow,
      contactShadowForm,
      "gravit-icon-contact-shadow-effect",
    ),
    entry(
      LongShadowEffect,
      "GLongShadowEffect",
      "raster",
      shadow,
      longShadowForm,
      "gravit-icon-long-shadow-effect",
    ),
    entry(
      ColorGradingEffect,
      "GColorGradingEffect",
      "filter",
      adjust,
      colorGradingForm,
      "gravit-icon-color-grading-effect",
    ),
    // Not in the old table, so selecting an element that has one of these
    // threw "Invalid effect/class". Hidden like the legacy effects: they
    // get a form but no add panel item.
    entry(GLTrueBlurEffect, "GGLTrueBlurEffect", "webgl", blur, webGLForm, undefined, hidden),
    entry(GLBendBlurEffect, "GGLBendBlurEffect", "webgl", blur, webGLForm, undefined, hidden),
    entry(AdjustMultiEffect, "GAdjustMultiEffect", "webgl", adjust, multiForm, undefined, hidden),
  ];
  return table;
}

/** Forgets the table (unit tests). */
export function resetEffectTable(): void {
  table = null;
}

/** Old U: the table entry of an effect or effect class; throws for an unknown one. */
export function entryOf(effectOrClass: unknown): EffectEntry {
  const clazz =
    effectOrClass && "object" == typeof effectOrClass
      ? (effectOrClass as object).constructor
      : effectOrClass;
  const entries = effectTable();
  for (let n = 0; n < entries.length; ++n)
    if ((entries[n] as EffectEntry).clazz === clazz) return entries[n] as EffectEntry;
  throw new Error("Invalid effect/class");
}

/** `GLocale.getValue(entry.i18n || clazz, "name", ...)` for the statistics calls. */
export function statsName(classId: unknown, fallback: string, language: number): string {
  return Locale.getValue(classId as ClassId, "name", fallback, language) as string;
}
