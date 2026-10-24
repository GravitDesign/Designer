// Old: chunk.vendor.js module 1086 (GSymbolEditor).
/**
 * The editor of a symbol (master or instance). It paints in the symbol
 * colour (masters and instances only), shows the label over the symbol
 * (GBlockEditor.LabelHolder) and moves the symbol by a label drag. Box
 * previews run on a rectangle of the symbol's source box that carries the
 * symbol's transform.
 *
 * Applying a transform to a master also transforms its instances: a
 * resize resizes the `frame` of every instance whose frame and scale/skew
 * match the master's (their editors are opened for that and closed
 * again), and the children follow through their own editors with
 * `blockEv` set so the instances don't update one change at a time.
 */
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { registerClass } from "../../engine/core/object.ts";
import type { Point } from "../../engine/math/point.ts";
import { Rect } from "../../engine/math/rect.ts";
import { Transform, type TransformDecomposition } from "../../engine/math/transform.ts";
import { ElementFlag } from "../../engine/scene/element-change.ts";
import { Element, GeometryChangeEvent } from "../../engine/scene/element.ts";
import type { Node } from "../../engine/scene/node.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import { Symbol as SymbolNode } from "../../engine/scene/symbol.ts";
import { PartInfo, type EditorPaintContext } from "./base-editor.ts";
import { BlockEditor, LabelHolder } from "./block-editor.ts";
import {
  BoxEditor,
  EdTransformOptions,
  type PointMapper,
  type StoredMoveData,
} from "./box-editor.ts";
import { ElementEditor, type EditedElement } from "./element-editor.ts";
import { ItemEditor, type EditedItem } from "./item-editor.ts";

/** A symbol as its editor drives it. */
export type EditedSymbol = EditedItem & SymbolNode;

/** PartInfo data of the label. */
export interface LabelPartData {
  point: Point;
  origTrf: Transform;
}

interface LabelScene {
  getLabelBBox(scale: number): Rect;
  addEventListener(type: unknown, listener: (...args: never[]) => void, target?: object): void;
  removeEventListener(type: unknown, listener: (...args: never[]) => void, target?: object): void;
}

/** A sibling instance as _transformSiblings drives it. */
type SiblingElement = EditedElement;

export class SymbolEditor<E extends EditedSymbol = EditedSymbol> extends ItemEditor<E> {
  static {
    registerClass(this, "GSymbolEditor");
    ElementEditor.exports(this, SymbolNode);
  }

  /** The preview the last transformBox used, kept for _applyTransform. */
  declare _savedElementPreview: E | null;
  declare _isAttached: boolean;

  constructor(element: E) {
    super(element);
    this.setColor(new RGBColor([132, 102, 176]));
  }

  /** GBlockEditor.LabelHolder's label box. */
  _getLabelBBox(transform: Transform | null): Rect | null {
    return LabelHolder._getLabelBBox.call(this as unknown as ElementEditor, transform);
  }

  override createElementPreview(): void {
    if (!this._elementPreview) {
      const box = this._element.getSourceBBox();
      if (!box) return;
      const transform = (this._element.getProperty("trf") as Transform | null) || new Transform();
      this._setElementPreview(
        new Rectangle(box.getX(), box.getY(), box.getWidth(), box.getHeight()) as unknown as E,
      );
      (this._elementPreview as unknown as E).setProperty("trf", transform);
    }
  }

  override _showEditor(context?: EditorPaintContext): boolean {
    return super._showEditor(context) || this._isAttached;
  }

  override _isBBoxEmpty(): boolean {
    return super._isBBoxEmpty() && !this._isAttached;
  }

  override _attach(): void {
    const scene = this._element.getScene() as unknown as LabelScene | null;
    if (null != scene) scene.addEventListener(GeometryChangeEvent, this._geometryChange, this);
    this._isAttached = true;
    this.requestInvalidation();
    super._attach();
  }

  override _detach(): void {
    const scene = this._element.getScene() as unknown as LabelScene | null;
    if (null != scene) scene.removeEventListener(GeometryChangeEvent, this._geometryChange, this);
    this._isAttached = false;
    super._detach();
  }

