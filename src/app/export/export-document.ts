// Old: designer.browser.dev.js module 1253 (GExporter, the app side).
/**
 * The exporter the export dialog, the Export panel and "Export Page" call.
 * Its algorithm (export list, one export per item, file names, ZIP and
 * directory output) was ported with the engine to src/io/export/exporter.ts;
 * this module is the app's entry point to it and connects it to the app:
 * the PDF title is the active window's title and the file-type lookup is
 * GDocument.FileTypes.
 *
 * The PDF author stays whatever the exporter host already returns. The old
 * app asked the signed-in account (gDesigner.getUser); the rewrite has no
 * accounts, and the parity hooks pass the old stub account's name (see
 * "Q-090 PDF author is the signed-in user's name" in QUESTIONS.md). Keeping
 * the current getUserFullName makes the result independent of whether this
 * module or the parity hooks load first.
 */
import { FileTypeList } from "../document/file-types.ts";
import { designerOrNull } from "../shell/globals.ts";
import { Exporter, type ExportFileType, type ExportHost } from "../../io/export/exporter.ts";

export {
  Exporter,
  ZipDirectory,
  EXPORT_PROPERTY_NAME,
  JPEG_EXPORT_QUALITY_DEFAULT,
  type Exportable,
  type ExportRow,
  type ExportStorage,
  type ExportMessenger,
} from "../../io/export/exporter.ts";

/** gDesigner.getWindows().getActiveWindow().getTitle(). */
function activeWindowTitle(): string | null {
  const designer = designerOrNull();
  if (!designer || !designer.isInitialized()) return null;
  const window = designer.getWindows().getActiveWindow();
  return window ? window.getTitle() : null;
}

/** The host the app gives the exporter, on top of `previous` (its user name is kept). */
export function appExportHost(previous: ExportHost): ExportHost {
  return {
    getUserFullName: () => previous.getUserFullName(),
    getActiveWindowTitle: activeWindowTitle,
    getFileTypes: (): readonly ExportFileType[] => FileTypeList,
  };
}

Exporter.setHost(appExportHost(Exporter.getHost()));
