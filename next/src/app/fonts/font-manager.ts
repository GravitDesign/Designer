// Old: designer.browser.dev.js module 255 (FontsProviderManager).
/**
 * The designer's font manager: the one place the app asks its font
 * providers (fonts-provider.ts) for fonts. It answers the engine font
 * manager's ResolveFontEvent (resolveFont) and QueryFontFamilyEvent
 * (resolveQueryFontFamily), and lists fonts for the font panel (query,
 * loadMore) with a cache of the last 30 queries.
 *
 * A font is resolved by the provider that listed its family, if a query
 * listed it already, else by asking every provider in order until one
 * has it. When none has it the request fails and MissingFontEvent fires.
 *
 * Not ported yet (phase 7): the missing-fonts dialog that a failed font
 * opens for the active document (see setMissingFontsHandler), the
 * "feature unavailable offline" dialog for a font whose download failed
 * while offline, and the network listener that init adds.
 */
import { Event } from "../../engine/core/event.ts";
import { EventTarget } from "../../engine/core/event-target.ts";
import { registerClass, type AnyConstructor } from "../../engine/core/object.ts";
import type { Font, FontStyle } from "../../engine/text/fonts/font.ts";
import { FontManager, type QueryFontFamilyEvent } from "../../engine/text/fonts/font-manager.ts";
import { OpenTypeFont } from "../../engine/text/fonts/open-type-font.ts";
import { FontsProviderErrors, type FontsProvider, type ListedFamily } from "./fonts-provider.ts";

/**
 * A copy of a ResolveFontEvent (the app copied the event before passing
 * it on): what to resolve and whom to tell.
 */
export interface FontRequest {
  family: string;
  style: FontStyle;
  weight: number;
  resolved: (font: Font) => void;
  failed: () => void;
  tryToResolveMissingFont: boolean;
  sender: object | null;
}

/** A query result: the matching families and how many the providers have. */
export interface QueryResult {
  faces: ListedFamily[];
  total?: number;
}

type QueryCallback = (result: QueryResult) => void;

type ProviderClass = new (manager: FontsProviderManager) => FontsProvider;

/** The font manager was reset (its caches dropped). */
export class ResetEvent extends Event {
  static {
    registerClass(this, "FontsProviderManager.ResetEvent");
  }

  constructor(public manager: FontsProviderManager) {
    super();
  }
}

/** No provider could resolve a font; `provider` is the one that listed it, if any. */
export class MissingFontEvent extends Event {
  static {
    registerClass(this, "FontsProviderManager.MissingFontEvent");
  }

  constructor(
    public manager: FontsProviderManager,
    public evt: FontRequest,
    public provider: FontsProvider | undefined,
  ) {
    super();
  }
}

/** The registered providers, in the order they are asked. */
const providers: FontsProvider[] = [];

/** Results of the last 30 queries over the enabled providers. */
let queryCache = new Map<string, QueryResult>();
let queryCacheKeys: string[] = [];
/** Results of the last 30 queries over all providers. */
let fullCache = new Map<string, QueryResult>();
let fullCacheKeys: string[] = [];
/** The provider that listed a family first. */
const familyProviders: Record<string, FontsProvider> = {};

/** Fonts listed per page: 20 previews, else (practically) all. */
const PREVIEW_PAGE = 20;
const FULL_PAGE = 9999;

export class FontsProviderManager extends EventTarget {
  static {
    registerClass(this, "FontsProviderManager");
  }

  static ResetEvent = ResetEvent;
  static MissingFontEvent = MissingFontEvent;

  private static _instance: FontsProviderManager | null = null;

  /**
   * Called after a font failed in every provider. The old app opened the
   * missing-fonts dialog for the active document here (app-dialogs-notify
   * registers it in phase 7).
   */
  private static missingFontsHandler: ((request: FontRequest) => void) | null = null;

  /** Provider classes to reset when the network comes back. */
  _resetProviders: ProviderClass[] | null = null;
  private _lock: ReturnType<typeof setTimeout> | null = null;
  private _loaded = 0;
  private _lastLoaded = 0;
  private _loadedPreviews = 0;
  private _lastLoadedPreviews = 0;
  private _loading = false;
  private _timeStamp = 0;
  /** A query the font panel runs again after every reset. */
  _firstCallback: QueryCallback | null = null;
  private _showMissingFontsDialog = true;
  keepFontsMessage: string | null = null;

  constructor() {
    super();
    if (FontsProviderManager._instance) {
      throw new Error("FontsProviderManager can be instantiated only once.");
    }
    FontsProviderManager._instance = this;
  }

