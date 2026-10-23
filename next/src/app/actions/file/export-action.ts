// Old: designer.browser.dev.js module 861 (GExportAction).
import { Key } from "../../../engine/core/key.ts";
import { Locale } from "../../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { DocumentStatus } from "../../document/document-status.ts";
import { lateExport } from "../../shell/late.ts";
import { Action, type Shortcut } from "../action.ts";
import { Category } from "../category.ts";
import { alertDialog, confirmDialog, richTooltipConfig, TOOLTIP_AREA } from "../deps.ts";
import { applicationManager, gDesigner, type ActionDocument } from "../host.ts";
import { SaveAction } from "./save-action.ts";

/** Options of the PDF variant ({ format: "pdf" }). */
export interface ExportOptions {
  format?: string;
}

/**
 * File > Export (Shift+Ctrl+E) and File > Export > PDF > Advanced Options:
 * opens the export dialog for the active document. A new document is
 * offered to be saved first.
 *
 * Dropped with the licence and the cloud: the paywall for marketplace
 * files, the sign-in gate, and the "Try Pro" tooltips (the toolbar
 * tooltip's Pro flag came from isProTooltipNeeded, which the rewrite
 * does not have). isPro() is false, see docs/rewrite/UI.md section 8.
 */
export class ExportAction extends Action {
  static ID = "file.export";
  static TITLE = new LocaleKey("GExportAction", "title");
  static SHORTCUT: Shortcut = [Key.Constant.SHIFT, Key.Constant.META, "E"];
  static TOOLTIP_CONFIG: Record<string, unknown> | null = null;

  private readonly _options: ExportOptions | null;

  constructor(options?: ExportOptions | null) {
    super();
    this._options = options || null;
    ExportAction.TOOLTIP_CONFIG = {
      [TOOLTIP_AREA.TOOLBAR]: richTooltipConfig({
        title: Locale.get(new LocaleKey("GExportAction", "tooltip-title")),
        description: Locale.get(new LocaleKey("GExportAction", "tooltip-description")),
        shortcut: ExportAction.SHORTCUT,
        learnMore: "",
      }),
    };
  }

  override getId(): string {
    return this._options && this._options.format
      ? ExportAction.ID + "." + this._options.format
      : ExportAction.ID;
  }

  override getTitle(): LocaleKey {
    return this._options
      ? new LocaleKey("GExportAction", "title.advanced-options")
      : ExportAction.TITLE;
  }

  override getGroupIcon(): string | null {
    return this._options ? null : "gravit-icon-export";
  }

  override getIcon(): string | null {
    return gDesigner().isTouchEnabled() ? "gravit-icon-export" : null;
  }

  override getCategory(): Category {
    return this._options && "pdf" == this._options.format
      ? Category.CATEGORY_FILE_EXPORT_PDF
      : Category.CATEGORY_FILE_EXPORT;
  }

  override getGroup(): string {
    return this._options ? "export/file-type/export" : "export/export";
  }

  override getShortcut(): Shortcut | null {
    return this._options ? null : ExportAction.SHORTCUT;
  }

  override isEnabled(): boolean {
    const designer = gDesigner();
    if (!applicationManager().isExportEnabled()) return false;
    return !!designer.getActiveDocument();
  }

  /** The argument is the export options when the action has none of its own. */
  override execute(options?: unknown): void {
    const designer = gDesigner();
    const document = designer.getActiveDocument() as ActionDocument;
    const openDialog = (target: ActionDocument | null) => {
      const ExportDialog = lateExport<
        new (document: unknown, options: unknown, referer: string) => { open(): void }
      >("export/export-dialog.ts", "ExportDialog");
      if (!ExportDialog) throw new Error("export/export-dialog.ts is not ported yet");
      new ExportDialog(target, this._options || options, this.getId()).open();
    };
    if (document.hasPagesWithInfiniteEmptyCanvas()) {
      alertDialog(
        Locale.get(new LocaleKey("GCommonNames", "text.error-emtpy-infinite-canvas")) as string,
      );
      return;
    }
    if (window.document.querySelectorAll(".g-export-dialog").length) return;
    if (document.isNew()) {
      confirmDialog(
        Locale.get(new LocaleKey("GExportAction", "text.save-before-export")) as string,
        (save) => {
          if (save) {
            designer.executeAction(
              SaveAction.ID,
              [
                document,
                function (result: { documentStatus?: number | null } = {}) {
                  const { documentStatus = null } = result;
                  if (documentStatus && documentStatus === DocumentStatus.Saved) {
                    openDialog(designer.getActiveDocument());
                  }
                },
                true,
              ],
              "unsavedhandler",
            );
          } else openDialog(document);
        },
        Locale.get(new LocaleKey("GLocale", "no")),
        Locale.get(new LocaleKey("GLocale", "yes")),
      );
    } else openDialog(document);
  }

  override getTooltipArea(): string {
    return this._options && "pdf" === this._options.format
      ? TOOLTIP_AREA.MAIN_MENU.TRY_EXP_PDF_ADVANCED_SETTING
      : TOOLTIP_AREA.MAIN_MENU.TRY_PRO_COMMON;
  }

  /** Only the toolbar tooltip of the plain Export action is left. */
  override getTooltipConfig(area?: string): unknown {
    return this._options
      ? null
      : (area && ExportAction.TOOLTIP_CONFIG && ExportAction.TOOLTIP_CONFIG[area]) || null;
  }

  override toString(): string {
    return "[Object GExportAction]";
  }
}
