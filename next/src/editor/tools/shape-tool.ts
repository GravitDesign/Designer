// Old: chunk.vendor.js module 236 (GShapeTool).
/**
 * The base of the tools that draw a shape by dragging out its box or its
 * line (rectangle, ellipse, line, polygons, simple shapes, text, slice
 * annotations ...).
 *
 * On drag start the shape is created and inserted at once in its own
 * transaction ("Insert Elements"), hidden (NoPaint) with its editor
 * painting a temporary outline instead; every drag move updates its
 * geometry (_updateShape); drag end shows it again. A click without a
 * drag calls _createShapeManually (most tools do nothing there). Either
 * way the tool's job is done and the default tool comes back.
 *
 * Start and current points snap through the guides. Modifiers, also
 * flipped in the middle of a drag (GModifiersChangedEvent), change the
 * shape: Shift keeps the ratio and Alt draws from the centre (for tools
 * made with keepRatio and fromCenter), Space moves the shape being drawn.
 */
import { MouseEvent } from "../../engine/core/mouse-event.ts";
import { ModifiersChangedEvent } from "../../engine/core/modifiers-changed-event.ts";
import { registerClass, type AnyConstructor } from "../../engine/core/object.ts";
import { Platform } from "../../engine/core/platform.ts";
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { VertexPixelAligner } from "../../engine/geometry/vertex-pixel-aligner.ts";
import { Point } from "../../engine/math/point.ts";
import { Rect } from "../../engine/math/rect.ts";
import type { PaintCanvas } from "../../engine/paint/paint-canvas.ts";
import type { PaintContext } from "../../engine/paint/paint-context.ts";
import { AnnotationMixin } from "../../engine/scene/annotations/annotation.ts";
import type { Element } from "../../engine/scene/element.ts";
import { ElementChange, ElementFlag } from "../../engine/scene/element-change.ts";
import type { Node } from "../../engine/scene/node.ts";
import type { PropertiesApi } from "../../engine/scene/node-properties.ts";
import type { Page } from "../../engine/scene/page.ts";
import { Path } from "../../engine/scene/path.ts";
import { Shape } from "../../engine/scene/shape.ts";
import { Cursor } from "../cursor.ts";
import { EditorOptions } from "../editor-options.ts";
import { ElementEditor } from "../element-editors/element-editor.ts";
import { BBoxGuide } from "../guides/bbox-guide.ts";
import { Panning } from "../view/panning.ts";
import type { EditorWidget } from "../view/editor-widget.ts";
import { ItemTool } from "./item-tool.ts";
import type { ToolManager } from "./tool-manager.ts";

/** The shapes a shape tool draws, as far as the base class drives them. */
export type DrawnShape = Element & PropertiesApi;

/** What the base class needs of an element editor. */
interface OutlineEditor {
  setOutlineTmpFlag(): void;
  removeOutlineTmpFlag(): void;
}

export class ShapeTool extends Panning(ItemTool) {
  static {
    registerClass(this, "GShapeTool");
  }

  _isDragging = false;
  _dragStart: Point | null = null;
  _dragStartOrig: Point | null = null;
  _dragCurrent: Point | null = null;
  _dragCurrentOrig: Point | null = null;
  /** Shift makes width and height equal (for 2-point shapes: 45° steps). */
  _keepRatio = false;
  /** Alt draws from the press point as the centre. */
  _fromCenter = false;
  _shape: DrawnShape | null = null;
  _dragArea: Rect | null = null;
  _dragLine: Point[] | null = null;
  _movePosition: Point | null = null;
  _hasCreatedShape = false;

  constructor(keepRatio?: boolean, fromCenter?: boolean) {
    super();
    this._keepRatio = !!keepRatio;
    this._fromCenter = !!fromCenter;
  }

  override getCursor(): string | null {
    return Cursor.Cross;
  }

  override activate(view: EditorWidget, light?: boolean): void {
    super.activate(view, light);
    if (!light) {
      view.addEventListener(MouseEvent.Move, this._mouseMove, this);
      view.addEventListener(MouseEvent.DragStart, this._mouseDragStart, this);
      view.addEventListener(MouseEvent.Drag, this._mouseDrag, this);
      view.addEventListener(MouseEvent.DragEnd, this._mouseDragEnd, this);
      view.addEventListener(MouseEvent.Down, this._mouseDown, this);
      view.addEventListener(MouseEvent.Release, this._mouseRelease, this);
      Platform.addEventListener(ModifiersChangedEvent, this._modifiersChanged, this);
    }
  }

