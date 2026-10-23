// Old: chunk.vendor.js module 1136 (model/item/sketchtext).
import { CMYKColor } from "../../../engine/color/cmyk-color.ts";
import { RGBColor } from "../../../engine/color/rgb-color.ts";
import type { AsyncExecutor } from "../../../engine/core/async-executor.ts";
import type { Rect } from "../../../engine/math/rect.ts";
import { Transform } from "../../../engine/math/transform.ts";
import { Stylable } from "../../../engine/style/stylable.ts";
import { Font } from "../../../engine/text/fonts/font.ts";
import { openTypeMeasure } from "../../../engine/text/gtl/measure.ts";
import { Text } from "../../../engine/text/text.ts";
import { NSArchiver, type ArchivedMap } from "./ns-archiver.ts";
import type { SceneNodeLike, TextRun } from "./scene-node.ts";
import type { SketchBase } from "./sketch-base.ts";
import type { SketchLayerData } from "./sketch-data.ts";
import { SketchElement } from "./sketch-element.ts";
import type { SketchFile } from "./sketch-file.ts";
import type { SketchFontQuery } from "./sketch-font-search.ts";

/** NSTextAlignment 0..3 in this key order. */
const ALIGNMENTS = {
  left: Stylable.ParagraphAlignment.Left,
  right: Stylable.ParagraphAlignment.Right,
  center: Stylable.ParagraphAlignment.Center,
  justify: Stylable.ParagraphAlignment.Justify,
};

/** The paragraph alignment for NSAlignment `index` (out of range: left), or its name. */
function alignment(index: number, name?: boolean): string {
  if (index < 0 || index >= Object.keys(ALIGNMENTS).length) index = 0;
  return Object.keys(ALIGNMENTS).map((key) =>
    name ? key : ALIGNMENTS[key as keyof typeof ALIGNMENTS],
  )[index] as string;
}

/** An archived NSColor: calibrated RGB or CMYK as a string of floats. */
function archivedColor(color: { NSRGB?: DataView; NSCMYK?: DataView }): RGBColor | CMYKColor {
  const rgb = color.NSRGB;
  if (rgb) return new RGBColor(NSArchiver.toByte(rgb) || RGBColor.BLACK.getValue());
  const cmyk = color.NSCMYK;
  if (cmyk) {
    const values = NSArchiver.toByte(cmyk);
    return values ? new CMYKColor(values.map((value) => value / 255)) : new CMYKColor();
  }
  return new RGBColor(RGBColor.BLACK.getValue());
}

/** NSFontDescriptor attributes. */
interface FontAttributes {
  NSFontNameAttribute?: string;
  NSCTFontUIUsageAttribute?: string;
  NSFontSizeAttribute?: number;
}

/** The attributes of one run. */
interface RunAttributes {
  MSAttributedStringFontAttribute?: { NSFontDescriptorAttributes: unknown };
  NSColor?: { NSRGB?: DataView; NSCMYK?: DataView };
  NSParagraphStyle?: { NSAlignment?: number; NSMaxLineHeight?: number };
}

/** The root of an archived NSAttributedString. */
interface AttributedStringRoot {
  NSString: unknown;
  NSAttributeInfo: unknown;
  NSAttributes: unknown;
}

/**
 * A text layer: the runs of the archived attributed string (or the plain
 * string with the layer's text style), each with its font as the font
 * provider answers. The runs are set once every font has loaded, after
 * parse() returns.
 */
export class SketchText extends SketchElement {
  /**
   * Family, weight and style from a PostScript-ish font name
   * ("OpenSans-Bold" -> "Open Sans", 700, normal). Any name that contains
   * "regular" (or "oblique") counts as italic (QUESTIONS.md "Sketch font
   * names with Regular import as italic").
   */
  static composeQuery(name: string): SketchFontQuery & { fontName: string } {
    const styleExpression = /normal|italic|oblique|regular/i;
    const weightExpression = /normal|bold|bolder|lighter|100|200|300|400|500|600|700|800|900/i;
    name = name.replace(/[\s\r\t\n]+/gm, " ").replace(/^\s+|\s+$/g, "");
    let style = "normal";
    let weight: string | number = Font.Weight.Regular;
    if (styleExpression.test(name))
      style = ((styleExpression.exec(name) as RegExpExecArray).pop() as string).toLowerCase();
    if (weightExpression.test(name))
      weight = ((weightExpression.exec(name) as RegExpExecArray).pop() as string).toLowerCase();
    return {
      fontName: name,
      fontFamily: SketchText._familyOf(name),
      fontWeight: SketchText._weightOf(weight),
      fontStyle: "normal" === style ? Font.Style.Normal : Font.Style.Italic,
    };
  }

