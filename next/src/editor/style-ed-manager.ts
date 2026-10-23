// Old: chunk.vendor.js module 779 (GStyleEdManager).
import { Event } from "../engine/core/event.ts";
import { EventTarget } from "../engine/core/event-target.ts";
import { getTypeId, registerClass } from "../engine/core/object.ts";
import type { Point } from "../engine/math/point.ts";
import type { Transform } from "../engine/math/transform.ts";
import { AfterPropertiesChangeEvent } from "../engine/scene/node-events.ts";
import type { PropertiesNode } from "../engine/scene/node-properties.ts";
import type { Node } from "../engine/scene/node.ts";
import { Page } from "../engine/scene/page.ts";
import { Scene } from "../engine/scene/scene.ts";
import { AngularGradient } from "../engine/style/angular-gradient.ts";
import { Gradient } from "../engine/style/gradient.ts";
import { LinearGradient } from "../engine/style/linear-gradient.ts";
import { RadialGradient } from "../engine/style/radial-gradient.ts";
import type { StyleOwner } from "../engine/style/stylable-sets.ts";
import { Stylable } from "../engine/style/stylable.ts";
import { EditorOptions } from "./editor-options.ts";
import { AngularGradientEditor } from "./element-editors/angular-gradient-editor.ts";
import { ElementEditor } from "./element-editors/element-editor.ts";
import { LinearGradientEditor } from "./element-editors/linear-gradient-editor.ts";
import { RadialGradientEditor } from "./element-editors/radial-gradient-editor.ts";
import { StyleEditor, type StyleEditorActivation } from "./element-editors/style-editor.ts";

const EditorEventType = {
  ActivePointChange: 1,
  PrepareModifiedEvent: 2,
} as const;

/** The active style editor changed. */
export class StyleEditorChangedEvent extends Event {
  static {
    registerClass(this, "GStyleEdManager.EditorChangedEvent");
  }

  constructor(
    public previousEditor: StyleEditor | null = null,
    public newEditor: StyleEditor | null = null,
  ) {
    super();
  }

  override toString(): string {
    return "[Event GStyleEdManager.EditorChangedEvent]";
  }
}

/** Something happened in the active style editor (active stop changed, change coming). */
export class StyleEditorEvent extends Event {
  static {
    registerClass(this, "GStyleEdManager.EditorEvent");
  }

  constructor(
    public type: number | null = null,
    public data: unknown = null,
  ) {
    super();
  }

  override toString(): string {
    return "[Event GStyleEdManager.EditorEvent]";
  }
}

/** The view as the manager uses it (GEditorWidget). */
export interface StyleEdView {
  getScene(): Scene;
  getEditor(): StyleEdMainEditor | null;
  _convertClientPositionFromMousePosition(event: MouseEvent): Point;
  getWorldTransform(page: unknown): Transform;
  getViewConfiguration(): { multiPageView?: unknown };
  setCursor(cursor: unknown): void;
}

/** The scene's GEditor as the manager uses it. */
export interface StyleEdMainEditor {
  beginTransaction(): void;
  commitTransaction(name?: string | null, relatedData?: unknown): void;
}

/**
 * A node holding a pattern property: a stylable element, a page or the
 * scene, or a paint layer or effect (which name their stylable owner).
 */
export type PatternHolder = PropertiesNode & {
  /** Set while the node is attached to a scene. */
  _scene?: unknown;
  /**
   * The stylable element owning a paint layer or effect. The engine types
   * it by the few members the style code uses (StyleOwner); it is a Node.
   */
  getOwnerStylable?: () => StyleOwner | null;
  getPatternPropNames?: () => string[] | null;
};

/**
 * Opens the gradient editors over the selection when a gradient fill or
 * border is changed, and routes their transactions to the scene's
 * editor. One manager per workspace; a view activates it.
 */
export class StyleEdManager extends EventTarget {
  static {
    registerClass(this, "GStyleEdManager");
  }

  static EditorEventType = EditorEventType;
  static EditorChangedEvent = StyleEditorChangedEvent;
  static EditorEvent = StyleEditorEvent;
  static PREPARE_MODIFIED_EVENT = new StyleEditorEvent(EditorEventType.PrepareModifiedEvent, null);

