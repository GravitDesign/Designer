// Old: designer.browser.dev.js module 447 (GSaveAction).
import { Key } from "../../../engine/core/key.ts";
import { Locale } from "../../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { lateExport } from "../../shell/late.ts";
import { Action, type Shortcut } from "../action.ts";
import { Category } from "../category.ts";
import { richTooltipConfig, TOOLTIP_AREA } from "../deps.ts";
import {
  applicationManager,
  gDesigner,
  type ActionDocument,
  type ActionStorageItem,
  type SaveCallback,
} from "../host.ts";
import { DEFAULT_EXTENSION, SaveAsAction } from "./save-as-action.ts";

/** The save-as action of the default format, "file.save-as.gvdesign". */
const SAVE_AS_DEFAULT_ID = SaveAsAction.ID + "." + DEFAULT_EXTENSION;

/**
 * File > Save (Ctrl+S, also inside text fields).
 *
 * A document that has its file is written back to it; a new one goes
 * through Save As (file.save-as.gvdesign). A document with linked images
 * first gets the linked-images warning.
 *
 * The old action also chose between the local file and Gravit Cloud: new
 * documents got a "save to file or to the cloud" chooser, cloud files and
 * documents with a cloud reference were synchronized, and browsers that
 * could not write files saved new documents to the cloud. With the cloud
 * dropped, new documents go to Save As directly (in every browser) and
 * the cloud branches are gone; see "Save of a new document skips the
 * cloud chooser" in QUESTIONS.md.
 */
export class SaveAction extends Action {
  static ID = "file.save";
  static TITLE = new LocaleKey("GSaveAction", "title");
  static SHORTCUT: Shortcut = [Key.Constant.META, "S"];
  static TOOLTIP_CONFIG: Record<string, unknown> | null = null;

  constructor() {
    super();
    SaveAction.TOOLTIP_CONFIG = {
      [TOOLTIP_AREA.TOOLBAR]: richTooltipConfig({
        title: Locale.get(new LocaleKey("GSaveAction", "tooltip-title")),
        description: Locale.get(new LocaleKey("GSaveAction", "tooltip-description")),
        shortcut: SaveAction.SHORTCUT,
        learnMore: "",
      }),
    };
  }

  override getId(): string {
    return SaveAction.ID;
  }

  override getTitle(): LocaleKey {
    return SaveAction.TITLE;
  }

  override getIcon(): string {
    return "gravit-icon-save";
  }

  override getCategory(): Category {
    return Category.CATEGORY_FILE;
  }

  override getGroup(): string {
    return "file";
  }

  override getShortcut(): Shortcut {
    return SaveAction.SHORTCUT;
  }

  override isShortcutGlobal(): boolean {
    return true;
  }

  override isEnabled(document?: ActionDocument | null): boolean {
    const designer = gDesigner();
    if (!applicationManager().isEditingEnabled()) return false;
    document = document || designer.getActiveDocument();
    if (!document || (!document.isModified() && !document.isNew())) return false;
    if (document.isSynchronizing()) return false;
    return (
      !(
        document.isNew() ||
        !document.getStorageItem() ||
        !(document.getStorageItem() as ActionStorageItem).getStorage().canSave()
      ) || designer.canExecuteAction(SAVE_AS_DEFAULT_ID, [null, document], undefined, true)
    );
  }

  /** Arguments as executeAction passes them: document, done. */
  override execute(document?: ActionDocument | null, done?: SaveCallback | null): void {
    const target = (document || gDesigner().getActiveDocument()) as ActionDocument;
    void this._save(target, done);
  }

  private async _save(document: ActionDocument, done?: SaveCallback | null): Promise<void> {
    if (gDesigner().getDefaultStorage().canSave()) {
      if (!document.getScene().hasLinkedFiles()) return this._saveDesktop(document, done);
      const WarnLinkedImageDialog = lateExport<new (proceed: () => void) => { open(): void }>(
        "dialogs/warn-linked-image-dialog.ts",
        "WarnLinkedImageDialog",
      );
      if (!WarnLinkedImageDialog) throw new Error("dialogs/warn-linked-image-dialog.ts is missing");
      new WarnLinkedImageDialog(() => {
        void this._saveDesktop(document, done);
      }).open();
    } else this._saveAs(document, done);
  }

  private async _saveDesktop(document: ActionDocument, done?: SaveCallback | null): Promise<void> {
    if (document.isNew()) this._saveAs(document, done);
    else document.store(document.getStorageItem() as ActionStorageItem, done, null, {});
  }

  private _saveAs(document: ActionDocument, done?: SaveCallback | null): void {
    gDesigner().executeAction(SAVE_AS_DEFAULT_ID, [null, document, done], undefined, true);
  }

  override getTooltipConfig(area?: string): unknown {
    return (area && SaveAction.TOOLTIP_CONFIG && SaveAction.TOOLTIP_CONFIG[area]) || null;
  }

  override toString(): string {
    return "[Object GSaveAction]";
  }
}