  /**
   * Always a full deactivation: the listeners go even when `light` is set,
   * and the base class is told it is not light.
   */
  override deactivate(view: EditorWidget, light?: boolean): void {
    void light;
    if (this._editor) this._editor.getGuides().invalidate();
    this.updateInlineHint(null);
    super.deactivate(view);
    view.removeEventListener(MouseEvent.Move, this._mouseMove, this);
    view.removeEventListener(MouseEvent.DragStart, this._mouseDragStart);
    view.removeEventListener(MouseEvent.Drag, this._mouseDrag);
    view.removeEventListener(MouseEvent.DragEnd, this._mouseDragEnd);
    view.removeEventListener(MouseEvent.Down, this._mouseDown);
    view.removeEventListener(MouseEvent.Release, this._mouseRelease);
    Platform.removeEventListener(ModifiersChangedEvent, this._modifiersChanged);
  }

  override isDeactivatable(): boolean {
    return !this._isDragging;
  }

  override paint(context: PaintContext): void {
    void context;
  }

  /** Extra transaction data for the insert (the annotation tools add some). */
  getAdditionalTransactionData(shape: Node, parent: Node | null): unknown {
    const self = this as unknown as {
      getAdditionalTransactionDataMixin?: (shape: Node, parent: Node | null) => unknown;
    };
    return "function" == typeof self.getAdditionalTransactionDataMixin
      ? self.getAdditionalTransactionDataMixin(shape, parent)
      : null;
  }

  _paintOutline(context: PaintContext): void {
    const canvas = context.canvas as PaintCanvas;
    // Only called while a shape is drawn; every drawn shape is a vertex
    // source, which the DrawnShape type (Element) doesn't carry.
    canvas.putVertices(new VertexPixelAligner(this._shape as never));
    canvas.strokeVertices(context.selectionOutlineColor, EditorOptions.outlineWidth);
  }

  _mouseDown(event: MouseEvent): void {
    if (event.button === MouseEvent.BUTTON_LEFT)
      this._editor.updateByMousePosition(
        event.client,
        this._view.getWorldTransform(this._scene),
        false,
        this._view.getViewConfiguration(),
      );
  }

  _mouseRelease(event: MouseEvent): void {
    if (!this._hasCreatedShape) {
      let point = this._pageViewTransformPoint(event.client);
      const guides = this._editor.getGuides();
      guides.beginMap(this._editor.getMappingScopes() as unknown as Node[]);
      point = guides.mapPoint(point, null, this._getExclusions());
      guides.finishMap();
      this._createShapeManually(point);
    }
    this._hasCreatedShape = false;
    (this._manager as ToolManager).notifyJobDone(this);
  }

  _mouseDragStart(event: MouseEvent): void {
    this._hasCreatedShape = false;
    this._isDragging = true;
    this.beginPan();
    this._dragStart = this._pageViewTransformPoint(event.client);
    const guides = this._editor.getGuides();
    guides.beginMap(this._editor.getMappingScopes() as unknown as Node[]);
    this._dragStart = guides.mapPoint(this._dragStart, null, this._getExclusions());
    guides.finishMap();
    this._shape = this._createShape();
    this._invalidateShape();
    this._hasCreatedShape = this._insertShape(this._shape, true);
    const editor = ElementEditor.getEditor<OutlineEditor>(this._shape);
    if (editor) {
      (this._shape as DrawnShape).setFlag(ElementFlag.NoPaint);
      editor.setOutlineTmpFlag();
    }
    this.updateInlineHint(null);
    this.updateCursor();
  }

  _mouseDrag(event: MouseEvent): void {
    this._dragCurrent = this._pageViewTransformPoint(event.client);
    if (this.isPanning()) this.panView(event.client, event.clientDelta);
    if (Platform.modifiers.spaceKey && this._dragStartOrig)
      this._dragStart = this._dragStartOrig.add(
        this._dragCurrent.subtract(this._dragCurrentOrig as Point),
      );
    this._invalidateShape();
  }