  /** Any geometry change in the scene drops the preview. */
  _geometryChange(): void {
    this._setElementPreview(null);
  }

  override canApplyTransform(): unknown {
    return (
      (this._elementPreview &&
        (!this._elementPreview.getTransform() ||
          (this._elementPreview.getTransform() as Transform).invertible())) ||
      super.canApplyTransform()
    );
  }

  override transformBox(transform: Transform, options?: EdTransformOptions | null): void {
    const source = this._element.getSourceBBox();
    if (source && !source.isEmpty()) {
      const preview = this._elementPreview as E;
      preview.setProperty("trf", this._element.getProperty("trf"));
      if (options) this._storedMoveData = options.storedMoveData;
      this._setPreTransform(transform);
      preview.assignPreTransformFrom(transform, this._element);
      this._savedElementPreview = preview;
      this.requestInvalidation();
      return;
    }
    super.transformBox(transform, options);
  }

  override getPEGeometryBBox(): Rect | null {
    const box = super.getPEGeometryBBox();
    return this._transform ? this._transform.mapRect(box as Rect) : box;
  }

  /** The preview, created on first use. */
  override getPaintElement(): E {
    if (!this._elementPreview) this.createElementPreview();
    return this._elementPreview || this._element;
  }

  /** The box handles (not the catch handle), else the label. */
  override _getPartInfoAt(
    location: Point,
    transform: Transform,
    tolerance: number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature
    extra?: unknown,
  ): PartInfo | null {
    const hit = BlockEditor.prototype._getPartInfoAt.call(this, location, transform, tolerance);
    if (
      !hit &&
      !this._element.hasFlag(ElementFlag.Hidden) &&
      !this._element.hasFlag(ElementFlag.FullLocked)
    ) {
      const label = this._getLabelBBox(transform);
      if (
        label &&
        label.expanded(tolerance, tolerance, tolerance, tolerance).containsPoint(location)
      ) {
        const data: LabelPartData = { point: location, origTrf: transform };
        return new PartInfo(this, LabelHolder.LABEL_PART_ID, data, true, true);
      }
    }
    return hit;
  }

  /** A label drag moves the symbol by the snapped offset of its top left corner. */
  override movePart(
    partId: unknown,
    partData: unknown,
    position: Point,
    viewToWorld: Transform,
    guides: unknown,
    shift?: unknown,
    option?: unknown,
    multiPage?: unknown,
  ): unknown {
    const result = BlockEditor.prototype.movePart.call(
      this,
      partId,
      partData,
      position,
      viewToWorld,
      guides,
      shift,
      option,
      multiPage,
    );
    if (partId === LabelHolder.LABEL_PART_ID) {
      const point = viewToWorld.mapPoint(position);
      const start = viewToWorld.mapPoint((partData as LabelPartData).point);
      const delta = point.subtract(start);
      const corner = (this.getElement().getGeometryBBox() as Rect).getSide(Rect.Side.TOP_LEFT);
      let moved = corner.add(delta);
      moved = (guides as PointMapper).mapPoint(moved);
      const offset = moved.subtract(corner);
      const translation = new Transform(1, 0, 0, 1, offset.getX(), offset.getY());
      const options = new EdTransformOptions();
      options.isMultiPage = multiPage as boolean;
      options.fullContentsTransform = true;
      this.edTransform(translation, null, null, options);
    }
    return result;
  }

  override _applyPartMove(
    partId: unknown,
    partData: unknown,
    option?: unknown,
    extra?: unknown,
  ): void {
    if (partId === LabelHolder.LABEL_PART_ID) {
      if (this.canApplyTransform()) {
        this._prepareApplyTransform(this._element);
        this._applyTransform(this._element, true, extra, option);
      } else this.resetTransform();
    }
    BlockEditor.prototype._applyPartMove.call(this, partId, partData, option, extra);
  }

