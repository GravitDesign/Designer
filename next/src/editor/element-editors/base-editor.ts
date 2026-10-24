// Old: chunk.vendor.js module 39 (GBaseEditor).
/**
 * The root of the editor tree. Every selected (or highlighted) element gets
 * an editor; editors nest like the elements (a group's editor holds its
 * children's editors) and the scene's editor is the root. An editor paints
 * the selection overlay (outline, handles), hit tests its parts
 * (getPartInfoAt), keeps a part selection (anchor points, gradient stops)
 * and previews a part move or a transform until it is applied as one
 * transaction (applyPartMove, applyTransform) or dropped (resetPartMove,
 * resetTransform).
 *
 * The flags here are the editor's own, not the node's: GEditor sets
 * Selected and Highlighted on the editor when the node's flags change.
 */
import type { Color } from "../../engine/color/color.ts";
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { GObject, getTypeId, registerClass } from "../../engine/core/object.ts";
import { equals as utilEquals } from "../../engine/core/util.ts";
import type { Point } from "../../engine/math/point.ts";
import type { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import type { PaintContext } from "../../engine/paint/paint-context.ts";
import type { Node } from "../../engine/scene/node.ts";
import type { PaintLayers } from "../../engine/style/paint-layers.ts";
import { FillPaintLayer } from "../../engine/style/fill-paint-layer.ts";
import { Stylable } from "../../engine/style/stylable.ts";

/**
 * What the element editors call on GEditor (editor-core). The scene's
 * GEditor hangs on `scene.__graphic_editor__`; BaseEditor.getEditor reads
 * it, so the editors never import GEditor itself.
 */
export interface EditorHost {
  getScene(): unknown;
  requestInvalidation(editor: BaseEditor, args?: unknown): void;
  beginTransaction(): void;
  commitTransaction(name?: string | null): void;
  rollbackTransaction?(): void;
  getSelection(): Node[] | null;
  updateSelection(toggle: boolean, nodes: readonly Node[], ...rest: unknown[]): void;
  clearSelection(nodes?: readonly Node[]): void;
  isTransformBoxActive(): boolean;
  getTransformBox(): unknown;
  getTBoxMode(): number;
}

/** The paint context editors paint with (GPaintContext plus the editor fields). */
export type EditorPaintContext = PaintContext;

/** A node the editor tree hangs off: GEditor sets `__graphic_editor__` on its scene. */
interface EditorCarrier {
  __graphic_editor__?: EditorHost | null;
}

/** Called per editor by accept; false stops the walk. */
export type EditorVisitor = (editor: BaseEditor) => unknown;

/**
 * GBaseEditor.PartInfo: a hit on a part of an editor. `isolated` means the
 * part is dragged on its own (handles), `selectable` that a click selects
 * it into the part selection.
 */
export class PartInfo {
  static {
    registerClass(this, "GBaseEditor.PartInfo");
  }

  declare editor: BaseEditor | null;
  declare id: unknown;
  declare data: unknown;
  declare isolated: unknown;
  declare selectable: unknown;

  constructor(
    editor: BaseEditor,
    id: unknown,
    data: unknown,
    isolated: unknown,
    selectable: unknown,
  ) {
    this.editor = editor;
    this.id = id;
    this.data = data;
    this.isolated = isolated;
    this.selectable = selectable;
  }
}
for (const name of ["id", "data", "editor", "isolated", "selectable"]) {
  (PartInfo.prototype as unknown as Record<string, unknown>)[name] = null;
}

const EditorFlag = {
  Selected: 1,
  Detail: 2,
  Outline: 4,
  HideEditor: 8,
  BackEditor: 16,
  Highlighted: 32,
} as const;

/** An editor class registered for a node class. */
export type EditorClass = new (node: never, arg?: unknown) => BaseEditor;

export class BaseEditor extends GObject {
  static {
    registerClass(this, "GBaseEditor");
  }

  /** Editor classes by the type id of the class they edit (exports). */
  static _Editors: Record<number, EditorClass> = {};

  static exports(editorClass: EditorClass, nodeClass: unknown): void {
    BaseEditor._Editors[getTypeId(nodeClass) as number] = editorClass;
  }

  /** The GEditor of a scene. */
  static getEditor<T = EditorHost>(scene: unknown): T | null {
    const carrier = scene as EditorCarrier;
    return (carrier.__graphic_editor__ ? carrier.__graphic_editor__ : null) as T | null;
  }

  /**
   * The colour to outline a selection with: `defaultColor`, unless the
   * canvas background under the element (blended with the element's fills
   * when it has any) is close to it. Then white, or a dark blue when white
   * would be close too.
   *
   * The pixel is read at (x, y) on the canvas, clamped to it. The old code
   * called Math.min with one argument and always read the bottom-right
   * pixel (BUG-055 The adaptive outline colour reads the bottom-right
   * pixel). The colour read is cached on the context.
   */
  static getOutlineColor(
    context: EditorPaintContext,
    x: number,
    y: number,
    defaultColor: Color,
    element: Node | null,
  ): Color {
    const white = [255, 255, 255];
    const canvas = context.canvas as NonNullable<PaintContext["canvas"]>;
    x = Math.max(0, Math.min(canvas.getWidth() - 1, Math.floor(x)));
    y = Math.max(0, Math.min(canvas.getHeight() - 1, Math.floor(y)));
    const background = (context.computedBackgroundColor
      ? context.computedBackgroundColor
      : canvas.getBitmap().getPixelValue(x, y).slice(0, 3)) as unknown as number[];
    context.computedBackgroundColor = background as unknown as Color;
    const closeToDefault = RGBColor.closeEnough(background, defaultColor.toScreen(), 100);
    let blended: RGBColor | null = null;
    if (element && element.hasMixin(Stylable) && (element as unknown as Visible).isVisible()) {
      let red = 0;
      let green = 0;
      let blue = 0;
      let opacity = 1;
      const stylable = element as unknown as StylableLike;
      if (stylable.hasProperty("_stop")) opacity = stylable.getProperty("_stop") as number;
      const layers = stylable.getPaintLayers();
      const list = layers ? layers.getLayers() : [];
      const colors: number[][] = [];
      for (let i = list.length - 1; i >= 0; i--) {
        const layer = list[i];
        if (layer instanceof FillPaintLayer) {
          const pattern = layer.getProperty("_pt") as { getAverageColor(): number[] | null } | null;
          const visible = layer.getProperty("_vs");
          const layerOpacity = layer.getProperty("_op") as number;
          if (pattern && visible) {
            const average = pattern.getAverageColor();
            if (average) {
              colors.unshift(average);
              average[3] = (average[3] as number) * layerOpacity;
              average[3] = average[3] * opacity;
              if (average[3] >= 1) break;
            }
          }
        }
      }
      if (colors.length) {
        if (((colors[0] as number[])[3] as number) < 1) {
          red = background[0] as number;
          green = background[1] as number;
          blue = background[2] as number;
        }
        for (let i = 0; i < colors.length; i++) {
          const color = colors[i] as number[];
          const alpha = Math.min(1, Math.max(0, color[3] as number));
          red = red * (1 - alpha) + (color[0] as number) * alpha;
          green = green * (1 - alpha) + (color[1] as number) * alpha;
          blue = blue * (1 - alpha) + (color[2] as number) * alpha;
        }
        blended = new RGBColor([red, green, blue]);
      } else blended = new RGBColor(background);
    } else if (element) blended = new RGBColor(background);
    return blended && closeToDefault && RGBColor.closeEnough(blended.toScreen(), white, 100)
      ? new RGBColor([0, 0, 40])
      : closeToDefault
        ? new RGBColor(white)
        : defaultColor;
  }

  static Flag = EditorFlag;

  /** Closes an editor and its children and takes it out of its parent. */
  static closeEditor(editor: BaseEditor | null): void {
    if (editor) {
      for (let children = editor.getEditors(); children && children.length;) {
        BaseEditor.closeEditor(children[0] as BaseEditor);
        children = editor.getEditors();
      }
      const closable = editor as unknown as { deactivate?: unknown };
      if (closable.deactivate instanceof Function) (closable.deactivate as () => void).call(editor);
      const parent = editor.getParentEditor();
      if (parent) parent.removeEditor(editor);
    }
  }

  static PartInfo = PartInfo;

  declare _flags: number;
  declare _temporalOutlineFlag: boolean;
  declare _transform: Transform | null;
  declare _parentEditor: BaseEditor | null;
  declare _editors: BaseEditor[] | null;
  declare _partSelection: unknown[] | null;
  declare _blockDeletion: boolean;
  declare _blockRemoval: boolean | undefined;
  declare _color: Color | null;

  hasFlag(flag: number): boolean {
    return 0 != (this._flags & flag);
  }

  /** Sets a flag; `noInvalidation` skips the repaint requests around it. */
  setFlag(flag: number, noInvalidation?: unknown): void {
    if (0 == (this._flags & flag)) {
      if (!noInvalidation) this.requestInvalidation();
      this._flags = this._flags | flag;
      if (!noInvalidation) this.requestInvalidation();
    }
  }

  removeFlag(flag: number, noInvalidation?: unknown): void {
    if (0 != (this._flags & flag)) {
      if (!noInvalidation) this.requestInvalidation();
      this._flags = this._flags & ~flag;
      if (!noInvalidation) this.requestInvalidation();
    }
  }

  setColor(color: Color | null): void {
    this._color = color;
  }

  getColor(): Color | null {
    return this._color;
  }

  getParentEditor(): BaseEditor | null {
    return this._parentEditor;
  }

  getEditors(): BaseEditor[] | null {
    return this._editors;
  }

  appendEditor(editor: BaseEditor): void {
    this.insertEditor(editor, null);
  }

  /** Inserts `editor` before `reference` (at the end without one). */
  insertEditor(editor: BaseEditor, reference: BaseEditor | null): void {
    let index = this._editors ? this._editors.length : 0;
    if (reference && this._editors && (index = this._editors.indexOf(reference)) < 0) {
      throw new Error("Unknown reference editor.");
    }
    if (null != editor._parentEditor) throw new Error("Editor already appended.");
    if (!this._editors) this._editors = [];
    if (index >= this._editors.length) this._editors.push(editor);
    else this._editors.splice(index, 0, editor);
    editor._parentEditor = this;
  }

  removeEditor(editor: BaseEditor, invalidate?: unknown): void {
    const index = (this._editors as BaseEditor[]).indexOf(editor);
    if (index < 0) throw new Error("Unknown editor.");
    (this._editors as BaseEditor[]).splice(index, 1);
    editor._parentEditor = null;
    if (invalidate) this.requestInvalidation();
  }

  /** Visits this editor and its children depth first; false from the visitor stops. */
  accept(visitor: EditorVisitor): boolean {
    if (false === visitor.call(null, this)) return false;
    if (this._editors) {
      for (let i = 0; i < this._editors.length; ++i) {
        if (false === (this._editors[i] as BaseEditor).accept(visitor)) return false;
      }
    }
    return true;
  }

  isPartSelected(partId: unknown): boolean {
    return this._indexOfPartId(this._partSelection, partId) >= 0;
  }

  getPartSelection(): unknown[] | null {
    return this._partSelection;
  }

  getPartsSelectionLength(): number {
    return this._partSelection ? this._partSelection.length : 0;
  }

  /**
   * Replaces the part selection with `partIds`, or with `toggle` toggles
   * them in and out of it. Only a selected editor has a part selection.
   */
  updatePartSelection(toggle: unknown, partIds?: readonly unknown[] | null): void {
    if (this.hasFlag(BaseEditor.Flag.Selected)) {
      let selection: unknown[] | null = null;
      if (toggle && this._partSelection) {
        if (partIds) {
          selection = [];
          for (let i = 0; i < this._partSelection.length; ++i) {
            if (this._indexOfPartId(partIds, this._partSelection[i]) < 0) {
              selection.push(this._partSelection[i]);
            }
          }
          for (let i = 0; i < partIds.length; ++i) {
            if (this._indexOfPartId(this._partSelection, partIds[i]) < 0)
              selection.push(partIds[i]);
          }
          if (0 === selection.length) selection = null;
        }
      } else selection = partIds && partIds.length > 0 ? partIds.slice() : null;
      if (!utilEquals(selection, this._partSelection, false)) this._updatePartSelection(selection);
    }
  }

  /** updatePartSelection with the ids of the parts in `parts` that this editor owns. */
  updateOwnedPartsSelection(toggle: unknown, parts: readonly PartInfo[] | null): void {
    if (parts) {
      const ids: unknown[] = [];
      for (let i = 0; i < parts.length; ++i) {
        const part = parts[i] as PartInfo;
        if ((part.data as { ownerEditor?: unknown }).ownerEditor === this) ids.push(part.id);
      }
      if (ids.length) this.updatePartSelection(toggle, ids);
    }
  }

  getOwnedPartsSelectionLength(): number {
    let length = this.getPartsSelectionLength();
    if (this.hasFlag(BaseEditor.Flag.Selected) && this._editors) {
      for (let i = 0; i < this._editors.length; ++i) {
        length += (this._editors[i] as BaseEditor).getPartsSelectionLength();
      }
    }
    return length;
  }

  isPartSelectionUnderCollisionAllowed(): boolean {
    return false;
  }

  /* eslint-disable @typescript-eslint/no-unused-vars -- overridden with the arguments */
  updatePartSelectionUnderCollision(collision: unknown, toggle?: unknown, area?: unknown): boolean {
    return false;
  }

  isDeletePartsAllowed(): boolean {
    return false;
  }

  deletePartsSelected(...args: unknown[]): void {}

  isAlignPartsAllowed(): boolean {
    return false;
  }

  hasSelectionEditing(): boolean {
    return false;
  }

  alignParts(alignment: unknown, area?: unknown, target?: unknown): void {}
  /* eslint-enable @typescript-eslint/no-unused-vars */

  /**
   * The part under `location` (view coordinates, `transform` maps scene to
   * view): child editors first, topmost first, back editors last. `filter`
   * must return true for this editor's own parts to count.
   */
  getPartInfoAt(
    location: Point,
    transform: Transform,
    filter?: ((editor: BaseEditor) => unknown) | null,
    tolerance?: number | null,
    extra?: unknown,
  ): PartInfo | null {
    tolerance = tolerance || 0;
    let backEditors: BaseEditor[] | null = null;
    if (this._editors && this._editors.length) {
      for (let i = this._editors.length - 1; i >= 0; --i) {
        const child = this._editors[i] as BaseEditor;
        if (child.hasFlag(BaseEditor.Flag.BackEditor)) {
          if (!backEditors) backEditors = [];
          backEditors.push(child);
        } else {
          const hit = child.getPartInfoAt(location, transform, filter, tolerance, extra);
          if (hit) return hit;
        }
      }
    }
    if (filter && true !== filter.call(null, this)) return null;
    const box = this.getBBox(transform);
    if (box && box.expanded(tolerance, tolerance, tolerance, tolerance).containsPoint(location)) {
      const hit = this._getPartInfoAt(location, transform, tolerance, extra);
      if (hit) return hit;
    }
    if (backEditors) {
      for (let i = backEditors.length - 1; i >= 0; --i) {
        const hit = (backEditors[i] as BaseEditor).getPartInfoAt(
          location,
          transform,
          filter,
          tolerance,
          extra,
        );
        if (hit) return hit;
      }
    }
    return null;
  }

  paint(transform: Transform, context: EditorPaintContext): void {
    this._paintChildren(transform, context);
  }

  getBBox(transform: Transform): Rect | null {
    return this.getCustomBBox(transform);
  }

  getBBoxMargin(): number {
    return 1.5;
  }

  /* eslint-disable @typescript-eslint/no-unused-vars -- overridden with the arguments */
  getCustomBBox(transform: Transform | null, includeTransform?: unknown): Rect | null {
    return null;
  }

  requestInvalidation(args?: unknown): void {}
  /* eslint-enable @typescript-eslint/no-unused-vars */

  invalidate(transform: Transform, skip?: unknown): Rect | null {
    return skip ? null : this.getBBox(transform);
  }

  /** Turns the outline on for the time of a preview (unless it is on already). */
  setOutlineTmpFlag(): void {
    if (!this.hasFlag(BaseEditor.Flag.Outline)) {
      this.setFlag(BaseEditor.Flag.Outline);
      this._temporalOutlineFlag = true;
    }
  }

  removeOutlineTmpFlag(): void {
    if (this._temporalOutlineFlag) {
      this.removeFlag(BaseEditor.Flag.Outline);
      this._temporalOutlineFlag = false;
    }
  }

  /**
   * Previews moving part `partId` (with `partData` from its PartInfo) to
   * `position`: `viewToWorld` maps view to scene, `guides` snaps, `shift`
   * and `option` are the modifiers. Returns what the editor previews
   * (a transform for the box handles) or null.
   */
  /* eslint-disable @typescript-eslint/no-unused-vars -- overridden with the arguments */
  movePart(
    partId: unknown,
    partData: unknown,
    position: Point,
    viewToWorld: Transform,
    guides: unknown,
    shift?: unknown,
    option?: unknown,
    ...rest: unknown[]
  ): unknown {
    if (this.hasFlag(BaseEditor.Flag.Outline)) this.requestInvalidation();
    else this.setOutlineTmpFlag();
    return null;
  }

  resetPartMove(partId: unknown, partData: unknown, ...rest: unknown[]): void {
    this.removeOutlineTmpFlag();
  }

  applyPartMove(partId: unknown, partData: unknown, option?: unknown, extra?: unknown): void {
    this._prepareApplyPartMove(partId, partData);
    this._applyPartMove(partId, partData, option, extra);
    this._finishApplyPartMove(partId, partData);
  }

  _applyPartMove(partId: unknown, partData: unknown, option?: unknown, extra?: unknown): void {
    this.removeOutlineTmpFlag();
  }

  _prepareApplyPartMove(partId: unknown, partData: unknown): void {}

  _finishApplyPartMove(partId: unknown, partData: unknown): void {}

  /** Previews `transform` on the edited element. */
  edTransform(transform: Transform, partId?: unknown, partData?: unknown, options?: unknown): void {
    this._setTransform(transform);
  }
  /* eslint-enable @typescript-eslint/no-unused-vars */

  resetTransform(): void {
    this._transform = null;
    this.requestInvalidation();
    this.removeOutlineTmpFlag();
  }

  canApplyTransform(): unknown {
    return this._transform && !this._transform.isIdentity() && this._transform.invertible();
  }

  applyTransform(target: unknown, ...rest: unknown[]): void {
    this._prepareApplyTransform(target);
    this._applyTransform(target, ...rest);
    this._finishApplyTransform(target);
  }

  /* eslint-disable @typescript-eslint/no-unused-vars -- overridden with the arguments */
  _applyTransform(target: unknown, ...rest: unknown[]): void {
    this.resetTransform();
  }

  _prepareApplyTransform(target: unknown): void {}

  _finishApplyTransform(target: unknown): void {}
  /* eslint-enable @typescript-eslint/no-unused-vars */

  canInlineEdit(): boolean {
    return false;
  }

  isContentModified(): boolean {
    return false;
  }

  allowPartSelection(): boolean {
    return this.hasFlag(BaseEditor.Flag.Selected);
  }

  isRelativeToPage(): boolean {
    return true;
  }

  isInlineEdit(): boolean {
    return false;
  }

  /* eslint-disable @typescript-eslint/no-unused-vars -- overridden with the arguments */
  beginInlineEdit(view: unknown, ...rest: unknown[]): void {
    throw new Error("Not Supported.");
  }

  adjustInlineEditForView(view: unknown, position?: unknown): void {
    throw new Error("Not Supported.");
  }

  finishInlineEdit(): unknown {
    throw new Error("Not Supported.");
  }
  /* eslint-enable @typescript-eslint/no-unused-vars */

  /**
   * The part a select tool drag that starts on `part` drags: the first
   * child editor that claims it, else the part itself when it is this
   * editor's (unless `noOwn`).
   */
  selectToolDragStartAction(part: PartInfo, noOwn?: unknown): PartInfo | null {
    let result: PartInfo | null = null;
    if (this._editors) {
      for (let i = 0; i < this._editors.length; ++i) {
        if ((result = (this._editors[i] as BaseEditor).selectToolDragStartAction(part, noOwn))) {
          return result;
        }
      }
    }
    if (part.editor === this && !noOwn) result = part;
    return result;
  }

  validateSelectionChange(): boolean {
    return true;
  }

  canHandleDblClick(): boolean {
    return false;
  }

  /* eslint-disable @typescript-eslint/no-unused-vars -- overridden with the arguments */
  handleDblClick(location: unknown, transform?: unknown): boolean {
    return false;
  }
  /* eslint-enable @typescript-eslint/no-unused-vars */

  blockRemoval(): void {
    this._blockRemoval = true;
  }

  allowRemoval(): void {
    this._blockRemoval = false;
  }

  isRemovalBlocked(): boolean | undefined {
    return this._blockRemoval;
  }

  /* eslint-disable @typescript-eslint/no-unused-vars -- overridden with the arguments */
  getCursor(partId: unknown, partData?: unknown, ...rest: unknown[]): unknown {
    return null;
  }
  /* eslint-enable @typescript-eslint/no-unused-vars */

  getObjectNameModified(): string | null {
    return null;
  }

  /** Paints the child editors that pass `filter`. */
  _paintChildren(
    transform: Transform,
    context: EditorPaintContext,
    filter?: (editor: BaseEditor) => boolean,
  ): void {
    if (this._editors) {
      for (let i = 0; i < this._editors.length; ++i) {
        const child = this._editors[i] as BaseEditor;
        if (!filter || filter(child)) child.paint(transform, context);
      }
    }
  }

  /* eslint-disable @typescript-eslint/no-unused-vars -- overridden with the arguments */
  _getPartInfoAt(
    location: Point,
    transform: Transform,
    tolerance: number,
    extra?: unknown,
  ): PartInfo | null {
    return null;
  }
  /* eslint-enable @typescript-eslint/no-unused-vars */

  _partIdAreEqual(a: unknown, b: unknown): boolean {
    return a === b;
  }

  _indexOfPartId(list: readonly unknown[] | null | undefined, partId: unknown): number {
    if (list && list.length > 0) {
      for (let i = 0; i < list.length; ++i) {
        if (this._partIdAreEqual(list[i], partId)) return i;
      }
    }
    return -1;
  }

  _updatePartSelection(selection: unknown[] | null): void {
    this.requestInvalidation();
    this._partSelection = selection;
    this.requestInvalidation();
  }

  _showAnnotations(): boolean {
    return true;
  }

  _setTransform(transform: Transform | null): void {
    if (!Transform.equals(this._transform, transform)) {
      if (this.hasFlag(BaseEditor.Flag.Outline)) this.requestInvalidation();
      else this.setOutlineTmpFlag();
      this._transform = transform;
      this.requestInvalidation();
    }
  }

  canHandleKeyEvents(): boolean {
    return false;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- overridden with the argument
  handleKeyEvent(event: unknown): void {}

  override toString(): string {
    return "[Object GBaseEditor]";
  }
}

// Prototype defaults, as the old prototype had them.
const defaults: Record<string, unknown> = {
  _flags: 0,
  _temporalOutlineFlag: false,
  _transform: null,
  _parentEditor: null,
  _editors: null,
  _partSelection: null,
  _blockDeletion: false,
  _color: null,
};
Object.assign(BaseEditor.prototype, defaults);

interface Visible {
  isVisible(): boolean;
}

interface StylableLike {
  hasProperty(name: string): boolean;
  getProperty(name: string): unknown;
  getPaintLayers(): PaintLayers | null;
}