  _mouseDragEnd(event: MouseEvent): void {
    void event;
    this.endPan();
    this._editor.getGuides().invalidate();
    const shape = this._shape;
    this._shape = null;
    this._dragStart = null;
    this._dragCurrent = null;
    this._shape = null;
    this._dragArea = null;
    this._dragLine = null;
    this._dragStartOrig = null;
    this._dragCurrentOrig = null;
    this._isDragging = false;
    this.updateCursor();
    this.updateInlineHint(null);
    if (!this._hasCreatedShape && shape) {
      this._prepareShapeForAppend(shape);
      this._insertShape(shape);
      this._hasCreatedShape = true;
    } else if (this._hasCreatedShape) {
      const drawn = shape as DrawnShape;
      drawn.removeFlag(ElementFlag.NoPaint);
      const editor = ElementEditor.getEditor<OutlineEditor>(drawn);
      if (editor) editor.removeOutlineTmpFlag();
      drawn._notifyChange(ElementChange.FinishGeometryUpdate, 1);
    }
  }

  _mouseMove(event: MouseEvent): void {
    if (!this._isDragging) {
      this._movePosition = this._pageViewTransformPoint(event.client);
      this._invalidateMovePosition();
    }
  }

  _modifiersChanged(event: ModifiersChangedEvent): void {
    const changed = event.changed;
    if (
      (this._keepRatio && changed.shiftKey) ||
      (this._fromCenter && changed.optionKey) ||
      changed.metaKey
    )
      this._invalidateShape();
    else if (changed.spaceKey) {
      if (Platform.modifiers.spaceKey) {
        this._dragStartOrig = this._dragStart;
        this._dragCurrentOrig = this._dragCurrent;
      } else {
        this._dragStartOrig = null;
        this._dragCurrentOrig = null;
      }
    }
    if (changed.metaKey && !this._isDragging) this._invalidateMovePosition();
  }

  /**
   * The guides to snap with: none for annotation items. The old code
   * passed the bbox guide class where guide ids are expected, so no guide
   * matches (see "Annotation tools snap to no guide" in QUESTIONS.md).
   */
  _getExclusions(): string[] | null {
    const itemClass = this._getRelatedItemClass();
    return itemClass &&
      (itemClass.prototype as Node).hasMixin.call(itemClass.prototype, AnnotationMixin)
      ? [BBoxGuide as unknown as string]
      : null;
  }

  /** `client` (view coordinates) in the active page's coordinates. */
  _pageViewTransformPoint(client: Point): Point {
    return this._view
      .getViewTransform(this._view.getScene().getActivePage() as Page)
      .mapPoint(client);
  }

  /** Shows the snapped pointer position as "x, y" while hovering. */
  _invalidateMovePosition(): void {
    if (this._movePosition) {
      const guides = this._editor.getGuides();
      guides.beginMap(this._editor.getMappingScopes() as unknown as Node[]);
      const point = guides.mapPoint(this._movePosition, null, this._getExclusions());
      guides.finishMap();
      if (
        EditorOptions.showTooltips &&
        EditorOptions.coordinatesTooltip &&
        this._showMousePositionInlineHint()
      ) {
        const text =
          this._scene.pointToString(point.getX(), EditorOptions.tooltipDecimalPlaces) +
          ", " +
          this._scene.pointToString(point.getY(), EditorOptions.tooltipDecimalPlaces);
        this.updateInlineHint(text, point, Rect.Side.BOTTOM_LEFT);
      }
    }
  }

