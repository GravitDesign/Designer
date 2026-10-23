// Old: chunk.vendor.js module 759 (GLayerTool).
/**
 * The select tool for layers: clicks select the layer an element is in.
 * Activated with a selection that isn't only layers, it stores that
 * selection, selects the active layer instead and restores the stored
 * selection when it is deactivated.
 */
import { registerClass } from "../../engine/core/object.ts";
import type { Element } from "../../engine/scene/element.ts";
import { Layer } from "../../engine/scene/layer.ts";
import type { Node } from "../../engine/scene/node.ts";
import "../element-editors/layer-editor.ts";
import type { EditorWidget } from "../view/editor-widget.ts";
import { SelectTool } from "./select-tool.ts";

export class LayerTool extends SelectTool {
  static {
    registerClass(this, "GLayerTool");
  }

  /** Whether the selection held only layers when the tool was activated. */
  _onlyLayers = false;

  constructor() {
    super();
    this._onlyLayers = true;
  }

  override activate(view: EditorWidget, light?: boolean): void {
    super.activate(view, light);
    let onlyLayers = true;
    if (this._editor) {
      const selection = this._editor.getSelection();
      if (selection && selection.length)
        for (let i = 0; i < selection.length && onlyLayers; ++i)
          onlyLayers = selection[i] instanceof Layer;
      if (!onlyLayers) {
        if (this._editor && !light) this._editor.storeSelection();
        const layer = this._scene.getActiveLayer();
        if (layer) this._editor.updateSelection(false, [layer]);
        else this._editor.clearSelection();
      }
    }
    this._onlyLayers = onlyLayers;
  }

  override deactivate(view: EditorWidget, light?: boolean): void {
    if (this._editor && !light && !this._onlyLayers) this._editor.restoreSelection();
    super.deactivate(view, light);
  }

  /** The layer `element` is in, else the active layer. */
  override _getSelectableElement(element: Node | null): Element | null {
    for (let node = element; null !== node; node = node.getParent())
      if (node instanceof Layer) return node as unknown as Element;
    return this._scene.getActiveLayer() as unknown as Element | null;
  }

  override toString(): string {
    return "[Object GLayerTool]";
  }
}
