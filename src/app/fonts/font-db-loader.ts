// Old: designer.browser.dev.js module 1245 (GFontDBLoader).
/**
 * File > Import > Add Fonts: asks for font files and stores every font in
 * them in the font database (font-db.ts), where the imported fonts
 * provider lists them.
 *
 * Each font is stored under "<family>_<weight>_<style>" and added to the
 * stored font list (FontDB.FONT_LIST), which is written once after the
 * last font of the batch. A font whose family, weight and style are
 * listed already only fills in a missing subfamily or display name; when
 * the listed one has a different subfamily, the new font's subfamily is
 * appended to its family and the search goes on with that name. After the
 * batch the font manager is reset and the engine asked for every listed
 * font, so open documents pick them up.
 *
 * The old methods waited on the jQuery Deferreds of GFontDBClient; these
 * wait on its Promises (one microtask later, nothing depends on that).
 */
import { OpenTypeUtil, type FontFileEntry } from "../../engine/text/fonts/open-type-util.ts";
import type { FontStyle } from "../../engine/text/fonts/font.ts";
import type { OpenPromptOptions, StorageFileType } from "../storage/storage.ts";
import { designer } from "../shell/globals.ts";
import { FontDB } from "./font-db.ts";
import { FontsProviderManager } from "./font-manager.ts";
import { ImportedFontsProvider, type ImportedFontRecord } from "./imported-fonts-provider.ts";

/** The font files the picker offers. */
const FONT_FILE_TYPES: readonly StorageFileType[] = [
  { ext: "ttf", mime: "font/ttf" },
  { ext: "otf", mime: "font/otf" },
  { ext: "ttc", mime: "font/collection" },
  { ext: "dfont", mime: "font/collection" },
];

/** How often import() waits for a busy loader before it gives up. */
const MAX_IMPORT_TRIALS = 100;

/** The engine font manager's lookup, which loads a font that isn't loaded yet. */
interface FontLookup {
  getFont(family: string, style: FontStyle, weight: number): unknown;
}

export interface FontImportOptions extends OpenPromptOptions {
  /**
   * Don't wait for a busy loader. Only the old debugImportFont passed it
   * (module 1486, dropped with the debug helpers).
   */
  silent?: boolean;
}

export class FontDBLoader {
  private _fontDB: FontDB | null;
  /** Fonts of the current batch still to store. */
  _numFiles = 0;
  _numLoaded = 0;
  /** The stored font list as this batch changes it. */
  _tmpFontList: ImportedFontRecord[] | null = null;
  private _importTrialCount = 0;

  constructor() {
    try {
      this._fontDB = FontDB.getInstance() || null;
    } catch {
      this._fontDB = null;
    }
  }

  /**
   * Opens the font file picker. While another import is running (or the
   * database isn't open yet) it tries again every 100 ms; the counter goes
   * up twice per retry, so it calls `done` and gives up after about 50
   * (see "Font import gives up after about 50 tries" in QUESTIONS.md).
   * The retries don't pass `options` on, as before. Returns true when the
   * picker was asked for.
   */
  import(done?: () => void, options: FontImportOptions = {}): boolean | undefined {
    const { silent } = options;
    if (!silent && this.busy()) {
      if (this._importTrialCount++ > MAX_IMPORT_TRIALS) {
        if (done) done();
        return undefined;
      }
      setTimeout(() => {
        this.import(done);
      }, 100);
      this._importTrialCount++;
      return undefined;
    }
    this._importTrialCount = 0;
    this._prompt(done, options);
    return true;
  }

  private _prompt(done: (() => void) | undefined, options: FontImportOptions): void {
    const storage = designer().getDefaultStorage();
    const fontDB = this._fontDB as FontDB;
    this._numLoaded = 0;
    const listRead = fontDB.getItem(FontDB.FONT_LIST).then(({ value }) => {
      this._tmpFontList = (value as ImportedFontRecord[] | null | undefined) || [];
      return this._tmpFontList;
    });
    storage.openPrompt(
      FONT_FILE_TYPES,
      (item, count = 1) => {
        // Set again for every picked file, as the old callback did.
        this._numFiles = count;
        void listRead.then(() => {
          item.read((data) => {
            // A collection gives one entry per font. A file that can't be
            // read (null) throws here, as before.
            const fonts = OpenTypeUtil.getFont(
              null as unknown as string,
              null,
              null,
              data,
              true,
            ) as FontFileEntry[];
            this._numFiles += fonts.length - 1;
            // Stores the fonts one after the other, then calls done.
            const step = (index: number): (() => void) | undefined =>
              index < fonts.length
                ? () => this.checkAndAdd(fonts[index] as FontFileEntry, step(index + 1))
                : done;
            const first = step(0);
            if (first) first();
          });
        });
      },
      true,
      options,
    );
  }

