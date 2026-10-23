// Old: designer.browser.dev.js module 381 (GFontsProvider).
/**
 * Base class of the font providers the designer's font manager asks, in
 * order, to list and resolve fonts: the bundled fonts, the imported ones,
 * Google fonts and the system's own (see font-manager.ts).
 *
 * A provider answers through callbacks: `load` lists font families for a
 * query, `resolveFont` hands back the bytes of one font file.
 */
import { Font, type FontStyle } from "../../engine/text/fonts/font.ts";

/** One font of a family: what a provider lists and resolves. */
export interface FontFace {
  weight: number;
  style: FontStyle;
  url?: string;
  family?: string;
  subfamily?: string | null;
  displayname?: string | null;
}

/**
 * A family as a provider lists it. The font manager and the font panel
 * hang more fields on the same objects (previews), so it stays open.
 */
export interface FontFamilyEntry {
  /** Null while the imported provider groups a family by display name. */
  family: string | null;
  fonts: FontFace[];
  displayname?: string;
  /** Every family name a grouped entry stands for. */
  families?: string[];
  preview?: string;
  scripts?: string[];
  [extra: string]: unknown;
}

/** The family entries as the font manager uses them (family set). */
export type ListedFamily = FontFamilyEntry & { family: string };

/** Why a provider failed. */
export const FontsProviderErrors = {
  UnknownError: 0,
  ConnectionError: 1,
} as const;

export type FontsProviderError = (typeof FontsProviderErrors)[keyof typeof FontsProviderErrors];

/** The callbacks of `load`; done gets the families (the other two arguments are always true, null). */
export interface LoadCallbacks {
  done(families: ListedFamily[], complete?: boolean, extra?: null): void;
  fail(error?: FontsProviderError | boolean): void;
}

/** The callbacks of `resolveFont`; done gets the font file. */
export interface ResolveCallbacks {
  done(data: ArrayBuffer | DataView): void;
  fail(error?: FontsProviderError | boolean): void;
}

/** What a provider needs from the font manager that owns it. */
export interface FontsProviderOwner {
  setLock(): void;
  reset(): void;
}

/**
 * Downloads one font file for the bundled and the Google fonts providers
 * (both had the same code). Requests for a file already on its way wait
 * for it in `pending`. Kept from the old code: a failed connection fails
 * only the request that started the download, the ones waiting for it
 * hear nothing, and a response outside 200-299 calls nobody and leaves
 * the file pending for good (see "A font download that fails leaves its
 * waiting requests pending" in QUESTIONS.md).
 */
export function downloadFontFile(
  pending: Map<string, ResolveCallbacks[]>,
  url: string,
  callbacks: ResolveCallbacks,
): void {
  const waiting = pending.get(url);
  if (waiting) {
    waiting.push(callbacks);
    return;
  }
  const request = new XMLHttpRequest();
  request.responseType = "arraybuffer";
  request.open("GET", url);
  pending.set(url, [callbacks]);
  request.onload = function () {
    if (this.status >= 200 && this.status < 300) {
      const all = pending.get(url) as ResolveCallbacks[];
      pending.delete(url);
      all.forEach((entry) => {
        entry.done(this.response as ArrayBuffer);
      });
    }
  };
  request.onerror = () => {
    pending.delete(url);
    callbacks.fail(FontsProviderErrors.ConnectionError);
  };
  request.send();
}

/**
 * Finds the font of `family` with exactly `weight` (default 400) and
 * `style` (default normal) in a family list.
 */
export function findListedFont(
  families: readonly FontFamilyEntry[],
  family: string,
  style: FontStyle | null | undefined,
  weight: number | string | null | undefined,
): FontFace | null {
  for (const entry of families) {
    if (entry.family !== family) continue;
    for (const font of entry.fonts) {
      if (font.weight === (weight || 400) && font.style === (style || Font.Style.Normal))
        return font;
    }
  }
  return null;
}

export abstract class FontsProvider {
  static Errors = FontsProviderErrors;

  protected _providerManager: FontsProviderOwner | null;
  private _enabled = true;

  constructor(manager: FontsProviderOwner | null) {
    this._providerManager = manager;
  }

  /**
   * Hangs preview callbacks on listed families for the font panel. The
   * previews come with the font panel (app-fonts-ui, phase 7); until then
   * every provider leaves the families as they are.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old virtual signature
  addPreviews(_families: ListedFamily[], _previews?: boolean): void {}

  /** Lists the families matching `query` from `start`, at most `count` of them. */
  abstract load(
    query: string,
    start: number,
    count: number,
    callbacks: LoadCallbacks,
    quiet?: boolean,
  ): void;

  /** The number of families matching `query`, or all of them without one. */
  abstract getTotalFonts(query?: string): number;

  abstract getProviderId(): string;

  abstract resolveFont(
    family: string,
    style: FontStyle | null | undefined,
    weight: number | string | null | undefined,
    callbacks: ResolveCallbacks,
  ): void;

  isInitialized(): boolean {
    return true;
  }

  resetProvider(): void {}

  /** Whether the missing-fonts dialog can offer to switch the provider on. */
  hasEnabler(): boolean {
    return false;
  }

  getEnabler(): unknown {
    return null;
  }

  setEnabled(enabled: boolean): void {
    this._enabled = !!enabled;
  }

  isEnabled(): boolean {
    return this._enabled;
  }

  /**
   * A filter for families matching a query: with "%" a prefix match on
   * the query without its "%" signs, else the whole name, both ignoring
   * case on the family's side only (the query is lower case already).
   */
  protected _searchFilter(query: string): (entry: { family: string | null }) => boolean {
    return (entry) =>
      query.indexOf("%") >= 0
        ? (entry.family as string).toLowerCase().startsWith(query.replace(/%/g, ""))
        : (entry.family as string).toLowerCase() == query.toLowerCase();
  }

  /**
   * The index of the font of `family` closest to `weight` and `style`
   * (squared weight distance, plus 90000 for the other style), or -1.
   */
  protected _getClosestKey(
    fonts: readonly { family: string; weight: number; style: FontStyle }[],
    family: string,
    weight: number | string,
    style: FontStyle,
  ): number {
    let best = Number.POSITIVE_INFINITY;
    const target = Number(weight);
    let index = -1;
    for (let i = 0; i < fonts.length; i++) {
      const font = fonts[i] as { family: string; weight: number; style: FontStyle };
      if (font.family === family) {
        let distance = (target - font.weight) * (target - font.weight);
        if (style !== font.style) distance += 9e4;
        if (distance < best) {
          best = distance;
          index = i;
        }
      }
    }
    return index;
  }
}
