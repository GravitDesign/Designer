/**
 * engine-opentype-fork in the parity bridge. The old G namespace has no
 * opentype.js classes (GOpenTypeFont and GOpenTypeUtil wrap them and belong
 * to engine-fonts), so nothing is exposed here.
 */
export const engineOpentype: Record<string, unknown> = {};
