// Old: chunk.vendor.js module 195 (measuring and drawing runs, carota's text.js).
import type { VertexReader } from "../../geometry/vertex-source.ts";
import { Formatting, type Run } from "./formatting.ts";
import type { Measurement } from "./measurement.ts";
import { TLUtil } from "./tl-util.ts";

/** The formatting values measuring passes to the text meter besides the CSS font. */
export interface AdditionalProps {
  charSpacing: number;
  transformation?: string | null;
  script?: string;
  fontSize?: number;
  ligatures?: boolean;
  langScript?: string;
  fractions?: boolean;
  stylisticSet?: string | null;
  localizedForm?: string | null;
  /** Read by the meter but never set by getAdditionalProps, so measuring ignores variants. */
  variant?: string | null;
}

/**
 * Measures a text in a CSS style ("font: ..."). TLCore.initialize installs
 * the OpenType measure (measure.ts) on first use.
 */
export type TextMeter = (
  text: string,
  style: string,
  props?: AdditionalProps | null,
) => Measurement | null;

/** The font question transformText asks while drawing. */
interface FeatureQuery {
  hasFeature(feature: string): boolean;
}

/**
 * Where drawText may keep what it made for a text (a Part) for the next
 * draws. Only the drawing context reads or writes it.
 */
export interface ShapedTextHolder {
  _shaped: unknown;
}

/** The context runs draw into: TLCanvasContext. */
export interface RunDrawContext {
  fillStyle: unknown;
  strokeStyle: unknown;
  font: string;
  charSpacing: number;
  textAlign: string;
  textBaseline: string;
  wordSpacing: number | undefined;
  textUnderline: boolean;
  textStrikeout: boolean;
  textLigatures: boolean | undefined;
  textStylisticSet: string | null | undefined;
  textLocalizedForm: string | null | undefined;
  langScript: string | null | undefined;
  textVariant: string | null | undefined;
  textFractions: boolean;
  getCurrentFont(): FeatureQuery | null;
  drawText(
    text: string,
    x: number,
    y: number,
    ascent: number,
    width: number,
    holder?: ShapedTextHolder | null,
  ): void;
  drawMarker(source: VertexReader, x: number, y: number): void;
  save(): void;
  restore(): void;
  fillRect(x: number, y: number, width: number, height: number): void;
  strokeRect(x: number, y: number, width: number, height: number): void;
  fillText?(text: string, x: number, y: number): void;
}

/** The text meter TLCore installs (TLCore.textMeter). */
export const textMeterSlot: { meter: TextMeter | null } = { meter: null };

const LS = String.fromCharCode(8232);
const NBSP = String.fromCharCode(160);

/**
 * The CSS font of a run: "style weight sizepx family", each falling back
 * to the default formatting; super- and subscript use 0.8 of the size.
 */
function getFontString(run: Run | null | undefined): string {
  let size = (run && run.fontSize) || Formatting.defaultFormatting.fontSize;
  if (run) {
    switch (run.script) {
      case "super":
      case "sub":
        size *= 0.8;
    }
  }
  return (
    ((run && "object" != typeof run.fontStyle && run.fontStyle) ||
      Formatting.defaultFormatting.fontStyle) +
    " " +
    ((run && "object" != typeof run.fontWeight && run.fontWeight) ||
      Formatting.defaultFormatting.fontWeight) +
    " " +
    size +
    "px " +
    ((run && "object" != typeof run.fontFamily && run.fontFamily) ||
      Formatting.defaultFormatting.fontFamily)
  );
}

function applyRunStyle(context: RunDrawContext, run: Run): void {
  context.fillStyle = (run && run.fontColor) || Formatting.defaultFormatting.fontColor;
  context.strokeStyle = "transparent";
  context.font = getFontString(run);
  context.charSpacing = run.charSpacing || 0;
}

function prepareContext(context: RunDrawContext): void {
  context.textAlign = "left";
  context.textBaseline = "alphabetic";
}

/** The CSS style string of a run ("font: ...; color: ...; vertical-align: ..."). */
function getRunStyle(run: Run | null | undefined, withoutColor?: boolean): string {
  const parts = ["font: ", getFontString(run)];
  if (!withoutColor) {
    parts.push(
      "; color: ",
      String((run && run.fontColor) || Formatting.defaultFormatting.fontColor),
    );
  }
  if (run) {
    switch (run.script) {
      case "super":
        parts.push("; vertical-align: super");
        break;
      case "sub":
        parts.push("; vertical-align: sub");
    }
  }
  return parts.join("");
}