  declare _editors: StyleEditor[];
  declare _typeIdToIndexMap: Record<string, number>;
  declare _activeEditor: StyleEditor | null;
  declare _view: StyleEdView | null;
  declare _scene: Scene | null;
  declare _mainEditor: StyleEdMainEditor | null;
  declare _activated: boolean;
  declare _overlayLock: boolean;
  declare _editorUpdateBlocker: boolean;
  /**
   * Never set: updateActiveEditorCursor reads it and throws when there is
   * an active editor and a view (BUGS-FIXED candidate "Style editor cursor
   * update reads a missing tool").
   */
  declare _activeTool: { getCursor(): unknown } | undefined;

  constructor() {
    super();
    this._editors = [];
    this._typeIdToIndexMap = {};
    this.addEditor(new LinearGradientEditor());
    this.addEditor(new RadialGradientEditor());
    this.addEditor(new AngularGradientEditor());
  }

  /** Activates for a view's scene (deactivating first when active). */
  activate(view: StyleEdView | null): void {
    if (this._activated) this.deactivate();
    this._view = view;
    this._scene = view ? view.getScene() : null;
    this._mainEditor = view ? view.getEditor() : null;
    this._activated = true;
    (this._scene as Scene).addEventListener(
      AfterPropertiesChangeEvent,
      this._afterPropertiesChange,
      this,
    );
  }

  deactivate(): void {
    if (this._activeEditor) this.deactivateEditor();
    if (this._scene)
      this._scene.removeEventListener(AfterPropertiesChangeEvent, this._afterPropertiesChange);
    this._view = null;
    this._scene = null;
    this._mainEditor = null;
    this._activated = false;
  }

  isActivated(): boolean {
    return this._activated;
  }

  getScene(): Scene | null {
    return this._scene;
  }

  addEditor(editor: StyleEditor): void {
    if (editor._manager) throw new Error("Editor is already registered");
    this._editors.push(editor);
    editor._manager = this;
    this._typeIdToIndexMap = {};
    for (let i = 0; i < this._editors.length; ++i) {
      editor = this._editors[i] as StyleEditor;
      this._typeIdToIndexMap[String(getTypeId(editor))] = i;
    }
  }

  /** The registered editor of a style editor class (or instance), or null. */
  getEditor(editorClass: unknown): StyleEditor | null {
    const key = String(getTypeId(editorClass));
    const index = Object.prototype.hasOwnProperty.call(this._typeIdToIndexMap, key)
      ? (this._typeIdToIndexMap[key] as number)
      : -1;
    return index >= 0 && index < this._editors.length
      ? (this._editors[index] as StyleEditor)
      : null;
  }

  getActiveEditor(): StyleEditor | null {
    return this._activated ? this._activeEditor : null;
  }

  /**
   * Opens the gradient editor for `holder`'s pattern property `name`
   * (attached to the element editor of the holder or of its stylable
   * owner), or closes the active one when the property isn't a gradient.
   */
  updateEditor(holder: PatternHolder, name: string, temporary?: boolean | null): void {
    this.deactivateEditor();
    // A null `temporary` (from the change event) is passed on as it is.
    const value = holder.getProperty(name, false, null, temporary as boolean | undefined);
    if (value) {
      let editorClass: unknown = null;
      let parentEditor: ElementEditor | null = null;
      let activation: StyleEditorActivation | null = null;
      if (
        (holder.hasMixin(Stylable) && holder._scene) ||
        holder instanceof Page ||
        holder instanceof Scene
      ) {
        parentEditor = ElementEditor.openEditor(holder);
      } else if (holder.getOwnerStylable) {
        const owner = holder.getOwnerStylable() as (Node & { _scene?: unknown }) | null;
        if (owner && owner._scene) parentEditor = ElementEditor.openEditor(owner);
      }
      if (value instanceof Gradient) {
        activation = {
          parentEditor,
          propName: name,
          propHolder: holder,
          propTemporary: temporary as boolean | undefined,
        };
        if (value instanceof LinearGradient) editorClass = LinearGradientEditor;
        else if (value instanceof RadialGradient) editorClass = RadialGradientEditor;
        else if (value instanceof AngularGradient) editorClass = AngularGradientEditor;
      }
      if (editorClass && activation) this._activateEditor(editorClass, activation);
    }
  }

  setOverlayLock(): void {
    this._overlayLock = true;
  }

  resetOverlayLock(): void {
    this._overlayLock = false;
  }

