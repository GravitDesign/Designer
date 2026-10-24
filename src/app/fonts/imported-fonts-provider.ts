// Old: designer.browser.dev.js module 1118 (GImportedFontsProvider).
/**
 * The fonts the user imported (File > Import fonts): their list and files
 * live in the font database (font-db.ts). Families are grouped by display
 * name, like the font panel shows them.
 *
 * The font panel shows each family in its own font (loaded into the page
 * as an @font-face from the database) with a delete button.
 */
import { Font, type FontStyle } from "../../engine/text/fonts/font.ts";
import { uuid } from "../../engine/core/util.ts";
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { FontDB } from "./font-db.ts";
import {
  FontsProvider,
  type ListedFamily,
  type LoadCallbacks,
  type ResolveCallbacks,
} from "./fonts-provider.ts";
import { generateFormattedList, type NamedFont } from "./font-style-naming.ts";
import { Text } from "../../engine/text/text.ts";
import { designer } from "../shell/globals.ts";
import { lateExport } from "../shell/late.ts";
import { FontsProviderManager } from "./font-manager.ts";
import type { PreviewFamily, PreviewReceiver } from "./font-preview.ts";

/** GSystemDialog.confirm (dialogs/system-dialog.ts), looked up when a font is deleted. */
interface ConfirmDialog {
  confirm(message: string, done: (ok: boolean) => void): unknown;
}

/** An imported family as its preview uses it: the deletes queue on the family itself. */
type ImportedPreviewFamily = PreviewFamily & {
  _queue?: (() => void)[] | null;
};

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
   * A preview is the family's name in its own font, which it loads into
   * the page from the database; the trash icon deletes every font of the
   * family after a confirm, replaces it with Open Sans in every open
   * document and lists the fonts again.
   */
  override addPreviews(families: ListedFamily[]): void {
    for (const family of families as ImportedPreviewFamily[])
      (family as { preview?: unknown }).preview = document.createElement("image");
    if (!families.length) return;
    // eslint-disable-next-line @typescript-eslint/no-this-alias -- the callbacks' `this` is the family
    const provider = this;
    for (const family of families as ImportedPreviewFamily[]) {
      if (family.cachedPreview) continue;
      family.addPreviewCallback = function (receiver) {
        const entry = this as ImportedPreviewFamily;
        const container = document.createElement("div");
        container.className = "preview-container";
        const label = document.createElement("div");
        label.innerHTML = (entry.displayname as string | undefined) || entry.family;
        label.style.fontFamily = entry.family;
        label.style.fontSize = designer().isTouchEnabled() ? "20px" : "13px";
        label.style.height = designer().isTouchEnabled() ? "30px" : "20px";
        container.appendChild(label);
        const trash = document.createElement("span");
        trash.className = "gravit-icon-trash g-font-delete";
        trash.setAttribute("name", "_SPECIAL_");
        container.appendChild(trash);
        label.addEventListener("mouseover", (event) => {
          event.stopPropagation();
          event.preventDefault();
        });
        trash.addEventListener("mouseup", (event) => {
          event.stopPropagation();
          event.preventDefault();
          provider._confirmDelete(entry);
        });
        let listed: ListedFamily | null = null;
        const formatted = provider._formattedFontList as ListedFamily[];
        for (let c = 0; c < formatted.length; c++)
          if ((formatted[c] as ListedFamily).family === entry.family) {
            listed = formatted[c] as ListedFamily;
            break;
          }
        if (listed)
          FontDB.getInstance((db) => {
            if (!db) return;
            const font = entry.fonts[0];
            if (!font) return;
            void db
              .getItem(String(font.family) + "_" + String(font.weight) + "_" + font.style)
              .then(({ value }) => {
                const reader = new FileReader();
                reader.onload = () => {
                  const style = document.createElement("style");
                  style.appendChild(
                    document.createTextNode(
                      "@font-face {font-family:" +
                        String(font.family) +
                        ";font-style:" +
                        ("N" !== font.style ? "italic" : "normal") +
                        ";font-weight:" +
                        String(font.weight) +
                        ';src: url("' +
                        String(reader.result) +
                        '") format("truetype");}',
                    ),
                  );
                  document.head.appendChild(style);
                };
                reader.readAsDataURL(
                  new Blob([value as BlobPart], { type: "application/x-font-ttf" }),
                );
              });
          });
        else label.innerHTML = "[Unavailable]";
        (receiver as PreviewReceiver)(container);
      };
    }
  }

  /** Asks, then deletes the family's fonts, one delete after the other. */
  private _confirmDelete(entry: ImportedPreviewFamily): void {
    const manager = FontsProviderManager.getInstance();
    const deleteFrom = (db: FontDB, index: number): void => {
      const fonts = entry.fonts;
      if (index >= fonts.length) {
        const formatted = this._formattedFontList as ListedFamily[];
        const position = formatted.findIndex((candidate) => candidate.family === entry.family);
        if (-1 === position) return;
        formatted.splice(position, 1);
        const list: ImportedFontRecord[] = [];
        this._fontList = list;
        formatted.forEach((family) => {
          family.fonts.forEach((font) => {
            list.push({
              family: font.family as string,
              weight: String(font.weight),
              style: font.style,
              subfamily: font.subfamily,
              displayname: font.displayname,
            });
          });
        });
        this._totalFonts--;
        void db
          .updateItem(
            FontDB.FONT_LIST,
            list.map((font) => ({
              family: font.family,
              weight: font.weight,
              style: font.style,
              subfamily: font.subfamily,
              displayname: font.displayname,
            })),
          )
          .then(() => {
            const names = entry.families as string[];
            const replacement: Record<string, string> = {};
            for (let i = 0; i < names.length; i++) replacement[names[i] as string] = "Open Sans";
            designer()
              .getDocuments()
              .forEach((document) => {
                (
                  document.getScene() as unknown as {
                    acceptChildren(visitor: (node: unknown) => void): void;
                  }
                ).acceptChildren((node) => {
                  if (node instanceof Text) node.replaceFonts(replacement, true);
                });
              });
            const workspace = designer().getWorkspace();
            if (workspace)
              for (let i = 0; i < names.length; i++)
                (
                  workspace.getFontManager() as unknown as { removeFont(family: string): void }
                ).removeFont(names[i] as string);
            FontsProviderManager.getInstance().reset();
            if (manager) manager.setShowMissingFontsDialog(true);
            console.log("successfully updated font list");
            if (entry._queue && entry._queue.length) (entry._queue.shift() as () => void)();
          });
      } else {
        const font = fonts[index] as (typeof fonts)[number];
        const key = String(font.family) + "_" + String(font.weight) + "_" + font.style;
        void db.deleteItem(key).then(() => {
          deleteFrom(db, index + 1);
        });
      }
    };
    const dialog = lateExport<ConfirmDialog>("dialogs/system-dialog.ts", "SystemDialog");
    if (!dialog) return;
    dialog.confirm(
      Locale.get(new LocaleKey("GImportedFontsProvider", "confirm.delete-font")) as string,
      (ok) => {
        if (!ok) return;
        if (!entry._queue) entry._queue = [];
        entry._queue.push(() => {
          FontDB.getInstance((db) => {
            if (db) {
              if (manager) manager.setShowMissingFontsDialog(false);
              deleteFrom(db, 0);
            }
          });
        });
        if (1 === entry._queue.length) (entry._queue.shift() as () => void)();
      },
    );
  }

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
