// Old: designer.browser.dev.js module 1609 (GPrintAction).
import { Key } from "../../../engine/core/key.ts";
import { Locale } from "../../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import type { Node } from "../../../engine/scene/node.ts";
import { exporters } from "../../../io/export/index.ts";
import { SvgExport } from "../../../io/export/svg/svg-export.ts";
import { Runtime } from "../../shell/container.ts";
import { lateExport } from "../../shell/late.ts";
import { ExtensionStorageItem } from "../../storage/extension-storage.ts";
import { stringToBase64String } from "../../util/designer-util.ts";
import { Action, type Shortcut } from "../action.ts";
import { Category } from "../category.ts";
import { confirmDialog } from "../deps.ts";
import {
  applicationManager,
  gContainer,
  gDesigner,
  type ActionDocument,
  type ActionStorageItem,
} from "../host.ts";

/** The hidden iframe every print goes through (made on the first print). */
let printFrame: HTMLIFrameElement | null = null;
/** Print the pages as SVG images instead of the PDF (Electron, or after the PDF failed). */
let printAsImages = false;
/** Printing threw once: say that printing is disabled from then on. */
let printingDisabled = false;

/**
 * File > Print (Ctrl+P): renders the document into a hidden iframe and
 * opens the browser's print dialog. The document is exported as PDF at
 * the highest resolution the PDF exporter supports for it (300 dpi with
 * the old Pro licence, else 150, falling back to 72 and 36). When no
 * resolution works, or in Electron, or when printing the PDF throws, every
 * page is exported as SVG and printed as images instead, after a warning
 * in Firefox and in Electron documents with effects.
 *
 * The sign-in gate around it is dropped with the accounts.
 */
export class PrintAction extends Action {
  static ID = "file.print";
  static TITLE = new LocaleKey("GPrintAction", "title");

  override getId(): string {
    return PrintAction.ID;
  }

  override getTitle(): LocaleKey {
    return PrintAction.TITLE;
  }

  override getIcon(): string {
    return "gravit-icon-print";
  }

  override getCategory(): Category {
    return Category.CATEGORY_FILE;
  }

  override getGroup(): string {
    return "print";
  }

  override isEnabled(): boolean {
    const designer = gDesigner();
    if (!applicationManager().isExportEnabled()) return false;
    const document = designer.getActiveDocument();
    return !!document && (!document.isNew() || document.isModified());
  }

  override getShortcut(): Shortcut {
    return [Key.Constant.COMMAND, "P"];
  }

  override execute(): void {
    const designer = gDesigner();
    const document = designer.getActiveDocument() as ActionDocument;
    const scene = document.getScene();
    const pdfItem = new ExtensionStorageItem("PDF");
    const options: Record<string, unknown> = {
      suppressMessages: true,
      dpi: designer.isEnabledProFeatures() ? 300 : 150,
      preserveEditingCapabilities: false,
      jpegQuality: 100,
      export: true,
    };
    const noData = () => {
      console.log("NO DATA :(");
    };
    const showPrintingDisabled = () => {
      const MessageDialog = lateExport<new (message: string) => { open(): void }>(
        "dialogs/message-dialog.ts",
        "MessageDialog",
      );
      if (!MessageDialog) throw new Error("dialogs/message-dialog.ts is not ported yet");
      new MessageDialog(
        Locale.get(new LocaleKey("GPrintAction", "printing-disabled")) as string,
      ).open();
    };
    const frame = (): HTMLIFrameElement => printFrame as HTMLIFrameElement;

    // Every page as an SVG image, one after another, then print the frame.
    const printImages = () => {
      Object.assign(options, { convertTextToPath: true });
      const pages: Node[] = [];
      scene.iteratePages(function (page: Node) {
        pages.push(page);
      });
      const svgs: string[] = [];
      const next = (error: unknown, svg?: string | null): void => {
        if (error || !svg) return noData();
        svgs.push(svg);
        pages.shift();
        if (pages.length) {
          exporters.SVGExport.export(pages[0], options, next);
          return;
        }
        let html = "";
        for (let i = 0; i < svgs.length; i++) {
          const url = "data:image/svg+xml;base64," + stringToBase64String(svgs[i] as string);
          html = html.concat(
            "<img style='height:100%;width:auto;max-width:100%;display:block;' src='" + url + "'/>",
          );
        }
        const content = frame().contentDocument as Document;
        content.head.innerHTML =
          "<style type='text/css' media='print'>@page { margin: 0mm; }</style>";
        content.body.style.margin = "0";
        content.body.style.height = "100%";
        content.body.innerHTML = html;
        content.title = document.getTitle();
        // $(contentWindow.document).ready(...): jQuery 3 runs a ready
        // handler of an already loaded page on a later timer turn.
        setTimeout(() => {
          (frame().contentWindow as Window).focus();
          try {
            (frame().contentWindow as Window).print();
          } catch {
            printingDisabled = true;
            showPrintingDisabled();
          }
        });
      };
      if (pages.length) exporters.SVGExport.export(pages[0], options, next);
    };

    const printImagesAfterWarning = () => {
      if (
        -1 !== navigator.userAgent.indexOf("Firefox") ||
        (gContainer().getRuntime() === Runtime.Electron &&
          SvgExport.hasSupportedEffects(scene as unknown as Node))
      ) {
        confirmDialog(
          Locale.get(new LocaleKey("GPrintAction", "printing-warning")) as string,
          (ok) => {
            if (ok) printImages();
          },
          undefined,
          undefined,
          undefined,
          true,
          true,
        );
      } else printImages();
    };

    const printPdf = () => {
      if (frame().src) {
        frame().focus();
        try {
          (frame().contentWindow as Window).print();
        } catch {
          printAsImages = true;
          frame().onload = printImagesAfterWarning;
          frame().src = "about:blank";
        }
      }
    };

    const loadPdf = () => {
      (pdfItem as unknown as { read(done: (data: BlobPart) => void): void }).read((data) => {
        const blob = new window.Blob([data], { type: "application/pdf" });
        const url = window.URL.createObjectURL(blob);
        frame().setAttribute("src", url);
      });
    };

    if (!printFrame) {
      printFrame = window.document.createElement("iframe");
      printFrame.style.visibility = "hidden";
      printFrame.style.position = "fixed";
      printFrame.style.right = "0";
      printFrame.style.bottom = "0";
      printFrame.style.zIndex = "-1";
      window.document.body.appendChild(printFrame);
      if (gContainer().getRuntime() === Runtime.Electron) printAsImages = true;
    }

    if (printingDisabled) showPrintingDisabled();
    else if (printAsImages) printImagesAfterWarning();
    else {
      let index = 0;
      const resolutions: (number | null)[] = [300, 150, 72, 36, null];
      if (!designer.isEnabledProFeatures()) resolutions.shift();
      let unsupported = false;
      while (!exporters.PDFExport.isSupported(scene, true, resolutions[index++] + "dpi")) {
        if (null === resolutions[index]) {
          unsupported = true;
          break;
        }
      }
      if (unsupported) {
        frame().onload = null;
        printImages();
      } else {
        options.dpi = resolutions[index - 1];
        frame().onload = printPdf;
        document.store(pdfItem as unknown as ActionStorageItem, loadPdf, noData, options);
      }
    }
  }

  override toString(): string {
    return "[Object GPrintAction]";
  }
}
