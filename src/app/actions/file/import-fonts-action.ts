// Old: designer.browser.dev.js module 1608 (GImportFontsAction).
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { lateExport } from "../../shell/late.ts";
import { Action } from "../action.ts";
import { Category } from "../category.ts";
import { applicationManager, gDesigner, type ActionStorage } from "../host.ts";

/** The font importer of module 1245 (fonts/font-db-loader.ts). */
interface FontImporter {
  import(done?: unknown): void;
}

/**
 * File > Import > Fonts: picks font files and stores them in the browser's
 * font database (IndexedDB). The old "Try Pro" tooltip is dropped with
 * the licence.
 */
export class ImportFontsAction extends Action {
  static ID = "font.import";
  static TITLE = new LocaleKey("GImportFontsAction", "title");

  override getId(): string {
    return ImportFontsAction.ID;
  }

  override getTitle(): LocaleKey {
    return ImportFontsAction.TITLE;
  }

  override getCategory(): Category {
    return Category.CATEGORY_FILE_IMPORT;
  }

  override getGroup(): string {
    return "import/import-fonts";
  }

  override isEnabled(storage?: ActionStorage | null): boolean {
    const designer = gDesigner();
    storage = storage || designer.getDefaultStorage();
    return (
      !!applicationManager().isImportResourcesEnabled() &&
      storage.canPromptOpen() &&
      "undefined" != typeof window &&
      !!window.indexedDB
    );
  }

  /** Arguments as executeAction passes them: an importer (a new one by default), done. */
  override execute(importer?: FontImporter | null, done?: unknown): void {
    if (!importer) {
      const FontDBLoader = lateExport<new () => FontImporter>(
        "fonts/font-db-loader.ts",
        "FontDBLoader",
      );
      if (!FontDBLoader) throw new Error("fonts/font-db-loader.ts is not ported yet");
      importer = new FontDBLoader();
    }
    importer.import(done);
  }

  override toString(): string {
    return "[Object GImportFontsAction]";
  }
}
