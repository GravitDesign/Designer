// Old: chunk.vendor.js module 758 (GFillTool).
/**
 * Fills the facets of selected paths graphs: pressing or dragging over a
 * facet gives it the tool's fill (setFill), or without one the style of
 * its paths graph. One press-to-release is one transaction. The tool can
 * only be activated while the selection is made of paths graphs only.
 */
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { MouseEvent } from "../../engine/core/mouse-event.ts";
import { registerClass } from "../../engine/core/object.ts";
import type { Pattern } from "../../engine/style/pattern.ts";
import type { Element } from "../../engine/scene/element.ts";
import { MapContainer, type Node } from "../../engine/scene/node.ts";
import { NodeFlag } from "../../engine/scene/node-change.ts";
import { PathsGraph } from "../../engine/scene/paths-graph/paths-graph.ts";
import { ShapeHitResult } from "../../engine/scene/shape.ts";
import { FillPaintLayer } from "../../engine/style/fill-paint-layer.ts";
import type { PaintLayers } from "../../engine/style/paint-layers.ts";
import { Cursor } from "../cursor.ts";
import type { EditorWidget } from "../view/editor-widget.ts";
import { Tool } from "./tool.ts";

/** A facet of a paths graph as the fill tool changes it. */
interface FillableFacet {
  setProperties(names: string[], values: unknown[]): void;
  getPaintLayers(): PaintLayers;
  getParent(): Node | null;
  assignStyleFrom(source: Node): void;
}

/** The data of a paths graph hit. */
interface PathsGraphHitData {
  hitRes: ShapeHitResult;
  facet: FillableFacet;
}

export class FillTool extends Tool {
  static {
    registerClass(this, "GFillTool");
  }

  _transactionStarted = false;
  /** The fill the tool applies (null: the paths graph's own style). */
  declare _fpt: Pattern | null | undefined;
  declare _fop: number | undefined;

  override getCursor(): string | null {
    return Cursor.Pipette;
  }

  override activate(view: EditorWidget, light?: boolean): void {
    super.activate(view, light);
    if (!light) {
      view.addEventListener(MouseEvent.Down, this._mouseDown, this);
      view.addEventListener(MouseEvent.Drag, this._mouseFill, this);
      view.addEventListener(MouseEvent.Release, this._mouseRelease, this);
    }
    this._transactionStarted = false;
    this._editor.setSelectionDetail(true);
    this._editor.setSelectionEdit(true);
  }

  /** Removes the listeners even for a light deactivation. */
  override deactivate(view: EditorWidget, light?: boolean): void {
    if (!light && this._editor) {
      this._editor.setSelectionDetail(false);
      this._editor.setSelectionEdit(false);
    }
    super.deactivate(view, light);
    view.removeEventListener(MouseEvent.Down, this._mouseDown);
    view.removeEventListener(MouseEvent.Drag, this._mouseFill);
    view.removeEventListener(MouseEvent.Release, this._mouseRelease);
  }

  /** Only with a selection of paths graphs. */
  override isActivatable(view: EditorWidget | null): boolean {
    const editor = view ? view.getEditor() : null;
    const selection = editor ? editor.getIndividualSelection() : null;
    let activatable = false;
    if (selection && selection.length) {
      activatable = true;
      for (let i = 0; i < selection.length && activatable; ++i)
        if (!(selection[i] instanceof PathsGraph)) activatable = false;
    }
    return activatable;
  }

  _mouseDown(event: MouseEvent): void {
    this._transactionStarted = false;
    this._mouseFill(event);
  }

  _mouseRelease(event: MouseEvent): void {
    this._mouseFill(event);
    if (this._transactionStarted) {
      this._editor.commitTransaction(
        Locale.get(new LocaleKey("GFillTool", "action.modify-fill")) as string,
      );
      this._transactionStarted = false;
    }
  }

  /** Fills the selected paths graph facet under the pointer. */
  _mouseFill(event: MouseEvent): void {
    this._editor.updateByMousePosition(
      event.client,
      this._view.getWorldTransform(this._scene),
      false,
      this._view.getViewConfiguration(),
    );
    const selection = this._editor.getIndividualSelection();
    if (selection && selection.length) {
      const hits = this._scene.hitTest(
        event.client,
        this._view.getWorldTransform(this._scene),
        (element: Element) => element.hasFlag(NodeFlag.Selected) && element instanceof PathsGraph,
        false,
        -1,
        0,
        true,
        null,
        false,
        false,
        this._view.getViewConfiguration().multiPageView,
      );
      if (
        hits &&
        1 == hits.length &&
        (hits[0]?.data as PathsGraphHitData).hitRes.type == ShapeHitResult.Type.Fill
      ) {
        const facet = (hits[0]?.data as PathsGraphHitData).facet;
        if (!this._transactionStarted) {
          this._editor.beginTransaction();
          this._transactionStarted = true;
        }
        facet.setProperties(["cSt"], [!!this._fpt]);
        facet.getPaintLayers().clearFillLayers();
        if (this._fpt) facet.getPaintLayers().appendChild(new FillPaintLayer(this._fpt, this._fop));
        else {
          let graph = facet.getParent() as Node;
          if (graph instanceof MapContainer) graph = graph.getParent() as Node;
          facet.assignStyleFrom(graph);
        }
      }
    }
  }

  /** The first fill pattern of the first selected paths graph. */
  getSelectionFillPattern(): Pattern | null {
    const selection = this._editor.getIndividualSelection();
    if (selection && selection.length)
      for (let i = 0; i < selection.length; ++i)
        if (selection[i] instanceof PathsGraph) {
          const fill = (
            (selection[i] as unknown as PathsGraph).getPaintLayers() as PaintLayers
          ).getFillLayers()[0];
          return fill ? fill.$_pt : null;
        }
    return null;
  }

  /** The first fill opacity of the first selected paths graph (1 without one). */
  getSelectionFillOpacity(): number | null {
    const selection = this._editor.getIndividualSelection();
    if (selection && selection.length)
      for (let i = 0; i < selection.length; ++i)
        if (selection[i] instanceof PathsGraph) {
          const fill = (
            (selection[i] as unknown as PathsGraph).getPaintLayers() as PaintLayers
          ).getFillLayers()[0];
          return fill ? fill.$_op : null;
        }
    return 1;
  }

  getFillPattern(): Pattern | null | undefined {
    return this._fpt;
  }

  getFillOpacity(): number | undefined {
    return this._fop;
  }

  setFill(pattern: Pattern | null, opacity?: number): void {
    this._fpt = pattern;
    this._fop = opacity;
  }

  override toString(): string {
    return "[Object GFillTool]";
  }
}
