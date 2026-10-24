// Old: designer.browser.dev.js module 445 (GSaveAsAction).
import { Key } from "../../../engine/core/key.ts";
import { Locale } from "../../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { DocumentStatus } from "../../document/document-status.ts";
import { FileTypes, type FileType } from "../../document/file-types.ts";
import { Action, type Shortcut } from "../action.ts";
import { Category } from "../category.ts";
import { alertDialog, errorDialog } from "../deps.ts";
import {
  applicationManager,
  gDesigner,
  type ActionDocument,
  type ActionStorage,
  type ActionStorageItem,
  type SaveCallback,
  type SaveOptions,
} from "../host.ts";

/**
 * The app's own formats (module 10 FILE_FORMATS); the browser build had
 * only .gvdesign, which is also the default.
 */
export const NATIVE_EXTENSIONS = ["gvdesign"];
export const DEFAULT_EXTENSION = "gvdesign";

/** What save-as passes to GDocument.store besides the action's own options. */
export interface SaveAsOptions extends SaveOptions {
  dpi?: number;
}

/**
 * File > Save As / Download File (.gvdesign) and File > Export > PNG, JPG,
 * SVG, PDF (at 72, 96, 150 or 300 dpi): asks where to save (or downloads)
 * and stores the active document in that format.
 *
 * Dropped with the cloud and the licence: the paywall for marketplace
 * files, the sign-in gate, the cloud file branches (Gravit Cloud
 * synchronization, last-modified dates), the storage destinations' write
 * permission check (the browser container had no destinations), saving
 * review annotations, and the "Try Pro" tooltip of the 300 dpi PDF.
 */
export class SaveAsAction extends Action {
  static ID = "file.save-as";
  static DEFAULT_SAVE_OPTIONS: SaveOptions = {};

  private readonly _fileExt: string;
  private readonly _isNativeExt: boolean;
  private readonly _title: LocaleKey;
  private readonly _mime: string;
  private readonly _options: SaveAsOptions;

  constructor(fileExt: string, options: SaveAsOptions = {}) {
    super();
    this._fileExt = fileExt;
    this._isNativeExt = !!NATIVE_EXTENSIONS.includes(this._fileExt);
    const type = FileTypes.getFileTypesArray().filter(
      (fileType) => fileType.ext === fileExt,
    )[0] as FileType;
    this._title = (type.title || type.name) as LocaleKey;
    this._mime = type.mime;
    this._options = options;
  }

  /** "file.save-as.<ext>", with ".<dpi>" for a PDF at other than 72 dpi. */
  override getId(): string {
    if ("pdf" === this._fileExt) {
      const dpi = this._options && this._options.dpi;
      if (dpi && 72 !== dpi) return SaveAsAction.ID + "." + this._fileExt + "." + dpi;
    }
    return SaveAsAction.ID + "." + this._fileExt;
  }

  override getTitle(): string {
    if (this._isNativeExt) {
      return gDesigner().getDefaultStorage().canSave()
        ? (Locale.get(this._title) as string)
        : (Locale.get(new LocaleKey("GDocument", "title.download-" + this._fileExt)) as string);
    }
    if ("pdf" === this._fileExt) {
      const dpi = this._options.dpi ? this._options.dpi : 72;
      return (Locale.get(new LocaleKey("GSaveAsAction", "text.dpi-value")) as string)
        .replace("%dpiValue", String(dpi))
        .replace("%dpiString", Locale.get(new LocaleKey("GSaveAsAction", "text.dpi")) as string);
    }
    const { dpi = 72 } = this._options;
    return (
      Locale.get(
        new LocaleKey(
          "GSaveAsAction",
          "pdf" === this._fileExt ? "text.save-pdf" : "text.save-common",
        ),
      ) as string
    )
      .replace("%title", Locale.get(this._title) as string)
      .replace("%fileExtension", this._fileExt)
      .replace("%dpiValue", String(dpi))
      .replace("%dpiString", Locale.get(new LocaleKey("GSaveAsAction", "text.dpi")) as string);
  }

  override getCategory(): Category {
    return this._isNativeExt
      ? Category.CATEGORY_FILE
      : "pdf" === this._fileExt
        ? Category.CATEGORY_FILE_EXPORT_PDF
        : Category.CATEGORY_FILE_EXPORT;
  }

