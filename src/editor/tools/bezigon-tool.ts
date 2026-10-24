// Old: chunk.vendor.js module 761 (GBezigonTool).
/**
 * The bezigon tool: a click places a point with automatic handles (`ah`),
 * so the path runs smoothly through the points without dragging handles;
 * dragging moves the point just placed. Alt+click places a symmetric
 * point, a right click (or Alt+right click) a connector point. Clicking
 * the first point closes the path (Alt makes the closing point a corner),
 * clicking another open path's end joins it. Esc, Enter and double click
 * work as for the pen.
 */
import { MouseEvent } from "../../engine/core/mouse-event.ts";
import { registerClass } from "../../engine/core/object.ts";
import { Platform } from "../../engine/core/platform.ts";
import { Point } from "../../engine/math/point.ts";
import { AnchorPoint } from "../../engine/scene/path-base.ts";
import type { Path } from "../../engine/scene/path.ts";
import { Cursor } from "../cursor.ts";
import { EditorOptions } from "../editor-options.ts";
import { PathBaseEditor } from "../element-editors/path-base-editor.ts";
import { DetailMapMode } from "../guides/guide.ts";
import type { EditorWidget } from "../view/editor-widget.ts";
import { Panning } from "../view/panning.ts";
import { PathTool, type ToolPathEditor } from "./path-tool.ts";
import type { ToolManager } from "./tool-manager.ts";

const Mode = PathTool.Mode;
const Transaction = PathTool.Transaction;
const Type = AnchorPoint.Type;
const ExtendingMode = PathBaseEditor.ExtendingMode;

export class BezigonTool extends Panning(PathTool) {
  static {
    registerClass(this, "GBezigonTool");
  }

  override activate(view: EditorWidget, light?: boolean): void {
    super.activate(view, light);
    if (!light) {
      view.addEventListener(MouseEvent.Drag, this._mouseDrag, this);
      view.addEventListener(MouseEvent.Move, this._mouseMove, this);
      view.addEventListener(MouseEvent.DragStart, this._mouseDragStart, this);
      view.addEventListener(MouseEvent.DragEnd, this._mouseDragEnd, this);
    }
    this._checkMode();
  }

  override deactivate(view: EditorWidget, light?: boolean): void {
    this._checkMode();
    super.deactivate(view, light);
    view.removeEventListener(MouseEvent.Drag, this._mouseDrag);
    view.removeEventListener(MouseEvent.Move, this._mouseMove);
    view.removeEventListener(MouseEvent.DragStart, this._mouseDragStart, this);
    view.removeEventListener(MouseEvent.DragEnd, this._mouseDragEnd, this);
  }

  _mouseDragStart(event: MouseEvent): void {
    void event;
    this.beginPan();
  }

  _mouseDragEnd(event: MouseEvent): void {
    void event;
    this.endPan();
  }

