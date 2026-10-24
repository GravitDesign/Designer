// Old: chunk.vendor.js module 642 (ICC profile data).

/** A lookup table as read from the profile: 8-bit (mft1) or 16-bit (mft2). */
export type IccTable = Uint8Array | Uint16Array;

/**
 * What the ICC reader keeps of a CMYK output profile: the header fields it
 * checks and the AToB1 / BToA1 lookup tables (input curves, the colour
 * lookup grid and output curves) that the CMYK conversions interpolate.
 */
export class IccHeader {
  profileFormatVersionMajor: number | null = null;
  profileFormatVersionMinor: number | null = null;
  colorSpace: number | null = null;
  deviceClass: number | null = null;
  PCS: number | null = null;
  // The old data class declared `flags` but the reader stores `Flags`.
  flags: number | null = null;
  Flags: number | null = null;
  intent: number | null = null;
  XYZIlluminant: number[] | null = null;
  illuminant: number[] | null = null;
  AtoB1InputChange: IccTable | null = null;
  AtoB1CLUTNumPts: number | null = null;
  AtoB1CLUT: IccTable | null = null;
  AtoB1OutputChange: IccTable | null = null;
  AtoB1normalizationRange: number | null = null;
  BtoA1InputChange: IccTable | null = null;
  BtoA1CLUTNumPts: number | null = null;
  BtoA1CLUT: IccTable | null = null;
  BtoA1OutputChange: IccTable | null = null;
  BtoA1normalizationRange: number | null = null;
}
