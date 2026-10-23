// Old: designer.browser.dev.js module 1118 (GImportedFontsProvider).
/**
 * The fonts the user imported (File > Import fonts): their list and files
 * live in the font database (font-db.ts). Families are grouped by display
 * name, like the font panel shows them.
 *
 * The font panel's previews of these fonts (with their delete button)
 * come with the font panel in phase 7.
 */
import { Font, type FontStyle } from "../../engine/text/fonts/font.ts";
import { uuid } from "../../engine/core/util.ts";
import { FontDB } from "./font-db.ts";
import {
  FontsProvider,
  type ListedFamily,
  type LoadCallbacks,
  type ResolveCallbacks,
} from "./fonts-provider.ts";
import { generateFormattedList, type NamedFont } from "./font-style-naming.ts";

const PROVIDER_ID = uuid();

/** An entry of the stored font list (weights are strings there). */
export interface ImportedFontRecord {
  family: string;
  weight: string;
  style: FontStyle;
  subfamily?: string | null;
  displayname?: string | null;
}

export class ImportedFontsProvider extends FontsProvider {
  private _totalFonts = 0;
  private _fontList: ImportedFontRecord[] | null = null;
  private _formattedFontList: ListedFamily[] | null = null;
  private _initialized = false;
  private _initializing = false;
  private _resolveCallbacks: ((failed: boolean) => void)[] = [];
  private _loadCallbacks: (() => void)[] = [];

  /**
   * Reads the font list once, then runs `retry` (the call that started
   * it) and everything that waited. Kept from the old code: the call that
   * started it also waits in a callback list, so it runs twice (see "The
   * first call to the imported fonts provider runs twice" in
   * QUESTIONS.md).
   */
  initialize(retry?: () => void): void {
    if (this._initialized || this._initializing) return;
    this._initializing = true;
    this.load(
      "%",
      0,
      1,
      {
        done: () => {
          this._initialized = true;
          this._initializing = false;
          if (retry) retry();
          this._clearCallbacks();
        },
        fail: () => {
          this._initializing = false;
          this._initialized = true;
          this._clearCallbacks(true);
        },
      },
      true,
    );
  }

  private _filtered(query: string, start: number, count: number): ListedFamily[] {
    return (this._formattedFontList as ListedFamily[])
      .filter((entry) =>
        query.indexOf("%") >= 0
          ? (entry.displayname || entry.family).toLowerCase().startsWith(query.replace(/%/g, ""))
          : (entry.displayname || entry.family).toLowerCase() == query.toLowerCase(),
      )
      .slice(start, start + count);
  }

  override load(
    query: string,
    start: number,
    count: number,
    callbacks: LoadCallbacks,
    initializing?: boolean,
  ): void {
    const retry = (failed?: boolean): void => {
      if (failed) callbacks.fail();
      else this.load(query, start, count, callbacks);
    };
    if (!this._initialized && !this._initializing) {
      this._loadCallbacks.push(retry);
      this.initialize(() => this.load(query, start, count, callbacks));
      return;
    }
    if (this._initializing && !initializing) {
      this._loadCallbacks.push(retry);
      return;
    }
    if (this._fontList) {
      callbacks.done(this._filtered(query, start, count), true, null);
      return;
    }
    FontDB.getInstance((db) => {
      if (!db) {
        callbacks.fail();
        return;
      }
      void db.getItem(FontDB.FONT_LIST).then(({ value }) => {
        this._fontList = (value as ImportedFontRecord[] | null | undefined) || [];
        this._generateFormattedList();
        this._totalFonts = this._formattedFontList
          ? (this._formattedFontList as ListedFamily[]).length
          : 0;
        callbacks.done(this._filtered(query, start, count), true, null);
        this._clearCallbacks();
      });
    });
  }

  private _generateFormattedList(): void {
    this._formattedFontList = this._fontList
      ? (generateFormattedList(this._fontList as NamedFont[]) as ListedFamily[])
      : null;
  }

  /** Calls everything waiting for the list: resolves get whether it failed, loads nothing. */
  private _clearCallbacks(failed?: boolean): void {
    this._resolveCallbacks.forEach((callback) => {
      callback(!!failed);
    });
    this._resolveCallbacks = [];
    this._loadCallbacks.forEach((callback) => {
      callback();
    });
    this._loadCallbacks = [];
  }

  /** Throws before the list was read, as before. */
  override getTotalFonts(query?: string): number {
    return query
      ? (this._formattedFontList as ListedFamily[]).filter(this._searchFilter(query)).length
      : this._totalFonts;
  }

  override resetProvider(): void {
    this._fontList = null;
    this._formattedFontList = null;
  }

  override resolveFont(
    family: string,
    style: FontStyle | null | undefined,
    weight: number | string | null | undefined,
    callbacks: ResolveCallbacks,
  ): void {
    const retry = (failed: boolean): void => {
      if (failed) callbacks.fail();
      else this.resolveFont(family, style, weight, callbacks);
    };
    if (!this._initialized && !this._initializing) {
      this._resolveCallbacks.push(retry);
      this.initialize(() => this.resolveFont(family, style, weight, callbacks));
      return;
    }
    if (this._initializing) {
      this._resolveCallbacks.push(retry);
      return;
    }
    // String(undefined) is "undefined", so a missing weight never
    // becomes "400" here.
    const weightText = String(weight) || "400";
    const fontStyle = style || Font.Style.Normal;
    FontDB.getInstance((db) => {
      if (!db) {
        callbacks.fail();
        return;
      }
      void db.getItem(family + "_" + weightText + "_" + fontStyle).then(({ value }) => {
        if (value) {
          callbacks.done(fontBytes(value));
          return;
        }
        if (!this._fontList) {
          console.warn("NO FONTLIST");
          callbacks.fail();
          return;
        }
        // A font imported under a subfamily name: try the weight it was
        // stored with.
        const index = this._fontList.findIndex(
          (entry) =>
            !(
              entry.family !== family ||
              entry.style !== fontStyle ||
              !entry.subfamily ||
              entry.displayname === entry.family
            ),
        );
        if (index < 0) {
          callbacks.fail();
          return;
        }
        const storedWeight = (this._fontList[index] as ImportedFontRecord).weight || "400";
        void db.getItem(family + "_" + storedWeight + "_" + fontStyle).then(({ value: data }) => {
          if (data) callbacks.done(fontBytes(data));
          else callbacks.fail();
        });
      });
    });
  }

  override getProviderId(): string {
    return PROVIDER_ID;
  }
}

/** A stored font file: an ArrayBuffer or DataView as is, else the view's buffer. */
function fontBytes(value: unknown): ArrayBuffer | DataView {
  return value instanceof DataView || value instanceof ArrayBuffer
    ? value
    : ((value as ArrayBufferView).buffer as ArrayBuffer);
}
