// Old: chunk.vendor.js module 1451 (the PDF raster fallback).
import { Length } from "../../../engine/math/length.ts";
import type { Rect } from "../../../engine/math/rect.ts";
import { Canvas2DPaintCanvas } from "../../../engine/paint/paint-canvas.ts";
import type { Node } from "../../../engine/scene/node.ts";
import { MirrorEffect } from "../../../engine/style/effects/mirror-effect.ts";
import { OverlayEffect } from "../../../engine/style/effects/overlay-effect.ts";
import { Stylable } from "../../../engine/style/stylable.ts";
import { BitmapExport, type BitmapExportNode } from "../bitmap-export.ts";
import type { PDFDocument } from "./pdf-document.ts";
import type { PDFPaintContext } from "./pdf-paint-context.ts";
import { PDFRect } from "./pdf-rect.ts";

/** The node calls of the fallback. */
type RasterNode = Node &
  BitmapExportNode & {
    getEffects(): { getFirstChild(): unknown } | null;
  };

interface TileBitmap {
  bitmap: { getHTMLElement(): HTMLCanvasElement; getWidth(): number; getHeight(): number };
  area: Rect;
}

/**
 * Rasterizes a node the PDF can't draw (custom blend modes, unsupported
 * patterns or effects) at the export resolution and puts the bitmap where
 * its drawing was. The node's own opacity and blend mode are left out of
 * the bitmap and applied by the PDF instead. Large nodes are rendered in
 * tiles of up to 1024 px at 72 dpi (fewer at higher dpi), unless they
 * have a mirror or overlay effect.
 */
export class PDFRasterFallback {
  _prepareForRastering(node: RasterNode): RasterNode {
    if (!node.hasMixin(Stylable)) return node;
    return new Proxy(node, {
      get(target, key) {
        switch (key) {
          case "$_stop":
            return 1;
          case "$_sbl":
            return Canvas2DPaintCanvas.BlendMode.Normal;
          default:
            return (target as unknown as Record<string | symbol, unknown>)[key];
        }
      },
    });
  }

  export(
    context: PDFPaintContext,
    pdfDocument: PDFDocument,
    node: RasterNode,
    size: string,
  ): Promise<undefined> {
    return pdfDocument.createPromise<undefined>((resolve, reject) => {
      try {
        const area = node._getBitmapPaintArea();
        const dpi = [0];
        const scale = BitmapExport.convertSizeToScale(
          area.getWidth(),
          area.getHeight(),
          size,
          null,
          dpi,
        );
        const scaleX = (scale.getX() * (dpi[0] as number)) / Length.DPI;
        const scaleY = (scale.getY() * (dpi[0] as number)) / Length.DPI;
        let tileSize = 1024;
        if (scaleX > 1 && scaleY > 1) tileSize *= Math.min(1 / scaleX, 1 / scaleY);
        let untiled = false;
        if (node.hasMixin(Stylable)) {
          const effects = node.getEffects();
          if (effects) {
            for (
              let effect = effects.getFirstChild() as { getNext(): unknown } | null;
              null != effect;
              effect = effect.getNext() as { getNext(): unknown } | null
            ) {
              if (effect instanceof MirrorEffect || effect instanceof OverlayEffect) {
                untiled = true;
                break;
              }
            }
          }
        }
        const tiles = untiled ? null : PDFRect.tile(area, tileSize);
        if (tiles) {
          const executor = pdfDocument.createExecutor(0);
          const bitmaps: TileBitmap[] = [];
          const pixelArea = BitmapExport.getBitmapPaintArea(node, size);
          const width = Math.round(pixelArea.getWidth());
          const height = Math.round(pixelArea.getHeight());
          const renderTile = (tile: Rect) => {
            const sceneTile = tile.translated(area.getX(), area.getY());
            const prepared = this._prepareForRastering(node);
            const bitmap = BitmapExport.export(
              prepared,
              size,
              null,
              null,
              null,
              null,
              false,
              sceneTile,
            );
            if (bitmap && bitmap.getWidth() > 0 && bitmap.getHeight() > 0) {
              bitmaps.push({ bitmap, area: tile });
            }
          };
          const assemble = () => {
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const canvasContext = canvas.getContext("2d") as CanvasRenderingContext2D;
            const pixelScale = (dpi[0] as number) / Length.DPI;
            bitmaps.forEach((entry) => {
              canvasContext.drawImage(
                entry.bitmap.getHTMLElement(),
                entry.area.getX() * pixelScale,
                entry.area.getY() * pixelScale,
              );
            });
            context.canvas.getContext().replaceWithBitmap(canvas, node, null, null, true);
            resolve(undefined);
          };
          executor.execute(tiles, renderTile, assemble);
        } else {
          const prepared = this._prepareForRastering(node);
          const bitmap = BitmapExport.export(
            prepared,
            size,
            undefined,
            undefined,
            undefined,
            undefined,
          );
          if (bitmap && bitmap.getWidth() > 0 && bitmap.getHeight() > 0) {
            context.canvas
              .getContext()
              .replaceWithBitmap(bitmap.getHTMLElement(), node, null, null, true);
          }
          resolve(undefined);
        }
      } catch (error) {
        reject(error);
      }
    });
  }
}
