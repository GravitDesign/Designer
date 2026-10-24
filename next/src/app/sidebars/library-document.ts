// Old: designer.browser.dev.js module 1255 (the direct-link document opener, unnamed class).
/**
 * Opens a document the start URL named: a shared file, a template or a
 * size preset (`?token=`, `?directlink=`). The old bootstrap called it for
 * those requests and Open Shared File for a pasted link; the rewrite reads
 * no start URL parameters (browser-container.ts) and has no shared files,
 * so nothing calls it now. Kept for the preset case, which needs no cloud:
 * a new scene with the preset's unit, dpi and page size. Other requests
 * are fit to the window once their document is active; presets are not.
 *
 * The container's openStorageFile (cloud and Electron items) isn't ported;
 * the request is handled directly, as the old callback did with no item.
 */
import { Length } from "../../engine/math/length.ts";
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { FitAllAction } from "../actions/view/fit-all-action.ts";
import type { Document } from "../document/document.ts";
import { DocumentEvent } from "../document/document-event.ts";
import { DocumentStatus } from "../document/document-status.ts";
import { OpenFileRequest } from "../shell/container.ts";
import { designer } from "../shell/globals.ts";

/** A preset of the new-document presets (welcome/presets.ts) as a direct link names it. */
export interface PresetRequest {
  presetCategory: string;
  presetLayout: {
    id: string;
    name: string;
    unit: string;
    dpi?: number;
    width: number;
    height: number;
  };
}

/** The old stats name: the category with whitespace and slashes as dashes. */
function statsName(category: string): string {
  return category.toLowerCase().replace(/[\s/]/g, "-");
}

// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- the old module was a static-only class
export class LibraryDocument {
  /** Fills `document` for the request; returns it. */
  static handleOpenFileRequest(
    document: Document,
    request: OpenFileRequest,
    content?: PresetRequest | null,
  ): Document {
    const type = request.getType();
    if (type !== OpenFileRequest.Type.Preset) {
      const fitWhenActive = (event: DocumentEvent): void => {
        if (event.type === DocumentEvent.Type.Activated && event.document === document) {
          const status = (event.document as Document).getStatus();
          if (status !== DocumentStatus.LoadFailed && status !== DocumentStatus.LoadCancelled)
            designer().executeAction(FitAllAction.ID, undefined, undefined, true);
          designer().removeEventListener(DocumentEvent, fitWhenActive);
        }
      };
      designer().addEventListener(DocumentEvent, fitWhenActive);
    }
    if (content && content.presetLayout) {
      const scene = designer().createScene();
      const { unit, dpi, width, height } = content.presetLayout;
      scene.setProperties(["ut", "dpi"], [unit, dpi || Length.DPI]);
      scene
        .getActivePage()
        ?.setProperties(
          ["bck", "w", "h"],
          [RGBColor.WHITE, new Length(width, unit).toPoint(), new Length(height, unit).toPoint()],
        );
      document.setTitle(content.presetLayout.id);
      document.setScene(scene);
      document.setDocumentFromTemplate(true);
      designer().stats(
        "directlink_preset_" + statsName(content.presetCategory),
        content.presetLayout.name,
      );
    }
    return document;
  }
}