  static getInstance(): FontsProviderManager {
    return FontsProviderManager._instance || new FontsProviderManager();
  }

  static setMissingFontsHandler(handler: ((request: FontRequest) => void) | null): void {
    FontsProviderManager.missingFontsHandler = handler;
  }

  /** Adds a provider of the class, made with this manager. */
  static registerProvider(providerClass: ProviderClass): void {
    const provider = new providerClass(FontsProviderManager.getInstance());
    if (providers.indexOf(provider) < 0) providers.push(provider);
  }

  static unregisterProvider(providerClass: ProviderClass): void {
    for (let i = 0; i < providers.length; i++) {
      if (providers[i] instanceof providerClass) providers.splice(i--, 1);
    }
  }

  /** The provider that listed the family, or null. */
  static getProvider(family: string): FontsProvider | null {
    return familyProviders[family] || null;
  }

  static getProviders(): FontsProvider[] {
    return providers.slice();
  }

  static getProviderInstance<T extends FontsProvider>(providerClass: AnyConstructor<T>): T | null {
    if (FontsProviderManager._instance) {
      for (const provider of providers) {
        if (provider instanceof providerClass) return provider;
      }
    }
    return null;
  }

  /** Disables the providers of the classes and enables every other one, then resets. */
  static disableProviders(classes: readonly ProviderClass[]): void {
    if (!FontsProviderManager._instance) return;
    for (const providerClass of classes) {
      for (const provider of providers) provider.setEnabled(!(provider instanceof providerClass));
    }
    FontsProviderManager._instance.reset(null, false, true);
  }

  /**
   * Enables the providers of the classes; unless `keepOthers`, disables
   * every other one and resets.
   */
  static enableProviders(classes: readonly ProviderClass[], keepOthers?: boolean): void {
    if (!FontsProviderManager._instance) return;
    for (const providerClass of classes) {
      for (const provider of providers) {
        const matches: boolean = provider instanceof providerClass;
        if (matches) provider.setEnabled(true);
        else if (!keepOthers) provider.setEnabled(false);
      }
    }
    if (!keepOthers) FontsProviderManager._instance.reset(null, false, true);
  }

  /**
   * Answers a QueryFontFamilyEvent with the faces of the family from the
   * full cache. An empty cache is filled first, which is asynchronous, so
   * the first question gets its answer too late for the engine (which
   * reads it right away) and sees undefined.
   */
  static resolveQueryFontFamily(event: QueryFontFamilyEvent): void {
    const manager = FontsProviderManager.getInstance();
    const answer = (): void => {
      const found = manager.searchFamilyInCache(event.family);
      event.callback(found && found.fonts && found.fonts.length ? found.fonts : []);
    };
    if (manager.isCacheEmpty()) manager.query(answer, "%", true);
    else answer();
  }

  private static _triggerMissingFont(
    request: FontRequest,
    provider: FontsProvider | undefined,
  ): void {
    const manager = FontsProviderManager.getInstance();
    if (manager.hasEventListeners(MissingFontEvent)) {
      manager.trigger(new MissingFontEvent(manager, request, provider));
    }
  }

  /** The request failed everywhere: tell the engine, then the listeners and the dialog. */
  private static _fail(request: FontRequest, provider: FontsProvider | undefined): void {
    request.failed();
    FontsProviderManager._triggerMissingFont(request, provider);
    const handler = FontsProviderManager.missingFontsHandler;
    if (handler) handler(request);
  }

  /**
   * The engine's font for a downloaded file: the one the engine font
   * manager has resolved meanwhile, else a new OpenTypeFont (null when
   * the file doesn't parse).
   */
  private static _fontFor(request: FontRequest, data: ArrayBuffer | DataView): Font | null {
    let font: Font | null = null;
    if (request.sender instanceof FontManager) {
      font = request.sender._getFont(request.family, request.style, request.weight);
    }
    if (!(font && font.isResolved())) {
      font = OpenTypeFont.create(request.family, request.style, request.weight, data);
    }
    return font;
  }

