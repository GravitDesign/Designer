// Old: chunk.vendor.js module 142 (GDate).
/** The clock, as an object so tests and the engine can share one source. */
export class DateSource {
  now(): number {
    return new Date().getTime();
  }
}

/** The old GDate singleton. */
export const GDate = new DateSource();
