// Old: chunk.vendor.js module 338 (GPDFNumber).

/** How the writer formats numbers. */
export const PDFNumber = {
  /** Four decimals at most, trailing zeros dropped; anything but a number is 0 (with a warning). */
  normalizeNumber(value: unknown): number {
    if ("number" != typeof value || isNaN(value)) {
      console.warn("GPDFNumber.normalizeNumber", "invalid number", value);
      value = 0;
    }
    return parseFloat((value as number).toFixed(4));
  },

  /** Lower-case hex, left-padded with zeros to `digits` (default 4). */
  toHex(value: number, digits?: number): string {
    const padding = new Array<string>(digits || 4);
    const hex = value.toString(16);
    const missing = padding.length - hex.length;
    for (let i = 0; i < missing; i++) padding[i] = "0";
    return padding.join("") + hex;
  },
};
