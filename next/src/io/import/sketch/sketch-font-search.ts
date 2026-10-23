// Old: chunk.vendor.js module 1142 (sketchfontsearch). port-map.tsv lists
// it under io-import-pdf-eps (import-font-resolver.ts), but only the Sketch
// importer (module 1122) requires it.
import { find } from "../../../engine/core/util.ts";
import { Font, type FontStyle } from "../../../engine/text/fonts/font.ts";
import {
  FontAvailableEvent,
  FontUnavailableEvent,
  type FontManager,
} from "../../../engine/text/fonts/font-manager.ts";

/** What the Sketch text importer asks for (sketch-text.ts composeQuery). */
export interface SketchFontQuery {
  fontName?: string;
  fontFamily: string;
  fontWeight: number;
  fontStyle: string;
}

/** A font provider's answer: the family, style and weight to use. */
export interface SketchFontAnswer {
  family: string;
  style: FontStyle;
  weight: number;
}

/** The import option `fontProvider` (the app's font library search). */
export interface SketchFontProvider {
  queryFirst(query: SketchFontQuery, callback: (answer: SketchFontAnswer | null) => void): void;
}

interface PendingFont {
  promise: Promise<void>;
  resolve: () => void;
  reject: (reason?: unknown) => void;
  font: Font;
}

/**
 * Asks the font provider for each text run's font (one request per
 * family/style/weight, later callers wait for the same answer), records
 * the font names it can't find, and waits for fonts the font manager is
 * still loading.
 */
export class SketchFontSearch {
  static hashCode(query: SketchFontQuery): string {
    return query.fontFamily + "_" + query.fontStyle + "_" + query.fontWeight;
  }

  declare _fontManager: FontManager | null;
  declare _unresolvedFonts: PendingFont[];
  declare _resolvedFonts: Font[];
  declare _fontCallback: Record<string, ((answer: SketchFontAnswer | null) => void)[]>;
  declare _fontProvider: SketchFontProvider;
  declare _missingFonts: string[];
  declare _promise: Promise<void>;
  declare _promiseCapability: { resolve: () => void; reject: (reason?: unknown) => void };

  constructor(fontProvider: SketchFontProvider | null | undefined, fontManager: FontManager) {
    this._fontManager = fontManager;
    this._fontManager.addEventListener(FontAvailableEvent, this._fontEvent, this);
    this._fontManager.addEventListener(FontUnavailableEvent, this._fontEvent, this);
    this._fontCallback = {};
    this._missingFonts = [];
    this._unresolvedFonts = [];
    this._resolvedFonts = [];
    this._fontProvider = fontProvider || {
      queryFirst: (_query, callback) => {
        callback(this.getDefaultFont());
      },
    };
    let resolve!: () => void;
    let reject!: (reason?: unknown) => void;
    this._promise = new Promise<void>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    this._promiseCapability = { resolve, reject };
  }

  /** The font manager's default font, or Open Sans regular. */
  getDefaultFont(): SketchFontAnswer {
    const manager = this._fontManager as FontManager;
    const font = () => manager.getDefaultFont();
    return {
      family: font() ? (font() as Font).getFamily() : "Open Sans",
      style: font() ? (font() as Font).getStyle() : Font.Style.Normal,
      weight: font() ? (font() as Font).getWeight() : Font.Weight.Regular,
    };
  }

  queryFirst(query: SketchFontQuery, callback: (answer: SketchFontAnswer | null) => void): void {
    let callbacks = this._fontCallback[SketchFontSearch.hashCode(query)];
    if (!callbacks) this._fontCallback[SketchFontSearch.hashCode(query)] = callbacks = [];
    callbacks.push(callback);
    if (1 === callbacks.length)
      this._fontProvider.queryFirst(query, (answer) => {
        if (!answer && -1 === this._missingFonts.indexOf(query.fontName as string))
          this._missingFonts.push(query.fontName as string);
        const waiting = this._fontCallback[SketchFontSearch.hashCode(query)];
        Reflect.deleteProperty(this._fontCallback, SketchFontSearch.hashCode(query));
        if (waiting)
          waiting.forEach((done) => {
            done(answer);
          });
        void this.ready();
      });
  }

  /** The font from the font manager, once it is loaded (it may stay pending). */
  getFont(family: string, style: FontStyle, weight: number): Promise<Font | null | undefined> {
    if (this._fontManager) {
      const font = this._fontManager.getFont(family, style, weight) as Font;
      if (!font.isResolved() && !font.isFailed()) {
        let pending = find(this._unresolvedFonts, (entry) => Font.equals(font, entry.font));
        if (!pending) {
          let resolve!: () => void;
          let reject!: (reason?: unknown) => void;
          const promise = new Promise<void>((res, rej) => {
            resolve = res;
            reject = rej;
          });
          pending = { promise, resolve, reject, font };
          this._unresolvedFonts.push(pending);
        }
        return pending.promise as Promise<undefined>;
      }
      return Promise.resolve(font);
    }
    return Promise.resolve(null);
  }

  _fontEvent(event: FontAvailableEvent | FontUnavailableEvent): void {
    if (!this._resolvedFonts.some((font) => Font.equals(event.font, font))) {
      const pending = find(this._unresolvedFonts, (entry) => Font.equals(event.font, entry.font));
      if (pending) {
        this._resolvedFonts.push(event.font);
        pending.resolve();
      }
    }
    void this.ready();
  }

  /** Settles once every font asked for is loaded and the provider answered everything. */
  ready(): Promise<void> {
    if (
      this._unresolvedFonts.length <= this._resolvedFonts.length &&
      !Object.keys(this._fontCallback).length
    ) {
      if (this._fontManager) {
        this._fontManager.removeEventListener(FontAvailableEvent, this._fontEvent, this);
        this._fontManager.removeEventListener(FontUnavailableEvent, this._fontEvent, this);
      }
      this._promiseCapability.resolve();
    }
    return this._promise;
  }
}

// The old prototype had a shared list; every instance gets its own.
SketchFontSearch.prototype._missingFonts = [];
