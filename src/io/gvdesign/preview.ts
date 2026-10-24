// Old: designer.browser.dev.js module 163 (GDocument.buildPreview).
/**
 * The JPEG preview a save embeds (FMT-PREVIEW-002): the first page of the
 * scene, its bitmap paint area scaled so the longer side is 600 px, drawn
 * with fit-and-center (mode 2) on white and encoded by the browser's own
 * JPEG encoder (canvas.toBlob, default quality).
 */
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { Page } from "../../engine/scene/page.ts";
import type { Scene } from "../../engine/scene/scene.ts";
import { BitmapExport } from "../export/bitmap-export.ts";

/** The size the preview is scaled to on its longer side. */
export const PREVIEW_SIZE = 600;

/** The first page among the scene's children, or null. */
export function firstPage(scene: Scene): Page | null {
  for (let child = scene.getFirstChild(); null !== child; child = child.getNext()) {
    if (child instanceof Page) return child;
  }
  return null;
}

/**
 * GDocument.buildPreview. Resolves with the JPEG blob (or null when the
 * browser's encoder gives none). As in the old code the promise never
 * settles for a scene without a page or a bitmap without a canvas, and
 * rejects when the page has nothing to draw (toBitmap returns null and
 * the old code then failed on it); the save gives up after 4 s.
 */
export function buildPreview(scene: Scene): Promise<Blob | null> {
  return new Promise((resolve) => {
    const page = firstPage(scene);
    if (page) {
      const area = page._getBitmapPaintArea();
      const scale = BitmapExport.convertSizeToScale(
        area.getWidth(),
        area.getHeight(),
        area.getWidth() > area.getHeight() ? PREVIEW_SIZE + "w" : PREVIEW_SIZE + "h",
      );
      const bitmap = page.toBitmap(scale.getX(), scale.getY(), 2, RGBColor.WHITE);
      if (!bitmap) throw new TypeError("buildPreview: the first page has nothing to draw");
      bitmap.toImageBlob("image/jpeg", resolve);
    }
  });
}