  /** True while the database isn't open or a batch is being stored. */
  busy(): boolean {
    return !this._fontDB || !this._fontDB.ready() || this._numFiles > 0;
  }

  /** How much of the batch is stored, 0..1 (1 with no batch). */
  getProgress(): number {
    return 0 === this._numFiles ? 1 : this._numLoaded / this._numFiles;
  }

  /** Resolves once the stored font list is read. */
  ready(): Promise<void> {
    if (this._tmpFontList) return Promise.resolve(undefined);
    return (this._fontDB as FontDB).getItem(FontDB.FONT_LIST).then(({ value }) => {
      this._tmpFontList = (value as ImportedFontRecord[] | null | undefined) || [];
    });
  }

  /**
   * Adds one font of a file to the list and stores it, unless the list has
   * it already. Calls `next` once that is done (see _postAddAction).
   */
  checkAndAdd(font: FontFileEntry, next?: () => void): void {
    const { family, weight, style, buffer } = font;
    const record: ImportedFontRecord = {
      style: style as FontStyle,
      weight: String(weight),
      family,
      subfamily: font.subfamily,
      displayname: font.displayname,
    };
    if (this._tmpFontList) {
      for (let i = 0; i < this._tmpFontList.length; i++) {
        const listed = this._tmpFontList[i] as ImportedFontRecord;
        if (
          listed.family === record.family &&
          listed.weight === record.weight &&
          listed.style === record.style
        ) {
          if (font.subfamily && !listed.subfamily) listed.subfamily = font.subfamily;
          else if (listed.subfamily && listed.subfamily !== record.subfamily) {
            // A different subfamily of the same name: list it under the
            // longer name and keep comparing with that.
            record.family = record.family + (record.subfamily || "");
            continue;
          }
          if (font.displayname && !listed.displayname) listed.displayname = font.displayname;
          this._postAddAction(next);
          return;
        }
      }
    } else this._tmpFontList = [];
    this._tmpFontList.push(record);
    // The file goes under the family the file gave, even when the list
    // entry was renamed above. Then it replaces the bytes of the font
    // listed first, and the renamed entry has no file of its own. Ported
    // as it was; it is listed for the bug-fix pass.
    void (this._fontDB as FontDB)
      .updateItem(family + "_" + weight + "_" + style, buffer)
      .then(() => {
        this._postAddAction(next, true);
      });
  }

  /**
   * Counts one font as done. After the last one of the batch it writes the
   * font list, resets the font manager (only the imported fonts provider,
   * forced, when the last font was new; everything otherwise), asks the
   * engine for every listed font and calls `next`; before that it just
   * calls `next`.
   */
  _postAddAction(next?: () => void, added?: boolean): void {
    this._numLoaded++;
    if (this._numLoaded !== this._numFiles) {
      if (next) next();
      return;
    }
    this._numLoaded = 0;
    this._numFiles = 0;
    void (this._fontDB as FontDB).updateItem(FontDB.FONT_LIST, this._tmpFontList).then(() => {
      if (added) FontsProviderManager.getInstance().reset(ImportedFontsProvider, true);
      else FontsProviderManager.getInstance().reset();
      const workspace = designer().getWorkspace();
      if (workspace) {
        const fonts = workspace.getFontManager() as unknown as FontLookup;
        const list = this._tmpFontList as ImportedFontRecord[];
        for (let i = 0; i < list.length; i++) {
          const listed = list[i] as ImportedFontRecord;
          fonts.getFont(listed.family, listed.style, parseInt(listed.weight));
        }
      }
      if (next) next();
    });
  }
}