  /**
   * Resolves a font request: through the provider that listed the family
   * if there is one, else through the providers from `index` on (0 when
   * not given).
   *
   * Kept from the old code: a listed family whose file doesn't parse, or
   * whose download failed for lack of connection, is neither resolved nor
   * failed and stays pending (offline, the old app offered to retry in a
   * dialog; see "A listed family whose download had no connection stays
   * pending" in QUESTIONS.md).
   */
  static resolveFont(request: FontRequest, index?: number): void {
    if (request && index === undefined) {
      const provider = FontsProviderManager.getProvider(request.family);
      if (!provider) {
        FontsProviderManager.resolveFont(request, 0);
        return;
      }
      provider.resolveFont(request.family, request.style, request.weight, {
        done: (data) => {
          const font = FontsProviderManager._fontFor(request, data);
          if (font) request.resolved(font);
        },
        fail: (error) => {
          if (error && error === FontsProviderErrors.ConnectionError) return;
          FontsProviderManager._fail(request, provider);
        },
      });
      return;
    }
    if (typeof index !== "number") return;
    const provider = providers[index];
    if (provider) {
      provider.resolveFont(request.family, request.style, request.weight, {
        done: (data) => {
          const font = FontsProviderManager._fontFor(request, data);
          if (font) request.resolved(font);
          else FontsProviderManager.resolveFont(request, index + 1);
        },
        fail: () => {
          FontsProviderManager.resolveFont(request, index + 1);
        },
      });
    } else if (index === providers.length) {
      FontsProviderManager._fail(request, undefined);
    } else {
      FontsProviderManager.resolveFont(request, index + 1);
    }
  }

  /** The network listener (GDesigner's network event) is added with the app shell. */
  init(): void {}

  /** When the network is back, resets the providers whose loads failed for lack of it. */
  _networkAvailabilityChangedEvent(connected: boolean): void {
    if (this._resetProviders && this._resetProviders.length && connected) {
      while (this._resetProviders.length) {
        this.reset(this._resetProviders.shift() as ProviderClass, true);
      }
    }
  }

  isLoading(): boolean {
    return this._loading;
  }

  setShowMissingFontsDialog(show: boolean): void {
    this._showMissingFontsDialog = show;
  }

  getShowMissingFontsDialog(): boolean {
    return this._showMissingFontsDialog;
  }

  /**
   * Lists fonts from provider `index` on and calls `callback` with the
   * result when the last provider answered. Each provider gets the rest
   * of the page; its families are merged in before the families of later
   * providers and the list is sorted by name. A full listing (`previews`
   * false) is cached and followed by a previews pass, unless `all`
   * (every provider, enabled or not, as resolveQueryFontFamily asks).
   * Answers to an older query than the last one are discarded.
   *
   * Kept from the old code: a provider removed or disabled while it
   * loaded starts the next provider and still merges its own answer, so
   * the rest of the probe runs twice.
   */
  private _providerProbe(
    index: number,
    callback: QueryCallback,
    query: string,
    timeStamp: number,
    faces: ListedFamily[],
    total: number,
    fresh: boolean,
    previews: boolean,
    all?: boolean,
    quiet?: boolean,
  ): void {
    const page = previews ? PREVIEW_PAGE : FULL_PAGE;
    while (providers[index] && !all && !(providers[index] as FontsProvider).isEnabled()) index++;
    const loaded = previews ? this._loadedPreviews : this._loaded;
    const lastLoaded = previews ? this._lastLoadedPreviews : this._lastLoaded;
    if (index >= providers.length) {
      this._loading = false;
      this._timeStamp = timeStamp;
      if (previews) {
        this._loadedPreviews = this._lastLoadedPreviews;
        return;
      }
      this._loaded = this._lastLoaded;
      if (fresh && faces.length) {
        if (all || !this.hasDisabled()) {
          fullCache.set(query, { faces: faces.slice(), total });
          if (fullCacheKeys.unshift(query) > 30) fullCache.delete(fullCacheKeys.pop() as string);
        }
        if (!all) {
          queryCache.set(query, { faces, total });
          if (queryCacheKeys.unshift(query) > 30) queryCache.delete(queryCacheKeys.pop() as string);
        }
      }
      callback({ faces, total });
      if (!all) this._providerProbe(0, callback, query, timeStamp, [], 0, fresh, true, all, quiet);
      return;
    }
    const limit = loaded + (loaded < FULL_PAGE ? FULL_PAGE : page);
    let skip = 0;
    if (0 === index && !fresh) {
      // Paging on: find the provider the next page starts in.
      let sum = 0;
      for (index = 0; index < providers.length; index++) {
        const provider = providers[index] as FontsProvider;
        if (
          (all || provider.isEnabled()) &&
          (sum += provider.getTotalFonts(this.normalizeQuery(query))) > loaded
        ) {
          skip = loaded - sum + provider.getTotalFonts(this.normalizeQuery(query));
          break;
        }
      }
    }
    if (((!query || "%" === query) && lastLoaded < total) || index >= providers.length) {
      this._providerProbe(
        providers.length,
        callback,
        query,
        timeStamp,
        faces,
        total,
        fresh,
        previews,
        all,
        quiet,
      );
      return;
    }
    const count = limit - lastLoaded;
    const provider = providers[index] as FontsProvider;
    provider.load(
      this.normalizeQuery(query),
      skip,
      count,
      {
        done: (families) => {
          if (timeStamp < this._timeStamp) {
            console.log("discarded");
            return;
          }
          if (
            providers.indexOf(provider) < 0 ||
            (!all && !(providers[index] as FontsProvider).isEnabled())
          ) {
            this._providerProbe(
              index + 1,
              callback,
              query,
              timeStamp,
              faces,
              total,
              fresh,
              previews,
              all,
            );
          }
          for (const family of families) {
            if (!Object.prototype.hasOwnProperty.call(familyProviders, family.family)) {
              familyProviders[family.family] = provider;
            }
          }
          if (!previews) this._mergeFamilies(index, query, faces, families, all);
          provider.addPreviews(families, previews);
          total += provider.getTotalFonts(this.normalizeQuery(query));
          if (fresh && 0 === index) {
            if (previews) this._loadedPreviews = 0;
            else this._loaded = 0;
          }
          if (previews) this._lastLoadedPreviews += families.length;
          else this._lastLoaded += families.length;
          faces.sort((a, b) => a.family.localeCompare(b.family));
          this._providerProbe(
            index + 1,
            callback,
            query,
            timeStamp,
            faces,
            total,
            fresh,
            previews,
            all,
          );
        },
        fail: (error) => {
          if (!quiet && error && error === FontsProviderErrors.ConnectionError) {
            if (!this._resetProviders) this._resetProviders = [];
            this._resetProviders.push(provider.constructor as ProviderClass);
          }
          this._providerProbe(
            index + 1,
            callback,
            query,
            timeStamp,
            faces,
            total,
            fresh,
            previews,
            all,
          );
        },
      },
      quiet,
    );
  }

