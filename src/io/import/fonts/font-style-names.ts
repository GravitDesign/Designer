// Old: chunk.vendor.js module 1204.
//
// Helpers the PDF import's text handling shares: comparing word
// transforms, reading weight and style from font names, comparing word
// formatting, and the base class of the text merger (text-merge.ts).
import { equals as utilEquals } from "../../../engine/core/util.ts";
import { Transform, type TransformDecomposition } from "../../../engine/math/transform.ts";
import { Font } from "../../../engine/text/fonts/font.ts";

type WeightName = keyof typeof Font.Weight;

/** Weight names in the order getWeight tries them. */
const WEIGHT_NAMES: readonly WeightName[] = [
  "ExtraLight",
  "ExtraBold",
  "SemiBold",
  "Thin",
  "Light",
  "Regular",
  "Medium",
  "Bold",
  "Heavy",
];

export const TransformHelpers = {
  /** Same skew, rotation and scale (translation is ignored). Throws for singular transforms. */
  sameTransformation(a: Transform, b: Transform): boolean {
    const first = a.decomposed() as TransformDecomposition;
    const second = b.decomposed() as TransformDecomposition;
    return (
      Transform.equals(first.skew, second.skew) &&
      Transform.equals(first.rotate, second.rotate) &&
      Transform.equals(first.scale, second.scale)
    );
  },
};

export const FontNameHelpers = {
  Weight: WEIGHT_NAMES,

  /** The first weight name contained in `name`, else bolder/bold, else regular. */
  getWeight(name: string): number {
    const lower = name.toLowerCase();
    let weight: number | undefined;
    for (const weightName of WEIGHT_NAMES) {
      if (lower.indexOf(weightName.toLowerCase()) !== -1) {
        weight = Font.Weight[weightName];
        break;
      }
    }
    if (!weight)
      weight =
        lower.indexOf("bolder") !== -1
          ? Font.Weight.ExtraBold
          : lower.indexOf("bold") !== -1
            ? Font.Weight.Bold
            : Font.Weight.Regular;
    return weight;
  },

  getStyle(name: string): string {
    return name.toLowerCase().indexOf("italic") !== -1 ? Font.Style.Italic : Font.Style.Normal;
  },
};

export const WordHelpers = {
  /**
   * Whether two words have the same weight, style, color, family and size
   * (plus `extraKeys`); keys listed in `ignoredKeys` always count as equal.
   */
  sameFormatting(
    a: Record<string, unknown>,
    b: Record<string, unknown>,
    extraKeys?: readonly string[] | null,
    ignoredKeys?: readonly string[] | null,
  ): boolean {
    return ["fontWeight", "fontStyle", "fontColor", "fontFamily", "fontSize"]
      .concat(extraKeys || [])
      .every(
        (key) =>
          !(!ignoredKeys || ignoredKeys.indexOf(key) === -1) || utilEquals(a[key], b[key], true),
      );
  },
};

/** Base class of the text merger: turns positioned words into texts and merges texts. */
export class TextMergerBase {
  static Transform = TransformHelpers;
  static Font = FontNameHelpers;
  static Word = WordHelpers;

  createTexts(words: unknown[]): unknown {
    void words;
    return undefined;
  }

  mergeTexts(target: unknown, source: unknown): unknown {
    void target;
    void source;
    return undefined;
  }
}
