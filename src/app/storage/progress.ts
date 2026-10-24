// Old: designer.browser.dev.js module 555 (a class with one static method).
/** Progress bar arithmetic shared by loading and saving. */
export const Progress = {
  /** The value `fraction` of the way from `start` to `end`. */
  calculateProgress(start: number, end: number, fraction: number): number {
    return start + (end - start) * fraction;
  },
};
