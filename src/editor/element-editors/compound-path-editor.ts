// Old: chunk.vendor.js module 235 (GCompoundPathEditor).
/**
 * The editor of a compound path. Each sub-path gets its own path editor
 * (opened as a child of this one, without a catch handle and without
 * resize handles); points and segments are edited there, and this editor
 * passes flags, part selection, previews and transforms on to them. Hits
 * on a sub-path's parts are tagged with this editor as `ownerEditor`.
 *
 * With the resize handles on (ResizeAll) the compound path transforms as
 * a whole; without them only the sub-paths with a part selection move.
 * Above GEditorOptions.maxNumberOfEditorsToDraw sub-paths the child
 * editors aren't painted and the outline is the box.
 */
import type { Color } from "../../engine/color/color.ts";
import { registerClass } from "../../engine/core/object.ts";
import type { Point } from "../../engine/math/point.ts";
import type { Rect } from "../../engine/math/rect.ts";
import type { Transform } from "../../engine/math/transform.ts";
import { CompoundPath } from "../../engine/scene/compound-path.ts";
import { GeometryChangeEvent } from "../../engine/scene/element.ts";
import { NodeFlag } from "../../engine/scene/node-change.ts";
import type { Node } from "../../engine/scene/node.ts";
import { Path } from "../../engine/scene/path.ts";
import { EditorOptions } from "../editor-options.ts";
import {
  BaseEditor,
  type PartInfo,
  type EditorHost,
  type EditorPaintContext,
} from "./base-editor.ts";
import { BoxEditor } from "./box-editor.ts";
import { ElementEditor } from "./element-editor.ts";
import { PathEditor } from "./path-editor.ts";
import { ShapeEditor, type EditedShape } from "./shape-editor.ts";

/** A compound path as its editor drives it. */
export type EditedCompoundPath = EditedShape & CompoundPath;

/** What the compound path editor calls on its sub-paths' path editors (GPathEditor). */
interface ChildPathEditor extends ElementEditor {
  _element: ElementEditor["_element"];
  setCatchHandle(allowed: unknown): void;
  hasAllPointsSelected(): boolean;
  getPath(): Node;
  releasePathPreview(): void;
  updatePartSelectionUnderCollision(collision: unknown, toggle?: unknown, area?: unknown): boolean;
}

/** GEditor.exchangeElements, which deletePartsSelected calls. */
interface ExchangingEditor extends EditorHost {
  exchangeElements(target: Node, replacements: Node[], noSelect?: unknown): void;
}

/** A path editor part id (GPathEditor.PartType). */
interface PathPartId {
  type: unknown;
  point?: unknown;
  apLeft?: unknown;
  apRight?: unknown;
}

/** PartInfo data with the owner editor. */
interface OwnedData {
  ownerEditor?: unknown;
}

const ResizeAll = BoxEditor.Flag.ResizeAll;

export class CompoundPathEditor<
  E extends EditedCompoundPath = EditedCompoundPath,