  /** Updates the shape being drawn from the drag start and the snapped current point. */
  _invalidateShape(): void {
    if (!(this._dragStart && this._dragCurrent)) return;
    const guides = this._editor.getGuides();
    guides.useExclusions([this._shape as unknown as Node]);
    guides.beginMap(this._editor.getMappingScopes() as unknown as Node[]);
    const current = guides.mapPoint(this._dragCurrent, null, this._getExclusions());
    guides.finishMap();
    if (Point.equals(this._dragStart, current)) return;
    const startX = this._dragStart.getX();
    const startY = this._dragStart.getY();
    let endX = current.getX();
    let endY = current.getY();
    // The line's end: with Shift it snaps to horizontal, vertical or 45°.
    let lineX = endX;
    let lineY = endY;
    if (this._keepRatio && Platform.modifiers.shiftKey) {
      const signX = endX < startX ? -1 : 1;
      const signY = endY < startY ? -1 : 1;
      const dx = Math.abs(endX - startX);
      const dy = Math.abs(endY - startY);
      if (dx >= dy) {
        endX = startX + dx * signX;
        endY = startY + dx * signY;
        lineY = dx < 2 * dy ? endY : startY;
      } else {
        endX = startX + dy * signX;
        endY = startY + dy * signY;
        lineX = dy < 2 * dx ? endX : startX;
      }
    }
    let area: Rect;
    let line: Point[];
    if (this._fromCenter && Platform.modifiers.optionKey) {
      area = Rect.fromPoints(
        new Point(startX - (endX - startX), startY - (endY - startY)),
        new Point(startX + (endX - startX), startY + (endY - startY)),
      );
      line = [
        new Point(startX - (lineX - startX), startY - (lineY - startY)),
        new Point(startX + (lineX - startX), startY + (lineY - startY)),
      ];
    } else {
      area = Rect.fromPoints(new Point(startX, startY), new Point(endX, endY));
      line = [new Point(startX, startY), new Point(lineX, lineY)];
    }
    this._dragArea = area;
    this._dragLine = line;
    this._updateShape(this._shape as DrawnShape, area, line, true);
    if (EditorOptions.showTooltips && EditorOptions.sizeTooltip && this._showAreaInlineHint()) {
      let text: string | null = null;
      if (this._dragArea) {
        const width = this._dragArea.getWidth();
        const height = this._dragArea.getHeight();
        text =
          this._shape instanceof Path && this._shape.isLine()
            ? this._scene.pointToString(
                Math.sqrt(width * width + height * height),
                EditorOptions.tooltipDecimalPlaces,
              )
            : this._scene.pointToString(width, EditorOptions.tooltipDecimalPlaces) +
              " × " +
              this._scene.pointToString(height, EditorOptions.tooltipDecimalPlaces);
      }
      this.updateInlineHint(text, this._dragCurrent, Rect.Side.BOTTOM_LEFT);
    }
  }

  _prepareShapeForAppend(shape: DrawnShape): boolean {
    return this._updateShape(shape, this._dragArea, this._dragLine, true);
  }

  /**
   * Inserts `shape` unless it already has a parent. Without
   * `noTransaction` the insert is its own transaction, named `name` or
   * "Insert Elements". `preview` is set for the insert at drag start.
   */
  _insertShape(
    shape: DrawnShape | null,
    preview?: boolean,
    noTransaction?: boolean,
    name?: string,
  ): boolean {
    void preview;
    if (shape && shape.getParent()) return false;
    const editor = this._editor;
    if (noTransaction) editor.insertElements([shape], false, !!noTransaction, true);
    else
      try {
        editor.beginTransaction();
        editor.insertElements([shape], false, true, true);
      } finally {
        const data = this.getAdditionalTransactionData(
          shape as unknown as Node,
          (shape as DrawnShape).getParent() as Node | null,
        );
        editor.commitTransaction(
          name || (Locale.get(new LocaleKey("GShapeTool", "action.insert-elements")) as string),
          data,
        );
      }
    return true;
  }

  /** A click without a drag at `point` (page coordinates, snapped). */
  _createShapeManually(point: Point): void {
    void point;
  }

  _createShape(): DrawnShape | null {
    const ItemClass = this._getRelatedItemClass() as unknown as new () => DrawnShape;
    return new ItemClass();
  }

  /**
   * Sets the shape's geometry from the drag `area` or the drag `line`
   * (start and end point). Returns whether it could.
   */
  _updateShape(
    shape: DrawnShape,
    area: Rect | null,
    line: Point[] | null,
    preview?: boolean,
  ): boolean {
    void shape;
    void area;
    void line;
    void preview;
    throw new Error("Not Supported.");
  }

  _hasCenterCross(): boolean {
    return false;
  }

  _showMousePositionInlineHint(): boolean {
    return false;
  }

  _showAreaInlineHint(): boolean {
    return false;
  }

  override _getRelatedItemClass(): AnyConstructor<Node> | null {
    return Shape as unknown as AnyConstructor<Node>;
  }

  override toString(): string {
    return "[Object GShapeTool]";
  }
}