  /**
   * Puts a provider's families before the first face that a later enabled
   * provider listed, else at the end; into the query's result and (unless
   * `all`) into its cached result too.
   */
  private _mergeFamilies(
    index: number,
    query: string,
    faces: ListedFamily[],
    families: ListedFamily[],
    all: boolean | undefined,
  ): void {
    const cached = queryCache.get(this.normalizeQuery(query)) || { faces: [] };
    const insertBeforeLater = (target: ListedFamily[], scan: ListedFamily[]): void => {
      let i: number;
      for (i = 0; i < scan.length; i++) {
        const owner = providers.indexOf(
          familyProviders[(scan[i] as ListedFamily).family] as FontsProvider,
        );
        if (owner > index && (providers[owner] as FontsProvider).isEnabled()) {
          target.splice(i, 0, ...families);
          break;
        }
      }
      if (i == scan.length) faces.push(...families);
    };
    if (faces !== cached.faces || all) {
      insertBeforeLater(faces, faces);
      if (!all) {
        const cachedFaces = cached.faces;
        let i: number;
        for (i = 0; i < cachedFaces.length; i++) {
          const owner = providers.indexOf(
            familyProviders[(cachedFaces[i] as ListedFamily).family] as FontsProvider,
          );
          if (owner > index && (providers[owner] as FontsProvider).isEnabled()) {
            cachedFaces.splice(i, 0, ...families);
            break;
          }
        }
        if (i == cachedFaces.length) cachedFaces.push(...families);
      }
    } else {
      // The query's result is the cached one.
      insertBeforeLater(cached.faces, faces);
    }
  }

  /** Locks the font list for ten seconds (while the launcher installs). */
  setLock(): void {
    if (this._lock) clearTimeout(this._lock);
    this._lock = setTimeout(() => {
      this._lock = null;
    }, 1e4);
  }

  getLock(): boolean {
    return !!this._lock;
  }

  /**
   * Drops the query caches (the full one too unless `keepFull`), after
   * resetting the providers of `providerClass` (enabled ones, or all with
   * `force`), runs the font panel's query again and fires ResetEvent.
   */
  reset(providerClass?: ProviderClass | null, force?: boolean, keepFull?: boolean): void {
    if (providerClass) {
      for (const provider of providers) {
        if (provider instanceof providerClass && (force || provider.isEnabled())) {
          provider.resetProvider();
        }
      }
    }
    if (this._lock) {
      clearTimeout(this._lock);
      this._lock = null;
    }
    this._loaded = 0;
    this._lastLoaded = 0;
    this._loadedPreviews = 0;
    this._lastLoadedPreviews = 0;
    this._loading = false;
    this._timeStamp = 0;
    queryCache = new Map();
    queryCacheKeys = [];
    if (!keepFull) {
      fullCache = new Map();
      fullCacheKeys = [];
    }
    if (this._firstCallback) this.query(this._firstCallback, "%");
    if (this.hasEventListeners(ResetEvent)) this.trigger(new ResetEvent(this));
  }

