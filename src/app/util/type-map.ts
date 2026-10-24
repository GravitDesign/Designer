// Old: designer.browser.dev.js module 1301 (a typed key/value bag).
/** A plain object's keys copied onto a map with presence checks. */
export class TypeMap {
  [key: string]: unknown;

  static readonly FileExtension = {
    CDR: "cdr",
    DES: "des",
    CDRAPP: "cdr",
    GVDESIGN: "gvdesign",
  } as const;

  /** A TypeMap with `source`'s keys, or null for nothing or an empty object. */
  static from(source: Record<string, unknown> | null | undefined): TypeMap | null {
    if (!source || (source && !Object.keys(source).length)) return null;
    return Object.assign(new TypeMap(), source);
  }

  hasKey(key: string): boolean {
    return Object.prototype.hasOwnProperty.call(this, key);
  }

  hasValue(key: string): boolean {
    return this.hasKey(key) && undefined !== this[key] && null !== this[key];
  }

  getAsInt(key: string): number {
    return parseInt(this[key] as string);
  }
}
