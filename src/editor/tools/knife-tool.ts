// Old: chunk.vendor.js module 757 (GKnifeTool).
/**
 * The knife: a drag draws a cut line (a press, moves, a release), and the
 * release cuts every shape the line crosses, or only the selected shapes
 * when there is a selection. Texts are converted to outlines first, locked
 * items are skipped. The pieces of each cut shape go in its place (in a
 * group when a side has more than one piece) and get selected.
 *
 * The tool draws the cut line with the pen's logic of the path tool, but
 * the line is no scene path: the tool keeps it in `_knifePath` (first
 * point) and its own preview (`_elementPreview`, the whole line) and acts
 * as its own path editor (`_pathEditor` is the tool itself). Shift
 * constrains to 45° steps; holding Alt at the press drags bezier handles
 * first, and letting Alt go then cuts along the curve. Right clicks add
 * rounded or (with Alt) connector points to the line.
 */
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { Locale } from "../../engine/core/locale/locale.ts";
import type { ModifiersChangedEvent } from "../../engine/core/modifiers-changed-event.ts";
import { MouseEvent } from "../../engine/core/mouse-event.ts";
import { registerClass } from "../../engine/core/object.ts";
import { Platform } from "../../engine/core/platform.ts";
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { PolyIntersector } from "../../engine/geometry/boolean/poly-segments.ts";
import { HitResult } from "../../engine/geometry/hit-result.ts";
import { KnifeCut } from "../../engine/geometry/knife-cut.ts";
import { PathUtil } from "../../engine/geometry/path-util.ts";
import { Vertex } from "../../engine/geometry/vertex.ts";
import { VertexContainer } from "../../engine/geometry/vertex-container.ts";
import { VertexInfo } from "../../engine/geometry/vertex-info.ts";
import { VertexPixelAligner } from "../../engine/geometry/vertex-pixel-aligner.ts";
import { VertexSource } from "../../engine/geometry/vertex-source.ts";
import type { VertexReader } from "../../engine/geometry/vertex-source.ts";
import { VertexTransformer } from "../../engine/geometry/vertex-transformer.ts";
import { GMath } from "../../engine/math/math.ts";
import { Point } from "../../engine/math/point.ts";
import type { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import type { PaintCanvas } from "../../engine/paint/paint-canvas.ts";
import type { PaintContext } from "../../engine/paint/paint-context.ts";
import { ElementData } from "../../engine/paint/element-data.ts";
import { Block } from "../../engine/scene/block.ts";
import { CompoundPath } from "../../engine/scene/compound-path.ts";
import { CompoundShape } from "../../engine/scene/compound-shape.ts";
import { Element } from "../../engine/scene/element.ts";
import { ElementFlag } from "../../engine/scene/element-change.ts";
import { Group } from "../../engine/scene/group.ts";
import { Image } from "../../engine/scene/image.ts";
import { Item } from "../../engine/scene/item.ts";
import { NodeFlag } from "../../engine/scene/node-change.ts";
import type { Node } from "../../engine/scene/node.ts";
import { AnchorPoint, PathBase } from "../../engine/scene/path-base.ts";
import { Path, type PathIntersection } from "../../engine/scene/path.ts";
import { Shape } from "../../engine/scene/shape.ts";
import { Text } from "../../engine/text/text.ts";
import { Cursor } from "../cursor.ts";
import { Editor } from "../editor.ts";
import { EditorOptions } from "../editor-options.ts";
import { DetailMapMode } from "../guides/guide.ts";
import { EditorAnnotation } from "../handles/editor-annotation.ts";
import type { EditorWidget } from "../view/editor-widget.ts";
import { PathTool, type ToolPathEditor } from "./path-tool.ts";
import type { ToolManager } from "./tool-manager.ts";

const Mode = PathTool.Mode;
const Type = AnchorPoint.Type;
const loc = (key: string): string => Locale.get(new LocaleKey("GKnifeTool", key)) as string;

/** What _iteratePoints passes per anchor point (page coordinates). */
interface KnifePointInfo {
  type: unknown;
  anchorPoint: AnchorPoint;
  position: Point;
  annotation: string;
  leftHandlePosition: Point | null;
  rightHandlePosition: Point | null;
}

/** A node with children (GNode.Container). */
interface ContainerNode extends Node {
  getFirstChild(): Node | null;
  appendChild(child: Node): void;
  insertChild(child: Node, reference: Node | null): void;
  removeChild(child: Node): void;
  clearChildren(): void;
}

/** The property access of scene nodes (the old GNode.Properties mixin). */
interface Propertied {
  getProperty(name: string): unknown;
  setProperty(name: string, value: unknown): void;
}

interface Cloneable {
  clone(): Node;
}

/** A shape as the cut handles it: a path, or a vertex source the cutter reads. */
type CutPiece = Path | VertexContainer;

export class KnifeTool extends PathTool {
  static {
    registerClass(this, "GKnifeTool");
  }

  /** The cut line's first point; the tool's preview holds the whole line. */
  _knifePath: Path | null = null;
  _elementPreview: Path | null = null;
  _sourceIndexToPreviewIndex: Record<number, number> | null = null;

  override activate(view: EditorWidget, light?: boolean): void {
    super.activate(view, light);
    if (!light) {
      view.addEventListener(MouseEvent.Drag, this._mouseDrag, this);
      view.addEventListener(MouseEvent.Move, this._mouseMove, this);
    }
    this._cursor = Cursor.Knife;
  }

  override deactivate(view: EditorWidget, light?: boolean): void {
    this._checkMode();
    super.deactivate(view, light);
    view.removeEventListener(MouseEvent.Drag, this._mouseDrag);
    view.removeEventListener(MouseEvent.Move, this._mouseMove);
    this._knifePath = null;
  }

  /** The cut line always appends. */
  override _checkMode(): void {
    this._mode = Mode.Append;
  }

  /** The cut line is no item, so it has no default style. */
  override getDefaultStyle(): null {
    return null;
  }

  override _mouseDown(event: MouseEvent): void {
    const now = new Date().getTime();
    if (now - this._mDownTime < PathTool.DBLCLICKTM) {
      if ("edit" == EditorOptions.selectDoubleClickBehavior) {
        (this._manager as ToolManager).notifyJobDone(this);
      }
      return;
    }
    this._lastMouseEvent = event;
    this._dragStarted = false;
    this._dragStartPt = null;
    this._mouseMove(event);
    this._mDownTime = now;
    this._released = false;
    if (Platform.modifiers.optionKey) this._firstAlt = true;
    this._blockDeactivation();
    this._checkMode();
    this._renewPreviewLink();
    if (this._newPoint && this._pathEditor) {
      // The point that followed the pointer becomes a real one.
      this._updatePoint(event.client);
      const editPoint = this._editPt as AnchorPoint;
      const previous = editPoint.getPrevious() as AnchorPoint | null;
      if (previous) {
        previous.removeFlag(NodeFlag.Selected);
        editPoint.setFlag(NodeFlag.Selected);
      }
      this._invalidate();
      if (event.button == MouseEvent.BUTTON_RIGHT) {
        if (Platform.modifiers.optionKey) editPoint.setProperty("tp", Type.Connector);
        else editPoint.setProperties(["tp", "cu"], [PathBase.CornerType.Rounded, true]);
      }
      this._invalidate();
    } else {
      let position = this._view
        .getViewTransform(this._view.getScene().getActivePage())
        .mapPoint(event.client);
      const guides = this._editor.getGuides();
      // The editor's EdNode stand-in vs. the scene Nodes beginMap takes.
      guides.beginMap(this._editor.getMappingScopes() as never);
      position = guides.mapPoint(position, DetailMapMode.DetailOnFilterOn);
      guides.finishMap();
      const point = this._constructNewPoint(event, position);
      if (event.button == MouseEvent.BUTTON_RIGHT) {
        if (Platform.modifiers.optionKey) point.setProperty("tp", Type.Connector);
        else point.setProperties(["tp", "cu"], [PathBase.CornerType.Rounded, true]);
      }
      this._addPoint(point, true, false);
    }
  }

  override _renewPreviewLink(): void {
    if (this._pathEditor) {
      const preview = this._pathEditor.getPathPreview() as Path;
      if (this._editPt) {
        const end = preview.getAnchorPoints().getLastChild();
        if (this._editPt != end) {
          this._newPoint = false;
          this._editPt = null;
        }
      }
      this._dpathRef = preview;
    } else {
      this._editPt = null;
      this._newPoint = false;
      this._dpathRef = null;
    }
  }

  /**
   * With the button up (or during an Alt press): the next point of the
   * line follows the pointer. With the right button down it drags.
   */
  override _mouseMove(event: MouseEvent): void {
    if (!(this._released || !this._firstAlt)) {
      if (event.button == MouseEvent.BUTTON_RIGHT) this._mouseDrag(event);
      return;
    }
    this._lastMouseEvent = event;
    this._pathEditor = null;
    this._checkPathEditor();
    if (this._pathEditor) this._pathRef = (this._pathEditor as ToolPathEditor).getPath();
    this._renewPreviewLink();
    let position = event.client;
    if (!this._newPoint && this._pathEditor) {
      position = this._constrainIfNeeded(
        event.client,
        this._view.getWorldTransform(this._view.getScene().getActivePage()),
        this._pathRef,
      );
      let scene = this._view
        .getViewTransform(this._view.getScene().getActivePage())
        .mapPoint(position);
      const guides = this._editor.getGuides();
      // The editor's EdNode stand-in vs. the scene Nodes beginMap takes.
      guides.beginMap(this._editor.getMappingScopes() as never);
      scene = guides.mapPoint(scene, DetailMapMode.DetailOnFilterOn);
      guides.finishMap();
      position = this._view
        .getWorldTransform(this._view.getScene().getActivePage())
        .mapPoint(scene);
      const point = this._constructNewPoint(event, scene);
      this._addPoint(point, true, false, true);
    } else if (this._editPt) {
      this._invalidate();
      position = this._updatePoint(event.client);
      this._invalidate();
    }
    void position;
    if (this._editPt) {
      // The old code read both ends here and did nothing with them.
      const path = this._pathRef as Path;
      path.getAnchorPoints().getFirstChild();
      path.getAnchorPoints().getLastChild();
    } else {
      this._cursor = Cursor.Knife;
      this.updateCursor();
    }
  }

  /**
   * Sets the outgoing handle of the dragged point from `position` (view);
   * back on the point it goes. An Alt drag from an existing point moves
   * that handle by the drag.
   */
  _updateHandles(position: Point): void {
    const editPoint = this._editPt as AnchorPoint;
    const editor = this._pathEditor as ToolPathEditor;
    let rightX: number | null;
    let rightY: number | null;
    const type = editPoint.getProperty("tp");
    const x = editPoint.getProperty("x") as number;
    const y = editPoint.getProperty("y") as number;
    if (
      editor.hitAnchorPoint(
        editPoint,
        position,
        this._view.getWorldTransform(this._view.getScene().getActivePage()),
        0,
      ) &&
      !this._firstAlt
    ) {
      if (null !== editPoint.getProperty("hlx") && null !== editPoint.getProperty("hly")) {
        editPoint.setProperties(["tp", "hrx", "hry"], [Type.Symmetric, null, null]);
      } else editPoint.setProperties(["tp", "hrx", "hry"], [Type.Asymmetric, null, null]);
      this._cursor = Cursor.Knife;
    } else {
      const local = (
        editor
          .getTransformFromNative(
            this._view.getWorldTransform(this._view.getScene().getActivePage()),
          )
          .inverted() as Transform
      ).mapPoint(position);
      if (
        this._newPoint ||
        !Platform.modifiers.optionKey ||
        !this._firstAlt ||
        type == Type.Connector ||
        (null == editPoint.getPrevious() && null == editPoint.getNext())
      ) {
        if (type != Type.Connector) {
          editPoint.setProperty("ah", false);
          const handleX = local.getX();
          const handleY = local.getY();
          editPoint.setProperties(["tp", "hrx", "hry"], [Type.Asymmetric, handleX, handleY]);
          this._cursor = Cursor.PenDrag;
        } else {
          const previous = editPoint.getPrevious() as AnchorPoint | null;
          if (previous) {
            const px = previous.getProperty("x") as number;
            const py = previous.getProperty("y") as number;
            const distance = Math.sqrt(GMath.ptSqrDist(x, y, px, py));
            if (GMath.isEqualEps(distance, 0)) {
              rightX = local.getX();
              rightY = local.getY();
            } else {
              const dirX = (x - px) / distance;
              const dirY = (y - py) / distance;
              const along = GMath.vDotProduct(dirX, dirY, local.getX() - x, local.getY() - y);
              if (along > 0) {
                rightX = x + dirX * along;
                rightY = y + dirY * along;
              } else {
                rightX = null;
                rightY = null;
              }
            }
          } else {
            rightX = local.getX();
            rightY = local.getY();
          }
          editPoint.setProperties(["hlx", "hly", "hrx", "hry"], [null, null, rightX, rightY]);
          this._cursor = Cursor.Knife;
        }
      } else {
        const dx = local.getX() - x;
        const dy = local.getY() - y;
        editPoint.setProperty("ah", false);
        const start = this._dragStartPt as AnchorPoint;
        const startRightX = start.getProperty("hrx") as number | null;
        rightX = null != startRightX ? startRightX + dx : local.getX();
        const startRightY = start.getProperty("hry") as number | null;
        rightY = null != startRightY ? startRightY + dy : local.getY();
        editPoint.setProperty("ah", false);
        editPoint.setProperties(["tp", "hrx", "hry"], [Type.Asymmetric, rightX, rightY]);
        this._cursor = Cursor.Knife;
      }
    }
    this.updateCursor();
    this._invalidate();
  }

  override _mouseDrag(event: MouseEvent): void {
    if (this._refPt && !this._editPt && !this._released) {
      // Not reached: _refPt is only set inside _mouseRelease. The tool has
      // no selectOnePoint, so _makePointMajor would throw, as in the old code.
      this._makePointMajor(this._refPt);
      this._editPt = this._refPt;
      this._dragStartPt = this._refPt;
      if (event.button == MouseEvent.BUTTON_LEFT) this._editPt.setProperty("tp", Type.Symmetric);
      this._invalidate();
    }
    if (!this._released && this._editPt) {
      this._lastMouseEvent = event;
      if (!this._dragStartPt) {
        this._dragStartPt = this._refPt ? this._refPt : this._editPt;
        if (
          event.button == MouseEvent.BUTTON_LEFT &&
          this._editPt.getProperty("tp") != Type.Connector
        ) {
          this._editPt.setProperty("tp", Type.Symmetric);
        }
      }
      this._dragStarted = true;
      this._updatePointProperties(event.client);
    }
  }

  _constructNewPoint(event: MouseEvent, position: Point): AnchorPoint {
    void event;
    const point = new AnchorPoint();
    point.setProperties(["x", "y"], [position.getX(), position.getY()]);
    return point;
  }

  /** The tool is its own path editor once the cut line exists. */
  override _checkPathEditor(): void {
    if (this._knifePath) {
      // The knife implements the members of ToolPathEditor that the path
      // tool calls, but isn't declared as one.
      this._pathEditor = this as unknown as ToolPathEditor;
      this._compoundPathEditor = null;
    }
  }

  /**
   * Adds `point` to the cut line's preview; the first point starts the
   * line (`_knifePath`).
   */
  override _addPoint(
    point: AnchorPoint,
    toPreview: boolean,
    sceneCoords: boolean,
    keepSelection?: boolean,
  ): void {
    void toPreview;
    if (!keepSelection) point.setFlag(NodeFlag.Selected);
    if (this._pathEditor && !sceneCoords) {
      const transform = this._pathRef && this._pathRef.getTransform();
      if (transform) {
        let position = new Point(
          point.getProperty("x") as number,
          point.getProperty("y") as number,
        );
        position = (transform.inverted() as Transform).mapPoint(position);
        point.setProperties(["x", "y"], [position.getX(), position.getY()]);
      }
    }
    if (this._pathEditor) {
      const preview = this._dpathRef as Path;
      this._invalidate();
      if (!keepSelection) {
        (preview.getAnchorPoints().getLastChild() as AnchorPoint).removeFlag(NodeFlag.Selected);
      }
      preview.getAnchorPoints().appendChild(point);
      this._editPt = preview.getAnchorPoints().getLastChild() as AnchorPoint;
      this._newPoint = true;
      this._invalidate();
    } else {
      this._knifePath = new Path();
      this._knifePath.getAnchorPoints().appendChild(point);
      point.setFlag(NodeFlag.Selected);
      this._knifePath.setFlag(NodeFlag.Selected);
      this._checkPathEditor();
      this._checkMode();
      this._renewPreviewLink();
      this._editPt = (this._dpathRef as Path).getAnchorPoints().getLastChild() as AnchorPoint;
      this._invalidate();
    }
  }

  /**
   * Letting Alt go after an Alt press finishes the curve and cuts. The
   * replayed press is dropped within the double-click time; see "Knife
   * right-click polyline cuts at every click" in QUESTIONS.md.
   */
  override _modifiersChanged(event: ModifiersChangedEvent): void {
    super._modifiersChanged(event);
    if (
      this._released &&
      event.changed.optionKey &&
      !Platform.modifiers.optionKey &&
      this._knifePath &&
      this._lastMouseEvent
    ) {
      this._mouseDown(this._lastMouseEvent);
      this._mouseRelease(this._lastMouseEvent);
    }
  }

  /** Ends the press; unless Alt was held at the press, cuts along the line. */
  override _mouseRelease(event: MouseEvent): void {
    if (!this._released) {
      this._released = true;
      if (this._dpathRef) {
        if (this._dragStarted) this._updatePointProperties(event.client);
        if (this._newPoint) this._invalidate();
        this._refPt = this._dpathRef.getAnchorPoints().getLastChild() as AnchorPoint;
        this._dpathRef.getAnchorPoints().getFirstChild();
        this._cursor = Cursor.Knife;
        this.updateCursor();
        if (!this._firstAlt) this._startCutting();
        this._refPt = null;
      }
    }
    this._dragStarted = false;
    this._dragStartPt = null;
    this._lastMouseEvent = event;
    this._firstAlt = false;
    this._reset();
    this._editor.getGuides().invalidate();
    this._allowDeactivation();
  }

  override _reset(): void {
    this._invalidate();
    this._dpathRef = null;
    this._pathRef = null;
    this._pathEditor = null;
    this._newPoint = false;
    this._editPt = null;
    this._dragStartPt = null;
    this._refPt = null;
    this._compoundPathEditor = null;
    if (this._cached) {
      const area = this._getPaintRect();
      this._cached = null;
      if (area) this.invalidateArea(area);
    }
  }

  /** Cuts in one transaction and forgets the line. */
  _startCutting(): void {
    try {
      this._editor.beginTransaction();
      this._performCut();
      this._lastMouseEvent = null;
      (this._pathEditor as ToolPathEditor).releasePathPreview();
      this._pathEditor = null;
      this._knifePath = null;
    } finally {
      try {
        this._editor.commitTransaction(loc("action.cut-shape"));
      } catch {
        // The old code swallowed a failing commit.
      }
    }
  }

  /** As the pen's, without rounded-corner shoulders. */
  _updatePointProperties(position: Point): Point {
    let result = position;
    this._invalidate();
    if (Platform.modifiers.spaceKey) {
      if (this._lastMouseEvent && this._lastMouseEvent.clientDelta && this._editPt) {
        const x = this._editPt.getProperty("x") as number;
        const y = this._editPt.getProperty("y") as number;
        let moved = new Point(
          x + this._lastMouseEvent.clientDelta.getX(),
          y + this._lastMouseEvent.clientDelta.getY(),
        );
        moved = this._updatePoint(moved);
        this._invalidate();
        result = result.add(new Point(moved.getX() - x, moved.getY() - y));
      }
    } else {
      result = this._constrainIfNeeded(
        position,
        this._view.getWorldTransform(this._view.getScene().getActivePage()),
        this._pathRef,
        this._dragStartPt,
      );
      this._updateHandles(result);
    }
    return result;
  }

  /** Visits the anchor points of `path` with their handles (as the path editor paints them). */
  _iteratePoints(path: Path, visitor: (info: KnifePointInfo) => unknown): void {
    const points = path.getAnchorPoints();
    const transform = path.getTransform();
    for (
      let point = points.getFirstChild() as AnchorPoint | null;
      null != point;
      point = point.getNext() as AnchorPoint | null
    ) {
      let handle: Point;
      const previous = points.getPreviousPoint(point);
      const next = points.getNextPoint(point);
      const type = point.getProperty("tp");
      const position = new Point(
        point.getProperty("x") as number,
        point.getProperty("y") as number,
      );
      const info: KnifePointInfo = {
        type,
        anchorPoint: point,
        position,
        annotation: EditorOptions.annotationHandles.path.node.straightType,
        leftHandlePosition: null,
        rightHandlePosition: null,
      };
      if (point.hasFlag(NodeFlag.Selected)) {
        if (type === Type.Connector)
          info.annotation = EditorOptions.annotationHandles.path.node.autoType;
        else if (type === Type.Symmetric || type === Type.Mirror) {
          info.annotation = EditorOptions.annotationHandles.path.node.smoothType;
        }
      }
      if (point.hasFlag(NodeFlag.Selected) || (previous && previous.hasFlag(NodeFlag.Selected))) {
        handle = new Point(point.getProperty("hlx") as number, point.getProperty("hly") as number);
        if (null !== handle.getX() && null !== handle.getY()) info.leftHandlePosition = handle;
      }
      if (point.hasFlag(NodeFlag.Selected) || (next && next.hasFlag(NodeFlag.Selected))) {
        handle = new Point(point.getProperty("hrx") as number, point.getProperty("hry") as number);
        if (null !== handle.getX() && null !== handle.getY()) info.rightHandlePosition = handle;
      }
      if (transform) {
        const mapped = transform.mapPoint(info.position);
        if (info.leftHandlePosition)
          info.leftHandlePosition = transform.mapPoint(info.leftHandlePosition);
        if (info.rightHandlePosition) {
          info.rightHandlePosition = transform.mapPoint(info.rightHandlePosition);
        }
        info.position = mapped;
      }
      if (true === visitor(info)) break;
    }
  }

  /** Paints the cut line with its points and handles in the knife colour. */
  override paint(context: PaintContext): void {
    super.paint(context);
    if (this._elementPreview) {
      const transform = this._view.getWorldTransform(this._view.getScene().getActivePage());
      this._paintOutline(transform, context);
      this._postPaint(transform, context);
    }
  }

  _paintOutline(transform: Transform, context: PaintContext): void {
    const transformed = new VertexTransformer(this._elementPreview as Path, transform);
    const aligned = new VertexPixelAligner(transformed);
    if (aligned) {
      // putVertices is typed for its first caller's source type; any
      // vertex reader works.
      (context.canvas as PaintCanvas).putVertices(aligned as never, false);
      (context.canvas as PaintCanvas).strokeVertices(
        context.knifeOutlineColor,
        EditorOptions.outlineWidth,
      );
    }
  }

  _postPaint(transform: Transform, context: PaintContext): void {
    this._iteratePoints(this._elementPreview as Path, (info) => {
      if (info.leftHandlePosition) {
        this._paintControlHandle(transform, context, info.position, info.leftHandlePosition);
      }
      if (info.rightHandlePosition) {
        this._paintControlHandle(transform, context, info.position, info.rightHandlePosition);
      }
      const node = EditorOptions.annotationHandles.path.node;
      EditorAnnotation.paintAnnotation(
        context,
        transform,
        info.position,
        // _iteratePoints hands over the annotation name as a plain string.
        info.annotation as never,
        info.anchorPoint.hasFlag(NodeFlag.Selected),
        node.size,
        context.knifeOutlineColor,
        RGBColor.WHITE,
      );
    });
  }

  _paintControlHandle(
    transform: Transform | null,
    context: PaintContext,
    position: Point,
    handle: Point,
  ): void {
    let from = position;
    let to = handle;
    if (transform) {
      from = transform.mapPoint(position);
      to = transform.mapPoint(handle);
    }
    (context.canvas as PaintCanvas).strokeLine(
      from.getX(),
      from.getY(),
      to.getX(),
      to.getY(),
      EditorOptions.outlineWidth,
      context.knifeOutlineColor,
    );
    const control = EditorOptions.annotationHandles.path.control;
    EditorAnnotation.paintAnnotation(
      context,
      transform,
      handle,
      control.type,
      false,
      control.size,
      context.knifeOutlineColor,
      context.knifeOutlineColor,
    );
  }

  /** The view area the cut line and its handles cover. */
  _getKnifeBBox(): Rect | null {
    const transform = this._view.getWorldTransform(this._view.getScene().getActivePage());
    if (!this._dpathRef) return null;
    let area = this._dpathRef.getGeometryBBox() as Rect | null;
    if (area && !area.isEmpty()) area = transform.mapRect(area).expanded(1.5, 1.5, 1.5, 1.5);
    const unite = (box: Rect | null): void => {
      if (box && !box.isEmpty()) area = area ? area.united(box) : box;
    };
    this._iteratePoints(this._dpathRef, (info) => {
      if (info.leftHandlePosition) {
        unite(
          EditorAnnotation.getAnnotationBBox(
            transform,
            info.leftHandlePosition,
            EditorOptions.annotationHandles.path.control.size,
            true,
          ),
        );
      }
      if (info.rightHandlePosition) {
        unite(
          EditorAnnotation.getAnnotationBBox(
            transform,
            info.rightHandlePosition,
            EditorOptions.annotationHandles.path.control.size,
            true,
          ),
        );
      }
      unite(
        EditorAnnotation.getAnnotationBBox(
          transform,
          info.position,
          EditorOptions.annotationHandles.path.node.size,
          true,
        ),
      );
    });
    return area;
  }

  /** The cut line's preview; created with a copy of the first point. */
  getPathPreview(): Path {
    if (!this._elementPreview) {
      this._invalidate();
      const first = (this._knifePath as Path).getAnchorPoints().getFirstChild() as AnchorPoint;
      const copy = new AnchorPoint();
      copy.setProperties(["x", "y"], [first.getProperty("x"), first.getProperty("y")]);
      this._elementPreview = new Path();
      this._elementPreview.getAnchorPoints().appendChild(copy);
      first.setFlag(NodeFlag.Selected);
      copy.setFlag(NodeFlag.Selected);
      this._elementPreview.setFlag(NodeFlag.Selected);
      this._invalidate();
    }
    return this._elementPreview;
  }

  /**
   * With Shift: `position` (view) constrained to 45° steps from the line's
   * last fixed point.
   */
  override _constrainIfNeeded(
    position: Point,
    worldToView: Transform,
    path?: Path | null,
    reference?: AnchorPoint | null,
  ): Point {
    void path;
    void reference;
    let result = position;
    if (Platform.modifiers.shiftKey) {
      let anchor: AnchorPoint | null = null;
      if (this._dpathRef) {
        anchor = this._dpathRef.getAnchorPoints().getLastChild() as AnchorPoint | null;
        if (anchor && anchor.getPrevious()) anchor = anchor.getPrevious() as AnchorPoint;
      }
      if (!anchor)
        anchor = (this._knifePath as Path).getAnchorPoints().getLastChild() as AnchorPoint;
      let origin = new Point(anchor.getProperty("x") as number, anchor.getProperty("y") as number);
      const transform = (this._knifePath as Path).getTransform();
      origin = (transform ? transform.multiplied(worldToView) : worldToView).mapPoint(origin);
      result = Editor.convertToConstrain(
        origin.getX(),
        origin.getY(),
        position.getX(),
        position.getY(),
        EditorOptions.cursorConstraint,
      );
    }
    return result;
  }

  hitAnchorPoint(
    point: AnchorPoint | null,
    location: Point,
    transform: Transform | null,
    tolerance: number,
  ): boolean {
    if (point) {
      let matrix = (this._knifePath as Path).getTransform();
      if (transform) matrix = matrix ? matrix.multiplied(transform) : transform;
      return EditorAnnotation.getAnnotationBBox(
        matrix,
        new Point(point.getProperty("x") as number, point.getProperty("y") as number),
        EditorOptions.annotationHandles.path.node.size,
        false,
      )
        .expanded(tolerance, tolerance, tolerance, tolerance)
        .containsPoint(location);
    }
    return false;
  }

  /** As GPathEditor.movePoint, on the cut line. */
  movePoint(
    point: AnchorPoint,
    position: Point,
    transform?: Transform | null,
    source?: AnchorPoint | null,
  ): void {
    const matrix = this.getTransformFromNative(transform);
    const inverse = matrix.inverted() as Transform;
    const local = inverse.mapPoint(position);
    if (point.getProperty("ah")) point.setProperties(["x", "y"], [local.getX(), local.getY()]);
    else {
      const from = source || point;
      let leftX = from.getProperty("hlx") as number | null;
      let leftY = from.getProperty("hly") as number | null;
      let rightX = from.getProperty("hrx") as number | null;
      let rightY = from.getProperty("hry") as number | null;
      if ((null != leftX && null != leftY) || (null != rightX && null != rightY)) {
        let handle: Point;
        const origin = matrix.mapPoint(
          new Point(from.getProperty("x") as number, from.getProperty("y") as number),
        );
        const dx = position.getX() - origin.getX();
        const dy = position.getY() - origin.getY();
        if (null != leftX && null != leftY) {
          leftX = (handle = inverse.mapPoint(
            matrix.mapPoint(new Point(leftX, leftY)).translated(dx, dy),
          )).getX();
          leftY = handle.getY();
        }
        if (null != rightX && null != rightY) {
          rightX = (handle = inverse.mapPoint(
            matrix.mapPoint(new Point(rightX, rightY)).translated(dx, dy),
          )).getX();
          rightY = handle.getY();
        }
      }
      point.setProperties(
        ["x", "y", "hlx", "hly", "hrx", "hry"],
        [local.getX(), local.getY(), leftX, leftY, rightX, rightY],
      );
    }
  }

  getTransformFromNative(transform?: Transform | null): Transform {
    let matrix = (this._knifePath as Path).getTransform();
    if (transform) matrix = matrix ? matrix.multiplied(transform) : transform;
    if (!matrix) matrix = new Transform();
    return matrix;
  }

  releasePathPreview(): void {
    this._elementPreview = null;
    this._sourceIndexToPreviewIndex = null;
  }

  getPath(): Path | null {
    return this._knifePath;
  }

  requestInvalidation(): void {
    const area = this._getKnifeBBox();
    if (area) this.invalidateArea(area);
  }

  /** The old prototype aliased _invalidate to requestInvalidation. */
  _invalidate(): void {
    this.requestInvalidation();
  }

  /**
   * Cuts the selected shapes, or the shapes whose box the line's box
   * touches, along the cut line. True when anything was cut.
   */
  _performCut(): boolean {
    let changed = false;
    const cutter = this._dpathRef as Path;
    const intersector = new PolyIntersector();
    const extraCutterAnchors: AnchorPoint[] = [];
    let elements: Item[];
    if (this._editor.hasSelection()) {
      elements = this._getSelectableElements(this._editor.getSelection() as Node[]);
    } else {
      let box = cutter.getGeometryBBox() as Rect;
      box = box.expanded(1, 1, 1, 1);
      const area = new VertexContainer();
      area.addVertex(Vertex.Command.Move, box.getX(), box.getY());
      area.addVertex(Vertex.Command.Line, box.getX(), box.getY() + box.getHeight());
      area.addVertex(
        Vertex.Command.Line,
        box.getX() + box.getWidth(),
        box.getY() + box.getHeight(),
      );
      area.addVertex(Vertex.Command.Line, box.getX() + box.getWidth(), box.getY());
      area.addVertex(Vertex.Command.Close, 0, 0);
      const hits = this._scene.getCollisions(
        area,
        Element.CollisionFlag.GeometryBBox | Element.CollisionFlag.Partial,
        null,
        this._selectFilter.bind(this),
        (element) => !(element instanceof Shape),
        this._view.getViewConfiguration().multiPageView,
      );
      elements = this._getSelectableElements(hits);
    }
    let parent: ContainerNode | undefined;
    let next: Node | null | undefined;
    const created: Node[] = [];
    const shapes: Element[] = [];
    const knifeCut = new KnifeCut(cutter);
    const owners: Item[] = [];
    for (let v = 0; v < elements.length; v++) {
      const element = elements[v] as Item;
      if (element instanceof Text) {
        const textShapes = element.getTextShapes();
        for (let b = 0; b < textShapes.length; b++) {
          shapes.push(textShapes[b] as Element);
          owners.push(element);
        }
      } else {
        shapes.push(element);
        owners.push(element);
      }
    }
    for (let v = 0; v < shapes.length; v++) {
      const shape = shapes[v] as Element;
      const owner = owners[v] as Item;
      if (owner.getParent()) {
        parent = owner.getParent() as ContainerNode;
        next = owner.getNext();
      }
      if (shape === cutter || shape === this._pathRef) continue;
      let pieces: (Node | null)[][] | null = [[], [], []];
      let groups = this.convertToPath(shape);
      // Element's type lacks the properties mixin every scene element has.
      const evenOdd = (shape as unknown as Propertied).getProperty("evenodd");
      const nonZero = "boolean" == typeof evenOdd && !evenOdd;
      const split: (CutPiece | null)[][] = [];
      let anyCut = false;
      for (let g = 0; g < groups.length; g++) {
        const closedPaths: CutPiece[] = [];
        const openPaths: CutPiece[] = [];
        const group = groups[g] as CutPiece[];
        for (let o = 0; o < group.length; o++) {
          const path = (groups[g] as CutPiece[])[o] as CutPiece;
          if ((path as Path).getProperty("closed")) closedPaths.push(path);
          else openPaths.push(path);
        }
        if (closedPaths.length) split.push(closedPaths);
        if (openPaths.length) split.push(openPaths);
      }
      groups = split as CutPiece[][];
      for (let g = 0; g < groups.length; g++) {
        const sides: (Node | VertexReader | null)[][] = [[], [], []];
        let cutterAnchors: AnchorPoint[] = [];
        let cutAnchors: AnchorPoint[] = [];
        const uncut: CutPiece[] = [];
        let anyClosed = false;
        let fit = false;
        const cutterCopy = cutter.clone() as Path;
        const group = groups[g] as (CutPiece | null)[];
        for (let o = 0; o < group.length; o++) {
          const path = group[o] as Path;
          // intersect types its points for polylines; on two paths they carry
          // the path segment data addIntersectionPoints reads.
          const intersections = intersector.intersect(
            cutterCopy,
            path,
          ) as unknown as PathIntersection[];
          const inserted = Path.addIntersectionPoints(cutterCopy, path, intersections, true);
          anyClosed = anyClosed || !!path.getProperty("closed");
          fit = fit || (this._isPathClosed(path) && intersections.length > 1);
          if (inserted && 0 !== intersections.length) {
            cutAnchors = cutAnchors.concat(inserted[1] as AnchorPoint[]);
            cutterAnchors = cutterAnchors.concat(inserted[0] as AnchorPoint[]);
          } else {
            uncut.push(path);
            group[o] = null;
          }
        }
        fit =
          fit ||
          ((shape instanceof CompoundPath || shape instanceof CompoundShape) &&
            anyClosed &&
            !!shape.hasStyleFill());
        if (extraCutterAnchors.length) cutterAnchors = cutterAnchors.concat(extraCutterAnchors);
        const result = knifeCut.performCut(
          group as (Path | null)[],
          cutAnchors,
          cutterAnchors,
          anyClosed,
          cutterCopy,
          fit,
          nonZero,
        );
        if (result && result !== KnifeCut.UNCHANGED) {
          anyCut = true;
          sides[0] = (sides[0] as unknown[]).concat(result[0]) as VertexReader[];
          sides[1] = (sides[1] as unknown[]).concat(result[1]) as VertexReader[];
          sides[2] = (sides[2] as unknown[]).concat(result[2]) as VertexReader[];
        }
        if (!result) {
          pieces = null;
          break;
        }
        for (let b = 0; b < uncut.length; b++) {
          const piece = uncut[b] as CutPiece;
          (sides[knifeCut.checkSideOfUncut(cutter, piece)] as unknown[]).push(piece);
        }
        for (let side = 0; side < 3; side++) {
          const list = sides[side] as (Node | VertexReader | null)[];
          let compound: CompoundPath | null = null;
          if (group.length > 1 && list.length > 1) compound = new CompoundPath();
          for (let b = 0; b < list.length; b++) {
            let piece = list[b] as Node | VertexReader | null;
            if (piece) {
              if (!(piece instanceof Path)) {
                piece = PathUtil.createPathFromVertexSource(
                  piece as VertexReader,
                  false,
                  false,
                  true,
                ) as Node | null;
              }
              if (compound && piece) compound.getPaths().appendChild(piece as Path);
              else if (piece) {
                // Every piece is a scene element with the properties mixin.
                if (nonZero) (piece as unknown as Propertied).setProperty("evenodd", false);
                (pieces[side] as Node[]).push(piece as Node);
              }
            }
          }
          if (compound) {
            if (nonZero) compound.setProperty("evenodd", false);
            (pieces[side] as Node[]).push(compound);
          }
        }
      }
      if (pieces && anyCut) {
        changed = true;
        const target = parent as ContainerNode;
        if ((owners[v] as Item).getParent()) target.removeChild(owners[v] as Item);
        for (let side = 0; side < pieces.length; side++) {
          const group = new Group();
          const count = (pieces[side] as Node[]).length;
          if (count > 1) {
            target.insertChild(group, next as Node | null);
            created.push(group);
          }
          for (let o = 0; o < count; o++) {
            const piece = (pieces[side] as (Node | null)[])[o] as
              (Node & { assignStyleFrom(other: Node): void }) | null;
            if (piece) {
              const transform = shape.$trf;
              shape.$trf = null;
              piece.assignStyleFrom(shape);
              shape.$trf = transform;
              if (1 == count) {
                target.insertChild(piece, next as Node | null);
                created.push(piece);
              } else group.appendChild(piece);
              if (!(shape instanceof CompoundShape)) {
                for (
                  // A shape is a container at runtime (its children are the
                  // elements it masks); Element's type doesn't say so.
                  let child = (shape as unknown as ContainerNode).getFirstChild();
                  null != child;
                  child = child.getNext()
                ) {
                  (piece as unknown as ContainerNode).appendChild(
                    (child as unknown as Cloneable).clone(),
                  );
                }
              }
            }
          }
        }
      }
    }
    if (created.length) this._editor.updateSelection(false, created);
    return changed;
  }

  _isPathClosed(path: Path): boolean {
    return !!path.getProperty("closed") && !!path.hasStyleFill();
  }

  /**
   * Never called. The old method assigned an undeclared global and read
   * another one (`locationInvTransformed`), which throws; see "Knife
   * elementHitTest" in QUESTIONS.md.
   */
  elementHitTest(location: Point, source: VertexReader): HitResult {
    const result = new HitResult();
    if (VertexInfo.hitTest(location.getX(), location.getY(), source, 2, false, result)) {
      void new ElementData(this, result);
      if (result.outline && 0 != result.slope && 1 != result.slope) {
        const middle = VertexInfo.getSegmentPoint(source, result.segment as number, 0.5);
        if (middle) throw new ReferenceError("locationInvTransformed is not defined");
      }
    }
    return result;
  }

  getTransformedVertices(path: Path): VertexContainer {
    const vertices = new VertexContainer();
    path.getAnchorPoints()._generateVertices(vertices, path.$trf as Transform | null, false);
    return vertices;
  }

  /**
   * The paths to cut for `element`, in groups (one per compound path):
   * paths and compound paths without styled corners as they are (a copy
   * when in the scene), texts as their outlines, other vertex sources as
   * a path built from their vertices.
   */
  convertToPath(element: Node): CutPiece[][] {
    let list: Node[] = [];
    let plain = false;
    if (element instanceof Path || element instanceof CompoundPath) {
      let paths: Path[] = [];
      if (element instanceof CompoundPath) {
        for (
          let child = element.getPaths().getFirstChild() as Path | null;
          null !== child;
          child = child.getNext() as Path | null
        ) {
          paths.push(child);
        }
      } else paths = [element];
      let styledCorner = false;
      for (let s = 0; s < paths.length && !styledCorner; s++) {
        for (
          let point = (paths[s] as Path).getAnchorPoints().getFirstChild() as AnchorPoint | null;
          point;
        ) {
          if (
            PathBase.isCornerType(point.getProperty("tp")) &&
            (0 !== point.getProperty("cl") || 0 !== point.getProperty("cr"))
          ) {
            styledCorner = true;
            break;
          }
          point = point.getNext() as AnchorPoint | null;
        }
      }
      plain = !styledCorner;
    }
    // Node has no clone() in its type; paths and compound paths do. A
    // text's shapes are its glyph outlines, typed as their vertex sources.
    if (plain) list.push(element.getParent() ? (element as unknown as Cloneable).clone() : element);
    else if (element instanceof Text) list = (element.getTextShapes() as unknown as Node[]) || [];
    else if (element.hasMixin(VertexSource)) {
      // hasMixin(VertexSource) doesn't narrow the type.
      const path = PathUtil.createPathFromVertexSource(
        element as unknown as VertexReader,
      ) as Node | null;
      if (path) {
        const styled = element as Element;
        const transform = styled.$trf;
        styled.$trf = null;
        path.assignFrom(element);
        if (element instanceof PathBase) {
          const target = path as Path;
          target.$evenodd = element.getProperty("evenodd") as boolean;
          target.$closed = element.getProperty("closed") as boolean;
        }
        styled.$trf = transform;
        list.push(path);
      }
    }
    const groups: CutPiece[][] = [];
    for (let s = 0; s < list.length; s++) {
      const group: CutPiece[] = [];
      const path = list[s] as Node;
      if (path instanceof CompoundPath) {
        const paths = path.getPaths();
        for (
          let child = paths.getFirstChild() as Path | null;
          null !== child;
          child = child.getNext() as Path | null
        ) {
          group.push(child);
        }
        paths.clearChildren();
      } else group.push(path as Path);
      groups.push(group);
    }
    return groups;
  }

  /** Unlocked elements whose block allows selecting, editing and deleting. */
  _selectFilter(element: Element): boolean {
    return (
      !element.hasFlag(ElementFlag.FullLocked) &&
      !(
        element instanceof Block &&
        ((element.getProperty("plkt") as number) & Block.ProgramLck.NoSelect ||
          (element.getProperty("plkt") as number) & Block.ProgramLck.NoEdit ||
          (element.getProperty("plkt") as number) & Block.ProgramLck.NoDelete ||
          (element.getParent() &&
            // The parent of an element is a scene node with properties.
            ((element.getParent() as unknown as Propertied).getProperty("plkt") as number) &
              Block.ProgramLck.NoEdit))
      )
    );
  }

  /** Items other than groups and images. */
  _getSelectableElement(node: Node): Item | null {
    return !(node instanceof Item) || node instanceof Group || node instanceof Image ? null : node;
  }

  _getSelectableElements(nodes: readonly Node[]): Item[] {
    const result: Item[] = [];
    for (let i = 0; i < nodes.length; ++i) {
      const element = this._getSelectableElement(nodes[i] as Node);
      if (element && result.indexOf(element) < 0) result.push(element);
    }
    return result;
  }

  override toString(): string {
    return "[Object GKnifeTool]";
  }
}
