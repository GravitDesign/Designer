// Old: designer.browser.dev.js module 1199 (the local fonts provider).
/**
 * The fonts installed on the machine, through the Local Font Access API
 * (window.queryLocalFonts). The browser container registers it last when
 * LOCAL_FONTS_API_ENABLED is set. The API needs a user gesture, so
 * without one the list comes back empty and every font fails here.
 */
import { Font, type FontStyle } from "../../engine/text/fonts/font.ts";
import { uuid } from "../../engine/core/util.ts";
import {
  FontsProvider,
  type ListedFamily,
  type LoadCallbacks,
  type ResolveCallbacks,
} from "./fonts-provider.ts";
import {
  getFontFamily,
  getLocalFontsData,
  parseNativeFonts,
  type LocalFontData,
  type ParsedNativeFont,
} from "./font-style-naming.ts";

const PROVIDER_ID = uuid();

/**
 * A local family with its fonts as the API lists them (FontData objects,
 * not font faces: the font list and QueryFontFamilyEvent get them so).
 */
interface LocalFamily {
  family: string;
  fonts: LocalFontData[];
  isLocalFont: true;
}

export class LocalFontsProvider extends FontsProvider {
  static VERSION = 1;

  private _totalFonts = 0;
  private _fontList: LocalFamily[] = [];
  /** Parsed fonts by "<family>_<style>_<weight>". */
  private _cachedParsedFonts: Record<string, ParsedNativeFont> = {};
  private _createLocalFontListPromise: Promise<void> | null = null;
  private _createLocalFontListCallbacks: LoadCallbacks[] | null = null;

  override load(query: string, start: number, count: number, callbacks: LoadCallbacks): void {
    this._createLocalFontList(query, start, count, callbacks);
  }

  override getTotalFonts(query?: string): number {
    return query ? this._fontList.filter(this._searchFilter(query)).length : this._totalFonts;
  }

  override resetProvider(): void {
    this._fontList = [];
  }

  override resolveFont(
    family: string,
    style: FontStyle | null | undefined,
    weight: number | string | null | undefined,
    callbacks: ResolveCallbacks,
  ): void {
    const fontWeight = parseInt(weight as string) || 400;
    const fontStyle = style || Font.Style.Normal;
    const key = family + "_" + fontStyle + "_" + String(fontWeight);
    const cached = this._cachedParsedFonts[key];
    if (cached) {
      callbacks.done(cached.blob);
      return;
    }
    if (this._fontList.length) {
      void this._processResolveFont(family, fontStyle, fontWeight, callbacks);
      return;
    }
    this._createLocalFontList("%", 0, 9999, {
      done: () => {
        void this._processResolveFont(family, fontStyle, fontWeight, callbacks);
      },
      fail: callbacks.fail,
    });
  }

  private async _processResolveFont(
    family: string,
    style: FontStyle,
    weight: number,
    callbacks: ResolveCallbacks,
  ): Promise<void> {
    const local = getFontFamily(family, (name) => this._findInFontsList(name));
    if (!local) {
      callbacks.fail();
      return;
    }
    const fonts = local.isLocalFont
      ? await parseNativeFonts(local.fonts)
      : (local.fonts as unknown as ParsedNativeFont[]);
    if (!fonts || !Array.isArray(fonts) || !fonts.length) {
      callbacks.fail();
      return;
    }
    const font = fonts.find(
      (parsed) =>
        (parsed.style === style && parsed.weight === weight && parsed.family === family) ||
        (parsed.style === style &&
          parsed.weight === weight &&
          parsed.family.replace(" " + String(parsed.subfamily), "") === family),
    );
    if (!font) {
      callbacks.fail();
      return;
    }
    this._cachedParsedFonts[family + "_" + style + "_" + String(weight)] = font;
    setTimeout(() => {
      callbacks.done(font.blob);
    }, 10);
  }

  /**
   * Lists the local families matching the query; the first call asks the
   * API and the calls made meanwhile wait for it. Kept from the old code:
   * the waiting calls all get the first call's query, start and count.
   */
  private _createLocalFontList(
    query: string,
    start: number,
    count: number,
    callbacks: LoadCallbacks,
  ): void {
    if (this._fontList && this._fontList.length > 0) {
      callbacks.done(this._listed(query, start, count), true, null);
      return;
    }
    if (this._createLocalFontListPromise) {
      (this._createLocalFontListCallbacks as LoadCallbacks[]).push(callbacks);
      return;
    }
    this._createLocalFontListCallbacks = [callbacks];
    this._createLocalFontListPromise = (async () => {
      const fonts = await getLocalFontsData();
      const families: LocalFamily[] = [];
      for (const font of fonts) {
        const known = families.find((entry) => entry.family === font.family);
        if (known) known.fonts.push(font);
        else families.push({ family: font.family, fonts: [font], isLocalFont: true });
      }
      // The old code sorted with a comparator that subtracted the family
      // names (always NaN), which keeps the order.
      this._fontList = families;
    })();
    void this._createLocalFontListPromise.then(() => {
      const waiting = this._createLocalFontListCallbacks as LoadCallbacks[];
      waiting.forEach((entry) => {
        entry.done(this._listed(query, start, count), true, null);
        this._createLocalFontListPromise = null;
        this._createLocalFontListCallbacks = null;
      });
      this._createLocalFontListCallbacks = [];
    });
  }

  private _listed(query: string, start: number, count: number): ListedFamily[] {
    return this._getFilteredFontsList(query, start, count) as unknown as ListedFamily[];
  }

  private _getFilteredFontsList(query: string, start = 0, count = 9999): LocalFamily[] {
    return this._fontList
      .filter((entry) =>
        query.indexOf("%") >= 0
          ? entry.family.toLowerCase().startsWith(query.replace(/%/g, ""))
          : entry.family.toLowerCase() === query.toLowerCase(),
      )
      .slice(start, start + count);
  }

  private _findInFontsList(family: string): LocalFamily | undefined {
    return this._fontList.find((entry) => family === entry.family);
  }

  override getProviderId(): string {
    return PROVIDER_ID;
  }
}
