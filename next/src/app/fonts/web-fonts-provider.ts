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

const PROVIDER_ID = uuid();

/** The Google families, once loaded. */
let families: ListedFamily[] = [];

/** Font files on their way, by url, with the requests waiting for them. */
const pendingDownloads = new Map<string, ResolveCallbacks[]>();

/** What waits for the family list: called with an error, or nothing once it's there. */
type PendingCall = (error?: FontsProviderError | true) => void;

export class WebFontsProvider extends FontsProvider {
  /**
   * The app's root path and version, which the family list url carries
   * (GContainer.getRootPath, GDesigner.getVersion). Without a version the
   * old code used a random number.
   */
  static rootPath = "";
  static version: string | number | null = null;

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
    const version =
      WebFontsProvider.version !== null ? WebFontsProvider.version : ~~(1e4 * Math.random());
    request.open("GET", WebFontsProvider.rootPath + "/assets/data/googlefonts.json?" + version);
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
