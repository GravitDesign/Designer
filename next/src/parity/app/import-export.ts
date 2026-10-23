/**
 * window.__parity.app.importExport, the hooks declared in
 * parity/scenarios/import-export/contract.ts. The old app's version is
 * parity/scenarios/import-export/old-hooks.js; each hook calls the same
 * code path, here the ported exporter (io/export/exporter.ts, old module
 * 1253) and the exporter registry (io/export/index.ts, old module 797).
 *
 * Interim parts, until the app shell (phase 7) exists:
 * - documents() reports the interim document list of ./document.ts.
 * - The exporter's host gives no user (the PDF author is then the
 *   default "text.default-export-author") and the active document's
 *   title as the window title (GWindow.getTitle is its document's).
 * - svgUnsupportedFeatures and pdfIsSupported throw while the SVG and PDF
 *   exporters are not in the registry.
 */
import { Image } from "../../engine/scene/image.ts";
import type { Node } from "../../engine/scene/node.ts";
import type { Scene } from "../../engine/scene/scene.ts";
import { Text } from "../../engine/text/text.ts";
import { BitmapExport, type BitmapExportNode } from "../../io/export/bitmap-export.ts";
import { Exporter, type Exportable } from "../../io/export/exporter.ts";
import { exporters } from "../../io/export/index.ts";
import { documentHooks, getActiveDocument, getDocuments } from "./document.ts";

/** GDocument status numbers by name, as old-hooks.js reports them. */
const STATUS: Record<number, string> = {
  0: "Init",
  1: "Ready",
  10: "Loading",
  11: "LoadFailed",
  12: "Loaded",
  13: "LoadCancelled",
  20: "Saving",
  21: "SaveFailed",
  22: "Saved",
};

Exporter.setHost({
  ...Exporter.getHost(),
  getActiveWindowTitle: () => getActiveDocument()?.getTitle() ?? null,
});

const frame = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve()));
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

interface MaybeContainer {
  getFirstChild?: () => MaybeContainer | null;
  getNext(): MaybeContainer | null;
}

function children(node: unknown): unknown[] {
  const out: unknown[] = [];
  const container = node as MaybeContainer;
  if (typeof container.getFirstChild === "function") {
    for (let child = container.getFirstChild(); child; child = child.getNext()) out.push(child);
  }
  return out;
}

/** Every image and texture pattern under root has finished loading. */
function imagesReady(root: unknown): boolean {
  let ready = true;
  const pattern = (value: unknown): void => {
    const pt = value as { isReady?: () => boolean } | null;
    if (pt && typeof pt.isReady === "function" && !pt.isReady()) ready = false;
  };
  const visit = (node: unknown): void => {
    if (node instanceof Image) {
      const status = node.getStatus();
      if (status !== Image.ImageStatus.Loaded && status !== Image.ImageStatus.Error) ready = false;
    }
    const styled = node as {
      getPaintLayers?: () => unknown;
      hasProperty?: (name: string) => boolean;
      getProperty?: (name: string) => unknown;
    };
    if (typeof styled.getPaintLayers === "function" && styled.getPaintLayers()) {
      for (const layer of children(styled.getPaintLayers())) {
        pattern((layer as { getProperty(name: string): unknown }).getProperty("_pt"));
      }
    }
    if (typeof styled.hasProperty === "function" && styled.hasProperty("bck")) {
      pattern((styled.getProperty as (name: string) => unknown)("bck"));
    }
    for (const child of children(node)) visit(child);
  };
  visit(root);
  return ready;
}

function textBoxes(root: unknown): string {
  const out: string[] = [];
  const visit = (node: unknown): void => {
    if (node instanceof Text) {
      const box = node.getGeometryBBox();
      out.push(box ? [box.getX(), box.getY(), box.getWidth(), box.getHeight()].join(",") : "-");
    }
    for (const child of children(node)) visit(child);
  };
  visit(root);
  return out.join(";");
}

function fontsReady(scene: Scene): boolean {
  const fonts = scene.getWorkspace()?.getFontManager();
  return !(fonts && fonts.hasPendingFonts()) && document.fonts.status === "loaded";
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).replace(/^data:[^,]*,/, ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export const importExportHooks = {
  importExport: {
    async settle(root?: unknown): Promise<void> {
      const start = Date.now();
      let quiet = 0;
      let last = "";
      while (quiet < 5) {
        if (Date.now() - start > 30000) throw new Error("importExport.settle timed out");
        const scene = documentHooks.scene();
        const signature = textBoxes(root || scene);
        const ok = imagesReady(root || scene) && fontsReady(scene) && signature === last;
        last = signature;
        quiet = ok ? quiet + 1 : 0;
        await frame();
        await sleep(20);
      }
    },

    exportExportable(exportable: Exportable, timeoutMs?: number): Promise<Blob | null> {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error("export produced no output")),
          timeoutMs || 30000,
        );
        try {
          Exporter.exportExportable(exportable, (blob) => {
            clearTimeout(timer);
            resolve(blob);
          });
        } catch (error) {
          clearTimeout(timer);
          reject(error);
        }
      });
    },

    generateExportables(
      target: Node | Node[],
      defaults: Partial<Exportable> | null,
      assets: boolean,
    ): Exportable[] {
      return Exporter.generateExportables(target, defaults, assets);
    },

    generateExportName(
      exportable: Exportable,
      name?: string | null,
      used?: { name: string; format: string }[],
    ): string {
      return Exporter.generateExportName(exportable, name, used);
    },

    convertSizeToScale(
      width: number,
      height: number,
      spec: string,
      dpi?: number,
    ): [number, number, number] {
      const out = [0];
      const scale = BitmapExport.convertSizeToScale(width, height, spec, dpi, out);
      return [scale.getX(), scale.getY(), out[0] as number];
    },

    bitmapPaintArea(
      node: BitmapExportNode,
      spec: string,
      dpi: number,
    ): [number, number, number, number] {
      const area = BitmapExport.getBitmapPaintArea(node, spec, dpi);
      return [area.getX(), area.getY(), area.getWidth(), area.getHeight()];
    },

    maximumCanvasSize(): { width: number; height: number; area: number } {
      return BitmapExport.getMaximumCanvasSize();
    },

    svgUnsupportedFeatures(node: unknown): unknown[] {
      if (!exporters.SVGExport) throw new Error("SVG export is not ported yet.");
      return exporters.SVGExport.getUnsupportedFeatures(node);
    },

    pdfIsSupported(node: unknown, withEffects: boolean, size: string): boolean {
      if (!exporters.PDFExport) throw new Error("PDF export is not ported yet.");
      return exporters.PDFExport.isSupported(node, withEffects, size);
    },

    documents(): { title: string; status: string }[] {
      return getDocuments().map((document) => ({
        title: document.getTitle(),
        status: STATUS[document.getStatus()] || String(document.getStatus()),
      }));
    },

    blobToBase64,
  },
};
