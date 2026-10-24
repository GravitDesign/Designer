// Old: chunk.vendor.js module 635.

/**
 * Wraps a class id (normally the old class name as a string, such as
 * "GSettingsDialog") so the locale can tell it apart from a class object.
 */
export class ClassReference {
  private readonly _ref: unknown;

  constructor(ref: unknown) {
    this._ref = ref;
  }

  getReference(): unknown {
    return this._ref;
  }
}
