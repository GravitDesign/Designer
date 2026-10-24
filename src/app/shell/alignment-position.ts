// Old: designer.browser.dev.js module 444 (unnamed; menu alignment).
/** Where a menu or popup opens relative to its reference, per axis. */
export const Position = { Left_Top: 0, Center: 1, Right_Bottom: 2 } as const;

export type PositionValue = (typeof Position)[keyof typeof Position];