/** The values of a run that differ from the defaults and change measuring. */
function getAdditionalProps(run: Run | null | undefined): AdditionalProps | null {
  if (!run) return null;
  const defaults = Formatting.defaultFormatting;
  const props: AdditionalProps = { charSpacing: 0 };
  if (void 0 !== run.charSpacing && run.charSpacing !== defaults.charSpacing) {
    props.charSpacing = run.charSpacing;
  }
  if (void 0 !== run.transformation && run.transformation !== defaults.transformation) {
    props.transformation = run.transformation;
  }
  if (void 0 !== run.script && run.script !== defaults.script) {
    props.script = run.script;
    props.fontSize = run.fontSize as number;
  }
  if (void 0 !== run.ligatures && run.ligatures !== defaults.ligatures) {
    props.ligatures = run.ligatures;
  }
  if (void 0 !== run.langScript && run.langScript !== defaults.langScript) {
    props.langScript = run.langScript;
  }
  if (void 0 !== run.fractions && run.fractions !== defaults.fractions) {
    props.fractions = run.fractions;
  }
  if (void 0 !== run.stylisticSet && run.stylisticSet !== defaults.stylisticSet) {
    props.stylisticSet = run.stylisticSet;
  }
  if (void 0 !== run.localizedForm && run.localizedForm !== defaults.localizedForm) {
    props.localizedForm = run.localizedForm;
  }
  return props;
}

function measureText(
  text: string,
  style: string,
  props?: AdditionalProps | null,
): Measurement | null {
  return (textMeterSlot.meter as TextMeter)(text, style, props);
}

/**
 * A measure function with its own cache, keyed by style, text and props.
 * Failed measurements (null) are not cached.
 */
function createCachedMeasureText(): TextMeter {
  const cache: Record<string, Measurement> = {};
  return (text, style, props) => {
    let key = style + "<>!&%" + text;
    if (props) key += "<>!&%" + JSON.stringify(props);
    let result: Measurement | null | undefined = cache[key];
    if (!result) {
      result = RunDraw.measureText(text, style, props);
      if (result) cache[key] = result;
      else result = null;
    }
    return result;
  };
}

/** Measures a text in a run's formatting (through the shared cache). */
function measure(text: string, run: Run | null | undefined): Measurement | null {
  return RunDraw.cachedMeasureText(text, getRunStyle(run, true), getAdditionalProps(run));
}

function drawMarker(
  context: RunDrawContext,
  source: VertexReader,
  run: Run,
  x: number,
  y: number,
): void {
  applyRunStyle(context, run);
  context.drawMarker(source, x, y);
}

/**
 * Draws a run's text at the baseline. Superscript moves up by a third of
 * the ascent, subscript down by half the descent; a line break draws a
 * non-breaking space. `holder` keeps the glyph outlines for later draws.
 */
function draw(
  context: RunDrawContext,
  text: string,
  run: Run,
  x: number,
  y: number,
  width: number,
  ascent: number,
  descent: number,
  holder?: ShapedTextHolder | null,
): void {
  prepareContext(context);
  applyRunStyle(context, run);
  switch (run.script) {
    case "super":
      y -= ascent * (1 / 3);
      break;
    case "sub":
      y += descent / 2;
  }
  if (run.transformation) {
    text = TLUtil.transformText(text, run.transformation, context.getCurrentFont());
  }
  context.wordSpacing = run.wordSpacing;
  context.textUnderline = true === run.underline;
  context.textStrikeout = true === run.strikeout;
  context.textLigatures = run.ligatures;
  context.textStylisticSet = run.stylisticSet;
  context.textLocalizedForm = run.localizedForm;
  context.langScript = run.langScript;
  context.textVariant = run.variant;
  context.textFractions = true === run.fractions;
  context.drawText("\n" === text || text === LS ? NBSP : text, x, y, ascent, width, holder);
}

/** The run measuring and drawing helpers under the names the old module exported. */
export const RunDraw = {
  getFontString,
  applyRunStyle,
  prepareContext,
  getRunStyle,
  getAdditionalProps,
  LS,
  NBSP,
  ENTER: NBSP,
  measureText,
  createCachedMeasureText,
  cachedMeasureText: null as unknown as TextMeter,
  measure,
  drawMarker,
  draw,
};
RunDraw.cachedMeasureText = createCachedMeasureText();
