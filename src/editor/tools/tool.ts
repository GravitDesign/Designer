// Old: chunk.vendor.js module 211 (GTool).
/**
 * The base of every editor tool. The tool manager activates a tool on a
 * view (the document's GEditorWidget); while active the tool knows the
 * view, its scene and its editor and listens to the view's input events.
 *
 * A "light" activation or deactivation (the tool manager's temporary
 * switches, see ToolManager.tempToolKeyActivate) keeps the tool's state
 * and listeners, so the tool can carry on when it comes back.
 */
import { Cursor } from "../cursor.ts";
import { KeyEvent } from "../../engine/core/key-event.ts";
import { GObject, registerClass } from "../../engine/core/object.ts";
import type { Point } from "../../engine/math/point.ts";
import type { Rect } from "../../engine/math/rect.ts";
import type { PaintContext } from "../../engine/paint/paint-context.ts";
import type { Scene } from "../../engine/scene/scene.ts";
import type { Editor } from "../editor.ts";
import { EditorOptions } from "../editor-options.ts";
import type { EditorWidget } from "../view/editor-widget.ts";
import type { ToolManager } from "./tool-manager.ts";

/**
 * The view, scene and editor fields hold null while the tool is not
 * active. They are typed as non-null because every handler that reads
 * them only runs while the tool is active, as in the old code.
 */
const NONE = null as never;

export class Tool extends GObject {
  static {
    registerClass(this, "GTool");
  }

  /** Set by ToolManager.addTool. */
  _manager: ToolManager | null = null;
  _scene: Scene = NONE;
  _view: EditorWidget = NONE;
  _editor: Editor = NONE;

  /** The cursor the tool shows right now (a Cursor value, null for the default one). */
  getCursor(): string | null {
    return Cursor.Default;
  }

  supportsElementClick(): boolean {
    return false;
  }

  /**
   * Starts working on `view`. `light` is set for a temporary switch back
   * to a tool that kept its state.
   */
  activate(view: EditorWidget, light?: boolean): void {
    this._scene = view ? view.getScene() : NONE;
    this._view = view;
    this._editor = view.getEditor();
    if (EditorOptions.toolExitKey && !light)
      view.addEventListener(KeyEvent.Down, this._keyDown, this);
  }

  /** Stops working on `view`; a light deactivation keeps view, scene and editor. */
  deactivate(view: EditorWidget, light?: boolean): void {
    if ((view.getScene() != this._scene && this._scene) || (view != this._view && this._view))
      throw new Error("Not supposed to happen");
    if (this._view && EditorOptions.toolExitKey)
      this._view.removeEventListener(KeyEvent.Down, this._keyDown, this);
    if (!light) {
      this._scene = NONE;
      this._view = NONE;
      this._editor = NONE;
    }
  }

  /** False while the tool is in the middle of something (a drag) it can't leave. */
  isDeactivatable(): boolean {
    return true;
  }

  isActivatable(view: EditorWidget | null): boolean {
    void view;
    return true;
  }

  /** Paints the tool's overlay over the scene (view coordinates). */
  paint(context: PaintContext): void {
    void context;
  }

  /** Shows the tool's current cursor, if it is the active tool. */
  updateCursor(): void {
    if (this._manager && this == this._manager.getActiveTool())
      this._manager._updateActiveToolCursor();
  }

  /**
   * Shows `text` next to `position` (page coordinates) anchored at `side`,
   * or hides the hint without text, if this is the active tool.
   */
  updateInlineHint(text: string | null, position?: Point | null, side?: string): void {
    if (this._manager && this == this._manager.getActiveTool())
      this._manager._updateInlineHint(text, position, side);
  }

  /** Asks the view to repaint `area` (view coordinates), if this is the active tool. */
  invalidateArea(area: Rect | null): void {
    if (this._manager && this == this._manager.getActiveTool())
      this._manager._invalidateActiveToolArea(area);
  }

  catchesContextMenu(event?: unknown): boolean {
    void event;
    return false;
  }

  /** EditorOptions.toolExitKey: that key ends the tool's job. */
  _keyDown(event: KeyEvent): void {
    if (EditorOptions.toolExitKey && event.key === EditorOptions.toolExitKey)
      (this._manager as ToolManager).notifyJobDone(this);
  }

  override toString(): string {
    return "[Object GTool]";
  }
}
