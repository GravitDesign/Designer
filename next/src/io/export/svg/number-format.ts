// Typed access to the exporters' shared number format (chunk.vendor.js
// module 801, next/src/io/export/pdf/number-format.ts). The old formatter
// is one shared instance: an SVG export sets its precision and later
// exports format with it, so this file only narrows the types.
import type { Rect } from "../../../engine/math/rect.ts";
import { numberFormat as shared } from "../pdf/number-format.ts";
import { Rounding, type Roundable } from "../pdf/rounding.ts";

function formatNumber(value: number): number;
function formatNumber(value: readonly number[]): number[];
function formatNumber(value: Rect): Rect;
function formatNumber(value: number | Rect | readonly number[]): number | Rect | number[] {
  return shared.formatNumber(value as Roundable) as number | Rect | number[];
}

export const numberFormat = {
  setDecimalPlacesPrecision(digits: number): void {
    shared.setDecimalPlacesPrecision(digits);
  },
  formatNumber,
  formatMatrix(values: readonly number[]): number[] {
    return shared.formatMatrix(values as Roundable) as number[];
  },
};

/**
 * `formatNumber` passed on as a bare function (the old code did
 * `path.toSVGPath(formatter.formatNumber)`). Called without its object,
 * the old method read the precision from `window`, found nothing and
 * rounded to 3 places, whatever precision the export asked for.
 */
export function formatNumberDetached(value: number): number {
  return Rounding.round(value, undefined) as number;
}