  /** The box editor's box grown upwards by the label height, or just the label box. */
  override getCustomBBox(transform: Transform | null, includeTransform?: unknown): Rect | null {
    let box = BlockEditor.prototype.getCustomBBox.call(this, transform, includeTransform);
    const scene = this.getElement().getScene() as unknown as LabelScene | null;
    if (scene) {
      if (box) {
        const scale = (transform as Transform).getScaleFactor();
        const height =
          scene.getLabelBBox(this.getElement().isScaleLabel() ? scale : 1 / scale).getHeight() + 1;
        box = box.expanded(0, height, 0, 0);
      } else if (this.getElement().getGeometryBBox()) box = this._getLabelBBox(transform);
    }
    return box;
  }

  override setColor(color: RGBColor | null): void {
    this._color = color;
  }

  /** The symbol colour, only for masters and instances. */
  override getColor(): RGBColor | null {
    return this.getElement() &&
      (this.getElement().isMaster() || this.getElement().getMasterSymbol())
      ? (this._color as RGBColor | null)
      : null;
  }

  override _applyTransform(target: unknown, ...rest: unknown[]): void {
    const symbol = target as E;
    const force = rest[0];
    const exceptions = rest[1] as readonly Node[] | false | null | undefined;
    const option = rest[2];
    let transform = this._transform;
    let blocked = false;
    if (!transform) {
      if (this._elementPreview || this._savedElementPreview) {
        const previewTransform =
          ((this._savedElementPreview || this._elementPreview) as E).getTransform() ||
          new Transform();
        const own = symbol.getTransform() || new Transform();
        transform = previewTransform.preMultiplied(own.inverted() as Transform);
      } else transform = new Transform();
    }
    const owner = symbol.findParent(function (node) {
      if (node instanceof SymbolNode) return true;
      return undefined;
    }) as SymbolNode | null;
    const insideMaster = owner && owner.isMaster();
    if (!transform.isIdentity()) {
      let savedBlockEv: unknown;
      symbol.beginUpdate();
      if (force) {
        symbol.setTransform(
          ((symbol.getProperty("trf") as Transform | null) || new Transform()).multiplied(
            transform,
          ),
        );
        if (!insideMaster || (insideMaster && symbol.isMaster())) {
          savedBlockEv = symbol.getProperty("blockEv");
          blocked = true;
          symbol.setProperty("blockEv", true);
        }
        this._transformSubElements(symbol, force, transform, exceptions, option);
      } else {
        const frame = symbol.getProperty("frame") as Rect;
        const box = this.getBox() as Rect;
        const stored = this._storedMoveData;
        const own = symbol.getTransform();
        if (symbol.dependentUpdate)
          symbol.setTransform((own || new Transform()).multiplied(transform));
        else if (stored) {
          const resize = Transform.getResizeTransform(
            box,
            stored.side,
            stored.dx,
            stored.dy,
            stored.shift as boolean,
            stored.option as boolean,
          );
          symbol.setProperty("frame", resize.mapRect(frame));
          if (!insideMaster) {
            if (this._savedElementPreview) {
              symbol._layoutTransform = (
                this._savedElementPreview as unknown as { _layoutTransform: Transform | null }
              )._layoutTransform;
            }
            this._transformSiblings(resize, own, frame, exceptions, option);
          }
        } else if (this._transform) {
          symbol.setTransform(
            ((symbol.getProperty("trf") as Transform | null) || new Transform()).multiplied(
              this._transform,
            ),
          );
          if (!insideMaster) this._transformSiblings(transform, own, frame, exceptions, option);
        }
        if (insideMaster && symbol.isMaster()) {
          savedBlockEv = symbol.getProperty("blockEv");
          blocked = true;
          symbol.setProperty("blockEv", true);
        }
        this._transformSubElements(symbol, force, transform, exceptions, option);
      }
      if (blocked) symbol.setProperty("blockEv", savedBlockEv);
      symbol.endUpdate();
    }
    this._savedElementPreview = null;
    BoxEditor.prototype._applyTransform.call(this, symbol);
  }

