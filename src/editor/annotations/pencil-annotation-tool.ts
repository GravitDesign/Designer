// Old: chunk.vendor.js module 773 (GPencilAnnotationTool).
/**
 * Draws a pencil annotation with the freehand tool's stroke. One stroke ends the
 * tool's job; Esc and Enter do nothing.
 */
import type { MouseEvent } from "../../engine/core/mouse-event.ts";
import { registerClass } from "../../engine/core/object.ts";
import { PencilAnnotation } from "../../engine/scene/annotations/pencil-annotation.ts";
import type { Path } from "../../engine/scene/path.ts";
import { Cursor } from "../cursor.ts";
import { ElementEditor } from "../element-editors/element-editor.ts";
import type { PathEditor } from "../element-editors/path-editor.ts";
import { FreehandTool } from "../tools/freehand-tool.ts";
import type { ToolManager } from "../tools/tool-manager.ts";
import "./pencil-annotation-editor.ts";
import { AnnotationToolMixin } from "./annotation-tool.ts";

export class PencilAnnotationTool extends AnnotationToolMixin(FreehandTool) {
  static {
    registerClass(this, "GPencilAnnotationTool");
  }

  override _getRelatedItemClass(): typeof PencilAnnotation {
    return PencilAnnotation;
  }

  /**
   * Inserts the annotation (into the page's annotations list) and opens
   * its editor; null when it could not be inserted. Unlike the freehand
   * tool it keeps the fills and the selection.
   */
  override _createAndAppendPath(): Path | null {
    const ItemClass = this._getRelatedItemClass();
    const annotation = new ItemClass();
    this._editor.insertElements([annotation], false, true, true);
    if (!annotation.getScene()) return null;
    this._pathEditor = ElementEditor.openEditor(annotation) as unknown as PathEditor;
    return annotation;
  }

  override _mouseRelease(event: MouseEvent): void {
    super._mouseRelease(event);
    (this._manager as ToolManager).notifyJobDone(this);
  }

  override _escAction(): void {}

  override _enterAction(): void {}

  override getCursor(): string {
    return Cursor.CrossFreehand;
  }

  override toString(): string {
    return "[Object GPencilAnnotationTool]";
  }
}
