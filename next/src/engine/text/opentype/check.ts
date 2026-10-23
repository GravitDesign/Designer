// Old: chunk.vendor.js module 105 (opentype.js check.js, unchanged).

/** Run-time checking of preconditions. */
export function fail(message: string): never {
  throw new Error(message);
}

/** Throws an Error with the message when the predicate is falsy. */
export function argument(predicate: unknown, message: string): asserts predicate {
  if (!predicate) {
    fail(message);
  }
}

export const assert: (predicate: unknown, message: string) => asserts predicate = argument;

/**
 * Port helper, not in opentype.js: the old code reads tables and fields it
 * assumes are present (font.tables.head, glyph.points, ...). Where the old
 * code would crash with a TypeError on a missing value, the port calls this
 * and throws an Error instead, so strict TypeScript needs no non-null
 * assertions.
 */
export function defined<T>(value: T | null | undefined, what: string): T {
  if (value === undefined || value === null) {
    throw new Error(what + " is missing.");
  }
  return value;
}
