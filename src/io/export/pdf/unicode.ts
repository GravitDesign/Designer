// Old: chunk.vendor.js module 1234 (the PDF Unicode helpers).

const Surrogate = {
  Lead: { FirstChar: 55296, EndChar: 56319 },
  Trail: { FirstChar: 56320, EndChar: 57343 },
} as const;

export const PDFUnicode = {
  Surrogate,

  isSurrogatePair(lead: number, trail: number): boolean {
    return PDFUnicode.isSurrogateLead(lead) && PDFUnicode.isSurrogateTrail(trail);
  },

  isSurrogateLead(code: number): boolean {
    return code >= Surrogate.Lead.FirstChar && code <= Surrogate.Lead.EndChar;
  },

  isSurrogateTrail(code: number): boolean {
    return code >= Surrogate.Trail.FirstChar && code <= Surrogate.Trail.EndChar;
  },

  encodeToUTF32(lead: number, trail: number): number {
    return 1024 * (lead - Surrogate.Lead.FirstChar) + trail - Surrogate.Trail.FirstChar + 65536;
  },

  /** Two bytes per code unit, high byte first. */
  encodeToUTF16BE(codes: string | number[]): number[] {
    const bytes = PDFUnicode.encodeToUCS2(codes);
    for (let i = 0; i < bytes.length; i += 2) {
      const low = bytes[i] as number;
      bytes[i] = bytes[i + 1] as number;
      bytes[i + 1] = low;
    }
    return bytes;
  },

  /** Two bytes per code unit, low byte first. */
  encodeToUCS2(codes: string | number[]): number[] {
    const bytes: number[] = [];
    for (let i = 0; i < codes.length; ++i) {
      const code = "string" == typeof codes ? codes.charCodeAt(i) : (codes[i] as number);
      bytes.push(code % 256);
      bytes.push(code >> 8);
    }
    return bytes;
  },
};