  override _mouseDown(event: MouseEvent): void {
    const now = new Date().getTime();
    if (now - this._mDownTime < PathTool.DBLCLICKTM) {
      if ("edit" == EditorOptions.selectDoubleClickBehavior) {
        (this._manager as ToolManager).notifyJobDone(this);
      } else this._mouseDblClick(event);
      return;
    }
    this._mDownTime = now;
    this._lastMouseEvent = event;
    this._editor.updateByMousePosition(
      event.client,
      this._view.getWorldTransform(this._scene),
      false,
      this._view.getViewConfiguration(),
    );
    this._dragStarted = false;
    this._dragStartPt = null;
    this._newPoint = null;
    this._editPt = null;
    if (!(
      event.button == MouseEvent.BUTTON_LEFT ||
      (event.button == MouseEvent.BUTTON_RIGHT && Platform.modifiers.optionKey)
    )) {
      return;
    }
    this._released = false;
    this._blockDeactivation();
    this._checkMode();
    if (this._mode == Mode.Edit) {
      this._mouseDownOnEdit(event, (point) => {
        if (Platform.modifiers.optionKey && point.getProperty("tp") != Type.Connector) {
          point.setProperty("tp", Type.Symmetric);
        }
      });
    }
    if (this._mode != Mode.Edit) {
      this._renewPreviewLink();
      const position = this._constrainIfNeeded(
        event.client,
        this._view.getWorldTransform(this._view.getScene().getActivePage()),
        this._pathRef,
      );
      let otherEnd: AnchorPoint | null | undefined;
      if (this._pathEditor) {
        const path = this._pathRef as Path;
        otherEnd = (
          this._mode == Mode.Append
            ? path.getAnchorPoints().getFirstChild()
            : path.getAnchorPoints().getLastChild()
        ) as AnchorPoint | null;
      }
      if (
        otherEnd &&
        (this._pathEditor as ToolPathEditor).hitAnchorPoint(
          otherEnd,
          position,
          this._view.getWorldTransform(this._view.getScene().getActivePage()),
          EditorOptions.annotDropDistance,
        )
      ) {
        // On the other end: close the path.
        const editor = this._pathEditor as ToolPathEditor;
        this._setCursorForPosition(Cursor.PenEnd);
        this._startTransaction(Transaction.ModifyPathProperties);
        (this._pathRef as Path).setProperty("closed", true);
        this._makePointMajor(otherEnd);
        editor.setActiveExtendingMode(ExtendingMode.Off);
        this._mode = Mode.Edit;
        this._editPt = editor.getPathPointPreview(otherEnd);
        editor.requestInvalidation();
      } else {
        let scene = this._view
          .getViewTransform(this._view.getScene().getActivePage())
          .mapPoint(position);
        const guides = this._editor.getGuides();
        guides.beginMap(this._editor.getMappingScopes() as never);
        scene = guides.mapPoint(scene, DetailMapMode.DetailOnFilterOn);
        guides.finishMap();
        const side = this._pathEditor ? this._hitSideConnectPoints(scene) : null;
        if (side) this._connectPaths(side);
        else {
          this._setCursorForPosition(Cursor.Pen);
          let ownEnd: AnchorPoint | null | undefined;
          if (this._pathEditor) {
            const path = this._pathRef as Path;
            ownEnd = (
              this._mode == Mode.Append
                ? path.getAnchorPoints().getLastChild()
                : path.getAnchorPoints().getFirstChild()
            ) as AnchorPoint | null;
          }
          if (
            ownEnd &&
            (this._pathEditor as ToolPathEditor).hitAnchorPoint(
              ownEnd,
              position,
              this._view.getWorldTransform(this._view.getScene().getActivePage()),
              EditorOptions.annotDropDistance,
            )
          ) {
            // On the end point itself: drag it.
            const editor = this._pathEditor as ToolPathEditor;
            this._makePointMajor(ownEnd);
            this._editPt = editor.getPathPointPreview(ownEnd);
            editor.requestInvalidation();
          } else {
            const point = this._constructNewPoint(event, scene);
            this._addPoint(point, true, false);
          }
        }
      }
    }
    if (this._pathEditor) this._pathEditor.blockRemoval();
  }

  /** With the button up sets the cursor (end over another path's end); Alt+right drag drags. */
  override _mouseMove(event: MouseEvent): void {
    if (this._released) {
      this._lastMouseEvent = event;
      let update = true;
      if (this._mode == Mode.Edit && Platform.modifiers.shiftKey) {
        this._setCursorForPosition(null, event.client);
        if (this._cursor == Cursor.PenPlusMiddle) update = false;
        this._highlightMiddle(event.client);
      }
      if (update) {
        let scene = this._view
          .getViewTransform(this._view.getScene().getActivePage())
          .mapPoint(event.client);
        const guides = this._editor.getGuides();
        guides.beginMap(this._editor.getMappingScopes() as never);
        scene = guides.mapPoint(scene, DetailMapMode.DetailOnFilterOn);
        guides.finishMap();
        if (
          this._pathEditor &&
          this._pathEditor.getActiveExtendingMode() &&
          (this._mode == Mode.Append || this._mode == Mode.Prepend) &&
          this._hitSideConnectPoints(scene)
        ) {
          this._setCursorForPosition(Cursor.PenEnd);
        } else {
          const view = this._view
            .getWorldTransform(this._view.getScene().getActivePage())
            .mapPoint(scene);
          this._setCursorForPosition(null, view);
        }
      }
    } else if (event.button == MouseEvent.BUTTON_RIGHT && Platform.modifiers.optionKey) {
      this._mouseDrag(event);
    }
  }

