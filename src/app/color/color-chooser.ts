// Old: designer.browser.dev.js module 1150 (GPatternChooser and $.fn.gPatternChooser).
/**
 * The color chooser: the overlay the paint fields open. It edits one
 * pattern (a color in RGB, HSB or CMYK, a linear, radial or angular
 * gradient, a texture, noise or the background fill) and its opacity, and
 * offers palettes (colors, swatches, colors in use, mixer).
 *
 * One chooser exists for the desktop and one for touch (pattern-chooser.ts);
 * patternChooser() is the one the last opened field picked (the old
 * window.gPatternChooser). The fields are PatternChooserWidget (the old
 * $.fn.gPatternChooser plugin):
 *
 *     const field = new PatternChooserWidget(element, { types: [Color, Gradient] });
 *     field.value(pattern).opacity(0.5);
 *     onPatternEvent(element, "patternchange", (event, pattern, opacity, transient, fromChooser, stop) => ...);
 *     onPatternEvent(element, "chooserclose", (event, prevent, cause) => ...);
 *     onPatternEvent(element, "chooseropen", () => ...);
 *
 * The chooser is built as plain DOM with the old classes and inline style
 * order, like the other overlays (UI.md, "Controllers that own an element
 * which moves between containers"): it is moved into body on open and
 * detached on close. The statistics calls of the old code are left out
 * (analytics are dropped), and so are the Pro badges (gPro) and the Pro
 * gates (watchDog.trap: every feature is enabled).
 */
import { Key } from "../../engine/core/key.ts";
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { Platform } from "../../engine/core/platform.ts";
import { equals, formatNumber, formatOpacity } from "../../engine/core/util.ts";
import { CMYKColor } from "../../engine/color/cmyk-color.ts";
import { Color } from "../../engine/color/color.ts";
import { ColorHelper } from "../../engine/color/color-helper.ts";
import { HSVColor } from "../../engine/color/hsv-color.ts";
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { VertexSource } from "../../engine/geometry/vertex-source.ts";
import { Length } from "../../engine/math/length.ts";
import { GMath } from "../../engine/math/math.ts";
import { Point } from "../../engine/math/point.ts";
import { Group } from "../../engine/scene/group.ts";
import { Node } from "../../engine/scene/node.ts";
import { AngularGradient } from "../../engine/style/angular-gradient.ts";
import { Background } from "../../engine/style/background.ts";
import { Gradient, type GradientStop } from "../../engine/style/gradient.ts";
import { LinearGradient } from "../../engine/style/linear-gradient.ts";
import { NoisePattern } from "../../engine/style/noise-pattern.ts";
import { Pattern } from "../../engine/style/pattern.ts";
import { RadialGradient } from "../../engine/style/radial-gradient.ts";
import { Swatch } from "../../engine/style/swatch.ts";
import { TexturePattern } from "../../engine/style/texture-pattern.ts";
import { ModifiedEvent, type Editor } from "../../editor/editor.ts";
import { GradientStyleEditor } from "../../editor/element-editors/gradient-style-editor.ts";
import { StyleEdManager, StyleEditorEvent } from "../../editor/style-ed-manager.ts";
import { Overlay, type OverlayOptions } from "../dialogs/dialog-container.ts";
import { SystemDialog } from "../dialogs/system-dialog.ts";
import type { Document } from "../document/document.ts";
import { css, outerWidth, width as jqWidth, height as jqHeight } from "../shell/dom.ts";
import { designer, designerOrNull, whenDesigner } from "../shell/globals.ts";
import { offset } from "../widgets/dom-helpers.ts";
import { InputBox, type InputBoxOptions } from "../widgets/input-box.ts";
import { initAccordion } from "../widgets/accordion.ts";
import { attachRichTooltip } from "../widgets/rich-tooltip.ts";
import { RichTooltipConfig } from "../widgets/rich-tooltip-config.ts";
import { EyeDropper } from "./eye-dropper.ts";
import { InputSlider, OPACITY_DEFAULT, type InputSliderOptions } from "./opacity-slider.ts";
import {
  onPatternEvent,
  PatternTarget,
  triggerPatternEvent,
  type PatternType,
} from "./pattern-target.ts";
import { SwatchesChangedEvent } from "./swatches-changed-event.ts";

// ---------------------------------------------------------------------------
// DOM helpers: the jQuery calls the old module made.

function text(className: string, key: string): string {
  return Locale.get(new LocaleKey(className, key)) as string;
}

/** `$("<tag/>").addClass(classes)`. */
function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  classes?: string | null,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (classes) for (const name of classes.split(/\s+/)) if (name) element.classList.add(name);
  return element;
}

/** `$(el).css(name)`: computed when attached, the inline value when not (jQuery's fallback). */
function cssValue(element: HTMLElement, name: string): string {
  if (element.isConnected) return getComputedStyle(element).getPropertyValue(name);
  return element.style.getPropertyValue(name);
}

/** `$.extend({}, ...sources)`: undefined values don't overwrite. */
function extend<T extends object>(...sources: (object | null | undefined)[]): T {
  const result: Record<string, unknown> = {};
  for (const source of sources) {
    if (!source) continue;
    for (const key of Object.keys(source)) {
      const value = (source as Record<string, unknown>)[key];
      if (value !== undefined) result[key] = value;
    }
  }
  return result as T;
}

