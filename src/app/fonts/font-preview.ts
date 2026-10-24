/**
 * The preview fields the providers hang on listed families for the font
 * panel (fonts-panel.ts). The old providers' addPreviews (modules 590,
 * 1118, 1199 and 1379) set them on the same objects the font manager
 * lists, and the panel reads and writes them there.
 */
import type { ListedFamily } from "./fonts-provider.ts";

/** Hands the preview element to the panel. */
export type PreviewReceiver = (preview: Element) => void;

/**
 * Asks for the family's preview. The Google fonts provider also calls it
 * itself with a null receiver and the preview once its batch is loaded.
 */
export type PreviewCallback = (
  this: PreviewFamily,
  receiver: PreviewReceiver | null,
  preview?: Element,
) => void;

export interface PreviewFields {
  /** The preview element, once it came (moved to the newest row). */
  cachedPreview?: Element;
  addPreviewCallback?: PreviewCallback;
  /** The panel row that waits for the preview. */
  row?: HTMLElement;
  /** A row that isn't a font (the old system fonts installer). */
  special?: boolean;
  /** The Google fonts provider's pending receiver and loaded preview. */
  cb?: PreviewReceiver;
  svg?: Element;
}

export type PreviewFamily = ListedFamily & PreviewFields;

/** One SVG element from a preview file, 20px high, or null. */
export function parsePreviewSvg(parser: DOMParser, text: string): Element | null {
  const svg = parser.parseFromString(text, "image/svg+xml").firstChild as Element | null;
  if (svg && svg.getAttribute("xmlns")) {
    svg.setAttribute("height", "20px");
    return svg;
  }
  return null;
}