  /**
   * Whether the overlay (the active style editor) holds the mouse: with a
   * DOM mouse event, set when the event is over one of its parts.
   */
  getOverlayLock(event?: unknown): boolean {
    if (this._activeEditor) {
      if (event && event instanceof globalThis.MouseEvent) {
        const view = this._view as StyleEdView;
        const position = view._convertClientPositionFromMousePosition(event);
        if (
          this._activeEditor.getPartInfoAt(
            position,
            view.getWorldTransform((this._scene as Scene).getActivePage()),
            null,
            EditorOptions.pickDistance,
            view.getViewConfiguration().multiPageView,
          )
        ) {
          this.setOverlayLock();
        } else this.resetOverlayLock();
      }
    } else this.resetOverlayLock();
    return this._overlayLock;
  }

  deactivateEditor(): void {
    this.releaseEditorUpdate();
    if (this._activated && this._activeEditor) this._activeEditor.deactivate();
  }

  notifyDeactivated(editor: StyleEditor): void {
    if (this._activated && this._activeEditor === editor) this._activeEditor = null;
  }

  updateActiveEditorCursor(): void {
    if (this._activeEditor && this._view) {
      this._view.setCursor((this._activeTool as { getCursor(): unknown }).getCursor());
    }
  }

  _activateEditor(editorOrClass: unknown, activation: StyleEditorActivation): boolean {
    if (this._activated) {
      if (this._activeEditor && !this._activeEditor.isDeactivatable()) return false;
      const editor: StyleEditor | null =
        editorOrClass instanceof StyleEditor ? editorOrClass : this.getEditor(editorOrClass);
      if (editor) {
        const previous = this._activeEditor;
        if (editor != this._activeEditor || !editor.validateAlreadyActive(activation)) {
          if (this._activeEditor) {
            this._activeEditor.deactivate();
            this._activeEditor = null;
          }
          if (editor.getParentEditor()) editor.deactivate();
          if (editor.activate(activation)) {
            this._activeEditor = editor;
            // updateEditor closes the active editor first, so `previous`
            // is always null there (see "Style editor switch never fires
            // EditorChangedEvent" in QUESTIONS.md).
            if (previous && this.hasEventListeners(StyleEditorChangedEvent)) {
              this.trigger(new StyleEditorChangedEvent(previous, editor));
            }
            return true;
          }
        }
      } else this.deactivateEditor();
    }
    return false;
  }

  blockEditorUpdate(): void {
    this._editorUpdateBlocker = true;
  }

  releaseEditorUpdate(): void {
    this._editorUpdateBlocker = false;
  }

  _afterPropertiesChange(event: AfterPropertiesChangeEvent): void {
    if (!this._editorUpdateBlocker) {
      const node = event.node as PatternHolder;
      const patternNames = node.getPatternPropNames ? node.getPatternPropNames() : null;
      const properties = event.properties as string[];
      if (patternNames && patternNames.length) {
        for (let i = 0; i < properties.length; ++i) {
          const name = properties[i] as string;
          if (patternNames.indexOf(name) >= 0) {
            this.updateEditor(node, name, event.temporary);
            return;
          }
        }
      }
    }
  }

  /** Tells listeners the active stop changed (index in `part.idx`), without reopening editors. */
  handleEditorPartUpdate(part: { idx: unknown } | null | undefined): void {
    if (this.hasEventListeners(StyleEditorEvent)) {
      this.blockEditorUpdate();
      this.trigger(
        new StyleEditorEvent(EditorEventType.ActivePointChange, part ? { idx: part.idx } : null),
      );
      this.releaseEditorUpdate();
    }
  }

  preparePermanentChange(): void {
    if (this.hasEventListeners(StyleEditorEvent))
      this.trigger(StyleEdManager.PREPARE_MODIFIED_EVENT);
  }

  beginTransaction(): void {
    if (this._mainEditor) {
      this.preparePermanentChange();
      this._mainEditor.beginTransaction();
    }
  }

  commitTransaction(name?: string | null, relatedData?: unknown): void {
    if (this._mainEditor) this._mainEditor.commitTransaction(name, relatedData);
  }

  override toString(): string {
    return "[Object GStyleEdManager]";
  }
}

Object.assign(StyleEdManager.prototype, {
  _editors: null,
  _typeIdToIndexMap: null,
  _activeEditor: null,
  _view: null,
  _scene: null,
  _mainEditor: null,
  _activated: false,
  _overlayLock: false,
  _editorUpdateBlocker: false,
});