/** `$(el).is(":visible")`. */
function isVisible(element: HTMLElement): boolean {
  return !!(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
}

/** `$(el).is(":input")`. */
function isInput(element: unknown): boolean {
  if (!(element instanceof Element)) return false;
  const name = element.nodeName.toLowerCase();
  return name === "input" || name === "select" || name === "textarea" || name === "button";
}

/** `$(el).val(v)` for selects and inputs. */
function setValue(element: Element, value: unknown): void {
  (element as HTMLInputElement).value = value === null || value === undefined ? "" : String(value);
}

/** `.attr("disabled", state)` / `.prop("disabled", state)` on form elements. */
function setDisabledProp(element: Element, state: boolean): void {
  (element as HTMLInputElement).disabled = state;
}

/** gInputBox("value", v) on an input that has a box. */
function boxValue(input: Element | null | undefined, value: unknown): void {
  if (!input) return;
  const box = InputBox.of(input);
  if (box) box.value(value);
}

function readBox(input: Element | null | undefined): string {
  if (!input) return "";
  const box = InputBox.of(input);
  return box ? box.value() : (input as HTMLInputElement).value;
}

function sliderOf(element: Element | null | undefined): InputSlider | null {
  return element ? InputSlider.of(element) : null;
}

export interface RowColumn {
  content?: HTMLElement;
  width?: string;
  padding?: boolean;
  label?: string;
  clazz?: string;
}

/**
 * `$(row).gPropertyRow({ clazz, label, columns })` for the rows the chooser
 * builds: appends the label, the columns and, when a column has a
 * caption, the captions. A second call appends a second set, as before.
 */
function propertyRow(
  row: HTMLElement,
  options: { clazz?: string; label?: string; columns: RowColumn[] },
): HTMLElement {
  row.classList.add("g-property-row");
  if (options.clazz) row.classList.add(options.clazz);
  if (options.label !== undefined) {
    const label = el("label", "property-label");
    row.appendChild(label);
    const span = el("span", "vertical-align");
    span.textContent = options.label;
    label.appendChild(span);
  } else row.classList.add("no-label");
  const columns = el("div", "columns");
  row.appendChild(columns);
  let captions = false;
  for (const column of options.columns) {
    const cell = el(column.content && isInput(column.content) ? "label" : "div", "column");
    if (column.clazz) cell.classList.add(column.clazz);
    if ("auto" === column.width) cell.classList.add("auto-grow");
    else if (column.width) css(cell, "width", column.width);
    if (column.content) {
      const content = el("div", "content");
      content.appendChild(column.content);
      cell.appendChild(content);
    } else cell.innerHTML = "&nbsp;";
    if (!column.content || false === column.padding) cell.classList.add("no-padding");
    if (column.label) captions = true;
    columns.appendChild(cell);
  }
  if (captions) {
    const labels = el("div", "labels");
    row.appendChild(labels);
    for (const column of options.columns) {
      const caption = el("label");
      if (column.label) {
        const span = el("span");
        span.textContent = column.label;
        caption.appendChild(span);
      } else caption.innerHTML = "&nbsp;";
      if ("auto" === column.width) caption.classList.add("auto-grow");
      else if (column.width) css(caption, "width", column.width);
      if (!column.content || false === column.padding) caption.classList.add("no-padding");
      labels.appendChild(caption);
    }
  }
  return row;
}

/** A `<select>` of an enum's values with the GCommonNames "<prefix>.<kind>.<value>" captions. */
function enumSelect(
  values: Record<string, string> | null | undefined,
  prefix: string,
  kind: string,
) {
  const select = el("select");
  values = values || {};
  for (const key of Object.keys(values)) {
    const option = el("option");
    option.setAttribute("value", values[key] as string);
    option.textContent = text("GCommonNames", prefix + "." + kind + "." + values[key]);
    select.appendChild(option);
  }
  return select;
}

/** `$(input).gInputBox(options)` and return the input. */
function inputBox(input: HTMLInputElement, options?: InputBoxOptions): HTMLInputElement {
  new InputBox(input, options);
  return input;
}

function slider(element: HTMLElement, options: InputSliderOptions): HTMLElement {
  new InputSlider(element, options);
  return element;
}

/** The hue slider (module 1263 gColorSlider with its default Hue stops). */
function colorSlider(element: HTMLElement): HTMLElement {
  const min = 0;
  const max = 360;
  let stops = "";
  let n = 0;
  const range = Math.abs(min) + Math.abs(max);
  for (let a = min; a <= max; a += 20) {
    const rgb = Color.hsvToRGB([n, 1, 1]);
    n += 20;
    if (stops) stops += ",";
    stops += Color.rgbToHtmlHex(rgb) + " " + (n / range) * 100 + "%";
  }
  return slider(element, { min, max, background: "linear-gradient(90deg," + stops + ")" });
}

// ---------------------------------------------------------------------------
// The element data the old code kept with $.data.

const swatchOf = new WeakMap<Element, Swatch>();
const swatchActive = new WeakMap<Element, boolean>();
const stopOf = new WeakMap<Element, ChooserStop>();
const stopPressOf = new WeakMap<Element, (event: { stopPropagation(): void }) => void>();
const typeOf = new WeakMap<Element, PatternTypeEntry>();
const colorModeOf = new WeakMap<Element, string>();

/** The swatch a palette swatch element shows ($(el).data("swatch")). */
export function swatchOfElement(element: Element): Swatch | undefined {
  return swatchOf.get(element);
}

/** A gradient stop while the chooser edits it (`remove` while dragged off the bar). */
export type ChooserStop = GradientStop & { remove?: boolean };

/** One entry of the pattern type select. */
export interface PatternTypeEntry {
  name: string;
  cssBackgroundImage: string;
  /** Whether a class in the field's `types` allows this entry. */
  isCompatible(type: unknown): boolean;
  isInstance(pattern: unknown): boolean;
  createDefault(current: Pattern | null): Pattern | null;
}

/** What the open field told the chooser (the old `_settings`). */
export interface PatternChooserSettings {
  types: unknown[];
  singleOption?: boolean;
  hasOpacity?: boolean;
  hasMask?: boolean;
  onPattern?: (pattern: Pattern | null, transient: boolean, activeStopIndex: number | null) => void;
  onOpacity?: (opacity: number, transient: boolean) => void;
  /** Returns whether the chooser may close; `prevent` keeps it open. */
  onClose?: (
    pattern: Pattern | null,
    opacity: number | null,
    prevent: () => void,
    event: unknown,
  ) => boolean;
  [option: string]: unknown;
}

/** The parameters the touch chooser overrides (the old __get*Params methods). */
export interface ColorModeParams {
  hexWidth: string;
  isTouchEnabled: boolean;
  rgbWidth: string;
  /** The touch chooser spelled it "cymkWidth", so its CMYK boxes get no width. */
  cmykWidth?: string;
  cymkWidth?: string;
}

export interface PatternEditorParams {
  isTouchEnabled: boolean;
  repeatWidth: string;
  ghostWidth: string;
  postionWith: string;
  sizeWidth: string;
  unitWidth: string;
}

export interface TouchParams {
  isTouchEnabled: boolean;
}

/** The document as the chooser uses it. */
function activeDocument(): Document | null {
  return designer().getActiveDocument() as unknown as Document | null;
}

function editorOf(document: Document): Editor {
  return document.getEditor() as Editor;
}

/** `$(".colormode-selector").children("option:selected").data("colormode")` (the first in the page). */
function selectedColorMode(): string | undefined {
  const select = document.querySelector(".colormode-selector");
  if (!select) return undefined;
  for (const option of select.children)
    if ((option as HTMLOptionElement).selected) return colorModeOf.get(option);
  return undefined;
}

function styleEdManager(): StyleEdManager | null {
  return designer().getWorkspace().getStyleEdManager() || null;
}

// ---------------------------------------------------------------------------
// Swatch files: GDesigner.exportSwatches and importSwatches.

export function exportSwatches(scope: string): void {
  designer().exportSwatches(scope);
}

export function importSwatches(scope: string): void {
  designer().importSwatches(scope);
}

/** The swatch scope of a pattern kind: "global", "document-linear-gradient", ... */
export function swatchScope(scope: string, pattern: unknown): string {
  return pattern && pattern instanceof LinearGradient
    ? scope + "-linear-gradient"
    : pattern && pattern instanceof RadialGradient
      ? scope + "-radial-gradient"
      : pattern && pattern instanceof AngularGradient
        ? scope + "-angular-gradient"
        : pattern && pattern instanceof TexturePattern && !(pattern instanceof NoisePattern)
          ? scope + "-texture-pattern"
          : pattern && pattern instanceof NoisePattern
            ? scope + "-noise-pattern"
            : scope;
}

// ---------------------------------------------------------------------------
// The chooser.

const ColorMode = { RGB: "rgb", HSV: "hsv", CMYK: "cmyk" } as const;

const ExtendedGamut = { COMPONENTS: "cp", COLOR_SLIDER: "cs", MAP: "map" } as const;
type ExtendedGamutValue = (typeof ExtendedGamut)[keyof typeof ExtendedGamut];

/** The engine's mode of each chooser mode (the old _ColorModeToFrameworkColorMode). */
const FRAMEWORK_COLOR_MODE: Record<string, string> = {
  [ColorMode.RGB]: Color.ColorModes.RGB,
  [ColorMode.HSV]: Color.ColorModes.HSB,
  [ColorMode.CMYK]: Color.ColorModes.CMYK,
};

const TEXTURE_DEFAULT_GROUP =
  '[{"@":"group","$":[{"@":"rectangle","uf":true,"ct":"R","sl":0,"reftxt":null,"trf":[9.948817641447532,0,0,9.692411708290129,370.93546258325506,25.987797270522503],"_sdf":84,"_layers":{"@":"paintLayers","$":[{"@":"fillPaintLayer","_pt":"C#[0,0,0]"}]}},{"@":"rectangle","uf":true,"ct":"R","sl":0,"reftxt":null,"trf":[9.948817641447532,0,0,9.692411708290129,410.7307331490452,25.987797270522503],"_sdf":84,"_layers":{"@":"paintLayers","$":[{"@":"fillPaintLayer","_pt":"C#[0,0,0]"}]}},{"@":"rectangle","uf":true,"ct":"R","sl":0,"reftxt":null,"trf":[9.948817641447532,0,0,9.692411708290129,390.7793771686299,44.58515959609013],"_sdf":84,"_layers":{"@":"paintLayers","$":[{"@":"fillPaintLayer","_pt":"C#[0,0,0]"}]}},{"@":"rectangle","uf":true,"ct":"R","sl":0,"reftxt":null,"trf":[9.948817641447532,0,0,9.692411708290129,430.57464773441995,44.58515959609013],"_sdf":84,"_layers":{"@":"paintLayers","$":[{"@":"fillPaintLayer","_pt":"C#[0,0,0]"}]}},{"@":"rectangle","uf":true,"ct":"R","sl":0,"reftxt":null,"trf":[9.948817641447532,0,0,9.692411708290129,370.9623229320152,63.96998301267038],"_sdf":84,"_layers":{"@":"paintLayers","$":[{"@":"fillPaintLayer","_pt":"C#[0,0,0]"}]}},{"@":"rectangle","uf":true,"ct":"R","sl":0,"reftxt":null,"trf":[9.948817641447532,0,0,9.692411708290129,410.75759349780526,63.96998301267038],"_sdf":84,"_layers":{"@":"paintLayers","$":[{"@":"fillPaintLayer","_pt":"C#[0,0,0]"}]}},{"@":"rectangle","uf":true,"ct":"R","sl":0,"reftxt":null,"trf":[9.948817641447532,0,0,9.692411708290129,390.80623751739,82.56734533823798],"_sdf":84,"_layers":{"@":"paintLayers","$":[{"@":"fillPaintLayer","_pt":"C#[0,0,0]"}]}},{"@":"rectangle","uf":true,"ct":"R","sl":0,"reftxt":null,"trf":[9.948817641447532,0,0,9.692411708290129,430.60150808318014,82.56734533823798],"_sdf":84,"_layers":{"@":"paintLayers","$":[{"@":"fillPaintLayer","_pt":"C#[0,0,0]"}]}}]}]';

const TEXTURE_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20">\n                        <circle r="9.2" stroke-width="2" stroke="white" fill="none"/>\n                        <circle cy="18.4" r="9.2" stroke-width="2px" stroke="white" fill="none"/>\n                        <circle cx="18.4" cy="18.4" r="9.2" stroke-width="2" stroke="white" fill="none"/>\n                    </svg>';

const NOISE_ICON =
  '<svg width="100%" height="100%" viewBox="0 0 20 20" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:1.41421;"><rect x="-0.994" y="-1.097" width="24.763" height="23.271" style="fill:transparent;"/><path d="M7.689,17.9l0.848,0l0,0.565l-0.848,0l0,0.848l-0.565,0l0,-0.848l-0.848,0l0,-0.565l0.848,0l0,-0.848l0.565,0l0,0.848Zm5.769,0l0.848,0l0,0.565l-0.848,0l0,0.848l-0.565,0l0,-0.848l-0.847,0l0,-0.565l0.847,0l0,-0.848l0.565,0l0,0.848Zm5.094,0l0.847,0l0,0.565l-0.847,0l0,0.848l-0.566,0l0,-0.848l-0.847,0l0,-0.565l0.847,0l0,-0.848l0.566,0l0,0.848Zm-16.58,0l0.847,0l0,0.565l-0.847,0l0,0.848l-0.566,0l0,-0.848l-0.847,0l0,-0.565l0.847,0l0,-0.848l0.566,0l0,0.848Zm3.015,-2.33l1.321,0l0,0.881l-1.321,0l0,1.321l-0.88,0l0,-1.321l-1.321,0l0,-0.881l1.321,0l0,-1.32l0.88,0l0,1.32Zm5.752,0l1.32,0l0,0.881l-1.32,0l0,1.321l-0.881,0l0,-1.321l-1.32,0l0,-0.881l1.32,0l0,-1.32l0.881,0l0,1.32Zm5.764,0l1.32,0l0,0.881l-1.32,0l0,1.321l-0.881,0l0,-1.321l-1.321,0l0,-0.881l1.321,0l0,-1.32l0.881,0l0,1.32Zm-8.814,-2.896l0.848,0l0,0.566l-0.848,0l0,0.847l-0.565,0l0,-0.847l-0.848,0l0,-0.566l0.848,0l0,-0.847l0.565,0l0,0.847Zm5.769,0l0.848,0l0,0.566l-0.848,0l0,0.847l-0.565,0l0,-0.847l-0.847,0l0,-0.566l0.847,0l0,-0.847l0.565,0l0,0.847Zm5.094,0l0.847,0l0,0.566l-0.847,0l0,0.847l-0.566,0l0,-0.847l-0.847,0l0,-0.566l0.847,0l0,-0.847l0.566,0l0,0.847Zm-16.58,0l0.847,0l0,0.566l-0.847,0l0,0.847l-0.566,0l0,-0.847l-0.847,0l0,-0.566l0.847,0l0,-0.847l0.566,0l0,0.847Zm3.015,-2.91l1.321,0l0,0.88l-1.321,0l0,1.321l-0.88,0l0,-1.321l-1.321,0l0,-0.88l1.321,0l0,-1.321l0.88,0l0,1.321Zm5.752,0l1.32,0l0,0.88l-1.32,0l0,1.321l-0.881,0l0,-1.321l-1.32,0l0,-0.88l1.32,0l0,-1.321l0.881,0l0,1.321Zm5.764,0l1.32,0l0,0.88l-1.32,0l0,1.321l-0.881,0l0,-1.321l-1.321,0l0,-0.88l1.321,0l0,-1.321l0.881,0l0,1.321Zm-8.814,-2.932l0.848,0l0,0.565l-0.848,0l0,0.848l-0.565,0l0,-0.848l-0.848,0l0,-0.565l0.848,0l0,-0.848l0.565,0l0,0.848Zm5.769,0l0.848,0l0,0.565l-0.848,0l0,0.848l-0.565,0l0,-0.848l-0.847,0l0,-0.565l0.847,0l0,-0.848l0.565,0l0,0.848Zm5.094,0l0.847,0l0,0.565l-0.847,0l0,0.848l-0.566,0l0,-0.848l-0.847,0l0,-0.565l0.847,0l0,-0.848l0.566,0l0,0.848Zm-16.58,0l0.847,0l0,0.565l-0.847,0l0,0.848l-0.566,0l0,-0.848l-0.847,0l0,-0.565l0.847,0l0,-0.848l0.566,0l0,0.848Zm3.015,-2.833l1.321,0l0,0.881l-1.321,0l0,1.32l-0.88,0l0,-1.32l-1.321,0l0,-0.881l1.321,0l0,-1.321l0.88,0l0,1.321Zm5.752,2.201l-0.881,0l0,-1.32l-1.32,0l0,-0.881l1.32,0l0,-1.321l0.881,0l0,1.321l1.32,0l0,0.881l-1.32,0l0,1.32Zm5.764,0l-0.881,0l0,-1.32l-1.321,0l0,-0.881l1.321,0l0,-1.321l0.881,0l0,1.321l1.32,0l0,0.881l-1.32,0l0,1.32Zm-8.814,-4.515l0.848,0l0,0.565l-0.848,0l0,0.848l-0.565,0l0,-0.848l-0.848,0l0,-0.565l0.848,0l0,-0.847l0.565,0l0,0.847Zm5.769,0l0.848,0l0,0.565l-0.848,0l0,0.848l-0.565,0l0,-0.848l-0.847,0l0,-0.565l0.847,0l0,-0.847l0.565,0l0,0.847Zm5.094,0l0.847,0l0,0.565l-0.847,0l0,0.848l-0.566,0l0,-0.848l-0.847,0l0,-0.565l0.847,0l0,-0.847l0.566,0l0,0.847Zm-16.58,0l0.847,0l0,0.565l-0.847,0l0,0.848l-0.566,0l0,-0.848l-0.847,0l0,-0.565l0.847,0l0,-0.847l0.566,0l0,0.847Z" style="fill:#fff;"/></svg>';

const BACKGROUND_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="20" viewBox="0 0 5 10"><line x1="-2" y1="1" x2="7" y2="10" stroke="white" stroke-width="2"/><line x1="-2" y1="6" x2="7" y2="15" stroke="white" stroke-width="2"/><line x1="-2" y1="-4" x2="7" y2="5" stroke="white" stroke-width="2"/></svg>';

function svgBackground(svg: string): string {
  return 'url("data:image/svg+xml;base64,' + btoa(svg) + '")';
}

/** The texture paste message, which the old string table lacks (BUG-133). */
const TEXTURE_PASTE_ALERT = "Select a shape, copy it to clipboard then paste it as texture here.";

export class PatternChooser {
  static ColorMode = ColorMode;
  static ColorModeLabel: Record<string, string> = { RGB: "RGB", HSV: "HSB", CMYK: "CMYK" };
  static ColorModelFree: Record<string, boolean> = { RGB: true };
  static ExtendedGamut = ExtendedGamut;
  /** Shared state of a swatch drag (the old statics). */
  static canDragSwatch = false;
  static dragSwatch: HTMLElement | null = null;
  static dragDeltaX = 0;
  static dragDeltaY = 0;
  static hasDropped = false;
  /** How far above or below the stop bar a stop may be dragged before it is removed. */
  static EXTEND_DRAG_RANGE = 50;
  static enableFileTypes = [
    { ext: "png", mime: "image/png" },
    { ext: "jpg", mime: "image/jpeg" },
    { ext: "jpeg", mime: "image/jpeg" },
    { ext: "gif", mime: "image/gif" },
  ];
  static PATTERN_TYPES: PatternTypeEntry[] | null = null;

  protected _container!: HTMLElement;
  protected _overlay!: Overlay;
  protected _toolbar!: HTMLElement;
  protected _gradientEditor!: HTMLElement;
  protected _gradientActions!: HTMLElement;
  protected _colorEditor!: HTMLElement;
  protected _patternEditor!: HTMLElement;
  protected _noiseEditor!: HTMLElement;
  protected _colorMap!: HTMLElement;
  protected _colorSlider!: HTMLElement;
  protected _colorComponents!: HTMLElement;
  protected _systemColorInput!: HTMLInputElement;
  protected _colorPreview!: HTMLElement;
  protected _colorPreviewOld!: HTMLElement;
  protected _colorPreviewNew!: HTMLElement;
  protected _opacitySlider!: HTMLElement;
  protected _palettes!: HTMLElement;
  protected _activePalette: string | null = null;
  protected _swatchesScope = "user";
  protected _colorMode: string | undefined | null = null;
  protected _oldColor: Color = RGBColor.BLACK;
  protected _color: Color = RGBColor.BLACK;
  protected _oldColorOpacity = 100;
  protected _colorOpacity = 100;
  protected _activeGradientStop: ChooserStop | null = null;
  protected _activeGradient: Gradient | null = null;
  protected _pattern: Pattern | null = null;
  protected _patternUpdateBlocker = false;
  protected _texture: Pattern | null = null;
  protected _opacity: number | null = null;
  protected _settings: PatternChooserSettings | null = null;
  protected _isVisible = false;
  protected _extendedGamutInitiated: ExtendedGamutValue | null = null;
  protected _sliderColorThumb!: HTMLElement;
  protected _sliderOpacityThumb!: HTMLElement;
  protected _extValue: number[] | null = null;
  /** The touch chooser's context menu and the element it was opened on. */
  protected _contextMenu: { open(target: Element): void } | null = null;
  protected _currentLongPressTarget: Element | null = null;

  /** `overlay`: the touch chooser's extra overlay options. */
  constructor(overlay: OverlayOptions = {}) {
    this.initLayout();
    this._overlay = new Overlay(this._container, {
      releaseOnClose: false,
      padding: false,
      ...overlay,
    });
    this._listenClose();
  }

  /** The `.pattern-chooser` element (inside its `.g-overlay` wrapper). */
  getElement(): HTMLElement {
    return this._container;
  }

  getOverlay(): Overlay {
    return this._overlay;
  }

  getPattern(): Pattern | null {
    return this._pattern;
  }

  setPattern(pattern: Pattern | null): void {
    this._updatePattern(pattern, "set_pattern");
  }

  getOpacity(): number | null {
    return this._opacity;
  }

  setOpacity(opacity: number): void {
    this._updateOpacity(opacity, "set_opacity");
  }

  /** The old `.on("close")` of the container: lets the field keep the chooser open. */
  protected _listenClose(): void {
    this._overlay.on("close", (prevent, event) => {
      if (
        this._settings &&
        this._settings.onClose &&
        this._settings.onClose(this._pattern, this._opacity, prevent, event)
      ) {
        const document = activeDocument();
        if (document) {
          editorOf(document).removeEventListener(ModifiedEvent, this._closeIfNeeded, this);
          editorOf(document).keysOn([Key.Constant.OPTION]);
        }
        const manager = styleEdManager();
        if (manager && manager.isActivated())
          manager.removeEventListener(StyleEditorEvent, this._styleEditorHandler, this);
      }
    });
  }

  initLayout(): void {
    this._container = el("div", "pattern-chooser");
    this._toolbar = el("div", "toolbar");
    this._container.appendChild(this._toolbar);
    if (!PatternChooser.PATTERN_TYPES)
      PatternChooser.PATTERN_TYPES = PatternChooser.initPatternType();
    const typeSelect = el("select", "pattern-type-select");
    for (const type of PatternChooser.PATTERN_TYPES)
      typeSelect.appendChild(PatternChooser._createPatternOption(type));
    typeSelect.addEventListener("change", () => {
      const selected = typeSelect.selectedOptions[0];
      const type = selected ? typeOf.get(selected) : undefined;
      const mode = selectedColorMode();
      const pattern = (type as PatternTypeEntry).createDefault(this._pattern);
      this._updateOpacity(1);
      this._updatePattern(pattern, "set_type");
      this._updateSwatchesPalette(this._getSwatchScope("global", this._pattern));
      this._updateSwatchesPalette(this._getSwatchScope("document", this._pattern));
      this.setColorMode(mode);
      this._updateActiveGradient();
    });
    this._toolbar.appendChild(typeSelect);

    const modeSelect = el("select", "colormode-selector");
    for (const key of Object.keys(ColorMode) as (keyof typeof ColorMode)[]) {
      const option = el("option", "color-mode");
      colorModeOf.set(option, ColorMode[key]);
      option.textContent = PatternChooser.ColorModeLabel[key] as string;
      modeSelect.appendChild(option);
    }
    modeSelect.addEventListener("change", () => {
      const selected = modeSelect.selectedOptions[0];
      const mode = selected ? colorModeOf.get(selected) : undefined;
      const document = activeDocument() as Document;
      const elements = (document.getColorModeElms() as unknown[] | null) || [];
      const selection = editorOf(document).getIndividualSelection();
      if (selection) {
        elements.push(selection[0]);
        document.setColorModeElms(elements);
      }
      this.setColorMode(mode);
      this._updateActiveGradient();
    });
    this._toolbar.appendChild(modeSelect);

    this._gradientEditor = el("div", "gradient-editor");
    this._gradientEditor.appendChild(el("div", "stops"));
    this._gradientEditor.addEventListener("mousedown", (event) => {
      const position = offset(this._gradientEditor);
      const x = event.pageX - position.left;
      const stop: ChooserStop = {
        position: x / outerWidth(this._gradientEditor),
        color: this._defineStopInitColor(x),
        opacity: 1,
      };
      (this._activeGradient as Gradient).getStops().push(stop);
      const element = this._insertGradientStop(stop);
      this._setActiveGradientStop(stop);
      this._updatePatternFromActiveGradient();
      this._updateOnlineEditorStops();
      // Old: $(stop).trigger("mousedown"): only the stop's own handler, which starts the drag.
      (stopPressOf.get(element) as (event: { stopPropagation(): void }) => void)({
        stopPropagation: () => undefined,
      });
    });
    this._container.appendChild(this._gradientEditor);
    this._patternEditor = this._createPatternEditor();
    this._container.appendChild(this._patternEditor);
    this._noiseEditor = this._createNoiseEditor();
    this._container.appendChild(this._noiseEditor);
    this._colorEditor = el("div", "color-editor");
    this._container.appendChild(this._colorEditor);
    this._systemColorInput = el("input");
    this._systemColorInput.setAttribute("type", "color");
    css(this._systemColorInput, "position", "absolute");
    css(this._systemColorInput, "visibility", "hidden");
    this._systemColorInput.addEventListener("change", () => {
      this._updateColor(RGBColor.fromCSSColor(this._systemColorInput.value) as Color);
    });
    this._colorEditor.appendChild(this._systemColorInput);
    this._colorMap = el("div", "color-map");
    this._colorMap.appendChild(el("canvas"));
    const mapOverlay = el("div", "overlay");
    mapOverlay.addEventListener("mousedown", (event) => this._colorMapMouseDown(event));
    mapOverlay.addEventListener("touchstart", (event) => this._colorMapMouseDown(event));
    mapOverlay.addEventListener("mousemove", (event) => {
      if (event.isTrusted) {
        event.preventDefault();
        event.stopPropagation();
      }
    });
    this._colorMap.appendChild(mapOverlay);
    this._colorMap.appendChild(el("div", "marker"));
    this._colorEditor.appendChild(this._colorMap);
    const details = el("div", "color-details");
    this._colorEditor.appendChild(details);
    const dropperButton = el("div", "color-eyedropper g-flat eye-drop");
    new EyeDropper(dropperButton);
    onPatternEvent(dropperButton, "colorchange", (_event, rgba) => {
      this._updateColor(new RGBColor(rgba));
      this._updateOpacity((rgba[3] as number) / 255, "eyedropper");
    });
    details.appendChild(dropperButton);
    const sliders = el("div", "color-sliders");
    details.appendChild(sliders);
    this._colorSlider = colorSlider(el("div"));
    css(this._colorSlider, "box-sizing", "border-box");
    this._colorSlider.addEventListener("input", () => this._updateColorFromColorSlider(true));
    this._colorSlider.addEventListener("change", () => this._updateColorFromColorSlider());
    sliders.appendChild(this._colorSlider);
    this._opacitySlider = slider(el("div"), OPACITY_DEFAULT);
    css(this._opacitySlider, "box-sizing", "border-box");
    this._opacitySlider.addEventListener("input", () => {
      this._updateOpacity(Number(this._sliderValue(this._opacitySlider)) / 100, "slider", true);
    });
    this._opacitySlider.addEventListener("change", () => {
      this._updateOpacity(
        Number(this._sliderValue(this._opacitySlider)) / 100,
        "slider",
        false,
        true,
      );
    });
    sliders.appendChild(this._opacitySlider);
    this._sliderColorThumb = this._colorSlider.querySelector(
      ".g-input-slider-thumb",
    ) as HTMLElement;
    css(this._sliderColorThumb, "box-sizing", "border-box");
    this._sliderOpacityThumb = this._opacitySlider.querySelector(
      ".g-input-slider-thumb",
    ) as HTMLElement;
    css(this._sliderOpacityThumb, "box-sizing", "border-box");
    const previewContainer = el("div", "color-preview-container");
    details.appendChild(previewContainer);
    this._colorPreview = el("div", "color-preview");
    css(this._colorPreview, "background", Pattern.asCSSBackground(null, 0));
    previewContainer.appendChild(this._colorPreview);
    this._colorPreviewOld = el("div", "color-preview-old");
    this._colorPreview.appendChild(this._colorPreviewOld);
    this._colorPreviewNew = el("div", "color-preview-new");
    this._colorPreview.appendChild(this._colorPreviewNew);
    this._colorPreview.appendChild(el("div", "color-preview-overlay"));
    this._colorComponents = el("div", "color-components");
    this._colorEditor.appendChild(this._colorComponents);

    this._gradientActions = el("div", "gradient-actions");
    const exchange = el("button", "g-flat");
    exchange.setAttribute("data-action", "exchange");
    exchange.setAttribute("data-title", text("GPatternChooser", "action.change-stops-order"));
    exchange.addEventListener("click", () => {
      const stops = (this._activeGradient as Gradient).getStops();
      for (let n = 0; n < stops.length; ++n) {
        const stop = stops[n] as ChooserStop;
        stop.position = 1 - stop.position;
        this._updateGradientStop(stop);
      }
      this._updatePatternFromActiveGradient();
    });
    exchange.appendChild(el("span", "gravit-icon-exchange"));
    this._gradientActions.appendChild(exchange);
    const rotate = el("div", "g-flat");
    css(rotate, "float", "right");
    for (const [action, title, icon, angle] of [
      ["rotate-left", "action.rotate-gradient-left", "gravit-icon-rotate-left", -45],
      ["rotate-right", "action.rotate-gradient-right", "gravit-icon-rotate-right", 45],
    ] as const) {
      const button = el("button", "g-flat");
      button.setAttribute("data-action", action);
      button.setAttribute("data-title", text("GPatternChooser", title));
      button.addEventListener("click", () => this._rotateActiveGradient(angle));
      button.appendChild(el("span", icon));
      rotate.appendChild(button);
    }
    this._gradientActions.appendChild(rotate);
    this._container.appendChild(this._gradientActions);

    this._palettes = el("div", "palettes");
    this._container.appendChild(this._palettes);
    const activate = (event: globalThis.Event) => {
      const target = event.target instanceof Element ? event.target : null;
      const palette = target ? target.closest("[data-palette]") : null;
      this._activatePalette(palette ? palette.getAttribute("data-palette") : null);
    };
    this._palettes.appendChild(this._createChoosers(activate));
    const colors = el("div", "palette colors-palette");
    colors.setAttribute("data-palette", "colors");
    this._palettes.appendChild(colors);
    this._createColorsPalette(colors);
    const mixer = el("div", "palette mixer-palette");
    mixer.setAttribute("data-palette", "mixer");
    this._palettes.appendChild(mixer);
    this._createMixerPalette(mixer);
    const used = el("div", "palette used-palette");
    used.setAttribute("data-palette", "used");
    this._palettes.appendChild(used);
    const global = el("div", "palette swatches-palette global");
    global.setAttribute("data-palette", "swatches");
    this._palettes.appendChild(global);
    // Old: " trial" when the swatches button had the licence's trial badge; never now.
    this._createSwatchesPalette(global, "global");
    const documentSwatches = el("div", "palette swatches-palette document");
    documentSwatches.setAttribute("data-palette", "swatches");
    this._palettes.appendChild(documentSwatches);
    this._createSwatchesPalette(documentSwatches, "document");
    this._swatchesScope = this._getSwatchScope("global", this._pattern);
    this._activatePalette("colors");
    for (const button of this._container.querySelectorAll("button"))
      button.addEventListener("mousedown", (event) => event.preventDefault());
    this.setColorMode(ColorMode.RGB);
  }

  /** The palette buttons (Colors, Swatches, In use, Mixer). */
  protected _createChoosers(activate: (event: globalThis.Event) => void): HTMLElement {
    const chooser = el("div", "chooser");
    for (const [palette, className, key] of [
      ["colors", "GCommonNames", "text.colors"],
      ["swatches", "GPatternChooser", "text.swatches"],
      ["used", "GPatternChooser", "text.in-use"],
      ["mixer", "GPatternChooser", "text.mixer"],
    ] as const) {
      const button = el("button");
      button.setAttribute("data-palette", palette);
      button.textContent = text(className, key);
      button.addEventListener("click", activate);
      chooser.appendChild(button);
    }
    return chooser;
  }

  __getColorModeParams(): ColorModeParams {
    return { hexWidth: "27%", isTouchEnabled: false, rgbWidth: "15%", cmykWidth: "18%" };
  }

  /** Converts the stops of the edited gradient to the current color mode. */
  protected _updateActiveGradient(): void {
    if (this._activeGradient) {
      const stops = this._activeGradient.getStops();
      if (stops && stops.length) {
        const mode = FRAMEWORK_COLOR_MODE[this._colorMode as string] || Color.ColorModes.RGB;
        stops.forEach((stop) => {
          const converted = ColorHelper.convertColor(stop.color, mode);
          if (converted) stop.color = converted;
          this._updateGradientStop(stop);
        });
        this._updatePatternFromActiveGradient();
      }
    }
  }

  /** Shows the hex, RGB/HSB or CMYK boxes and the alpha box; `force` rebuilds the same mode. */
  setColorMode(mode: string | undefined | null, force?: boolean): void {
    const params = this.__getColorModeParams();
    if (mode === this._colorMode && !force) return;
    this._colorMode = mode;
    let converted: Color | null = null;
    for (const option of this._toolbar.querySelectorAll(".color-mode")) {
      const value = colorModeOf.get(option);
      if (value) (option as HTMLOptionElement).selected = mode === value;
    }
    this._colorComponents.replaceChildren();
    if (this._colorMode === ColorMode.RGB || this._colorMode === ColorMode.HSV) {
      css(this._colorMap, "display", "");
      css(this._colorSlider, "display", "");
      this._colorEditor.classList.toggle("cmyk-mode", false);
      this._opacitySlider.classList.toggle("cmyk-mode", false);
      const hexLabel = el("label");
      css(hexLabel, "width", params.hexWidth);
      hexLabel.setAttribute("data-css", "");
      const hex = el("input");
      hex.setAttribute("type", "text");
      hex.setAttribute("data-long-press-delay", "500");
      inputBox(hex, { keyIncrement: false, wheelIncrement: false, mousemoveIncrement: false });
      hex.addEventListener("long-press", (event) => {
        if (params.isTouchEnabled && this._contextMenu) {
          this._currentLongPressTarget = event.target as Element;
          this._contextMenu.open(event.target as Element);
        }
      });
      hex.addEventListener("change", () => {
        let color: Color | null = RGBColor.fromCSSColor(hex.value);
        if (!color) color = this._color;
        if (mode === ColorMode.HSV)
          color = new HSVColor(Color.rgbToHSV(color.getValue() as number[]));
        this._updateColor(color, null, false, true);
      });
      const filter = (event: globalThis.Event) => {
        let value = hex.value;
        if ("keydown" === event.type) {
          const keyEvent = event as KeyboardEvent;
          // \u017F (long s) and \u212A (Kelvin sign) come from the old
          // transpiled /[0-9a-z]/iu class, which matches them case-insensitively.
          const typed = /[0-9a-z\u017F\u212A]/i.test(
            String.fromCharCode(keyEvent.keyCode || keyEvent.charCode),
          );
          if (value.length >= 7 && typed && hex.selectionStart === hex.selectionEnd) {
            // Old: `return false` from the jQuery handler.
            event.preventDefault();
            event.stopPropagation();
            return;
          }
        }
        if (!value.startsWith("#")) {
          value = "#" + value;
          hex.value = value;
        }
        const match = /^#[0-9A-Za-z]{0,6}/.exec(value);
        if (match && match[0] && value !== match[0]) hex.value = match[0];
      };
      hex.addEventListener("paste", filter);
      hex.addEventListener("keydown", filter);
      hex.addEventListener("keyup", filter);
      hexLabel.appendChild(hex);
      const hexCaption = el("span");
      hexCaption.textContent = text("GPatternChooser", "text.hex");
      hexLabel.appendChild(hexCaption);
      this._colorComponents.appendChild(hexLabel);
      if (params.isTouchEnabled) {
        const gap = el("div");
        css(gap, "width", "11%");
        this._colorComponents.appendChild(gap);
      }
      const names = this._colorMode === ColorMode.RGB ? ["R", "G", "B"] : ["H", "S", "B"];
      names.forEach((name, index) => {
        let max = 0;
        switch (name) {
          case "R":
          case "G":
          case "B":
            if (this._colorMode === ColorMode.RGB) max = 255;
            else if (this._colorMode === ColorMode.HSV) max = 100;
            break;
          case "H":
            max = 360;
            break;
          case "S":
            max = 100;
        }
        const label = el("label");
        css(label, "width", params.rgbWidth);
        label.setAttribute("data-component-index", String(index));
        const input = el("input");
        input.setAttribute("type", "text");
        inputBox(input, { minValue: 0, maxValue: max });
        label.appendChild(input);
        const caption = el("span");
        caption.textContent = name;
        label.appendChild(caption);
        this._colorComponents.appendChild(label);
      });
    } else if (this._colorMode === ColorMode.CMYK) {
      css(this._colorMap, "display", "none");
      this._colorEditor.classList.toggle("cmyk-mode", true);
      this._opacitySlider.classList.toggle("cmyk-mode", true);
      css(this._colorSlider, "display", "none");
      ["C", "M", "Y", "K"].forEach((name, index) => {
        const label = el("label", "cymk-label");
        // Old: .css("width", undefined) wrote nothing (the touch chooser's
        // "cymkWidth"; see "The touch chooser's CMYK boxes have no width" in QUESTIONS.md).
        if (params.cmykWidth !== undefined) css(label, "width", params.cmykWidth);
        label.setAttribute("data-component-index", String(index));
        const input = el("input");
        input.setAttribute("type", "text");
        inputBox(input, { minValue: 0, maxValue: 100, postfix: "%" });
        label.appendChild(input);
        const caption = el("span");
        caption.textContent = name;
        label.appendChild(caption);
        this._colorComponents.appendChild(label);
      });
      if (!(this._color instanceof CMYKColor))
        converted = new CMYKColor(Color.rgbToCMYK(this._color.toScreen()));
    }
    for (const input of this._colorComponents.querySelectorAll("[data-component-index] input"))
      input.addEventListener("change", () => this._updateColorFromColorComponents());
    const alphaLabel = el("label");
    css(alphaLabel, "width", "18%");
    alphaLabel.setAttribute("data-opacity", "");
    const alpha = el("input");
    alpha.setAttribute("type", "text");
    inputBox(alpha, { minValue: 0, maxValue: 100, postfix: "%" });
    boxValue(alpha, formatOpacity(100 * this._colorOpacity));
    alpha.addEventListener("change", () => {
      this._updateOpacity((Length.parseEquationValue(readBox(alpha)) as number) / 100, "input");
    });
    alphaLabel.appendChild(alpha);
    const alphaCaption = el("span");
    alphaCaption.textContent = "A";
    alphaLabel.appendChild(alphaCaption);
    this._colorComponents.appendChild(alphaLabel);
    this._updateColorMap();
    if (converted) this._updateColor(converted, "mode");
    else this._updateColorComponentsFromColor();
    this._relayout();
  }

  /** Opens the chooser at the field `target` with the field's settings. */
  open(target: HTMLElement, settings: Partial<PatternChooserSettings>): void {
    this._updateSettings(settings, true);
    this._overlay.open(target);
    if ("used" === this._activePalette) this._updateUsedPalette();
    const manager = styleEdManager();
    if (manager && manager.isActivated())
      manager.addEventListener(StyleEditorEvent, this._styleEditorHandler, this);
    const document = activeDocument();
    if (document) {
      editorOf(document).addEventListener(ModifiedEvent, this._closeIfNeeded, this);
      editorOf(document).keysOff([Key.Constant.OPTION]);
    }
  }

  close(): void {
    this._overlay.close();
  }

  /** Whether the chooser is open (for the field `target`, when given). */
  isOpenned(target?: HTMLElement | null): boolean {
    return this._overlay.isOpenned(target);
  }

  setActiveGradientStopByIdx(index: number | null | undefined): void {
    if (this._activeGradient && null !== index) {
      const stops = this._activeGradient.getStops();
      if ((index as number) >= 0 && (index as number) < stops.length) {
        const stop = stops[index as number] as ChooserStop;
        this._setActiveGradientStop(stop);
        this._updateOnlineEditorStops();
      }
    }
  }

  /** Takes the field's settings (`replace`: instead of merging with the previous ones). */
  _updateSettings(
    settings: Partial<PatternChooserSettings> | null | undefined,
    replace?: boolean,
  ): void {
    this._settings = replace
      ? extend<PatternChooserSettings>({ types: [] }, settings)
      : extend<PatternChooserSettings>({ types: [] }, this._settings, settings);
    const { types, singleOption } = this._settings;
    if (singleOption) css(this._toolbar, "display", "none");
    else {
      if ("none" === cssValue(this._toolbar, "display")) css(this._toolbar, "display", "");
      const options: HTMLOptionElement[] = [];
      const all = PatternChooser.PATTERN_TYPES as PatternTypeEntry[];
      for (let t = 0, count = all.length; t < count; t++) {
        const type = all[t] as PatternTypeEntry;
        let compatible = !types.length;
        if (!compatible)
          for (let r = 0; r < types.length; ++r) {
            if (type.isCompatible(types[r])) {
              compatible = true;
              break;
            }
          }
        if (compatible) options.push(PatternChooser._createPatternOption(type));
      }
      const select = this._toolbar.querySelector(".pattern-type-select") as HTMLSelectElement;
      select.replaceChildren(...options);
    }
    const slider = sliderOf(this._opacitySlider);
    if (slider)
      slider.disabled(
        Object.prototype.hasOwnProperty.call(this._settings, "hasOpacity") &&
          !this._settings.hasOpacity,
      );
    for (const mask of this._patternEditor.querySelectorAll('[data-property="texture_mask"]'))
      setDisabledProp(mask, !this._settings.hasMask);
  }

  protected _createNoiseEditor(): HTMLElement {
    const editor = el("div", "noise-editor");
    const amountSlider = slider(el("div"), { min: 0, max: 100 });
    amountSlider.setAttribute("data-property", "noise_amount");
    amountSlider.addEventListener("input", () => {
      const amount = parseFloat(String(this._sliderValue(amountSlider))) / 100;
      boxValue(
        editor.querySelector('[type="text"][data-property="noise_amount"]'),
        formatNumber(100 * amount, 0),
      );
      if (this._pattern) {
        const pattern = this._pattern.clone() as NoisePattern;
        pattern.setAmount(amount);
        this._updatePattern(pattern, "noise_amount", null, true);
      }
    });
    amountSlider.addEventListener("change", () => {
      if (this._pattern) {
        const pattern = this._pattern.clone() as NoisePattern;
        pattern.setAmount(parseFloat(String(this._sliderValue(amountSlider))) / 100);
        this._updatePattern(pattern, "noise_amount");
      }
    });
    const amountInput = el("input");
    amountInput.setAttribute("data-property", "noise_amount");
    amountInput.setAttribute("type", "text");
    amountInput.addEventListener("change", () => {
      if (this._pattern) {
        const pattern = this._pattern.clone() as NoisePattern;
        pattern.setAmount((Length.parseEquationValue(readBox(amountInput)) as number) / 100);
        this._updatePattern(pattern, "noise_amount");
      }
    });
    inputBox(amountInput, { minValue: 0, maxValue: 100, incrementValue: 1 });
    const amountRow = propertyRow(el("div"), {
      label: text("GPatternChooser", "text.intensity"),
      columns: [
        { width: "auto", content: amountSlider },
        { width: "40px", content: amountInput },
      ],
    });
    editor.appendChild(amountRow);
    const typeSelect = enumSelect(NoisePattern.Type as Record<string, string>, "noise", "type");
    typeSelect.setAttribute("data-property", "noise_type");
    typeSelect.addEventListener("change", () => {
      if (this._pattern) {
        const pattern = this._pattern.clone() as NoisePattern;
        pattern.setType(typeSelect.value as Parameters<NoisePattern["setType"]>[0]);
        this._updatePattern(pattern, "noise_type");
      }
    });
    editor.appendChild(
      propertyRow(el("div"), {
        label: text("GPatternChooser", "text.type"),
        columns: [{ width: "auto", content: typeSelect }],
      }),
    );
    return editor;
  }

  protected _createPatternEditorFirstRow(choose: () => void, paste: () => void): RowColumn[] {
    const chooseButton = el("button", "pattern-choose-image-button");
    chooseButton.innerHTML = text("GPatternChooser", "action.choose-image") + "...";
    chooseButton.addEventListener("click", choose);
    const pasteButton = el("button", "paste-btn g-flat");
    pasteButton.appendChild(el("span", "gravit-icon-paste"));
    const pasteTitle = el("span", "title");
    // Old: .html() with the string table text.
    pasteTitle.innerHTML = text("GPasteAction", "title");
    pasteButton.appendChild(pasteTitle);
    pasteButton.addEventListener("click", paste);
    return [
      { padding: false, content: chooseButton },
      { width: "auto", content: pasteButton },
    ];
  }

  protected _createPatternEditorMaskRow(onMask: (event: globalThis.Event) => void): RowColumn[] {
    const caption = el("span");
    caption.textContent = text("GPatternChooser", "action.set-transparency-mask");
    const toggle = el("label", "g-switch");
    const checkbox = el("input");
    checkbox.setAttribute("type", "checkbox");
    checkbox.setAttribute("data-property", "texture_mask");
    checkbox.disabled = true;
    checkbox.addEventListener("change", onMask);
    toggle.append(checkbox, el("div"));
    return [
      { padding: false, width: "auto", content: caption },
      { padding: false, width: "40px", content: toggle },
    ];
  }

  protected _createPatternEditorScaleRow(
    onInput: (event: globalThis.Event) => void,
    onChange: (event: globalThis.Event) => void,
    onBox: (event: globalThis.Event) => void,
  ): RowColumn[] {
    const tile = slider(el("div"), { min: 10, max: 200 });
    tile.setAttribute("data-property", "texture_tile");
    tile.addEventListener("input", onInput);
    tile.addEventListener("change", onChange);
    const box = el("input");
    box.setAttribute("data-property", "texture_tile");
    box.setAttribute("type", "text");
    box.addEventListener("change", onBox);
    inputBox(box, { minValue: 10, maxValue: 200, incrementValue: 1, postfix: "%" });
    return [
      { width: "auto", content: tile },
      { width: "40px", content: box },
    ];
  }

  protected _createPatternEditorAdvancedRow(advanced: HTMLElement): RowColumn[] {
    const button = el("button");
    button.innerHTML = text("GCommonNames", "text.advanced");
    button.addEventListener("click", () => slideToggle(advanced));
    return [{ width: "auto", content: button }];
  }

  __getCreatePatternEditorParams(): PatternEditorParams {
    return {
      isTouchEnabled: false,
      repeatWidth: "50%",
      ghostWidth: "0%",
      postionWith: "50%",
      sizeWidth: "52%",
      unitWidth: "10%",
    };
  }

  protected _createPatternEditor(): HTMLElement {
    const params = this.__getCreatePatternEditorParams();
    const editor = el("div", "pattern-editor");
    const onMask = (event: globalThis.Event) => {
      const pattern = (this._pattern as TexturePattern).clone() as TexturePattern;
      pattern.setMask((event.target as HTMLInputElement).checked);
      this._updatePattern(pattern, "texture_mask");
    };
    const onTileInput = (event: globalThis.Event) => {
      const target = event.target as HTMLElement;
      const property = target.getAttribute("data-property");
      const size = parseFloat(String(this._sliderValue(target))) / 100;
      for (const box of editor.querySelectorAll(`[type="text"][data-property="${property}"]`))
        boxValue(box, formatNumber(100 * size, 0));
      if (this._pattern) {
        const pattern = this._pattern.clone() as TexturePattern;
        pattern.setTileSize(size);
        this._updatePattern(pattern, "texture_tile", null, true);
      }
    };
    const onTileChange = (event: globalThis.Event) => {
      if (this._pattern) {
        const pattern = this._pattern.clone() as TexturePattern;
        pattern.setTileSize(
          parseFloat(String(this._sliderValue(event.target as HTMLElement))) / 100,
        );
        this._updatePattern(pattern, "texture_tile");
      }
    };
    const onTileBox = (event: globalThis.Event) => {
      if (this._pattern) {
        const pattern = this._pattern.clone() as TexturePattern;
        pattern.setTileSize(
          (Length.parseEquationValue(readBox(event.target as HTMLInputElement)) as number) / 100,
        );
        this._updatePattern(pattern, "texture_tile");
      }
    };
    const section = el("div", "choose-section");
    const previewContainer = el("div", "pattern-preview-container");
    previewContainer.appendChild(el("div", "pattern-preview"));
    section.appendChild(previewContainer);
    const info = el("div", "pattern-info-container");
    info.appendChild(
      propertyRow(el("div"), {
        clazz: "first-row",
        columns: this._createPatternEditorFirstRow(
          () => this._chooseImage(),
          () => this._pasteTexture(),
        ),
      }),
    );
    const scaleSelect = enumSelect(
      TexturePattern.ScaleMode as Record<string, string>,
      "texture",
      "scale",
    );
    scaleSelect.setAttribute("data-property", "texture_scale");
    scaleSelect.addEventListener("change", () => {
      if (this._pattern) {
        const pattern = this._pattern.clone() as TexturePattern;
        pattern.setScaleMode(scaleSelect.value);
        (TexturePattern.ScaleSettings[scaleSelect.value] as (texture: TexturePattern) => void)(
          pattern,
        );
        this._updatePattern(pattern, "texture_pattern");
      }
    });
    info.appendChild(
      propertyRow(el("div"), { columns: [{ width: "100%", content: scaleSelect }] }),
    );
    info.appendChild(
      propertyRow(el("div"), {
        columns: params.isTouchEnabled
          ? this._createPatternEditorMaskRow(onMask)
          : this._createPatternEditorScaleRow(onTileInput, onTileChange, onTileBox),
      }),
    );
    section.appendChild(info);
    editor.appendChild(section);
    // Old: .addClass("") for the desktop, which adds nothing.
    editor.appendChild(
      propertyRow(el("div", params.isTouchEnabled ? "scale" : ""), {
        columns: params.isTouchEnabled
          ? this._createPatternEditorScaleRow(onTileInput, onTileChange, onTileBox)
          : this._createPatternEditorMaskRow(onMask),
      }),
    );
    const advanced = el("div", "pattern-advanced-settings");
    editor.appendChild(
      propertyRow(el("div"), { columns: this._createPatternEditorAdvancedRow(advanced) }),
    );
    const repeat = enumSelect(
      TexturePattern.RepeatMode as Record<string, string>,
      "texture",
      "repeat",
    );
    repeat.setAttribute("data-property", "texture_repeat");
    repeat.addEventListener("change", () => {
      if (this._pattern) {
        const pattern = this._pattern.clone() as TexturePattern;
        pattern.setRepeatMode(repeat.value);
        this._updatePattern(pattern, "texture_repeat");
      }
    });
    const position = enumSelect(
      TexturePattern.PositionMode as Record<string, string>,
      "texture",
      "position",
    );
    position.setAttribute("data-property", "texture_position");
    position.addEventListener("change", () => {
      if (this._pattern) {
        const pattern = this._pattern.clone() as TexturePattern;
        pattern.setPosition(position.value);
        this._updatePattern(pattern, "texture_position");
      }
    });
    const settingsRow = propertyRow(el("div"), {
      columns: [
        {
          label: text("GPatternChooser", "text.repeat"),
          width: params.repeatWidth,
          content: repeat,
        },
        { width: params.ghostWidth },
        {
          label: text("GCommonNames", "text.position"),
          width: params.postionWith,
          content: position,
        },
      ],
    });
    const size = enumSelect(
      TexturePattern.SizeMode as unknown as Record<string, string>,
      "texture",
      "size",
    );
    size.setAttribute("data-property", "texture_size");
    size.addEventListener("change", () => {
      if (this._pattern) {
        const pattern = this._pattern.clone() as TexturePattern;
        pattern.setSizeMode(size.value);
        this._updatePattern(pattern, "texture_size");
      }
    });
    const sizeInput = (property: string, set: (pattern: TexturePattern, value: number) => void) => {
      const input = el("input");
      input.setAttribute("data-property", property);
      input.setAttribute("type", "text");
      input.addEventListener("change", () => {
        if (this._pattern) {
          const value = Length.parseEquationValue(input.value);
          if (null !== value && value >= 0) {
            const pattern = this._pattern.clone() as TexturePattern;
            set(pattern, value);
            this._updatePattern(pattern, "texture_size");
          }
        }
      });
      return inputBox(input);
    };
    const unit = el("label");
    unit.setAttribute("data-property", "texture_size_u");
    // The second call on the same row appends a second set of columns and captions.
    propertyRow(settingsRow, {
      columns: [
        { label: text("GCommonNames", "text.size"), width: params.sizeWidth, content: size },
        { width: params.ghostWidth },
        {
          label: text("GCommonNames", "text.width"),
          width: "20%",
          content: sizeInput("texture_size_w", (pattern, value) => pattern.setWidth(value)),
        },
        {
          label: text("GCommonNames", "text.height"),
          width: "20%",
          content: sizeInput("texture_size_h", (pattern, value) => pattern.setHeight(value)),
        },
        {
          label: params.isTouchEnabled ? "" : text("GCommonNames", "text.unit"),
          width: params.unitWidth,
          content: unit,
        },
      ],
    });
    advanced.appendChild(settingsRow);
    editor.appendChild(advanced);
    return editor;
  }

  /** "Choose image...": a png, jpg or gif from the document's storage becomes the texture. */
  private _chooseImage(): void {
    const document = activeDocument();
    const storage = (document ? document.getStorage() : null) || designer().getDefaultStorage();
    if (storage && storage.canPromptOpen()) {
      storage.openPrompt(
        PatternChooser.enableFileTypes,
        (item) => {
          item.read((data) => {
            const reader = new FileReader();
            reader.onload = () => {
              const url = reader.result as string;
              let pattern: TexturePattern;
              if (this._pattern instanceof TexturePattern) {
                pattern = this._pattern.clone() as TexturePattern;
                pattern.setTexture(url);
              } else {
                pattern = new TexturePattern(url);
                pattern.setScene(
                  (activeDocument() as Document).getScene() as unknown as Parameters<
                    TexturePattern["setScene"]
                  >[0],
                );
              }
              this._updatePattern(pattern, "texture_upload");
            };
            reader.readAsDataURL(new Blob([data as BlobPart]));
          });
        },
        false,
      );
    }
  }

  /** Paste: the first shape or group on the clipboard becomes the texture. */
  private _pasteTexture(): void {
    let pasted = false;
    const nodes = Node.deserialize(designer().getClipboardContent(Node.MIME_TYPE) as string) as
      Node[] | null;
    if (nodes && nodes.length)
      for (let n = 0; n < nodes.length; ++n) {
        const node = nodes[n] as Node;
        if (node.hasMixin(VertexSource) || node instanceof Group) {
          if (this._pattern) {
            const pattern = this._pattern.clone() as TexturePattern;
            pattern.setTexture(node as unknown as Parameters<TexturePattern["setTexture"]>[0]);
            this._updatePattern(pattern, "texture_paste");
          }
          pasted = true;
          break;
        }
      }
    // The old app showed the arrowhead message here (BUG-133). The string
    // table is the old bundle's, so the texture message is English only.
    if (!pasted) window.alert(TEXTURE_PASTE_ALERT);
  }

  __getCreatePaletteSwatchParamas(): TouchParams {
    return { isTouchEnabled: false };
  }

  /** The last `.swatches` row of a palette, or a new one when it is full (8). */
  protected _findOrCreateLastSwitchContiner(palette: HTMLElement): HTMLElement {
    const rows = palette.querySelectorAll<HTMLElement>(".swatches");
    let row = rows.length > 0 ? (rows[rows.length - 1] as HTMLElement) : null;
    if (row) {
      if (row.querySelectorAll(".swatch").length >= 8) {
        row = el("div", "swatches");
        palette.appendChild(row);
      }
    } else {
      row = el("div", "swatches");
      palette.appendChild(row);
    }
    return row;
  }

  /**
   * Adds a swatch button for a color or swatch to `parent`. `draggable`
   * swatches (the swatches palettes) can be reordered and dragged out to
   * remove them; `newRow` starts a row in touch mode.
   */
  protected _createPaletteSwatch(
    source: Color | Swatch,
    parent: HTMLElement,
    draggable?: boolean,
    newRow?: boolean,
  ): void {
    const params = this.__getCreatePaletteSwatchParamas();
    const swatch = source instanceof Swatch ? source : new Swatch(source);
    let row = parent;
    if (params.isTouchEnabled) {
      if (newRow) {
        row = el("div", "swatches");
        parent.appendChild(row);
      } else row = this._findOrCreateLastSwitchContiner(parent);
    }
    const onDragStart = (event: DragEvent) => {
      if (!PatternChooser.canDragSwatch) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      const dragged = (event.target as Element).closest(".swatch") as HTMLElement;
      const position = offset(dragged);
      event.stopPropagation();
      PatternChooser.dragSwatch = dragged;
      PatternChooser.hasDropped = false;
      PatternChooser.dragDeltaX = event.pageX - position.left;
      PatternChooser.dragDeltaY = event.pageY - position.top;
      const transfer = event.dataTransfer as DataTransfer;
      transfer.effectAllowed = "move";
      transfer.setData("text/plain", "dummy_data");
    };
    const onDragEnd = (event: DragEvent) => {
      event.stopPropagation();
      for (const overlay of row.querySelectorAll(".grid-drag-overlay")) overlay.remove();
      let outside = false;
      const chooser = document.querySelector(".pattern-chooser") as HTMLElement;
      const box = offset(chooser);
      const top = box.top;
      const left = box.left;
      const right = left + jqWidth(chooser);
      const bottom = top + jqHeight(chooser);
      const x = event.pageX;
      const y = event.pageY;
      if (x > right || x < left || y > bottom || y < top) outside = true;
      if (PatternChooser.dragSwatch && outside) {
        const editor = editorOf(activeDocument() as Document);
        editor.beginTransaction();
        try {
          const dragged = swatchOf.get(PatternChooser.dragSwatch) as Swatch;
          const scope = this._getSwatchScope(
            (PatternChooser.dragSwatch.closest(".swatches-wrapper") as Element).classList.contains(
              "global",
            )
              ? "global"
              : "document",
            dragged.getProperty("_pt"),
          );
          let list = designer().getSwatches(scope);
          if (dragged && list) {
            for (let n = 0; n < list.length; ++n) {
              if (equals(dragged, list[n])) {
                list = list.slice();
                list.splice(n, 1);
                break;
              }
            }
            designer().setSwatches(scope, list);
          }
        } finally {
          editor.commitTransaction(text("GPatternChooser", "action.remove-swatch"), {
            chooserOn: true,
          });
        }
      }
      PatternChooser.hasDropped = false;
    };
    let pattern = swatch.getProperty("_pt") as Pattern | null;
    const isTexture = pattern instanceof TexturePattern && !(pattern instanceof NoisePattern);
    if (activeDocumentOrNull() && isTexture) pattern = this._clonePattern(pattern as Pattern);
    const opacity = swatch.getProperty("_op") as number;
    const element = el("div", "swatch");
    css(element, "background", Pattern.asCSSBackground(pattern, opacity));
    swatchOf.set(element, swatch);
    // Old: .attr("draggable", n), which writes nothing when n is undefined (the mixer).
    if (draggable !== undefined) element.setAttribute("draggable", String(draggable));
    element.setAttribute("data-long-press-delay", "500");
    element.addEventListener("long-press", (event) => {
      if (params.isTouchEnabled && this._contextMenu) {
        this._currentLongPressTarget = event.target as Element;
        this._contextMenu.open(event.target as Element);
      }
    });
    element.addEventListener("click", (event) => {
      const clicked = swatchOf.get(
        (event.target as Element).closest(".swatch") as Element,
      ) as Swatch;
      const clickedPattern = clicked.getProperty("_pt") as Pattern | null;
      const clickedOpacity = clicked.getProperty("_op") as number;
      const mode = selectedColorMode();
      if (Platform.modifiers.optionKey) {
        const editor = editorOf(activeDocument() as Document);
        const nodes = editor.selectFromPattern(clickedPattern, true);
        if (nodes) {
          for (const open of document.querySelectorAll(".g-overlay .pattern-chooser")) {
            const overlay = Overlay.of(open);
            if (overlay) overlay.close();
          }
          editor.updateSelection(false, nodes);
          editor.blinkSelection(2e3, 4);
          const previews = document.querySelectorAll(
            ".fill-properties-panel .g-pattern-chooser .preview",
          );
          for (let c = 0; c < previews.length; ++c) {
            const target = PatternTarget.of(previews[c] as Element);
            if (target && equals(target.pattern, clickedPattern)) {
              (previews[c] as HTMLElement).click();
              break;
            }
          }
        }
      } else {
        this._updateOpacity(clickedOpacity);
        this._updatePattern(clickedPattern, "set_type", true);
      }
      this.setColorMode(mode);
    });
    row.appendChild(element);
    if (swatch.isCMYK()) this._addCmykIcon(element);
    if (draggable) {
      element.addEventListener("mousedown", (event) => {
        PatternChooser.canDragSwatch = (event.target as Element).classList.contains("swatch");
      });
      element.addEventListener("dragenter", () => {
        const dragged = PatternChooser.dragSwatch as HTMLElement;
        const fromGlobal = (dragged.closest(".swatches-wrapper") as Element).classList.contains(
          "global",
        );
        const toGlobal = (element.closest(".swatches-wrapper") as Element).classList.contains(
          "global",
        );
        const sameKind =
          (swatchOf.get(dragged) as Swatch).isCMYK() === (swatchOf.get(element) as Swatch).isCMYK();
        if (!(!((fromGlobal && toGlobal) || (!fromGlobal && !toGlobal)) || !sameKind))
          element.classList.add("g-drop");
      });
      element.addEventListener("dragleave", () => element.classList.remove("g-drop"));
      element.addEventListener("dragstart", onDragStart);
      element.addEventListener("dragend", onDragEnd);
      element.addEventListener("dragover", (event) => event.preventDefault());
      element.addEventListener("drop", () => {
        for (const overlay of row.querySelectorAll(".grid-drag-overlay")) overlay.remove();
        const dragged = PatternChooser.dragSwatch as HTMLElement;
        const wrapper = dragged.closest(".swatches-wrapper") as Element;
        const drops = wrapper.querySelectorAll(".g-drop");
        for (const drop of drops) drop.classList.remove("g-drop");
        if (PatternChooser.dragSwatch && drops.length > 0) {
          const moved = swatchOf.get(dragged) as Swatch;
          // Old: $(drops).data("swatch"), the first one's.
          const before = swatchOf.get(drops[0] as Element) as Swatch;
          const scope = this._getSwatchScope(
            wrapper.classList.contains("global") ? "global" : "document",
            moved.getProperty("_pt"),
          );
          let list = designer().getSwatches(scope);
          let from = -1;
          let to = -1;
          if (moved && list && before) {
            for (let c = 0; c < list.length; ++c) {
              if (equals(moved, list[c])) from = c;
              else if (equals(before, list[c])) to = c;
            }
            if (from > -1 && to > -1) {
              list = list.slice();
              list.splice(from, 1);
              list.splice(to, 0, moved);
            }
            designer().setSwatches(scope, list);
          }
        }
      });
    }
    if (isTexture && !(pattern as TexturePattern).isReady()) {
      const texture = pattern as TexturePattern;
      const onUpdate = () => {
        if (texture.isReady()) {
          css(element, "background", Pattern.asCSSBackground(texture, opacity));
          texture.removeEventListener(TexturePattern.UpdateEvent, onUpdate);
        }
      };
      texture.addEventListener(TexturePattern.UpdateEvent, onUpdate);
    }
  }

  protected _addCmykIcon(swatch: HTMLElement): void {
    const icon = el("div", "cmyk-swatch");
    icon.append(
      el("div", "cmyk-icon c"),
      el("div", "cmyk-icon m"),
      el("div", "cmyk-icon y"),
      el("div", "cmyk-icon k"),
    );
    swatch.appendChild(icon);
  }

  __getCreateColorsPaletteParams(): TouchParams {
    return { isTouchEnabled: false };
  }

  /** Twelve greys, then the twelve base colors. */
  protected _createColorsPalette(palette: HTMLElement): void {
    const params = this.__getCreatePaletteSwatchParamas();
    let row: HTMLElement = el("div", "swatches");
    palette.appendChild(row);
    if (params.isTouchEnabled) row = palette;
    const black = [0, 0, 0];
    const white = [255, 255, 255];
    this._createPaletteSwatch(new RGBColor(black), row, false, false);
    for (let r = 1; r <= 10; r += 1)
      this._createPaletteSwatch(
        new RGBColor(RGBColor.blend(black, white, r * (1 / 11)) as number[]),
        row,
        false,
        false,
      );
    this._createPaletteSwatch(new RGBColor(white), row, false, false);
    const base = [
      [152, 0, 0],
      [255, 0, 0],
      [255, 153, 0],
      [255, 255, 0],
      [0, 255, 0],
      [0, 255, 255],
      [0, 150, 136],
      [96, 125, 139],
      [74, 134, 232],
      [0, 0, 255],
      [153, 0, 255],
      [255, 0, 255],
    ];
    // Blends of the base colors; the list is empty, so only the base row is made.
    const blends: { color: number[]; factor: number }[] = [];
    for (let n = -1; n < blends.length; ++n) {
      let target = palette;
      if (!params.isTouchEnabled) {
        target = el("div", "swatches");
        palette.appendChild(target);
      }
      let color: number[] | null = null;
      let factor = 0;
      if (n >= 0) {
        color = (blends[n] as { color: number[] }).color;
        factor = (blends[n] as { factor: number }).factor;
      }
      for (let e = 0; e < base.length; ++e) {
        const value = base[e] as number[];
        const blended = color ? (RGBColor.blend(value, color, factor) as number[]) : value;
        this._createPaletteSwatch(new RGBColor(blended), target, false, false);
      }
    }
  }

  protected _createMixerPalette(palette: HTMLElement): void {
    const section = (name: string, key: string, labelFirst: boolean) => {
      const container = el("div");
      container.setAttribute("data-container", name);
      if (labelFirst) container.classList.add("swatches");
      const label = el("label");
      label.textContent = text("GPatternChooser", key);
      container.appendChild(label);
      if (!labelFirst) container.classList.add("swatches");
      palette.appendChild(container);
      return container;
    };
    const tints = section("tints", "text.tints", true);
    const shades = section("shades", "text.shades", false);
    const tones = section("tones", "text.tones", false);
    const mixes = section("mixes", "text.mixes", false);
    for (let r = 1; r <= 10; r += 1) {
      this._createPaletteSwatch(RGBColor.WHITE, tints);
      this._createPaletteSwatch(RGBColor.WHITE, shades);
      this._createPaletteSwatch(RGBColor.WHITE, tones);
      this._createPaletteSwatch(RGBColor.WHITE, mixes);
    }
    this._updateMixerPalette();
  }

  __getUpdateMixerPaletteParams(): { maxCount: number } {
    return { maxCount: 10 };
  }

  /** Tints, shades and tones of the current color and its mix with the old one. */
  protected _updateMixerPalette(): void {
    const params = this.__getUpdateMixerPaletteParams();
    const set = (color: Color, swatches: NodeListOf<HTMLElement>, index: number) => {
      const swatch = swatches[index];
      if (!swatch) return;
      css(swatch, "background", Pattern.asCSSBackground(color));
      swatchOf.set(swatch, new Swatch(color));
    };
    const white = [255, 255, 255];
    const black = [0, 0, 0];
    const grey = [128, 128, 128];
    const current = this._color.toScreen();
    const tints = this._palettes.querySelectorAll<HTMLElement>(
      '.mixer-palette [data-container="tints"] .swatch',
    );
    const shades = this._palettes.querySelectorAll<HTMLElement>(
      '.mixer-palette [data-container="shades"] .swatch',
    );
    const tones = this._palettes.querySelectorAll<HTMLElement>(
      '.mixer-palette [data-container="tones"] .swatch',
    );
    const mixes = this._palettes.querySelectorAll<HTMLElement>(
      '.mixer-palette [data-container="mixes"] .swatch',
    );
    for (let u = 0; u < params.maxCount; u += 1) {
      const amount = (u + 1) / (1 * params.maxCount);
      set(new RGBColor(RGBColor.blend(current, white, amount) as number[]), tints, u);
      set(new RGBColor(RGBColor.blend(current, black, amount) as number[]), shades, u);
      set(new RGBColor(RGBColor.blend(current, grey, amount) as number[]), tones, u);
      set(
        new RGBColor(RGBColor.blend(current, this._oldColor.toScreen(), amount) as number[]),
        mixes,
        u,
      );
    }
  }

  __getCreateUsedPaletteParams(): { isTouchEnabled: boolean; maxCount: number } {
    return { isTouchEnabled: false, maxCount: 12 };
  }

  protected _createUsedPalette(palette: HTMLElement): void {
    const params = this.__getCreateUsedPaletteParams();
    let row: HTMLElement | null = null;
    if (!params.isTouchEnabled) {
      row = el("div", "swatches");
      palette.appendChild(row);
    }
    for (let o = 0; o < params.maxCount; o += 1)
      this._createPaletteSwatch(
        RGBColor.WHITE,
        params.isTouchEnabled ? palette : (row as HTMLElement),
        false,
        false,
      );
  }

  /**
   * Shows the colors used in the document. The old code looked the palette
   * up in the whole page (`.palettes > .used-palette`), so it works only
   * while the chooser is in the page.
   */
  protected _updateUsedPalette(): void {
    const document_ = activeDocumentOrNull();
    const colors = document_ ? document_.getDocumentColors() : [];
    const palettes = [...document.querySelectorAll<HTMLElement>(".palettes > .used-palette")];
    for (const palette of palettes) palette.replaceChildren();
    for (const palette of palettes) this._createUsedPalette(palette);
    for (let t = 12, n = 0; n < t; n += 1) {
      const used = n < colors.length;
      const color = used ? (colors[n] as Pattern) : null;
      const swatchElement = this._palettes.querySelectorAll<HTMLElement>(
        ".used-palette .swatches .swatch",
      )[n];
      const swatch = new Swatch(color);
      if (used && swatchElement) {
        css(swatchElement, "background", Pattern.asCSSBackground(color));
        swatchOf.set(swatchElement, swatch);
      }
      if (swatchElement) css(swatchElement, "display", used ? "" : "none");
      if (swatch.isCMYK() && swatchElement) this._addCmykIcon(swatchElement);
      if (n % 11 == 0 && used) {
        t += 12;
        for (const palette of palettes) this._createUsedPalette(palette);
      }
    }
  }

  /** A swatches section (global or document): its toolbar with import and export, and the wrapper. */
  protected _createSwatchesPalette(palette: HTMLElement, scope: string): void {
    const title = el("span");
    title.textContent =
      "global" === scope
        ? text("GCommonNames", "text.global")
        : text("GCommonNames", "text.document");
    const wrapper = el("div", "swatches-wrapper");
    wrapper.classList.add(scope);
    const toolbar = el("div", "toolbar");
    toolbar.classList.add(scope);
    toolbar.appendChild(title);
    const button = (key: string, icon: string, run: () => void) => {
      const element = el("button");
      element.appendChild(el("span"));
      element.setAttribute("data-title", text("GCommonNames", key));
      element.classList.add("swatch-icon", icon);
      element.addEventListener("click", run);
      return element;
    };
    toolbar.appendChild(
      button("text.import-swatches", "gravit-icon-swatches-import", () => importSwatches(scope)),
    );
    toolbar.appendChild(
      button("text.export-swatches", "gravit-icon-swatches-export", () => exportSwatches(scope)),
    );
    palette.appendChild(toolbar);
    palette.appendChild(wrapper);
    initAccordion(toolbar, { title: "span", before: false });
  }

  _getSwatchScope(scope: string, pattern: unknown): string {
    return swatchScope(scope, pattern);
  }

  __getUpdateSwatchesPaletteParams(): TouchParams {
    return { isTouchEnabled: false };
  }

  /** Lists the swatches of a scope (solid ones first, CMYK after) with an "Add swatch" button. */
  protected _updateSwatchesPalette(scope: string): void {
    const params = this.__getUpdateSwatchesPaletteParams();
    const kinded = scope.indexOf("-") > 0;
    const base = kinded ? scope.substring(0, scope.indexOf("-")) : scope;
    const wrappers = [
      ...this._palettes.querySelectorAll<HTMLElement>(
        ".swatches-palette .swatches-wrapper." + base,
      ),
    ];
    for (const wrapper of wrappers) wrapper.replaceChildren();
    const wrapper = wrappers[0];
    const swatches = designer().getSwatches(scope) as Swatch[] | undefined;
    if (!swatches) {
      if (wrapper) {
        const info = el("div", "info");
        info.textContent = text("GPatternChooser", "text.error-on-loading");
        wrapper.appendChild(info);
      }
      return;
    }
    if (!wrapper) return;
    let ordered: Swatch[] = [];
    const cmyk: Swatch[] = [];
    for (let e = 0; e < swatches.length; ++e) {
      const swatch = swatches[e] as Swatch;
      if (swatch.isCMYK()) cmyk.push(swatch);
      else ordered.push(swatch);
    }
    ordered = ordered.concat(cmyk);
    let row: HTMLElement | null = null;
    let count = 1;
    if (!params.isTouchEnabled && ordered.length)
      for (let e = 0; e < ordered.length; ++e) {
        if (!row) {
          row = el("div", "swatches");
          wrapper.appendChild(row);
        }
        this._createPaletteSwatch(ordered[e] as Swatch, row, true, false);
        if (14 == ++count) {
          count = 1;
          row = null;
        }
      }
    if (!row) {
      row = el("div", "swatches");
      wrapper.appendChild(row);
    }
    const add = el("button", params.isTouchEnabled ? "add-button swatch-button" : "swatch-button");
    add.classList.add("g-flat");
    add.setAttribute("data-title", text("GPatternChooser", "action.add-swatch"));
    add.appendChild(el("span", "gravit-icon-plus"));
    add.addEventListener("click", () => {
      const swatch = new Swatch(this._pattern, this._opacity);
      const list = designer().getSwatches(scope);
      if (list) {
        for (let o = 0; o < list.length; ++o) {
          if (equals(swatch, list[o], true)) {
            SystemDialog.alert(text("GPatternChooser", "text.equal-swatch-alert"));
            return;
          }
        }
        list.push(swatch);
        designer().setSwatches(scope, list);
      }
    });
    row.appendChild(add);
    if (params.isTouchEnabled) {
      if (ordered.length)
        for (let u = 0; u < ordered.length; ++u)
          this._createPaletteSwatch(ordered[u] as Swatch, wrapper, true, 7 === u);
    }
    this._updateActiveSwatch(base);
  }

  /** Marks the swatches equal to the current pattern and opacity. */
  protected _updateActiveSwatch(scope: string): void {
    if ("swatches" !== this._activePalette) return;
    const palettes = this._palettes.querySelectorAll(".swatches-palette." + scope);
    let found = false;
    for (const palette of palettes)
      for (const swatch of palette.querySelectorAll<HTMLElement>(
        ".swatches-wrapper .swatches .swatch",
      )) {
        const active = equals(swatchOf.get(swatch), new Swatch(this._pattern, this._opacity), true);
        if (active) found = true;
        swatchActive.set(swatch, active);
        swatch.classList.toggle("g-active", active);
      }
    for (const palette of palettes)
      for (const button of palette.querySelectorAll(".toolbar button[data-active-swatch]"))
        setDisabledProp(button, !found);
  }

  protected _swatchesChanged(event: SwatchesChangedEvent): void {
    this._updateSwatchesPalette(event.scope as string);
  }

  protected _activatePalette(palette: string | null): void {
    if (palette === this._activePalette) return;
    // Old: switch (this._activatePalette), the method instead of the field,
    // so the swatches listener was never removed here. See "The swatches
    // palette never stops listening" in QUESTIONS.md.
    switch (this._activatePalette as unknown) {
      case "swatches":
        designer().removeEventListener(SwatchesChangedEvent, this._swatchesChanged, this);
    }
    for (const button of this._palettes.querySelectorAll<HTMLElement>(".chooser [data-palette]"))
      button.classList.toggle("g-active", button.getAttribute("data-palette") === palette);
    for (const element of this._palettes.querySelectorAll<HTMLElement>(".palette"))
      css(element, "display", element.getAttribute("data-palette") === palette ? "" : "none");
    switch (palette) {
      case "mixer":
        this._updateMixerPalette();
        break;
      case "used":
        this._updateUsedPalette();
        break;
      case "swatches":
        this._updateSwatchesPalette(this._getSwatchScope("global", this._pattern));
        this._updateSwatchesPalette(this._getSwatchScope("document", this._pattern));
        designer().addEventListener(SwatchesChangedEvent, this._swatchesChanged, this);
    }
    this._activePalette = palette;
    this._relayout();
  }

  protected _setActiveGradientStop(
    stop: ChooserStop | null | undefined,
    color?: Color | null,
    force?: boolean | null,
  ): void {
    if (stop === this._activeGradientStop && !force) return;
    this._activeGradientStop = stop || null;
    if (this._activeGradientStop) {
      this._updateColor(color || this._activeGradientStop.color, force ? "" : "gradient-stop");
      this._updateOpacity(this._activeGradientStop.opacity, "gradient-stop");
      for (const each of (this._activeGradient as Gradient).getStops())
        this._updateGradientStop(each);
    }
  }

  /** Selects the active stop's handle in the gradient editor on the canvas. */
  protected _updateOnlineEditorStops(): void {
    const manager = styleEdManager();
    if (!(manager && manager.isActivated())) return;
    let index: number | null = null;
    if (this._activeGradientStop && this._activeGradient) {
      const stops = this._activeGradient.getStops();
      for (let n = 0; n < stops.length; n++) if (stops[n] === this._activeGradientStop) index = n;
    }
    const editor = manager.getActiveEditor();
    let part: { type: unknown; idx: number } | null = null;
    if (null !== index && editor)
      part = { type: GradientStyleEditor.STOP_HANDLE_PART_ID, idx: index };
    // noEvent (true): the editor doesn't report the new active stop back
    // to the manager, so the open chooser gets no ActivePointChange echo.
    if (editor) editor.updatePartSelection(false, part ? [part] : null, true);
  }

  /** Adds a stop handle; dragging it moves the stop, dragging it off the bar removes it. */
  protected _insertGradientStop(stop: ChooserStop): HTMLElement {
    const bar = this._gradientEditor.querySelector(".stops") as HTMLElement;
    const barWidth = jqWidth(bar);
    const barHeight = jqHeight(bar);
    const barOffset = offset(bar);
    let element: HTMLElement | null = null;
    const move = (event: MouseEvent, final?: boolean) => {
      const x = Math.max(0, Math.min(barWidth, Math.round(event.pageX - barOffset.left)));
      if (
        event.pageY < barOffset.top - PatternChooser.EXTEND_DRAG_RANGE ||
        event.pageY > barOffset.top + barHeight + PatternChooser.EXTEND_DRAG_RANGE
      ) {
        if ((this._activeGradient as Gradient).getStops().length >= 3) {
          css(element as HTMLElement, "display", "none");
          stop.remove = true;
        }
      } else {
        css(element as HTMLElement, "display", "");
        stop.remove = false;
      }
      stop.position = x / barWidth;
      this._updateGradientStop(stop);
      this._updatePatternFromActiveGradient(!final);
    };
    const onMove = (event: MouseEvent) => move(event);
    const onUp = (event: MouseEvent) => {
      move(event, true);
      event.stopPropagation();
      document.removeEventListener("mouseup", onUp, true);
      document.removeEventListener("mousemove", onMove, true);
      if (stop.remove) {
        const stops = (this._activeGradient as Gradient).getStops();
        const index = stops.indexOf(stop);
        stops.splice(index, 1);
      }
    };
    element = el("div", "stop");
    stopOf.set(element, stop);
    const press = (event: { stopPropagation(): void }) => {
      event.stopPropagation();
      this._setActiveGradientStop(stop);
      this._updateOnlineEditorStops();
      document.addEventListener("mouseup", onUp, true);
      document.addEventListener("mousemove", onMove, true);
      const first = ((this._activeGradient as Gradient).getStops()[0] as GradientStop).color;
      if (first instanceof CMYKColor) this.setColorMode(ColorMode.CMYK);
      else if (first instanceof HSVColor) this.setColorMode(ColorMode.HSV);
      else if (first instanceof RGBColor) this.setColorMode(ColorMode.RGB);
    };
    element.addEventListener("mousedown", press);
    stopPressOf.set(element, press);
    bar.appendChild(element);
    this._updateGradientStop(stop);
    return element;
  }

  __getUpdateGradientStopParams(): TouchParams {
    return { isTouchEnabled: false };
  }

  protected _updateGradientStop(stop: GradientStop): void {
    const params = this.__getUpdateGradientStopParams();
    const bar = this._gradientEditor.querySelector(".stops") as HTMLElement;
    const barWidth = jqWidth(bar);
    for (const element of bar.querySelectorAll<HTMLElement>(".stop")) {
      if (stopOf.get(element) !== stop) continue;
      element.classList.toggle("g-active", stop === this._activeGradientStop);
      if (params.isTouchEnabled) {
        if (stop === this._activeGradientStop) {
          css(element, "background", stop.color.toScreenCSS(stop.opacity));
          css(element, "border", "2px solid #FFFFFF");
        } else {
          css(element, "background", "transparent");
          css(element, "border", "2px solid transparent");
        }
      }
      let x = Math.round(stop.position * barWidth);
      const half = outerWidth(element) / 2 + 1;
      if (x < half) {
        if (!params.isTouchEnabled) x = half;
      } else if (x > barWidth - half) {
        if (!params.isTouchEnabled) x = barWidth - half;
      }
      css(element, "left", x + "px");
    }
  }

  /** Sends the edited gradient (without stops dragged off) as the pattern. */
  protected _updatePatternFromActiveGradient(transient?: boolean): void {
    if (!this._activeGradient) return;
    this._activeGradient.sortStops();
    const gradient = this._activeGradient.clone() as Gradient;
    const stops = gradient.getStops();
    this._activeGradient.getStops().forEach((stop: ChooserStop, n) => {
      if (stop.remove) stops.splice(n, 1);
    });
    this._updatePattern(gradient, "gradient", null, transient);
  }

  protected _rotateActiveGradient(degrees: number): void {
    const gradient = this._activeGradient as LinearGradient;
    const angle = GMath.toRadians(degrees);
    let focus = new Point(gradient._fx, gradient._fy);
    focus = focus.rotatedAt(angle, new Point(0.5, 0.5));
    gradient._fx = focus.getX();
    gradient._fy = focus.getY();
    gradient._angle = gradient._angle + angle;
    this._updatePatternFromActiveGradient();
  }

  protected _updateTexture(texture: Pattern | null): void {
    if (!equals(texture, this._texture)) this._texture = texture;
  }

  __getUpdateColorParams(): TouchParams {
    return { isTouchEnabled: false };
  }

  /**
   * Shows `color` everywhere (boxes, map, slider, previews) and, unless
   * the change came from setting the pattern, sends it as the pattern or
   * the active stop's color. `source` names where it came from
   * ("set_pattern", "slider", "map", "mode", "gradient-stop", ...).
   */
  protected _updateColor(
    color: Color,
    source?: string | null,
    transient?: boolean | null,
    force?: boolean,
  ): void {
    const params = this.__getUpdateColorParams();
    if (equals(color, this._color) && "set_pattern" !== source && !force) return;
    this._color = color;
    this._updateSwatchesPalette(this._getSwatchScope("global", this._pattern));
    this._updateSwatchesPalette(this._getSwatchScope("document", this._pattern));
    if (
      this._pattern &&
      this._pattern instanceof Color &&
      "set_pattern" !== source &&
      "update_pattern" !== source
    )
      this._updatePattern(this._color, "set_color", null, transient);
    if (this._activeGradientStop && "gradient-stop" !== source) {
      this._activeGradientStop.color = this._color;
      this._updatePatternFromActiveGradient(transient ?? undefined);
    }
    if ("mode" !== source) {
      if (this._color instanceof CMYKColor) this.setColorMode(ColorMode.CMYK);
      else if (this._color instanceof HSVColor) this.setColorMode(ColorMode.HSV);
      else if (this._color instanceof RGBColor) this.setColorMode(ColorMode.RGB);
    }
    this._updateColorComponentsFromColor();
    if ("slider" !== source && "map" !== source) this._updateColorSliderFromColor();
    this._systemColorInput.value = this._color.toScreenCSS();
    if ("map" !== source) this._updateMapMarker();
    if ("set_pattern" === source || "gradient-stop" === source) {
      this._oldColor = this._color;
      css(this._colorPreviewOld, "background", this._oldColor.toScreenCSS(this._oldColorOpacity));
    }
    if ("swatch" !== source && "mixer" === this._activePalette) this._updateMixerPalette();
    if (!equals(this._oldColor, this._color) && 0 === this._oldColorOpacity) this._updateOpacity(1);
    if (params.isTouchEnabled) {
      css(this._sliderColorThumb, "background", this._color.toScreenCSS(1));
      css(this._sliderOpacityThumb, "background", this._color.toScreenCSS(this._colorOpacity));
    }
    css(this._colorPreviewNew, "background", this._color.toScreenCSS(this._colorOpacity));
  }

  __getUpdateOpacityParams(): TouchParams {
    return { isTouchEnabled: false };
  }

  /** Shows the opacity and sends it (as the field's opacity or the active stop's). */
  protected _updateOpacity(
    opacity: number,
    source?: string | null,
    transient?: boolean,
    force?: boolean,
  ): void {
    // Old: the color params, not the opacity ones (both say the same).
    const params = this.__getUpdateColorParams();
    if (!(opacity !== this._colorOpacity || "set_opacity" === source || force)) return;
    if (this._activeGradientStop && "set_opacity" === source) return;
    if (!this._activeGradientStop) {
      this._opacity = opacity;
      if ("set_opacity" !== source && this._settings && this._settings.onOpacity)
        this._settings.onOpacity(this._opacity, !!transient);
    }
    this._colorOpacity = opacity;
    if ("set_opacity" === source || "gradient-stop" === source) {
      this._oldColorOpacity = this._colorOpacity;
      css(this._colorPreviewOld, "background", this._oldColor.toScreenCSS(this._oldColorOpacity));
    }
    css(this._colorPreviewNew, "background", this._color.toScreenCSS(this._colorOpacity));
    if ("slider" !== source) {
      const slider = sliderOf(this._opacitySlider);
      if (slider) slider.value(Math.round(100 * this._colorOpacity));
    }
    for (const input of this._colorComponents.querySelectorAll("[data-opacity] input")) {
      setDisabledProp(
        input,
        !!(
          this._settings &&
          Object.prototype.hasOwnProperty.call(this._settings, "hasOpacity") &&
          !this._settings.hasOpacity
        ),
      );
      boxValue(input, formatOpacity(100 * this._colorOpacity));
    }
    if (this._activeGradientStop && "gradient-stop" !== source) {
      this._activeGradientStop.opacity = this._colorOpacity;
      this._updatePatternFromActiveGradient(transient);
    }
    if (params.isTouchEnabled) {
      css(this._sliderColorThumb, "background", this._color.toScreenCSS(1));
      css(this._sliderOpacityThumb, "background", this._color.toScreenCSS(this._colorOpacity));
    }
  }

  /**
   * Shows `pattern`: picks the editor for its kind and fills it, then
   * tells the field (except for "set_pattern", the field's own value).
   * `keepPattern` (a swatch click) keeps the current pattern unless the
   * new one is a gradient; `transient` marks changes while dragging.
   */
  protected _updatePattern(
    pattern: Pattern | null,
    source?: string | null,
    keepPattern?: boolean | null,
    transient?: boolean | null,
  ): void {
    if (this._patternUpdateBlocker) return;
    if ("set_pattern" === source || "gradient" === source) this._patternUpdateBlocker = true;
    if (!keepPattern || pattern instanceof Gradient) {
      this._pattern = pattern;
      for (const option of this._toolbar.querySelectorAll(".pattern-type")) {
        const type = typeOf.get(option);
        if (type) (option as HTMLOptionElement).selected = !!type.isInstance(pattern);
      }
    }
    const isGradient = !!this._pattern && this._pattern instanceof Gradient;
    const isColor = !!this._pattern && this._pattern instanceof Color;
    // Old: the new pattern, not this._pattern, is checked for noise here.
    const isTexture =
      !!this._pattern &&
      this._pattern instanceof TexturePattern &&
      !(pattern instanceof NoisePattern);
    const isNoise = !!this._pattern && this._pattern instanceof NoisePattern;
    const isBackground = !!this._pattern && this._pattern instanceof Background;
    css(this._gradientEditor, "display", isGradient ? "" : "none");
    css(this._gradientActions, "display", isGradient ? "" : " none");
    css(this._colorEditor, "display", isColor || isGradient ? "" : "none");
    css(this._palettes, "display", isColor || isGradient || isTexture || isNoise ? "" : "none");
    const chooserButtons = this._palettes.querySelectorAll<HTMLElement>(".chooser button");
    if (isTexture || isNoise) {
      for (const button of chooserButtons)
        if (button.getAttribute("data-palette") !== "swatches") css(button, "display", "none");
      this._activatePalette("swatches");
    } else for (const button of chooserButtons) css(button, "display", "");
    css(this._patternEditor, "display", isTexture && !isNoise ? "" : "none");
    css(this._noiseEditor, "display", isNoise ? "" : "none");
    if ("set_pattern" === source || ("set_type" === source && !isGradient)) {
      this._activeGradient = null;
      this._activeGradientStop = null;
    }
    let activeIndex: number | null = null;
    if (isGradient) {
      const current = this._pattern as Gradient;
      css(
        this._gradientEditor,
        "background",
        Pattern.asCSSBackground(new LinearGradient(current.getStops()), this._opacity),
      );
      if ("set_pattern" === source || "set_type" === source) {
        (this._gradientEditor.querySelector(".stops") as HTMLElement).replaceChildren();
        this._activeGradient = current.clone() as Gradient;
        let first: ChooserStop | null = null;
        let same: ChooserStop | null = null;
        const inserted = this._activeGradient.getStops();
        for (let t = 0; t < inserted.length; t++) {
          const stop = inserted[t] as ChooserStop;
          this._insertGradientStop(stop);
          if (0 === t) first = stop;
          if (this._activeGradientStop && this._activeGradientStop.position === stop.position)
            same = stop;
        }
        const manager = styleEdManager();
        const editor = manager ? manager.getActiveEditor() : null;
        if (!same && editor && editor.getPartsSelectionLength()) {
          const stops = this._activeGradient.getStops();
          const selection = editor.getPartSelection() as { idx: number | null }[] | null;
          const index =
            selection && null !== (selection[0] as { idx: number | null }).idx
              ? (selection[0] as { idx: number }).idx
              : null;
          if (stops && null !== index && stops.length > index) {
            same = stops[index] as ChooserStop;
            activeIndex = index;
          }
        }
        if (!same) same = first;
        this._setActiveGradientStop(
          same,
          pattern && pattern instanceof Color ? pattern : null,
          keepPattern,
        );
        for (const button of this._gradientActions.querySelectorAll<HTMLElement>("[data-action]")) {
          let shown = true;
          switch (button.getAttribute("data-action")) {
            case "rotate-left":
            case "rotate-right":
              shown = pattern instanceof LinearGradient;
          }
          css(button, "display", shown ? "" : "none");
        }
      }
      if (null === activeIndex) {
        const stops = (this._activeGradient as Gradient).getStops();
        for (let t = 0; t < stops.length; t++)
          if (stops[t] === this._activeGradientStop) activeIndex = t;
      }
    } else if (isColor)
      this._updateColor(pattern as Color, source || "update_pattern", !!transient);
    else if (isNoise) {
      const noise = pattern as NoisePattern;
      const amount = 100 * noise.getAmount();
      const amountSlider = sliderOf(
        this._noiseEditor.querySelector('.g-input-slider[data-property="noise_amount"]'),
      );
      if (amountSlider) amountSlider.value(amount);
      boxValue(
        this._noiseEditor.querySelector('[type="text"][data-property="noise_amount"]'),
        formatNumber(amount, 0),
      );
      // The old code looked for the type select in the texture editor,
      // where it isn't, so the select never showed the pattern's type
      // (BUG-157).
      const typeSelect = this._noiseEditor.querySelector('[data-property="noise_type"]');
      if (typeSelect) {
        for (const option of typeSelect.children) option.removeAttribute("selected");
        const option = typeSelect.querySelector(`option[value="${noise.getType()}"]`);
        if (option) option.setAttribute("selected", "selected");
        setValue(typeSelect, noise.getType());
      }
    } else if (isTexture) {
      const texture = pattern as TexturePattern;
      this._updateTexture(texture);
      const hasTexture = !!texture.getTexture();
      // Old: SizeMode.Length.concat(SizeMode.Percent).indexOf(mode). Both are
      // strings, so this is a substring search in "lengthpercent", not an
      // array lookup (the same result for every real size mode).
      const sizable =
        -1 !==
        (TexturePattern.SizeMode.Length + TexturePattern.SizeMode.Percent).indexOf(
          texture.getSizeMode(),
        );
      const select = (property: string, value: string) => {
        for (const element of this._patternEditor.querySelectorAll(
          `[data-property="${property}"]`,
        )) {
          setDisabledProp(element, !hasTexture);
          for (const option of element.children) option.removeAttribute("selected");
          for (const option of element.querySelectorAll(`:scope > option[value="${value}"]`))
            option.setAttribute("selected", "selected");
          setValue(element, value);
        }
      };
      const number = (property: string, value: number | null) => {
        for (const element of this._patternEditor.querySelectorAll(
          `[data-property="${property}"]`,
        )) {
          setDisabledProp(element, !(hasTexture && sizable));
          setValue(element, formatNumber(value as number));
        }
      };
      select("texture_repeat", texture.getRepeatMode());
      select("texture_position", texture.getPosition());
      select("texture_size", texture.getSizeMode());
      select("texture_scale", texture.getScaleMode());
      number("texture_size_w", texture.getWidth());
      number("texture_size_h", texture.getHeight());
      const tile = 100 * texture.getTileSize();
      const tileSlider = sliderOf(
        this._patternEditor.querySelector('.g-input-slider[data-property="texture_tile"]'),
      );
      if (tileSlider) tileSlider.value(tile);
      boxValue(
        this._patternEditor.querySelector('[type="text"][data-property="texture_tile"]'),
        formatNumber(tile, 0),
      );
      // Old: gInputSlider("disabled") on both the slider and its box.
      const disabled = texture.getScaleMode() !== TexturePattern.ScaleMode.Tile;
      for (const element of this._patternEditor.querySelectorAll(
        '[data-property="texture_tile"]',
      )) {
        if (disabled) element.setAttribute("disabled", "disabled");
        else element.removeAttribute("disabled");
      }
      for (const unit of this._patternEditor.querySelectorAll('[data-property="texture_size_u"]'))
        unit.textContent = texture.getSizeMode() === TexturePattern.SizeMode.Length ? "px" : "%";
      for (const mask of this._patternEditor.querySelectorAll('[data-property="texture_mask"]'))
        (mask as HTMLInputElement).checked = texture.isMask();
      for (const preview of this._patternEditor.querySelectorAll<HTMLElement>(".pattern-preview")) {
        css(preview, "background-image", texture.asCSSBackground());
        css(preview, "background-repeat", "no-repeat");
        css(preview, "background-position", "center");
        css(preview, "background-size", "contain");
      }
      if ("set_type" === source) {
        const clone = this._clonePattern(texture);
        this._updatePattern(clone, "texture_pattern");
      }
    }
    this._relayout(!isBackground);
    if ("set_pattern" !== source && this._settings && this._settings.onPattern)
      this._settings.onPattern(
        keepPattern ? this._pattern : pattern,
        !!transient,
        null !== activeIndex ? activeIndex : null,
      );
    if (isGradient) this._updateOnlineEditorStops();
    if ("swatches" === this._activePalette) {
      this._updateSwatchesPalette(this._getSwatchScope("global", this._pattern));
      this._updateSwatchesPalette(this._getSwatchScope("document", this._pattern));
    }
    this._patternUpdateBlocker = false;
  }

  /** The canvas gradient editor's active stop changed: follow it. */
  protected _styleEditorHandler(event: StyleEditorEvent): void {
    if (event.type === StyleEdManager.EditorEventType.ActivePointChange) {
      const stops = this._activeGradient ? this._activeGradient.getStops() : null;
      const data = event.data as { idx: number | null } | null;
      const index = data ? data.idx : null;
      if (stops && null !== index && stops.length > index)
        this._setActiveGradientStop(stops[index] as ChooserStop);
      // Old: stops.null, which is undefined: no stop is active.
      else if (stops) this._setActiveGradientStop(undefined);
      this._updatePatternFromActiveGradient();
    }
  }

  /** Closes on a document change unless it came from the chooser ({ chooserOn: true }). */
  protected _closeIfNeeded(event: ModifiedEvent): void {
    const data = event.data as { chooserOn?: boolean } | null;
    if (this.isOpenned() && !(data && data.chooserOn)) this.close();
  }

  private _sliderValue(element: Element): string | number {
    const slider = sliderOf(element);
    return slider ? slider.value() : NaN;
  }

  protected _updateColorFromColorSlider(transient?: boolean): void {
    const hue = parseInt(String(this._sliderValue(this._colorSlider)));
    let color: Color;
    let hsv: number[] | null = null;
    if (this._colorMode === ColorMode.RGB || this._colorMode === ColorMode.HSV) {
      switch (this._colorMode) {
        case ColorMode.RGB:
          hsv = Color.rgbToHSV(this._color.toScreen());
          break;
        case ColorMode.HSV:
          hsv = [];
          for (const label of this._colorComponents.querySelectorAll("[data-component-index]")) {
            const index = parseInt(label.getAttribute("data-component-index") as string);
            if (0 !== index) hsv[index] = parseInt(readBox(label.querySelector("input"))) / 100;
          }
      }
      if (hsv) {
        hsv = [hue, hsv[1] as number, hsv[2] as number];
        color =
          this._colorMode === ColorMode.RGB ? new RGBColor(Color.hsvToRGB(hsv)) : new HSVColor(hsv);
        this._extendedGamutInitiated = ExtendedGamut.COLOR_SLIDER;
        this._updateColor(color, "slider", transient, true);
        this._updateColorMap();
        this._extendedGamutInitiated = null;
      }
    }
  }

  protected _updateColorSliderFromColor(): void {
    switch (this._colorMode) {
      case ColorMode.RGB:
      case ColorMode.HSV: {
        if (
          this._extendedGamutInitiated === ExtendedGamut.COLOR_SLIDER ||
          this._extendedGamutInitiated === ExtendedGamut.MAP
        )
          return;
        const hue =
          this._extendedGamutInitiated === ExtendedGamut.COMPONENTS &&
          this._extValue &&
          this._colorMode === ColorMode.HSV
            ? (this._extValue[0] as number)
            : (Color.rgbToHSV(this._color.toScreen())[0] as number);
        const slider = sliderOf(this._colorSlider);
        if (slider && parseInt(String(slider.value())) !== hue) {
          slider.value(hue);
          this._updateColorMap();
        }
        break;
      }
      case ColorMode.CMYK:
    }
  }

  protected _updateColorFromColorComponents(): void {
    const values: number[] = [];
    for (const label of this._colorComponents.querySelectorAll("[data-component-index]")) {
      const index = parseInt(label.getAttribute("data-component-index") as string);
      values[index] = parseInt(readBox(label.querySelector("input")));
    }
    let color: Color | null = null;
    switch (this._colorMode) {
      case ColorMode.RGB:
        color = new RGBColor(values);
        break;
      case ColorMode.HSV:
        color = new HSVColor(values.map((value, index) => (0 === index ? value : value / 100)));
        break;
      case ColorMode.CMYK:
        color = new CMYKColor(values.map((value) => value / 100));
    }
    this._extendedGamutInitiated = ExtendedGamut.COMPONENTS;
    if (color) this._updateColor(color, "components", false, true);
    this._extendedGamutInitiated = null;
  }

  protected _updateColorComponentsFromColor(): void {
    for (const input of this._colorComponents.querySelectorAll("[data-css] input"))
      boxValue(input, this._color.toScreenCSS());
    if (
      this._extendedGamutInitiated === ExtendedGamut.COMPONENTS &&
      this._colorMode === ColorMode.HSV
    )
      return;
    let values: number[] | null = null;
    let format: (index: number, value: number) => unknown = (_index, value) => value;
    switch (this._colorMode) {
      case ColorMode.RGB:
        values = this._color.toScreen();
        break;
      case ColorMode.HSV:
        values =
          (this._extendedGamutInitiated !== ExtendedGamut.COLOR_SLIDER &&
            this._extendedGamutInitiated !== ExtendedGamut.MAP) ||
          !this._extValue
            ? this._color instanceof HSVColor
              ? (this._color.getValue() as number[])
              : Color.rgbToHSV(this._color.toScreen())
            : this._extValue;
        format = (index, value) => (0 === index ? value : formatNumber(100 * value, 0));
        break;
      case ColorMode.CMYK:
        values =
          this._color instanceof CMYKColor
            ? (this._color.getValue() as number[])
            : Color.rgbToCMYK(this._color.toScreen());
        format = (_index, value) => formatNumber(100 * value, 0);
    }
    for (const label of this._colorComponents.querySelectorAll("[data-component-index]")) {
      const index = parseInt(label.getAttribute("data-component-index") as string);
      boxValue(label.querySelector("input"), format(index, (values as number[])[index] as number));
    }
  }

  protected _updateMapMarker(): void {
    if (this._extendedGamutInitiated === ExtendedGamut.MAP) return;
    const canvas = this._colorMap.querySelector("canvas") as HTMLCanvasElement;
    const w = canvas.width;
    const h = canvas.height;
    const hsv =
      (this._extendedGamutInitiated !== ExtendedGamut.COLOR_SLIDER &&
        this._extendedGamutInitiated !== ExtendedGamut.COMPONENTS) ||
      !this._extValue ||
      this._colorMode !== ColorMode.HSV
        ? Color.rgbToHSV(this._color.toScreen())
        : this._extValue;
    const x = Math.round((hsv[1] as number) * w);
    const y = Math.round((1 - (hsv[2] as number)) * h);
    this._setMarkerPosition(x, y);
  }

  protected _setMarkerPosition(x: number, y: number): void {
    const marker = this._colorMap.querySelector(".marker") as HTMLElement;
    const canvas = this._colorMap.querySelector("canvas") as HTMLCanvasElement;
    const w = canvas.width;
    const h = canvas.height;
    const halfWidth = jqWidth(marker) / 2;
    const halfHeight = jqHeight(marker) / 2;
    if (x < halfWidth) x = halfWidth;
    if (y < halfHeight) y = halfHeight;
    if (x > w - halfWidth) x = w - halfWidth;
    if (y > h - halfHeight) y = h - halfHeight;
    css(marker, "left", x + "px");
    css(marker, "top", y + "px");
  }

  /** Paints the saturation/brightness map of the slider's hue. */
  protected _updateColorMap(): void {
    const canvas = this._colorMap.querySelector("canvas") as HTMLCanvasElement;
    if (jqWidth(this._colorMap) && jqHeight(this._colorMap)) {
      canvas.width = jqWidth(this._colorMap);
      canvas.height = jqHeight(this._colorMap);
    }
    const w = canvas.width;
    const h = canvas.height;
    const context = canvas.getContext("2d");
    if (!context) return;
    const hue = this._sliderValue(this._colorSlider);
    const image = context.getImageData(0, 0, w, h);
    if (image) {
      for (let s = 0; s < w; ++s)
        for (let l = 0; l < h; ++l) {
          const rgb = Color.hsvToRGB([parseInt(String(hue)), s / w, 1 - l / h]);
          const d = 4 * (l * w + s);
          image.data[d] = rgb[0] as number;
          image.data[d + 1] = rgb[1] as number;
          image.data[d + 2] = rgb[2] as number;
          image.data[d + 3] = 255;
        }
      context.putImageData(image, 0, 0);
    }
  }

  protected _colorMapMouseDown(start: MouseEvent | TouchEvent): void {
    if (!start.isTrusted) return;
    const move = (event: MouseEvent | TouchEvent, final?: boolean) => {
      if (!event.isTrusted) return;
      if (event.cancelable) event.preventDefault();
      let x = (event as MouseEvent).pageX;
      let y = (event as MouseEvent).pageY;
      if ("touchstart" === event.type || "touchmove" === event.type) {
        const touch = (event as TouchEvent).changedTouches[0];
        x = (touch && touch.pageX) as number;
        y = (touch && touch.pageY) as number;
      }
      const canvas = this._colorMap.querySelector("canvas") as HTMLCanvasElement;
      const w = canvas.width;
      const h = canvas.height;
      const position = offset(this._colorMap);
      const cx = Math.max(0, Math.min(w, Math.round(x - position.left)));
      const cy = Math.max(0, Math.min(h, Math.round(y - position.top)));
      const hsv = [parseInt(String(this._sliderValue(this._colorSlider))), cx / w, 1 - cy / h];
      const color =
        this._colorMode === ColorMode.HSV ? new HSVColor(hsv) : new RGBColor(Color.hsvToRGB(hsv));
      this._setMarkerPosition(cx, cy);
      this._extendedGamutInitiated = ExtendedGamut.MAP;
      this._updateColor(color, "map", !final, final);
      this._extendedGamutInitiated = null;
    };
    const onMove = (event: MouseEvent | TouchEvent) => move(event);
    const onUp = (event: MouseEvent) => {
      move(event, true);
      event.stopPropagation();
      document.removeEventListener("mouseup", onUp, true);
      document.removeEventListener("mousemove", onMove, true);
      document.removeEventListener("touchmove", onMove, true);
    };
    move(start);
    document.addEventListener("mouseup", onUp, true);
    document.addEventListener("mousemove", onMove, true);
    document.addEventListener("touchmove", onMove, true);
  }

  /** The color of a new stop at `x`: between the stops left and right of it. */
  protected _defineStopInitColor(x: number): Color {
    const stops = [...this._gradientEditor.querySelectorAll<HTMLElement>(".stop")].filter(
      isVisible,
    );
    const left = (element: HTMLElement) => Number(cssValue(element, "left").replace("px", ""));
    const colorOf = (element: HTMLElement | null) => {
      const stop = element ? stopOf.get(element) : undefined;
      return stop && stop.color instanceof Color ? stop.color.toScreen() : [0, 0, 0];
    };
    const after: HTMLElement[] = [];
    const before: HTMLElement[] = [];
    let previous: HTMLElement | null = null;
    let next: HTMLElement | null = null;
    let previousX: number | null = null;
    let nextX: number | null = null;
    for (let o = 0; o < stops.length; ++o) {
      const stop = stops[o] as HTMLElement;
      if (left(stop) < x) before.push(stop);
      else after.push(stop);
    }
    for (let e = 0; e < before.length; ++e) {
      const stop = before[e] as HTMLElement;
      if (previous) {
        if (left(stop) > (previousX as number)) {
          previous = stop;
          previousX = left(stop);
        }
      } else {
        previous = stop;
        previousX = left(stop);
      }
    }
    for (let e = 0; e < after.length; ++e) {
      const stop = after[e] as HTMLElement;
      if (next) {
        if (left(stop) < (nextX as number)) {
          next = stop;
          nextX = left(stop);
        }
      } else {
        next = stop;
        nextX = left(stop);
      }
    }
    // Old: null positions count as 0 in the subtractions.
    x -= Number(previousX);
    const span = Number(nextX) - Number(previousX);
    const amount = (100 * x) / span / 100;
    const from = colorOf(previous);
    const to = colorOf(next);
    const weight = ((2 * amount - 1) / 1 + 1) / 2;
    const rest = 1 - weight;
    const rgb = [
      Math.round((to[0] as number) * weight + (from[0] as number) * rest),
      Math.round((to[1] as number) * weight + (from[1] as number) * rest),
      Math.round((to[2] as number) * weight + (from[2] as number) * rest),
    ];
    switch (this._colorMode) {
      case ColorMode.CMYK:
        return new CMYKColor(Color.rgbToCMYK(rgb));
      case ColorMode.HSV:
        return new HSVColor(Color.rgbToHSV(rgb));
      default:
        return new RGBColor(rgb);
    }
  }

  static _createPatternOption(type: PatternTypeEntry): HTMLOptionElement {
    const option = el("option", "pattern-type");
    typeOf.set(option, type);
    option.setAttribute("data-title", type.name);
    option.setAttribute("value", type.name);
    option.textContent = type.name;
    return option;
  }

  /**
   * Re-places the overlay. The touch module replaced the desktop
   * chooser's own version (preserveTop false) with this one for both, so
   * the top is kept unless `preserveTop` is false. See "The touch chooser
   * module changes the desktop chooser's relayout" in QUESTIONS.md.
   */
  protected _relayout(preserveTop = true): void {
    // Before the overlay exists (while initLayout builds), as the plugin
    // call without its data did, nothing happens.
    if (this._overlay) this._overlay.relayout({ preserveTop });
  }

  /** The stops a new gradient starts with: the gradient's, or white to black (the color instead of white). */
  static getGradientStopsFromCurrentPattern(pattern: Pattern | null): GradientStop[] {
    let stops: GradientStop[];
    if (pattern instanceof Gradient) stops = pattern.getClonedStops();
    else {
      stops = [
        { color: RGBColor.WHITE, position: 0, opacity: 1 },
        { color: RGBColor.BLACK, position: 1, opacity: 1 },
      ];
      if (
        pattern instanceof Color &&
        !equals(pattern.toScreen(), (stops[1] as GradientStop).color.toScreen())
      )
        (stops[0] as GradientStop).color = pattern;
    }
    return stops;
  }

  static initPatternType(): PatternTypeEntry[] {
    return [
      {
        name: text("GPatternChooser", "pattern-type.color"),
        cssBackgroundImage: new LinearGradient(
          [
            { color: RGBColor.WHITE, position: 0, opacity: 0.5 },
            { color: RGBColor.WHITE, position: 1, opacity: 0.5 },
          ],
          1,
          GMath.toRadians(90),
        ).asCSSBackground(),
        isCompatible: (type) => type === Color,
        isInstance: (pattern) => !!pattern && pattern instanceof Color,
        createDefault(current) {
          if (current instanceof Gradient)
            for (let stops = current.getStops(), n = 0; n < stops.length; ++n)
              if (Object.prototype.hasOwnProperty.call(stops[n], "color"))
                return (stops[n] as GradientStop).color;
          return new RGBColor();
        },
      },
      {
        name: text("GPatternChooser", "pattern-type.lineargradient"),
        cssBackgroundImage: new LinearGradient(
          [
            { color: RGBColor.WHITE, position: 0, opacity: 1 },
            { color: RGBColor.BLACK, position: 1, opacity: 0 },
          ],
          1,
          GMath.toRadians(90),
        ).asCSSBackground(),
        isCompatible: (type) => type === LinearGradient || type === Gradient,
        isInstance: (pattern) => !!pattern && pattern instanceof LinearGradient,
        createDefault: (current) =>
          new LinearGradient(PatternChooser.getGradientStopsFromCurrentPattern(current)),
      },
      {
        name: text("GPatternChooser", "pattern-type.radialgradient"),
        cssBackgroundImage: new RadialGradient([
          { color: RGBColor.WHITE, position: 0, opacity: 1 },
          { color: RGBColor.BLACK, position: 1, opacity: 0 },
        ]).asCSSBackground(),
        isCompatible: (type) => type === RadialGradient || type === Gradient,
        isInstance: (pattern) => !!pattern && pattern instanceof RadialGradient,
        createDefault: (current) =>
          new RadialGradient(PatternChooser.getGradientStopsFromCurrentPattern(current)),
      },
      {
        name: text("GPatternChooser", "pattern-type.angulargradient"),
        cssBackgroundImage: new AngularGradient([
          { color: RGBColor.WHITE, position: 0, opacity: 1 },
          { color: RGBColor.BLACK, position: 1, opacity: 0 },
        ]).asCSSBackground(),
        isCompatible: (type) => type === AngularGradient || type === Gradient,
        isInstance: (pattern) => !!pattern && pattern instanceof AngularGradient,
        createDefault: (current) =>
          new AngularGradient(PatternChooser.getGradientStopsFromCurrentPattern(current)),
      },
      {
        name: text("GPatternChooser", "pattern-type.texture"),
        cssBackgroundImage: svgBackground(TEXTURE_ICON),
        isCompatible: (type) => type === TexturePattern,
        isInstance: (pattern) =>
          !!pattern && pattern instanceof TexturePattern && !(pattern instanceof NoisePattern),
        createDefault() {
          const group = (Node.deserialize(TEXTURE_DEFAULT_GROUP) as Node[]).pop();
          const texture = new TexturePattern(
            group as unknown as ConstructorParameters<typeof TexturePattern>[0],
            TexturePattern.RepeatMode.Both,
          );
          texture.setScene(sceneOfActiveDocument());
          return texture;
        },
      },
      {
        name: text("GPatternChooser", "pattern-type.noise"),
        cssBackgroundImage: svgBackground(NOISE_ICON),
        isCompatible: (type) => type === NoisePattern,
        isInstance: (pattern) => !!pattern && pattern instanceof NoisePattern,
        createDefault: () => new NoisePattern(),
      },
      {
        name: text("GPatternChooser", "pattern-type.backgroundfill"),
        cssBackgroundImage: svgBackground(BACKGROUND_ICON),
        isCompatible: (type) => type === Background,
        isInstance: (pattern) => !!pattern && pattern instanceof Background,
        createDefault: () => new Background(),
      },
    ];
  }

  /** A copy of a texture that belongs to the active document's scene. */
  _clonePattern(pattern: Pattern): Pattern {
    const clone = pattern.clone() as TexturePattern;
    clone.setScene(sceneOfActiveDocument());
    return clone;
  }
}

function activeDocumentOrNull(): Document | null {
  const app = designerOrNull();
  return app ? (app.getActiveDocument() as unknown as Document | null) : null;
}

function sceneOfActiveDocument(): Parameters<TexturePattern["setScene"]>[0] {
  return (activeDocument() as Document).getScene() as unknown as Parameters<
    TexturePattern["setScene"]
  >[0];
}

/**
 * jQuery's slideToggle without its 400 ms slide (the advanced texture
 * settings, desktop and touch): the section snaps open and shut. See
 * "Advanced texture settings open without the slide" in QUESTIONS.md.
 */
export function slideToggle(element: HTMLElement): void {
  if ("none" === cssValue(element, "display")) css(element, "display", "block");
  else css(element, "display", "none");
}

// ---------------------------------------------------------------------------
// The choosers (window.gPatternChooser, gPatternChooserNormal, gPatternChooserTouch).

let normalChooser: PatternChooser | null = null;
let touchChooser: PatternChooser | null = null;
let currentChooser: PatternChooser | null = null;
let touchChooserClass: (new () => PatternChooser) | null = null;

/** pattern-chooser.ts registers the touch chooser here when it loads. */
export function setTouchPatternChooserClass(cls: new () => PatternChooser): void {
  touchChooserClass = cls;
}

/** Creates both choosers once (bootstrap did, right before designer.init()). */
export function createPatternChoosers(): void {
  if (normalChooser) return;
  normalChooser = new PatternChooser();
  touchChooser = touchChooserClass ? new touchChooserClass() : normalChooser;
  currentChooser = designer().isTouchEnabled() ? touchChooser : normalChooser;
}

/** The chooser the fields use (the old window.gPatternChooser). */
export function patternChooser(): PatternChooser {
  if (!currentChooser) createPatternChoosers();
  return currentChooser as PatternChooser;
}

/** Picks the desktop or touch chooser, as a field's click did. */
function selectChooser(): PatternChooser {
  if (!normalChooser) createPatternChoosers();
  currentChooser = designer().isTouchEnabled()
    ? (touchChooser as PatternChooser)
    : (normalChooser as PatternChooser);
  return currentChooser;
}

/** The choosers, for tests (both null before they were created). */
export function patternChoosers(): { normal: PatternChooser | null; touch: PatternChooser | null } {
  return { normal: normalChooser, touch: touchChooser };
}

/** Forgets the choosers (unit tests). */
export function resetPatternChoosers(): void {
  normalChooser = null;
  touchChooser = null;
  currentChooser = null;
}

if (typeof document !== "undefined") {
  whenDesigner(() => {
    // Boot sets the designer before designer.init(), where the old
    // bootstrap created the choosers.
    createPatternChoosers();
  });
}

// ---------------------------------------------------------------------------
// The paint field ($.fn.gPatternChooser).

export interface PatternChooserWidgetOptions {
  /** The preview is a button (g-button, g-active while open). Default true. */
  asButton?: boolean;
  /** A label after the preview. */
  label?: string;
  /** Hides the pattern type select. */
  singleOption?: boolean;
  /** Only the preview (`g-pattern-chooser-simplified`, no eye dropper). */
  simplified?: boolean;
  noEyedropper?: boolean;
  /** Replaces the open statistic. */
  onOpen?: (() => void) | null;
  onClickEyedropper?: (() => void) | null;
  /** The pattern classes the chooser offers (none: all). */
  types?: unknown[];
  hasOpacity?: boolean;
  hasMask?: boolean;
  [option: string]: unknown;
}

interface WidgetData {
  options: PatternChooserWidgetOptions;
  opacity: number;
  nullValue?: Pattern | null;
}

const widgets = new WeakMap<Element, PatternChooserWidget>();

/**
 * A paint field: a preview (a pattern target, so paints can be dragged
 * onto and off it) that opens the chooser, and an eye dropper.
 *
 *     div.g-pattern-chooser > span.preview.g-button > div.eyedropper.eye-drop
 */
export class PatternChooserWidget {
  /** The field set up on an element ($(el).data("gpatternchooser")). */
  static of(element: Element): PatternChooserWidget | null {
    return widgets.get(element) || null;
  }

  readonly element: HTMLElement;
  readonly preview: HTMLElement;
  readonly eyeDropper: HTMLElement | null = null;
  private readonly _data: WidgetData;

  constructor(element: HTMLElement, options: PatternChooserWidgetOptions = {}) {
    const resolved = extend<PatternChooserWidgetOptions>(
      { asButton: true, label: "", singleOption: false },
      options,
    );
    this.element = element;
    widgets.set(element, this);
    patternChooser()._updateSettings(resolved as Partial<PatternChooserSettings>, true);
    let label: HTMLElement | null = null;
    if (resolved.label) {
      label = el("span", "label");
      css(label, "margin-left", "5px");
      label.textContent = resolved.label;
    }
    const simplified = resolved.simplified;
    const preview = el("span", "preview");
    this.preview = preview;
    preview.addEventListener("click", (event) => {
      const stopIndex = (event as MouseEvent & { stopIndex?: number | null }).stopIndex;
      this._onPreviewClick(event, stopIndex);
    });
    new PatternTarget(preview);
    attachRichTooltip(
      preview,
      RichTooltipConfig.from({
        title: text("GPatternChooser", "text.color-picker-tooltip-title"),
        description: text("GPatternChooser", "text.color-picker-tooltip-description"),
        learnMore: "",
      }),
    );
    if (resolved.asButton) preview.classList.add("g-button");
    element.classList.add(simplified ? "g-pattern-chooser-simplified" : "g-pattern-chooser");
    this._data = { options: resolved, opacity: 1 };
    if (!simplified && !resolved.noEyedropper) {
      const dropper = el("div", "eyedropper eye-drop");
      new EyeDropper(dropper, { onClick: resolved.onClickEyedropper });
      onPatternEvent(dropper, "colorchange", (_event, rgba) => {
        triggerPatternEvent(element, "patternchange", [
          new RGBColor(rgba),
          (rgba[3] as number) / 255,
          false,
        ]);
      });
      dropper.classList.remove("g-button");
      attachRichTooltip(
        dropper,
        RichTooltipConfig.from({
          title: text("GPatternChooser", "text.eyedropper-tooltip-title"),
          description: text("GPatternChooser", "text.eyedropper-tooltip-description"),
        }),
      );
      preview.appendChild(dropper);
      this.eyeDropper = dropper;
    }
    if (resolved.noEyedropper) element.classList.add("only-picker");
    element.appendChild(preview);
    if (label) element.appendChild(label);
  }

  private _onPreviewClick(event: globalThis.Event, stopIndex?: number | null): void {
    const chooser = selectChooser();
    if (this._data.options.onOpen) this._data.options.onOpen.call(this.preview);
    event.stopPropagation();
    event.preventDefault();
    if (this.element.classList.contains("g-disabled")) return;
    const element = this.element;
    const data = this._data;
    if (data.options.asButton) element.classList.add("g-active");
    const callbacks: Pick<PatternChooserSettings, "onPattern" | "onOpacity" | "onClose"> = {
      onPattern: (pattern, transient, activeStopIndex) => {
        this.value(pattern);
        triggerPatternEvent(element, "patternchange", [
          pattern,
          undefined,
          transient,
          true,
          null !== activeStopIndex ? activeStopIndex : null,
        ]);
      },
      onOpacity: (opacity, transient) => {
        this.opacity(opacity);
        triggerPatternEvent(element, "patternchange", [undefined, opacity, transient, true]);
      },
      onClose: (_pattern, _opacity, prevent, cause) => {
        let prevented = false;
        triggerPatternEvent(element, "chooserclose", [
          () => {
            prevented = true;
            if (prevent) prevent();
          },
          cause,
        ]);
        if (prevented) return false;
        if (data.options.asButton) element.classList.remove("g-active");
        return true;
      },
    };
    const settings = extend<Partial<PatternChooserSettings>>(data.options, callbacks);
    chooser.open(element, settings);
    chooser.setOpacity(this.opacity());
    chooser.setPattern(this.value());
    triggerPatternEvent(element, "chooseropen", []);
    // Old: the click handler's extra jQuery argument; undefined for a real click.
    if (null !== stopIndex) chooser.setActiveGradientStopByIdx(stopIndex);
  }

  /** Opens the chooser as a click on the preview does (the panels' openPatternChooser). */
  open(stopIndex?: number | null): void {
    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    (event as MouseEvent & { stopIndex?: number | null }).stopIndex = stopIndex;
    this.preview.dispatchEvent(event);
  }

  /** `gPatternChooser("opacity")`. */
  opacity(): number;
  /** `gPatternChooser("opacity", v)`: sets it and redraws the preview. */
  opacity(opacity: number): this;
  opacity(...args: number[]): number | this {
    if (args.length) {
      this._data.opacity = args[0] as number;
      this._updateBackground();
      return this;
    }
    return this._data.opacity;
  }

  /** `gPatternChooser("value")`: the pattern the preview holds. */
  value(): Pattern | null;
  /** `gPatternChooser("value", p)`: holds and shows `p`. */
  value(pattern: Pattern | string | null | undefined): this;
  value(...args: (Pattern | string | null | undefined)[]): Pattern | null | this {
    const target = PatternTarget.of(this.preview) as PatternTarget;
    if (args.length) {
      target.value(args[0]);
      const dropper = this.eyeDropper ? EyeDropper.of(this.eyeDropper) : null;
      if (dropper) dropper.setValue(args[0] as Pattern | string | null);
      this._updateBackground();
      return this;
    }
    return target.value();
  }

  /** `gPatternChooser("setPattern", p)`: passes `p` to the chooser when it is open for this field. */
  setPattern(pattern: Pattern | null): this {
    const chooser = patternChooser();
    if (chooser.isOpenned(this.element)) chooser.setPattern(pattern);
    return this;
  }

  /** `gPatternChooser("nullValue")`: what the preview shows without a pattern. */
  nullValue(): Pattern | null;
  nullValue(pattern: Pattern | null): this;
  nullValue(...args: (Pattern | null)[]): Pattern | null | this {
    if (args.length) {
      this._data.nullValue = args[0];
      this._updateBackground();
      return this;
    }
    return this._data.nullValue ?? null;
  }

  /** `gPatternChooser("close")`: closes the chooser when it is open for this field. */
  close(): void {
    const chooser = patternChooser();
    if (chooser.isOpenned(this.element)) chooser.close();
  }

  /** `gPatternChooser("openEyeDropper", x, y)`. */
  openEyeDropper(pageX?: number, pageY?: number): void {
    const dropper = this.eyeDropper ? EyeDropper.of(this.eyeDropper) : null;
    if (dropper) dropper.setActive(true, pageX, pageY);
  }

  /**
   * `gPatternChooser("updateSettings", options)`: merges into the field's
   * options in place, like `$.extend`, so undefined values don't overwrite.
   */
  updateSettings(options: Partial<PatternChooserWidgetOptions>): this {
    const target = this._data.options as Record<string, unknown>;
    for (const key of Object.keys(options)) {
      const value = (options as Record<string, unknown>)[key];
      if (value !== undefined) target[key] = value;
    }
    return this;
  }

  private _updateBackground(): void {
    const data = this._data;
    let pattern = (PatternTarget.of(this.preview) as PatternTarget).value();
    const dropper = this.eyeDropper ? EyeDropper.of(this.eyeDropper) : null;
    if (!pattern && data && data.nullValue) pattern = data.nullValue;
    const opacity = data && "number" == typeof data.opacity ? data.opacity : 1;
    if (pattern instanceof TexturePattern) {
      const background = Pattern.asCSSBackground(pattern, opacity);
      css(this.preview, "background-image", background);
      css(this.preview, "background-repeat", pattern.getRepeatMode());
      css(this.preview, "background-size", "contain");
      if (dropper) dropper.setValue(pattern);
    } else if (pattern && "function" == typeof pattern.asCSSBackground) {
      const background = Pattern.asCSSBackground(pattern, opacity);
      css(this.preview, "background", background);
      if (dropper) dropper.setValue(background);
    }
  }
}

/** The classes a field's `types` option lists (for drop checks: GPatternTarget types). */
export type { PatternType };