  /** Moves the pressed point with the pointer. */
  override _mouseDrag(event: MouseEvent): void {
    if (this.isPanning()) this.panView(event.client, event.clientDelta);
    if (this._refPt && !this._released) {
      const editor = this._pathEditor as ToolPathEditor;
      this._makePointMajor(this._refPt);
      this._editPt = editor.getPathPointPreview(this._refPt);
      this._dragStartPt = this._refPt;
      editor.requestInvalidation();
      this._refPt = null;
    }
    if (this._editPt && !this._released) {
      const editor = this._pathEditor as ToolPathEditor;
      this._lastMouseEvent = event;
      this._dragStarted = true;
      editor.requestInvalidation();
      let otherEnd: AnchorPoint | null | undefined;
      const position = this._updatePoint(event.client);
      const path = this._pathRef as Path;
      const preview = this._dpathRef as Path;
      if (
        this._newPoint ||
        path.getAnchorPoints().getFirstChild() != path.getAnchorPoints().getLastChild()
      ) {
        if (this._editPt == preview.getAnchorPoints().getLastChild()) {
          otherEnd = path.getAnchorPoints().getFirstChild() as AnchorPoint | null;
        } else if (this._editPt == preview.getAnchorPoints().getFirstChild()) {
          otherEnd = path.getAnchorPoints().getLastChild() as AnchorPoint | null;
        }
        if (
          otherEnd &&
          editor.hitAnchorPoint(
            otherEnd,
            position,
            this._view.getWorldTransform(this._view.getScene().getActivePage()),
            EditorOptions.annotDropDistance,
          )
        ) {
          this._setCursorForPosition(Cursor.PenEnd);
        } else this._setCursorForPosition(Cursor.Pen);
      } else this._setCursorForPosition(Cursor.Pen);
      editor.requestInvalidation();
    }
  }

  /**
   * An auto-handle point; Alt+left click makes it symmetric, a right
   * click a connector.
   */
  _constructNewPoint(event: MouseEvent, position: Point): AnchorPoint {
    const point = new AnchorPoint();
    point.setProperties(["x", "y", "ah"], [position.getX(), position.getY(), true]);
    if (event.button == MouseEvent.BUTTON_LEFT) {
      if (Platform.modifiers.optionKey) point.setProperty("tp", Type.Symmetric);
    } else point.setProperty("tp", Type.Connector);
    return point;
  }

