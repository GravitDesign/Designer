// Old: designer.browser.dev.js module 1379 (the Google fonts provider).
/**
 * The Google fonts: the family list comes from assets/data/googlefonts.json
 * (loaded on first use), the font files from fonts.gstatic.com.
 */
import { Font, type FontStyle } from "../../engine/text/fonts/font.ts";
import { uuid } from "../../engine/core/util.ts";
import {
  downloadFontFile,
  findListedFont,
  FontsProvider,
  FontsProviderErrors,
  type FontsProviderError,
  type ListedFamily,
  type LoadCallbacks,
  type ResolveCallbacks,
} from "./fonts-provider.ts";
import { containerOrNull, designerOrNull } from "../shell/globals.ts";
import { parsePreviewSvg, type PreviewCallback, type PreviewFamily } from "./font-preview.ts";

const PROVIDER_ID = uuid();

/** The Google families, once loaded. */
let families: ListedFamily[] = [];

/** Font files on their way, by url, with the requests waiting for them. */
const pendingDownloads = new Map<string, ResolveCallbacks[]>();

/** What waits for the family list: called with an error, or nothing once it's there. */
type PendingCall = (error?: FontsProviderError | true) => void;

export class WebFontsProvider extends FontsProvider {
  private _totalFonts = 0;
  private _initialized = false;
  private _initializing = false;
  private _resolveCallbacks: PendingCall[] = [];
  private _loadCallbacks: PendingCall[] = [];

  /** Calls everything waiting for the list, the resolves first. */
  private _clearCallbacks(error?: FontsProviderError | true): void {
    this._resolveCallbacks.forEach((callback) => {
      callback(error);
    });
    this._resolveCallbacks = [];
    this._loadCallbacks.forEach((callback) => {
      callback(error);
    });
    this._loadCallbacks = [];
  }

  /**
   * The previews come in batches of ten families per file
   * (assets/data/google_previews/previews<n>.json, SVG strings in list
   * order). A family's callback hands the preview over once both the
   * panel asked and the batch arrived, whichever comes last.
   *
   * Kept from the old code: a batch is fetched only from the first batch
   * on whose first family has no preview yet; once one is fetched, every
   * later batch of the call is fetched again, cached or not. A family
   * the list doesn't have stops the call with a warning.
   */
  override addPreviews(faces: ListedFamily[], previews?: boolean): void {
    const parser = new DOMParser();
    let fetching = false;
    const callback: PreviewCallback = function (receiver, preview) {
      if (receiver) {
        this.cb = receiver;
        if (this.svg) receiver(this.svg);
      } else {
        this.svg = preview;
        if (this.cb) this.cb(preview as Element);
      }
    };
    for (const family of faces as PreviewFamily[])
      if (!family.cachedPreview && !family.addPreviewCallback) family.addPreviewCallback = callback;
    if (!previews) return;
    if (!faces.length) return;
    const batches: number[] = [];
    for (const family of faces) {
      let index = 0;
      for (; index < families.length; index++)
        if ((families[index] as ListedFamily).family === family.family) {
          const batch = parseInt(String(index / 10));
          if (batches.indexOf(batch) < 0) batches.push(batch);
          break;
        }
      if (index === families.length) {
        console.warn("Error while generating previews: couldn't find font.");
        return;
      }
    }
    for (const batch of batches) {
      if (!(families[10 * batch] as PreviewFamily).cachedPreview) fetching = true;
      if (!fetching) continue;
      const request = new XMLHttpRequest();
      request.open(
        "GET",
        (containerOrNull()?.getRootPath() ?? "") +
          "/assets/data/google_previews/previews" +
          batch +
          ".json",
      );
      request.onload = function () {
        if (!(this.status >= 200 && this.status < 300)) return;
        let svgs: string[];
        try {
          svgs = JSON.parse(this.response as string) as string[];
        } catch {
          return;
        }
        const count = Math.min(families.length, 10 * (batch + 1)) - 10 * batch;
        for (let o = 0; o < count; o++) {
          const family = families[10 * batch + o] as PreviewFamily;
          if (!family.addPreviewCallback) family.addPreviewCallback = callback;
          try {
            const svg = parsePreviewSvg(parser, svgs[o] as string);
            if (svg) family.addPreviewCallback(null, svg);
          } catch {
            // The old code warned only in its debug build.
          }
        }
      };
      request.send();
    }
  }

  initialize(): void {
    if (!this._initialized && !this._initializing) this._load();
  }

  /**
   * Downloads the family list. A response from 300 to 399 leaves the
   * provider initializing for good, as before.
   */
  private _load(): void {
    this._initializing = true;
    const request = new XMLHttpRequest();
    // The url carries the app's root path and version, so the cache keeps
    // the list until the app changes; a random number before the designer
    // exists.
    const root = containerOrNull()?.getRootPath() ?? "";
    const app = designerOrNull();
    const version = app ? app.getVersion() : ~~(1e4 * Math.random());
    request.open("GET", root + "/assets/data/googlefonts.json?" + version);
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        this._initialized = true;
        this._initializing = false;
        families = JSON.parse(request.response as string) as ListedFamily[];
        this._totalFonts = families.length;
        this._clearCallbacks();
      } else if (request.status >= 400) {
        this._initialized = true;
        this._initializing = false;
        this._clearCallbacks(true);
      }
    };
    request.onerror = () => {
      this._initialized = true;
      this._initializing = false;
      this._clearCallbacks(FontsProviderErrors.ConnectionError);
    };
    request.send();
  }

  override load(query: string, start: number, count: number, callbacks: LoadCallbacks): void {
    const retry: PendingCall = (error) => {
      if (error) callbacks.fail(error);
      else this.load(query, start, count, callbacks);
    };
    if (!this._initialized && !this._initializing) {
      this._loadCallbacks.push(retry);
      this.initialize();
      return;
    }
    if (this._initializing) this._loadCallbacks.push(retry);
    else
      callbacks.done(
        families.filter(this._searchFilter(query)).slice(start, start + count),
        true,
        null,
      );
  }

  override getTotalFonts(query?: string): number {
    return query ? families.filter(this._searchFilter(query)).length : this._totalFonts;
  }

  override resolveFont(
    family: string,
    style: FontStyle | null | undefined,
    weight: number | string | null | undefined,
    callbacks: ResolveCallbacks,
  ): void {
    const retry: PendingCall = (error) => {
      if (error) callbacks.fail(error);
      else this.resolveFont(family, style, weight, callbacks);
    };
    // Before the first download the request waits with the loads; while
    // the list is on its way, with the resolves.
    if (!this._initialized && !this._initializing) {
      this._loadCallbacks.push(retry);
      this.initialize();
      return;
    }
    if (this._initializing) {
      this._resolveCallbacks.push(retry);
      return;
    }
    const font = findListedFont(families, family, style || Font.Style.Normal, weight);
    if (font) downloadFontFile(pendingDownloads, font.url as string, callbacks);
    else callbacks.fail();
  }

  override getProviderId(): string {
    return PROVIDER_ID;
  }

  /** Downloads the family list again. */
  override resetProvider(): void {
    this._load();
  }
}