  /**
   * Transforms the children through their editors; without `force` only
   * when the symbol has no anchored children (they follow the frame).
   */
  _transformSubElements(
    symbol: E,
    force: unknown,
    transform: Transform,
    exceptions: readonly Node[] | false | null | undefined,
    option: unknown,
  ): void {
    if (force || !symbol.hasAnchors()) {
      const stored = this._storedMoveData;
      for (
        let child = symbol.getFirstChild() as EditedElement | null;
        null != child;
        child = child.getNext() as EditedElement | null
      ) {
        if (child instanceof Element && (!exceptions || exceptions.indexOf(child) < 0)) {
          const editor = ElementEditor.openEditor(child) as ElementEditor;
          const options = new SymbolEditor.EdTransformOptions();
          options.fullContentsTransform = !!force;
          child.dependentUpdate = true;
          child.setProperty("subtrf", true, true);
          options.storedMoveData = stored;
          if (editor instanceof SymbolEditor) editor._preTransform = this._preTransform;
          editor.edTransform(transform, null, null, options);
          editor.applyTransform(child, force, exceptions, option);
          child.dependentUpdate = false;
          child.setProperty("subtrf", false, true);
        }
      }
    }
  }

  /**
   * For a master: applies the change to every instance whose frame equals
   * `frame` (the master's before the change) and whose scale and skew
   * equal the master's, through a temporary editor on the instance.
   */
  _transformSiblings(
    transform: Transform,
    ownTransform: Transform | null,
    frame: Rect,
    exceptions: readonly Node[] | false | null | undefined,
    option: unknown,
  ): void {
    const stored = this._storedMoveData;
    if ((this._storedMoveData || transform) && this.getElement().isMaster()) {
      const dependent = this.getElement().dependentUpdate;
      const decomposition = (ownTransform || new Transform()).decomposed();
      const masterFrame = frame;
      const preTransform = this._preTransform;
      this.getElement()._iterateSiblings(this.getElement(), function (node) {
        const sibling = node as unknown as SiblingElement;
        const siblingTransform = sibling.getTransform() || new Transform();
        const siblingDecomposition = siblingTransform.decomposed();
        if (
          Rect.equals(masterFrame, sibling.getProperty("frame") as Rect | null) &&
          // A singular transform has no decomposition; the old code threw here.
          Transform.equals(
            (decomposition as TransformDecomposition).scale,
            (siblingDecomposition as TransformDecomposition).scale,
          ) &&
          Transform.equals(
            (decomposition as TransformDecomposition).skew,
            (siblingDecomposition as TransformDecomposition).skew,
          )
        ) {
          const editor = ElementEditor.openEditor(sibling) as ElementEditor;
          const options = new SymbolEditor.EdTransformOptions();
          options.fullContentsTransform = false;
          sibling.dependentUpdate = dependent;
          options.storedMoveData = stored;
          const box = editor.getBox();
          const move = stored as StoredMoveData;
          const change =
            transform ||
            Transform.getResizeTransform(
              box as Rect,
              move.side,
              move.dx,
              move.dy,
              move.shift as boolean,
              move.option as boolean,
            );
          editor.edTransform(
            (siblingTransform.inverted() as Transform)
              .multiplied(change)
              .multiplied(siblingTransform),
            null,
            null,
            options,
          );
          editor._preTransform = preTransform;
          let savedBlockEv: unknown;
          const isMaster = (sibling as unknown as SymbolNode).isMaster();
          if (!isMaster) {
            savedBlockEv = sibling.getProperty("blockEv");
            sibling.setProperty("blockEv", true);
          }
          editor.applyTransform(sibling, false, exceptions, option);
          ElementEditor.closeElementEditor(sibling);
          if (!(sibling as unknown as SymbolNode).isMaster())
            sibling.setProperty("blockEv", savedBlockEv);
          sibling.dependentUpdate = false;
        }
      });
    }
  }

  override toString(): string {
    return "[Object GSymbolEditor]";
  }
}

Object.assign(SymbolEditor.prototype, { _savedElementPreview: null, _isAttached: false });