  override getGroup(): string {
    return this._isNativeExt
      ? "file"
      : "pdf" === this._fileExt
        ? "export/file-type/" + this._fileExt
        : "export/file-type";
  }

  override getShortcut(): Shortcut | null {
    return this._isNativeExt
      ? [Key.Constant.SHIFT, Key.Constant.META, Key.Constant.OPTION, "S"]
      : null;
  }

  override isEnabled(storage?: ActionStorage | null, document?: ActionDocument | null): boolean {
    const designer = gDesigner();
    const manager = applicationManager();
    if (!manager.isFileFormatEnabledForSaveAs({ ext: this._fileExt })) return false;
    if (!manager.isSavingAsEnabled()) return false;
    document = document || designer.getActiveDocument();
    if (!document) return false;
    storage =
      storage ||
      (document.getStorageItem()
        ? (document.getStorageItem() as ActionStorageItem).getStorage()
        : designer.getDefaultStorage());
    return storage.canPromptSave() || storage.canDownload();
  }

  /** Arguments as executeAction passes them: storage, document, done, options, file name. */
  override execute(
    storage?: ActionStorage | null,
    document?: ActionDocument | null,
    done?: SaveCallback | null,
    options: SaveOptions = SaveAsAction.DEFAULT_SAVE_OPTIONS,
    fileName?: string,
  ): void {
    const target = document || gDesigner().getActiveDocument();
    void this._performSave(storage, target as ActionDocument, done, options, fileName);
  }

  private async _performSave(
    storage: ActionStorage | null | undefined,
    document: ActionDocument,
    done: SaveCallback | null | undefined,
    options: SaveOptions = {},
    fileName?: string,
  ): Promise<void> {
    let name = fileName;
    storage =
      storage ||
      (document.getStorageItem()
        ? (document.getStorageItem() as ActionStorageItem).getStorage()
        : gDesigner().getDefaultStorage());
    options.referer = this.getId();
    // A PDF is downloaded when the storage can, even if it could prompt.
    const promptAllowed = !storage.canDownload() || this._fileExt !== FileTypes.PDF.ext;
    if (storage.canPromptSave() && promptAllowed) {
      const item = document.getStorageItem();
      if (!name && item) name = item.getName();
      if (!name) name = document.getTitle();
      if (name && !name.endsWith(this._fileExt)) name += ".".concat(this._fileExt.toLowerCase());
      storage.savePrompt(
        name,
        this._getFileTypes(),
        (chosen: ActionStorageItem) => {
          if (NATIVE_EXTENSIONS.includes((chosen.getExtension() || "").toLowerCase())) {
            document.setStorageItem(chosen);
          }
          options = document.updateSaveOptionsLastModifiedDate(options);
          options.singleton = true;
          options = this._updateSaveOptions(options);
          document.store(chosen, done, this._showError, Object.assign({}, this._options, options));
        },
        () => {
          if (done) done({ documentStatus: DocumentStatus.SaveCancelled });
        },
      );
    } else if (storage.canDownload()) {
      if (!name && document.getStorageItem())
        name = (document.getStorageItem() as ActionStorageItem).getName();
      name = name || document.getTitle() || "Design";
      if (!this._isNativeExt && document.hasPagesWithInfiniteEmptyCanvas()) {
        alertDialog(
          Locale.get(new LocaleKey("GCommonNames", "text.error-emtpy-infinite-canvas")) as string,
        );
        return;
      }
      options = document.updateSaveOptionsLastModifiedDate(options);
      options.singleton = true;
      options = { ...SaveAsAction.DEFAULT_SAVE_OPTIONS, ...options };
      const downloadName = name;
      storage.download(name + "." + this._fileExt, (item) => {
        if (item) {
          document.store(
            item,
            done,
            this._showError,
            Object.assign({}, this._options, options, { filename: downloadName }),
          );
        }
      });
    }
  }

  private _showError(message?: string): void {
    if (message) errorDialog(message, { showTitle: false });
  }

  private _getFileTypes(): { ext: string; mime: string }[] {
    return [{ ext: this._fileExt, mime: this._mime }];
  }

  private _updateSaveOptions(options: SaveOptions): SaveOptions {
    return options;
  }

  override toString(): string {
    return "[Object GSaveAsAction]";
  }
}