  /** The name without a weight suffix, split into words ("OpenSans" -> "Open Sans"). */
  static _familyOf(name: string): string {
    const family = name.replace(/["']/g, "").replace(" ", "").trim();
    let result = family;
    const dash = family.indexOf("-");
    if (-1 !== dash) {
      const suffix = family.substring(dash + 1, family.length).trim();
      if (Font.Weight[suffix as keyof typeof Font.Weight] || "normal" === suffix.toLowerCase())
        result = family.substring(0, dash).trim();
    }
    return result
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
      .replace(/([a-z])([0-9])/gi, "$1 $2")
      .replace(/([0-9])([a-z])/gi, "$1 $2")
      .trim();
  }

  static _weightOf(weight: string | number): number {
    if (isNaN(weight as number)) {
      if ("normal" !== weight) {
        const names = Object.keys(Font.Weight);
        for (let i = 0; i < names.length; i++) {
          const key = names[i] as keyof typeof Font.Weight;
          if (key.toLowerCase() === (weight as string).toLowerCase()) return Font.Weight[key];
        }
      }
      return Font.Weight.Regular;
    }
    return parseInt(weight as string);
  }

  declare _promise: Promise<void> | null;

  constructor(
    data: SketchLayerData,
    file: SketchFile,
    parent: SketchBase | null,
    node?: SceneNodeLike | null,
  ) {
    super(data, file, parent, node);
    if (this._node && this._node instanceof Text) this._node.setProperty("sc", true);
  }

  /**
   * A symbol override: the first run gets `text`. A centred auto-width
   * text then moves left by half the width it grew beyond its frame.
   */
  setText(text: string): void {
    void (this._promise as Promise<void>).then(() => {
      const content = this._node.getContent();
      if (content && content.length) {
        const run = content[0] as TextRun;
        run.text = text;
        this._node.setText(content);
        if (0 === this._data.textBehaviour && "center" === run.align && this._promise)
          void this._file
            .getFontSearch()
            .getFont(
              run.fontFamily,
              "normal" !== run.fontStyle ? Font.Style.Italic : Font.Style.Normal,
              run.fontWeight || Font.Weight.Regular,
            )
            .then((font) => {
              const resolved = font as Font;
              if (resolved.isResolved() && !resolved.isFailed())
                this._calculateNewPosition(resolved);
              else console.warn("Font is unresolved");
            });
      }
    });
  }

  _calculateNewPosition(font: Font): void {
    const run = (this._node.getContent() as TextRun[])[0];
    if (run) {
      const css: (string | number)[] = [];
      css.push("font:");
      css.push(font.getStyle() === Font.Style.Normal ? "normal" : "italic");
      css.push(font.getWeight());
      css.push(String(run.fontSize) + "px");
      css.push(font.getFamily());
      // `new` on the meter gave an empty object when it returned null.
      const metrics = openTypeMeasure(run.text, css.join(" ")) || ({} as { width?: number });
      const box = this._getGeometryBBox() as Rect;
      if ((metrics.width as number) > box.getWidth())
        this._node.transform(
          new Transform().translated(box.getWidth() / 2 - (metrics.width as number) / 2, 0),
        );
    }
  }

  override parse(flag?: unknown, executor?: AsyncExecutor | null): void {
    super.parse(flag, executor);
    let resolve!: () => void;
    let reject!: (reason?: unknown) => void;
    this._promise = new Promise<void>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    let paragraphAlignment: number | undefined;
    let styleFont: FontAttributes | undefined;
    let color: RGBColor | CMYKColor = RGBColor.BLACK;
    // The old code kept the last run's font attributes in a shared variable.
    let font: FontAttributes | undefined;
    let archive: NSArchiver | null;
    if (this._data.style) {
      const textStyle = this._data.style.textStyle;
      if (textStyle && textStyle.encodedAttributes) {
        const encoded = textStyle.encodedAttributes;
        if (encoded.NSColor) {
          if ((archive = NSArchiver.from(encoded.NSColor._archive)))
            color = archivedColor(archive.top() as Parameters<typeof archivedColor>[0]);
        }
        if (encoded.NSParagraphStyle) {
          if (
            (archive = NSArchiver.from(encoded.NSParagraphStyle._archive)) &&
            (archive.top() as RunAttributes["NSParagraphStyle"] & object).NSAlignment
          )
            paragraphAlignment = (archive.top() as { NSAlignment: number }).NSAlignment;
        }
        if (encoded.MSAttributedStringFontAttribute) {
          if ((archive = NSArchiver.from(encoded.MSAttributedStringFontAttribute._archive))) {
            const descriptor = archive.getByRef(
              (archive.top() as { NSFontDescriptorAttributes: unknown }).NSFontDescriptorAttributes,
            );
            styleFont = font = archive.toMap(descriptor) as FontAttributes;
          }
        }
      }
    }
    let string: unknown;
    const attributed = this._data.attributedString;
    if (attributed && attributed.archivedAttributedString) {
      if (!(archive = NSArchiver.from(attributed.archivedAttributedString._archive))) {
        reject();
        return;
      }
      const strings = archive;
      const root = strings.top() as AttributedStringRoot;
      string = strings.getByRef(root.NSString);
      if ("object" == typeof string && (string as Record<string, unknown>)["NS.string"])
        string = (string as Record<string, unknown>)["NS.string"];
      const info = strings.getByRef(root.NSAttributeInfo) as { "NS.data": DataView } | undefined;
      const attributes = strings.getByRef(root.NSAttributes) as
        (ArchivedMap & { "NS.objects": number[] }) | undefined;
      if (attributes) {
        let lengths: ArrayLike<number>;
        let runAttributes: Record<string, unknown>[];
        if (info) {
          const data = info["NS.data"];
          lengths = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
          runAttributes = attributes["NS.objects"].map((ref) =>
            strings.toMap(strings.getByRef(ref)),
          );
        } else {
          lengths = [(string as string).length, 0];
          runAttributes = [strings.toMap(attributes)];
        }
        const runs: TextRun[] = [];
        let settled = 0;
        let defaultFont = this._file.getFontSearch().getDefaultFont();
        for (let i = 0; i < lengths.length; i += 2) {
          const length = lengths[i] as number;
          const run = runAttributes[lengths[i + 1] as number] as RunAttributes | undefined;
          font = styleFont;
          let runColor: RGBColor | CMYKColor = color;
          let align = alignment(paragraphAlignment || 0, true).toLowerCase();
          if (run) {
            if (run.MSAttributedStringFontAttribute)
              font = strings.toMap(
                strings.getByRef(run.MSAttributedStringFontAttribute.NSFontDescriptorAttributes),
              ) as FontAttributes;
            if (run.NSColor) runColor = archivedColor(run.NSColor);
            if (run.NSParagraphStyle)
              align = alignment(run.NSParagraphStyle.NSAlignment || 0, true).toLowerCase();
          }
          if (font && runColor && align) {
            defaultFont = this._file.getFontSearch().getDefaultFont();
            const name =
              font.NSFontNameAttribute || font.NSCTFontUIUsageAttribute || defaultFont.family;
            const query = SketchText.composeQuery(name);
            const textRun: TextRun = {
              text: (string as string).substring(0, length),
              fontName: query.fontName,
              fontFamily: query.fontFamily,
              fontWeight: query.fontWeight,
              fontStyle: query.fontStyle,
              fontSize: font.NSFontSizeAttribute,
              fontColor: runColor.toScreenCSS(),
              align,
            };
            if (run && run.NSParagraphStyle && run.NSParagraphStyle.NSMaxLineHeight)
              textRun.lineSpacing = String(run.NSParagraphStyle.NSMaxLineHeight);
            runs.push(textRun);
          }
          string = (string as string).substring(length);
        }
        this._node.$fontFamilies = runs.map((run) => run.fontName as string);
        runs.forEach((run) => {
          this._file.getFontSearch().queryFirst(run, (answer) => {
            run.fontFamily = answer ? answer.family : defaultFont.family;
            run.fontWeight = answer ? answer.weight : defaultFont.weight;
            run.fontStyle = answer && answer.style !== Font.Style.Normal ? "italic" : "normal";
            const done = (): void => {
              if (++settled >= runs.length) {
                this._node.setText(runs);
                resolve();
              }
            };
            this._file
              .getFontSearch()
              .getFont(
                run.fontFamily,
                "normal" === run.fontStyle ? Font.Style.Normal : Font.Style.Italic,
                run.fontWeight,
              )
              .then(done)
              .catch(done);
          });
        });
        string = null;
      } else this._node.setText(string);
    }
    const names: string[] = [];
    const values: unknown[] = [];
    if (string && "string" == typeof string) {
      if (color) {
        names.push("_fc");
        values.push(color);
      }
      if (paragraphAlignment) {
        names.push("_pal");
        values.push(alignment(paragraphAlignment));
      }
      if (styleFont) {
        const last = font as FontAttributes;
        names.push("_tfi", "_tff");
        values.push(last.NSFontSizeAttribute, last.NSFontNameAttribute);
      }
    }
    if (0 === this._data.textBehaviour) {
      if (this._node._geometryBBox) {
        names.push("ah");
        values.push(true);
      } else {
        names.push("aw", "ah");
        values.push(true, true);
      }
    }
    this._node.setProperties(names, values);
    // The node's cached geometry box becomes the Sketch frame.
    this._node._geometryBBox = this._getGeometryBBox();
  }

  override _getRelatedNodeClass(): new () => object {
    return Text;
  }
}

SketchText.prototype._promise = null;