  /**
   * Closes the path when the point being placed or dragged ended on the
   * other end: the end point takes the dropped point's left handle (unless
   * automatic) and the dropped point goes.
   */
  _closeIfNeeded(): void {
    if (
      this._pathRef &&
      (this._newPoint ||
        this._pathRef.getAnchorPoints().getFirstChild() !=
          this._pathRef.getAnchorPoints().getLastChild()) &&
      (this._mode == Mode.Append || this._mode == Mode.Prepend)
    ) {
      const path = this._pathRef;
      const preview = this._dpathRef as Path;
      const editor = this._pathEditor as ToolPathEditor;
      let dropped: AnchorPoint;
      let otherEnd: AnchorPoint | null;
      if (this._mode == Mode.Append) {
        dropped = preview.getAnchorPoints().getLastChild() as AnchorPoint;
        otherEnd = path.getAnchorPoints().getFirstChild() as AnchorPoint | null;
      } else {
        dropped = preview.getAnchorPoints().getFirstChild() as AnchorPoint;
        otherEnd = path.getAnchorPoints().getLastChild() as AnchorPoint | null;
      }
      let position = new Point(
        dropped.getProperty("x") as number,
        dropped.getProperty("y") as number,
      );
      const transform = path.getTransform();
      position = transform ? transform.mapPoint(position) : position;
      if (
        otherEnd &&
        editor.hitAnchorPoint(
          otherEnd,
          this._view.getWorldTransform(this._view.getScene().getActivePage()).mapPoint(position),
          this._view.getWorldTransform(this._view.getScene().getActivePage()),
          EditorOptions.annotDropDistance,
        )
      ) {
        if (this._transactionType == Transaction.NoTransaction) {
          this._startTransaction(Transaction.ModifyPathProperties);
        } else this._transactionType = Transaction.ModifyPathProperties;
        path.beginUpdate();
        editor.selectOnePoint(otherEnd);
        if (Platform.modifiers.optionKey) {
          otherEnd.setProperties(["ah", "tp"], [false, Type.Asymmetric]);
        }
        if (!otherEnd.getProperty("ah")) {
          otherEnd.setProperties(
            ["hlx", "hly"],
            [dropped.getProperty("hlx"), dropped.getProperty("hly")],
          );
        }
        preview.getAnchorPoints().removeChild(dropped);
        if (!this._newPoint) {
          dropped = (
            this._mode == Mode.Append
              ? path.getAnchorPoints().getLastChild()
              : path.getAnchorPoints().getFirstChild()
          ) as AnchorPoint;
          path.getAnchorPoints().removeChild(dropped);
        }
        preview.setProperty("closed", true);
        path.setProperty("closed", true);
        path.endUpdate();
        editor.requestInvalidation();
        editor.setActiveExtendingMode(ExtendingMode.Off);
        this._newPoint = false;
      }
    }
  }

  override _mouseRelease(event: MouseEvent): void {
    if (this._pathEditor) this._pathEditor.allowRemoval();
    this._editor.getGuides().invalidate();
    if (!this._released) {
      try {
        this._released = true;
        if (this._mode == Mode.Append || this._mode == Mode.Prepend) {
          this._updatePoint(event.client);
          this._closeIfNeeded();
          if (this._pathRef && this._pathRef.getProperty("closed")) {
            this._setCursorForPosition(Cursor.PenMinus);
            this._mode = Mode.Edit;
          } else if (this._newPoint) {
            this._addPoint(this._editPt as AnchorPoint, false, true);
            this._setCursorForPosition(Cursor.Pen);
          } else if (this._editPt && this._pathRef) {
            const editor = this._pathEditor as ToolPathEditor;
            if (this._transactionType == Transaction.NoTransaction) {
              this._startTransaction(Transaction.MovePoint);
            }
            editor.applyTransform(this._pathRef);
            this._setCursorForPosition(Cursor.PenEnd);
            editor.setActiveExtendingMode(
              this._mode == Mode.Prepend ? ExtendingMode.Beginning : ExtendingMode.End,
            );
          }
          this._commitChanges();
        } else if (this._mode == Mode.Edit && (this._editPt || this._refPt)) {
          if (this._dragStarted && this._editPt && this._pathRef) {
            const position = this._updatePoint(event.client);
            if (this._transactionType == Transaction.NoTransaction) {
              this._startTransaction(Transaction.MovePoint);
            }
            (this._pathEditor as ToolPathEditor).applyTransform(this._pathRef);
            this._setCursorForPosition(null, position);
            this._commitChanges();
          } else if (this._editPt) this._commitChanges();
          else this._mouseNoDragReleaseOnEdit(event.client);
        }
        this._dragStarted = false;
        this._dragStartPt = null;
      } finally {
        this._finishTransaction();
      }
    }
    this._lastMouseEvent = null;
    this._allowDeactivation();
  }

  override toString(): string {
    return "[Object GBezigonTool]";
  }
}