  /**
   * The font panel's next page: previews first, then the next full page.
   * Returns how many previews are loaded, or undefined while loading.
   *
   * Kept from the old code: the very first page goes out without a time
   * stamp (undefined), so no answer of it is ever discarded.
   */
  loadMore(callback: QueryCallback, query: string): number | undefined {
    if (this._loading) return undefined;
    if (0 === this._loadedPreviews && 0 === this._lastLoadedPreviews) {
      this._providerProbe(0, callback, query, undefined as unknown as number, [], 0, false, true);
    } else if (
      this._loadedPreviews >= FULL_PAGE &&
      this._lastLoadedPreviews < this._loadedPreviews + PREVIEW_PAGE
    ) {
      this._loading = true;
      const now = new Date().getTime();
      const full = this._loaded >= FULL_PAGE && this._lastLoaded < this._loaded + FULL_PAGE;
      this._providerProbe(0, callback, query, now, [], 0, false, !full);
    } else if (this._loaded >= FULL_PAGE && this._lastLoaded < this._loaded + FULL_PAGE) {
      this._loading = true;
      const now = new Date().getTime();
      this._providerProbe(0, callback, query, now, [], 0, false, false);
    }
    return this._lastLoadedPreviews;
  }

  /**
   * Lists the fonts for a query (lower-cased): from a cache when it has
   * the query, from the cached result of a shorter query when that one
   * is complete, else from the providers.
   */
  query(callback: QueryCallback, query: string, all?: boolean): void {
    if (query) query = query.toLowerCase();
    if (all && fullCache.has(query)) {
      callback(fullCache.get(query) as QueryResult);
      return;
    }
    if (!all && queryCache.has(query)) {
      this._lastLoaded = 0;
      this._lastLoadedPreviews = 0;
      const cached = queryCache.get(query) as QueryResult;
      this._loaded = cached.faces.length;
      this._loadedPreviews = cached.faces.length;
      callback(cached);
      return;
    }
    if (query.length > 2) {
      let prefix = this.normalizeQuery(query.substr(0, query.length - 2));
      while (prefix.length > 1) {
        if (queryCache.has(prefix)) {
          const cached = queryCache.get(prefix) as QueryResult;
          if (cached.faces.length < FULL_PAGE || cached.faces.length == cached.total) {
            const matching: ListedFamily[] = [];
            for (const face of cached.faces) {
              if (
                face.family.substr(0, query.length - 1).toLowerCase() ==
                query.substr(0, query.length - 1).toLowerCase()
              ) {
                matching.push(face);
              }
            }
            this._lastLoaded = this._lastLoadedPreviews = 0;
            this._loaded = this._loadedPreviews = matching.length;
            callback({ faces: matching });
            return;
          }
        }
        prefix = this.normalizeQuery(prefix.substr(0, prefix.length - 2));
      }
    }
    const now = new Date().getTime();
    this._loading = true;
    this._loaded = this._loadedPreviews = 0;
    this._lastLoaded = this._lastLoadedPreviews = 0;
    this._providerProbe(0, callback, query, now, [], 0, true, false, all);
  }

  /** "%" stays; anything else gets one trailing "%" (an empty query becomes "%"). */
  normalizeQuery(query: string): string {
    if ("%" != query) {
      query = query ? query + "%" : "%";
      query = query.replace(/%+$/, "%");
    }
    return query;
  }

  isCacheEmpty(): boolean {
    return !fullCache.has("%");
  }

  hasDisabled(): boolean {
    return providers.some((provider) => !provider.isEnabled());
  }

  /**
   * The listed family (or grouped family) named `family` in the full
   * cache: under its own query, then under ever shorter prefixes.
   */
  searchFamilyInCache(family: string): ListedFamily | null {
    let key = family.toLowerCase() + ("%" == family ? "" : "%");
    if (this.isCacheEmpty()) return null;
    while (key.length > 0) {
      const cached = fullCache.get(key);
      if (cached) {
        if (cached.faces) {
          for (const face of cached.faces) {
            if (face.family === family) return face;
            if (face.families && face.families.indexOf(family) >= 0) return face;
          }
        }
      }
      if (1 === key.length) break;
      key = this.normalizeQuery(key.substr(0, key.length - 2));
    }
    return null;
  }
}

// The old module made the instance when it loaded.
FontsProviderManager.getInstance();
