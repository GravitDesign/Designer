// Old: chunk.vendor.js module 1454 (the PDF compatibility processor).
import { hasContainer } from "../../../engine/scene/node-container.ts";
import type { Node } from "../../../engine/scene/node.ts";
import { Page } from "../../../engine/scene/page.ts";
import { ExportCompat } from "../export-compat.ts";

/**
 * Walks a page (with its master pages) before it is exported and sorts
 * out the nodes the PDF can't draw as vectors. Of those, the ones that
 * aren't inside another one are rasterized; the rest is drawn as part of
 * their rasterized ancestor.
 */
export class PDFCompatibilityProcessor {
  declare _rasterizableNodes: Node[];
  declare _incompatibleNodes: Node[];
  declare _effectsEnabled: boolean;

  constructor(effectsEnabled: boolean) {
    this._effectsEnabled = effectsEnabled;
    this._incompatibleNodes = [];
    this._rasterizableNodes = [];
  }

  processNode(node: Node): void {
    if (!ExportCompat.isCompatible(node, this._effectsEnabled)) {
      this._incompatibleNodes.push(node);
      if (this._shouldRaster(node)) this._rasterizableNodes.push(node);
    }
    if (node instanceof Page) this._processMasterPages(node);
    if (hasContainer(node)) {
      node.acceptChildren((child: Node) => {
        this.processNode(child);
      });
    }
  }

  isVectorable(node: Node): boolean {
    return (
      !this._incompatibleNodes.length || !this._incompatibleNodes.some((other) => other === node)
    );
  }

  getRasterizableNodes(): Node[] {
    return this._rasterizableNodes;
  }

  hasRasterizableNodes(): boolean {
    return this._rasterizableNodes.length > 0;
  }

  _shouldRaster(node: Node): boolean {
    for (let i = 0; i < this._rasterizableNodes.length; i++) {
      const rasterized = this._rasterizableNodes[i];
      if (node.findParent((parent: Node) => rasterized == parent)) return false;
    }
    return true;
  }

  _processMasterPages(page: Page): void {
    const masters = page.getMasterPages();
    if (masters) {
      masters.forEach((master) => {
        master.accept((node: Node) => {
          this.processNode(node);
        });
      });
    }
  }
}

Object.assign(PDFCompatibilityProcessor.prototype, {
  _rasterizableNodes: null,
  _incompatibleNodes: null,
  _effectsEnabled: false,
});
