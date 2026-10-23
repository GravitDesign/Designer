// Old: chunk.vendor.js module 738 (GConnectorTool).
/**
 * Draws a connector with the pen tool between two shapes: the first press
 * on a shape (highlighted while hovering) picks the source, a press on
 * another one the target; on that release the connector is connected to
 * both and the tool's job is done. The class kept the pen tool's toString,
 * so it reports itself as "GPenTool".
 */
import type { MouseEvent } from "../../engine/core/mouse-event.ts";
import { registerClass } from "../../engine/core/object.ts";
import { CompoundPath } from "../../engine/scene/compound-path.ts";
import { Connector } from "../../engine/scene/connector.ts";
import type { Element } from "../../engine/scene/element.ts";
import { Image } from "../../engine/scene/image.ts";
import { NodeFlag } from "../../engine/scene/node-change.ts";
import { Path } from "../../engine/scene/path.ts";
import { PathsGraph } from "../../engine/scene/paths-graph/paths-graph.ts";
import { Shape } from "../../engine/scene/shape.ts";
import { EditorOptions } from "../editor-options.ts";
import "../element-editors/connector-editor.ts";
import type { EditorWidget } from "../view/editor-widget.ts";
import { PenTool } from "./pen-tool.ts";
import type { ToolManager } from "./tool-manager.ts";

export class ConnectorTool extends PenTool {
  static {
    registerClass(this, "GConnectorTool");
  }

  _sourcePath: Shape | null = null;
  _targetPath: Shape | null = null;
  _pathUnderMouse: Shape | null = null;

  override _getRelatedItemClass(): typeof Path {
    return Connector as unknown as typeof Path;
  }

  override deactivate(view: EditorWidget, light?: boolean): void {
    super.deactivate(view, light);
    if (this._pathUnderMouse) {
      this._pathUnderMouse.removeFlag(NodeFlag.Highlighted);
      this._pathUnderMouse = null;
    }
    this._sourcePath = null;
    this._targetPath = null;
  }

  /** The pen's move, then highlights the shape under the pointer (exact hit, else within the pick distance). */
  override _mouseMove(event: MouseEvent): void {
    super._mouseMove(event);
    if (this._pathUnderMouse) {
      this._pathUnderMouse.removeFlag(NodeFlag.Highlighted);
      this._pathUnderMouse = null;
    }
    const multiPageView = this._view.getViewConfiguration().multiPageView;
    let hits = this._scene.hitTest(
      event.client,
      this._view.getWorldTransform(this._scene),
      null,
      false,
      -1,
      0,
      false,
      null,
      false,
      true,
      multiPageView,
    );
    if (!(hits && hits.length && hits[0]?.element instanceof Path))
      hits = this._scene.hitTest(
        event.client,
        this._view.getWorldTransform(this._scene),
        null,
        false,
        -1,
        EditorOptions.pickDistance,
        false,
        null,
        false,
        true,
        multiPageView,
      );
    if (hits && hits.length) {
      const element: Element = (hits[0] as { element: Element }).element;
      if (
        element instanceof Shape &&
        !(element instanceof Image) &&
        !(element instanceof CompoundPath) &&
        !(element instanceof PathsGraph) &&
        !(element instanceof Connector)
      ) {
        this._pathUnderMouse = element;
        this._pathUnderMouse.setFlag(NodeFlag.Highlighted);
      }
    }
  }

  /** Only over a shape: the pen's press, which picks the source, then the target. */
  override _mouseDown(event: MouseEvent): void {
    if (this._pathUnderMouse && !(this._sourcePath && this._pathUnderMouse === this._sourcePath)) {
      super._mouseDown(event);
      if (this._sourcePath) this._targetPath = this._pathUnderMouse;
      else this._sourcePath = this._pathUnderMouse;
      this._pathUnderMouse = null;
    }
  }

  /** With source and target picked: connects the connector and ends the job. */
  override _mouseRelease(event: MouseEvent): void {
    super._mouseRelease(event);
    const connector = this._editor.getPathSelection() as unknown as Connector | null;
    if (connector && this._sourcePath && this._targetPath) {
      connector.connect(this._sourcePath, this._targetPath);
      this._editor.clearSelection();
      (this._manager as ToolManager).notifyJobDone(this);
    }
  }
}
