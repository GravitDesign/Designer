// Old: chunk.vendor.js module 368 (GTLCode).
// The old module was a function whose constructor threw "cannot be
// instantiated"; nothing called it with new, so a plain object stands in.

/** The `$` values of the list codes in a run's text. */
export const TLCode = {
  List: {
    Open: "ListStart",
    Item: "ListNext",
    Close: "ListEnd",
  },
} as const;
