// Old: chunk.vendor.js module 801 (the shared export number format).
import { Rounding, type Roundable } from "./rounding.ts";

/**
 * Rounds numbers to a number of decimals (3 by default). The old module
 * exported one shared instance; so does this one.
 */
export class NumberFormat {
  declare _decimalPlacesPrecision: number;

  constructor() {
    this._decimalPlacesPrecision = 3;
  }

  setDecimalPlacesPrecision(digits: number): void {
    this._decimalPlacesPrecision = digits;
  }

  formatMatrix(matrix: Roundable): Roundable {
    return this.formatNumber(matrix);
  }

  formatNumber(value: Roundable): Roundable {
    return Rounding.round(value, this._decimalPlacesPrecision);
  }
}

NumberFormat.prototype._decimalPlacesPrecision = 3;

export const numberFormat = new NumberFormat();