> extends ShapeEditor<E> {
  static {
    registerClass(this, "GCompoundPathEditor");
    ElementEditor.exports(this, CompoundPath);
  }

  /**
   * Keeps `transform` and passes it on to the sub-path editors; while some
   * sub-path has a part selection, only those editors get it.
   */
  override edTransform(
    transform: Transform,
    partId?: unknown,
    partData?: unknown,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature
    options?: unknown,
  ): void {
    this._transform = transform;
    if (this.hasFlag(BaseEditor.Flag.Outline)) this.requestInvalidation();
    else this.setOutlineTmpFlag();
    const partSelection = this.hasPathPartSelection();
    this._iterateChildPathsEditors(function (editor) {
      if (!(partSelection && !editor.getPartSelection())) {
        editor.edTransform(transform, partId, partData);
      }
    });
  }

  /** With `keepPreviews` the sub-path editors only drop their transform. */
  override resetTransform(keepPreviews?: unknown): void {
    this._transform = null;
    this._iterateChildPathsEditors(function (editor) {
      if (keepPreviews) editor._setTransform(null);
      else editor.resetTransform();
    });
    this.removeOutlineTmpFlag();
  }

  override canApplyTransform(): unknown {
    let can = false;
    this._iterateChildPathsEditors(function (editor) {
      if (editor.canApplyTransform()) {
        can = true;
        return true;
      }
      return undefined;
    });
    return can;
  }

  override _applyTransform(target: unknown, ...rest: unknown[]): void {
    const element = target as E;
    const option = rest[2];
    const whole = !this.hasPathPartSelection() || this.hasFlag(ResizeAll);
    element.beginUpdate();
    element._beginBlockEvents([GeometryChangeEvent]);
    if (whole) super._applyTransform(element, ...rest);
    else {
      this._iterateChildPathsEditors(function (editor) {
        if (editor.canApplyTransform()) editor.applyTransform(editor._element, false, null, option);
      });
    }
    this.resetTransform(whole);
    element._endBlockEvents([GeometryChangeEvent]);
    element.endUpdate();
  }

  /** The element box united with the sub-path editors' boxes, with a second margin when resizable. */
  override getBBox(transform: Transform): Rect | null {
    let box = super.getBBox(transform);
    if (this.hasFlag(BaseEditor.Flag.Selected) || this.hasFlag(BaseEditor.Flag.Highlighted)) {
      this._iterateChildPathsEditors(function (editor) {
        const childBox = editor.getBBox(transform);
        if (childBox) box = box ? box.united(childBox) : childBox;
      });
    }
    if (box && this.hasFlag(ResizeAll) && !box.isEmpty()) {
      const margin = this.getBBoxMargin();
      box = box.expanded(margin, margin, margin, margin);
    }
    return box;
  }

  /** The boxes of the sub-paths with a part selection, else the geometry box. */
  override getElementSelectionBBox(): Rect | null {
    let box: Rect | null = null;
    this._iterateChildPathsEditors(function (editor) {
      let childBox: Rect | null = null;
      if (editor.getPartsSelectionLength()) childBox = editor.getElementSelectionBBox();
      if (childBox) box = box ? box.united(childBox) : childBox;
    });
    if (!box) box = this._element.getGeometryBBox();
    return box;
  }

  override _attach(): void {
    const scene = this._element.getScene() as unknown as SceneEvents | null;
    if (null != scene) scene.addEventListener(GeometryChangeEvent, this._geometryChange, this);
  }

  override _detach(): void {
    for (
      let path: Node | null = this._element.getPaths().getFirstChild();
      null != path;
      path = path.getNext()
    ) {
      path.removeFlag(NodeFlag.Selected);
    }
    const scene = this._element.getScene() as unknown as SceneEvents | null;
    if (null != scene) scene.removeEventListener(GeometryChangeEvent, this._geometryChange, this);
    super._detach();
  }

  /** Tags the hit with this editor as `ownerEditor` (the old call dropped `extra`). */
  override getPartInfoAt(
    location: Point,
    transform: Transform,
    filter?: ((editor: BaseEditor) => unknown) | null,
    tolerance?: number | null,
  ): PartInfo | null {
    const hit = super.getPartInfoAt(location, transform, filter, tolerance);
    if (hit) {
      if (!hit.data) hit.data = {};
      (hit.data as OwnedData).ownerEditor = this;
      return hit;
    }
    return null;
  }

  /** Without the resize handles the sub-paths' parts come first. */
  override _getPartInfoAt(
    location: Point,
    transform: Transform,
    tolerance: number,
  ): PartInfo | null {
    if (!this.hasFlag(ResizeAll)) {
      for (
        let path: Node | null = this._element.getPaths().getFirstChild();
        null != path;
        path = path.getNext()
      ) {
        const editor = ElementEditor.openEditor(path) as unknown as ChildPathEditor;
        editor.removeFlag(ResizeAll);
        editor.setCatchHandle(false);
        const hit = editor._getPartInfoAt(location, transform, tolerance);
        if (hit) {
          if (!hit.data) hit.data = {};
          (hit.data as OwnedData).ownerEditor = this;
          return hit;
        }
      }
    }
    const hit = super._getPartInfoAt(location, transform, tolerance);
    if (hit) {
      if (!hit.data) hit.data = {};
      (hit.data as OwnedData).ownerEditor = this;
      return hit;
    }
    return null;
  }

  /** Path part ids: the same point, or the same segment. */
  override _partIdAreEqual(a: unknown, b: unknown): boolean {
    const first = a as PathPartId;
    const second = b as PathPartId;
    let equal = first.type === second.type;
    if (equal && first.type == PathEditor.PartType.Point) equal = first.point === second.point;
    else if (equal && first.type == PathEditor.PartType.Segment) {
      equal = first.apLeft === second.apLeft && first.apRight == second.apRight;
    }
    return equal;
  }

  /**
   * Has no part selection of its own: drops it, and with no ids clears
   * (or with `toggle` keeps) the sub-path editors' selections.
   */
  override updatePartSelection(toggle: unknown, partIds?: readonly unknown[] | null): void {
    if (this._partSelection) this._partSelection = null;
    if (!partIds && this.hasFlag(BaseEditor.Flag.Selected) && this._editors) {
      this._iterateChildPathsEditors(function (editor) {
        editor.updatePartSelection(toggle, null);
      });
    }
  }

  override _paintChildren(
    transform: Transform,
    context: EditorPaintContext,
    filter?: (editor: BaseEditor) => boolean,
  ): void {
    if (this._editors && this._editors.length <= EditorOptions.maxNumberOfEditorsToDraw) {
      super._paintChildren(transform, context, filter);
    }
  }

  /**
   * Selects the owned parts in their sub-path editors: with `toggle` each
   * toggles; without, the last one becomes the only selected part.
   */
  override updateOwnedPartsSelection(toggle: unknown, parts: readonly PartInfo[] | null): void {
    if (parts && parts.length) {
      let last: PartInfo | null = null;
      for (let i = 0; i < parts.length; ++i) {
        const part = parts[i] as PartInfo;
        if ((part.data as OwnedData).ownerEditor === this) {
          if (toggle) (part.editor as BaseEditor).updatePartSelection(toggle, [part.id]);
          else last = part;
        }
      }
      if (last) {
        this.updatePartSelection(false);
        (last.editor as BaseEditor).updatePartSelection(false, [last.id]);
      }
    }
  }

  getActiveExtendingMode(): unknown {
    return null;
  }

  override isPartSelectionUnderCollisionAllowed(): boolean {
    return true;
  }

  override updatePartSelectionUnderCollision(
    collision: unknown,
    toggle?: unknown,
    area?: unknown,
  ): boolean {
    let changed = false;
    for (
      let path: Node | null = this._element.getPaths().getFirstChild();
      null != path;
      path = path.getNext()
    ) {
      const editor = ElementEditor.openEditor(path) as unknown as ChildPathEditor;
      editor.removeFlag(ResizeAll);
      editor.setCatchHandle(false);
      if (editor.updatePartSelectionUnderCollision(collision, toggle, area)) changed = true;
    }
    return changed;
  }

  /**
   * Parts can be deleted when a sub-path editor allows it, or when some
   * but not all sub-paths have all their points selected (those
   * sub-paths are then removed).
   */
  override isDeletePartsAllowed(): boolean {
    let allowed = false;
    if (this.hasFlag(BaseEditor.Flag.Selected) && this._editors) {
      let allFull = true;
      let someFull = false;
      this._iterateChildPathsEditors(function (editor) {
        if (!(allowed = allowed || editor.isDeletePartsAllowed())) {
          if (editor.hasAllPointsSelected()) someFull = true;
          else allFull = false;
        }
      });
      if (!(allowed || !someFull || allFull)) allowed = true;
    }
    return allowed;
  }

  /**
   * Deletes the selected parts in the sub-paths; sub-paths with all points
   * selected are removed, and a compound path left with one sub-path is
   * replaced by it (GEditor.exchangeElements).
   */
  override deletePartsSelected(): void {
    if (this.hasFlag(BaseEditor.Flag.Selected) && this._editors) {
      const full: ChildPathEditor[] = [];
      this._iterateChildPathsEditors(function (editor) {
        if (editor.isDeletePartsAllowed()) editor.deletePartsSelected();
        else if (editor instanceof PathEditor && editor.hasAllPointsSelected()) full.push(editor);
      });
      if (full.length) {
        const element = this._element;
        for (let i = 0; i < full.length; ++i) {
          const editor = full[i] as ChildPathEditor;
          editor.deletePartsSelected();
          const path = editor.getPath();
          if (path.hasFlag(NodeFlag.Selected)) path.removeFlag(NodeFlag.Selected);
          element.getPaths().removeChild(path);
        }
        if (this._element.getPaths().getFirstChild() == this._element.getPaths().getLastChild()) {
          const first = element.getPaths().getFirstChild() as Node;
          (
            BaseEditor.getEditor<ExchangingEditor>(element.getScene()) as ExchangingEditor
          ).exchangeElements(element, [first], true);
        }
      }
    }
  }

  override isAlignPartsAllowed(): boolean {
    let allowed = false;
    if (this.hasFlag(BaseEditor.Flag.Selected) && this._editors) {
      this._iterateChildPathsEditors(function (editor) {
        if (editor.isAlignPartsAllowed()) return (allowed = true);
        return undefined;
      });
    }
    return allowed;
  }

  override alignParts(alignment: unknown, area?: unknown, target?: unknown): void {
    if (this.hasFlag(BaseEditor.Flag.Selected) && this._editors) {
      this._element.beginUpdate();
      this._iterateChildPathsEditors(function (editor) {
        if (editor.isAlignPartsAllowed()) editor.alignParts(alignment, area, target);
      });
      this._element.endUpdate();
    }
  }

  /** A geometry change of the compound path or one of its sub-paths repaints (and after it drops the previews). */
  _geometryChange(event: GeometryChangeEvent): void {
    if (
      event.type == GeometryChangeEvent.Type.Before ||
      event.type == GeometryChangeEvent.Type.After
    ) {
      let own = event.element == this._element;
      if (!own && event.element instanceof Path) {
        for (
          let path: Node | null = this._element.getPaths().getFirstChild();
          null != path && !own;
          path = path.getNext()
        ) {
          if (path == event.element) own = true;
        }
      }
      if (own) {
        if (event.type == GeometryChangeEvent.Type.After) this.releasePathPreview();
        this.requestInvalidation();
      }
    }
  }

  /**
   * Sets the flag here and opens the sub-path editors without catch
   * handles: they get the flag too (unless it is ResizeAll), are outlined
   * while this one is resizable, and never have resize handles.
   */
  override setFlag(flag: number): void {
    if (0 == (this._flags & flag)) {
      this.requestInvalidation();
      this._flags = this._flags | flag;
      for (
        let path: Node | null = this._element.getPaths().getFirstChild();
        null != path;
        path = path.getNext()
      ) {
        const editor = ElementEditor.openEditor(path) as unknown as ChildPathEditor | null;
        (editor as ChildPathEditor).setCatchHandle(false);
        if ((flag & ResizeAll) != ResizeAll && editor && !editor.hasFlag(flag))
          editor.setFlag(flag);
        if (this.hasFlag(ResizeAll) && editor && !editor.hasFlag(BaseEditor.Flag.Outline)) {
          editor.setFlag(BaseEditor.Flag.Outline);
        }
        if (editor && editor.hasFlag(ResizeAll)) editor.removeFlag(ResizeAll);
      }
      this.requestInvalidation();
    }
  }

  /**
   * Clears the flag here and on the sub-path editors; clearing ResizeAll
   * takes their outline away, and Outline stays on them while this one is
   * resizable.
   */
  override removeFlag(flag: number): void {
    if (0 != (this._flags & flag)) {
      this.requestInvalidation();
      if (this._editors) {
        this._iterateChildPathsEditors((editor) => {
          if ((flag & ResizeAll) == ResizeAll) editor.removeFlag(BaseEditor.Flag.Outline);
          else if (!(
            (flag & BaseEditor.Flag.Outline) == BaseEditor.Flag.Outline &&
            (this._flags & ResizeAll) == ResizeAll
          )) {
            editor.removeFlag(flag);
          }
        });
      }
      this._flags = this._flags & ~flag;
      this.requestInvalidation();
    }
  }

  override _paintOutline(
    transform: Transform,
    context: EditorPaintContext,
    noVertices: unknown,
    color: Color | null,
    baseTransform?: Transform | null,
  ): void {
    if (this._editors && this._editors.length > EditorOptions.maxNumberOfEditorsToDraw) {
      BoxEditor.prototype._paintOutline.call(this, transform, context, noVertices, color);
    } else if (
      !this.hasFlag(BaseEditor.Flag.Selected) &&
      this.hasFlag(BaseEditor.Flag.Outline) &&
      this._editors
    ) {
      this._iterateChildPathsEditors(function (editor) {
        editor._paintOutline(transform, context, noVertices, color, baseTransform);
      });
    }
  }

  releasePathPreview(): void {
    for (
      let path: Node | null = this._element.getPaths().getFirstChild();
      null != path;
      path = path.getNext()
    ) {
      const editor = ElementEditor.getEditor<ChildPathEditor>(path);
      if (editor) editor.releasePathPreview();
    }
  }

  hasPathPartSelection(): boolean {
    let has = false;
    if (this._editors) {
      this._iterateChildPathsEditors(function (editor) {
        if (editor.getPartSelection()) {
          has = true;
          return true;
        }
        return undefined;
      });
    }
    return has;
  }

  /**
   * Calls `visitor` with the editor of each sub-path that has one, until
   * it returns true; nothing when the first sub-path has no editor.
   */
  _iterateChildPathsEditors(visitor: (editor: ChildPathEditor) => unknown): void {
    if (
      this._editors &&
      this._element.getPaths().getFirstChild() &&
      ElementEditor.getEditor(this._element.getPaths().getFirstChild())
    ) {
      let stop = false;
      for (
        let path: Node | null = this._element.getPaths().getFirstChild();
        null != path && !stop;
        path = path.getNext()
      ) {
        const editor = ElementEditor.getEditor<ChildPathEditor>(path);
        if (editor && true === visitor(editor)) stop = true;
      }
    }
  }

  override toString(): string {
    return "[Object GCompoundPathEditor]";
  }
}

interface SceneEvents {
  addEventListener(type: unknown, listener: (...args: never[]) => void, target?: object): void;
  removeEventListener(type: unknown, listener: (...args: never[]) => void, target?: object): void;
}
