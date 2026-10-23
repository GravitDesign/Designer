// Old: chunk.vendor.js module 385 (GStyleEditor).
import { registerClass } from "../../engine/core/object.ts";
import type { Point } from "../../engine/math/point.ts";
import type { Rect } from "../../engine/math/rect.ts";
import type { Transform } from "../../engine/math/transform.ts";
import type { PropertiesNode } from "../../engine/scene/node-properties.ts";
import { Cursor } from "../cursor.ts";
import type { StyleEdManager } from "../style-ed-manager.ts";
import { BaseEditor, type EditorHost } from "./base-editor.ts";
import { GroupEditor } from "./group-editor.ts";
import { PageEditor } from "./page-editor.ts";
import { SceneEditor } from "./scene-editor.ts";
import { ShapeEditor } from "./shape-editor.ts";

/**
 * What GStyleEdManager.updateEditor hands to an editor it activates: the
 * element editor to attach to and the property (a pattern) to edit.
 */
export interface StyleEditorActivation {
  parentEditor: BaseEditor | null;
  propName: string;
  propHolder: PropertiesNode;
  propTemporary?: boolean;
}

/**
 * Base of the editors that edit one style property of an element (the
 * gradient editors). It attaches itself as a child of the element's
 * editor while active and is driven by the style editor manager.
 */
export class StyleEditor extends BaseEditor {
  static {
    registerClass(this, "GStyleEditor");
  }

  static options = {
    snapDistance: 5,
  };

  /** Set by GStyleEdManager.addEditor. */
  declare _manager: StyleEdManager | null;

  override getCursor(): unknown {
    return Cursor.Default;
  }

  /** Attaches to a shape, page, scene or group editor; false for others. */
  activate(activation: StyleEditorActivation): boolean {
    const parent = activation.parentEditor;
    if (
      parent instanceof ShapeEditor ||
      parent instanceof PageEditor ||
      parent instanceof SceneEditor ||
      parent instanceof GroupEditor
    ) {
      parent.insertEditor(this, null);
      this.setFlag(BaseEditor.Flag.Selected);
      this.requestInvalidation();
      return true;
    }
    return false;
  }

  deactivate(): void {
    if (this._parentEditor) {
      this.updatePartSelection(false, null, true);
      this.removeFlag(BaseEditor.Flag.Selected);
      this.requestInvalidation();
      this._parentEditor.removeEditor(this, true);
    }
    this.manager().notifyDeactivated(this);
  }

  /**
   * The gradient editors take a third argument (`noEvent`: don't tell the
   * manager about the new active stop); here it is ignored.
   */
  override updatePartSelection(
    toggle: unknown,
    partIds?: readonly unknown[] | null,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- read by the gradient editors
    noEvent?: unknown,
  ): unknown {
    super.updatePartSelection(toggle, partIds);
    return undefined;
  }

  validateAlreadyActive(activation: StyleEditorActivation): boolean {
    return activation.parentEditor === this._parentEditor;
  }

  isDeactivatable(): boolean {
    return null != this._parentEditor;
  }

  getEditObj(): unknown {
    return null;
  }

  updateCursor(): void {
    if (this._manager && this == this._manager.getActiveEditor()) {
      this._manager.updateActiveEditorCursor();
    }
  }

  override getBBox(transform: Transform): Rect | null {
    return this.getCustomBBox(transform);
  }

  override requestInvalidation(area?: unknown): void {
    const scene = this.manager().getScene();
    // No null check on the scene's editor, as in the old code.
    if (scene) (BaseEditor.getEditor(scene) as EditorHost).requestInvalidation(this, area);
  }

  override movePart(
    partId: unknown,
    partData: unknown,
    position: Point,
    viewToScene: Transform,
    guides: unknown,
    shift?: unknown,
    option?: unknown,
  ): unknown {
    super.movePart(partId, partData, position, viewToScene, guides, shift, option);
    this.manager().blockEditorUpdate();
    return undefined;
  }

  override _applyPartMove(
    partId: unknown,
    partData: unknown,
    option?: unknown,
    extra?: unknown,
  ): void {
    this.manager().releaseEditorUpdate();
    super._applyPartMove(partId, partData, option, extra);
  }

  /**
   * The manager. The old code dereferenced it without a check; an editor
   * outside a manager threw a TypeError at the same places.
   */
  protected manager(): StyleEdManager {
    return this._manager as StyleEdManager;
  }

  override toString(): string {
    return "[Object GStyleEditor]";
  }
}

StyleEditor.prototype._manager = null;
