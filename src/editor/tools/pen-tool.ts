// Old: chunk.vendor.js module 539 (GPenTool).
/**
 * The pen: a click places a corner point, a click-drag pulls symmetric
 * bezier handles out of the point just placed. While the button is up the
 * next point follows the pointer in the path preview (`_newPoint`), so
 * the segment to it shows before the click. Clicking the first point
 * closes the path, clicking an end point of another open path joins it.
 *
 * Modifiers while dragging: Shift constrains to 45° steps, Alt breaks the
 * handle pair (Alt held at the press edits the outgoing handle of the
 * existing point instead), Space moves the anchor point instead of the
 * handle. A right click places a rounded corner, Alt+right click a
 * connector point.
 *
 * All state lives in the tool, so a light switch (holding D, Space for
 * the hand tool) and back carries on with the same path.
 */
import { MouseEvent } from "../../engine/core/mouse-event.ts";
import { registerClass } from "../../engine/core/object.ts";
import { Platform } from "../../engine/core/platform.ts";
import { GMath } from "../../engine/math/math.ts";
import { Point } from "../../engine/math/point.ts";
import type { Transform } from "../../engine/math/transform.ts";
import { NodeFlag } from "../../engine/scene/node-change.ts";
import { AnchorPoint, PathBase } from "../../engine/scene/path-base.ts";
import type { Path } from "../../engine/scene/path.ts";
import type { PaintLayers } from "../../engine/style/paint-layers.ts";
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

export class PenTool extends Panning(PathTool) {
  static {
    registerClass(this, "GPenTool");
  }

  override activate(view: EditorWidget, light?: boolean): void {
    super.activate(view, light);
    if (!light) {
      view.addEventListener(MouseEvent.DragStart, this._mouseDragStart, this);
      view.addEventListener(MouseEvent.DragEnd, this._mouseDragEnd, this);
      view.addEventListener(MouseEvent.Drag, this._mouseDrag, this);
      view.addEventListener(MouseEvent.Move, this._mouseMove, this);
    }
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
    this._lastMouseEvent = event;
    this._dragStarted = false;
    this._dragStartPt = null;
    this._mouseMove(event);
    this._mDownTime = now;
    this._released = false;
    if (Platform.modifiers.optionKey) this._firstAlt = true;
    this._blockDeactivation();
    this._checkMode();
    if (this._mode == Mode.Edit) this._mouseDownOnEdit(event);
    if (EditorOptions.leaveWhenClosePath && this._pathRef && this._pathRef.getProperty("closed")) {
      (this._manager as ToolManager).notifyJobDone(this);
      return;
    }
    if (this._mode != Mode.Edit) {
      this._renewPreviewLink();
      if (this._newPoint && this._pathEditor) {
        // The point that followed the pointer becomes a real one.
        this._updatePoint(event.client);
        const editPoint = this._editPt as AnchorPoint;
        if (this._mode == Mode.Append) {
          const previous = editPoint.getPrevious() as AnchorPoint | null;
          if (previous) {
            previous.removeFlag(NodeFlag.Selected);
            editPoint.setFlag(NodeFlag.Selected);
          }
        } else {
          const next = editPoint.getNext() as AnchorPoint | null;
          if (next) {
            next.removeFlag(NodeFlag.Selected);
            editPoint.setFlag(NodeFlag.Selected);
          }
        }
        this._pathEditor.requestInvalidation();
        if (event.button == MouseEvent.BUTTON_RIGHT) {
          if (Platform.modifiers.optionKey) editPoint.setProperty("tp", Type.Connector);
          else editPoint.setProperties(["tp", "cu"], [PathBase.CornerType.Rounded, true]);
        }
        if (!this._closeOrChangePreviewIfNeeded()) {
          if ((this._dpathRef as Path).getProperty("closed")) {
            const path = this._pathRef as Path;
            this._refPt = (
              this._mode == Mode.Append
                ? path.getAnchorPoints().getFirstChild()
                : path.getAnchorPoints().getLastChild()
            ) as AnchorPoint;
          }
          (this._pathEditor as ToolPathEditor).requestInvalidation();
        }
      } else if (this._pathEditor) {
        const path = this._pathRef as Path;
        this._refPt = (
          this._mode == Mode.Append
            ? path.getAnchorPoints().getLastChild()
            : path.getAnchorPoints().getFirstChild()
        ) as AnchorPoint;
      } else {
        let position = this._view
          .getViewTransform(this._view.getScene().getActivePage())
          .mapPoint(event.client);
        const guides = this._editor.getGuides();
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
    this._editor.updateByMousePosition(
      event.client,
      this._view.getWorldTransform(this._scene),
      false,
      this._view.getViewConfiguration(),
    );
    if (this._pathEditor) this._pathEditor.blockRemoval();
  }

  /**
   * Re-reads the full preview; the edited point is dropped when it is no
   * longer the end being extended.
   */
  override _renewPreviewLink(): void {
    if (this._pathEditor) {
      const preview = this._pathEditor.getPathPreview(true) as Path;
      if (this._editPt) {
        const end =
          this._mode == Mode.Append
            ? preview.getAnchorPoints().getLastChild()
            : preview.getAnchorPoints().getFirstChild();
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
   * After a press that placed the following point: closes the path when
   * it landed on the other end, drops the outgoing handle when it landed
   * back on the end point (a click on the point just dragged), or joins
   * another path whose end it landed on. True when paths were joined.
   */
  _closeOrChangePreviewIfNeeded(): boolean {
    if (
      this._pathRef &&
      this._newPoint &&
      (this._mode == Mode.Append || this._mode == Mode.Prepend)
    ) {
      const preview = this._dpathRef as Path;
      const editor = this._pathEditor as ToolPathEditor;
      let added: AnchorPoint;
      let otherEnd: AnchorPoint | null;
      let ownEnd: AnchorPoint | null;
      if (this._mode == Mode.Append) {
        added = preview.getAnchorPoints().getLastChild() as AnchorPoint;
        ownEnd = this._pathRef.getAnchorPoints().getLastChild() as AnchorPoint | null;
        otherEnd = preview.getAnchorPoints().getFirstChild() as AnchorPoint | null;
      } else {
        added = preview.getAnchorPoints().getFirstChild() as AnchorPoint;
        ownEnd = this._pathRef.getAnchorPoints().getFirstChild() as AnchorPoint | null;
        otherEnd = preview.getAnchorPoints().getLastChild() as AnchorPoint | null;
      }
      let position = new Point(added.getProperty("x") as number, added.getProperty("y") as number);
      const transform = this._pathRef.getTransform();
      position = transform ? transform.mapPoint(position) : position;
      const worldTransform = (): Transform =>
        this._view.getWorldTransform(this._view.getScene().getActivePage());
      if (
        otherEnd &&
        editor.hitAnchorPoint(
          otherEnd,
          worldTransform().mapPoint(position),
          worldTransform(),
          EditorOptions.annotDropDistance,
        )
      ) {
        this._dpathRef = editor.getPathPreview(true);
        const closed = this._dpathRef as Path;
        this._editPt = (
          this._mode == Mode.Append
            ? closed.getAnchorPoints().getFirstChild()
            : closed.getAnchorPoints().getLastChild()
        ) as AnchorPoint;
        this._editPt.getProperty("tp");
        this._editPt.setProperty("ah", false);
        closed.getAnchorPoints().removeChild(added);
        closed.setProperty("closed", true);
        editor.requestInvalidation();
        this._editPt.setFlag(NodeFlag.Selected);
        editor.requestInvalidation();
        this._newPoint = false;
      } else if (
        ownEnd &&
        this._mode == Mode.Append &&
        null !== ownEnd.getProperty("hrx") &&
        null !== ownEnd.getProperty("hry") &&
        editor.hitAnchorPoint(
          ownEnd,
          worldTransform().mapPoint(position),
          worldTransform(),
          EditorOptions.annotDropDistance,
        )
      ) {
        ownEnd.setProperty("ah", false);
        ownEnd.setProperties(["hrx", "hry"], [null, null]);
        this._newPoint = false;
      } else if (
        ownEnd &&
        this._mode == Mode.Prepend &&
        null !== ownEnd.getProperty("hlx") &&
        null !== ownEnd.getProperty("hly") &&
        editor.hitAnchorPoint(
          ownEnd,
          worldTransform().mapPoint(position),
          worldTransform(),
          EditorOptions.annotDropDistance,
        )
      ) {
        ownEnd.setProperty("ah", false);
        ownEnd.setProperties(["hlx", "hly"], [null, null]);
        this._newPoint = false;
      } else {
        const side = this._hitSideConnectPoints(position);
        if (side) {
          this._connectPaths(side);
          return true;
        }
      }
    }
    return false;
  }

  /** Snaps `position` (view) to the guides and maps it back to view pixels. */
  _snapped(position: Point): { scene: Point; view: Point } {
    let scene = this._view
      .getViewTransform(this._view.getScene().getActivePage())
      .mapPoint(position);
    const guides = this._editor.getGuides();
    guides.beginMap(this._editor.getMappingScopes() as never);
    scene = guides.mapPoint(scene, DetailMapMode.DetailOnFilterOn);
    guides.finishMap();
    const view = this._view
      .getWorldTransform(this._view.getScene().getActivePage())
      .mapPoint(scene);
    return { scene, view };
  }

  /**
   * With the button up: auto-pans near the view edge, moves the point
   * that follows the pointer and sets the cursor (end, modify, join or
   * plain pen; in Edit mode the cursor for what is under the pointer).
   * With the right button down it drags. Ignored for DBLCLICKTM after a
   * press.
   */
  override _mouseMove(event: MouseEvent): void {
    if (new Date().getTime() - this._mDownTime < PathTool.DBLCLICKTM) return;
    // _pathRef is only set again by the _checkMode below, so this exits
    // on the second move after closing; see "leaveWhenClosePath waits
    // for the second move" in QUESTIONS.md.
    if (EditorOptions.leaveWhenClosePath && this._pathRef && this._pathRef.getProperty("closed")) {
      (this._manager as ToolManager).notifyJobDone(this);
      return;
    }
    if (!this._released) {
      if (event.button == MouseEvent.BUTTON_RIGHT) this._mouseDrag(event);
      return;
    }
    if (this.isPanning()) {
      this.panView(
        event.client,
        new Point(EditorOptions.autoPanStep, EditorOptions.autoPanStep),
        new Point(40, 40),
      );
    } else this.beginPan();
    this._lastMouseEvent = event;
    this._checkMode();
    if (this._mode == Mode.Edit) {
      this._setCursorForPosition(null, event.client);
      if (Platform.modifiers.shiftKey) this._highlightMiddle(event.client);
      if (this._cursor == Cursor.PenStart) {
        this._setCursorForPosition(null, this._snapped(event.client).view);
      }
      return;
    }
    this._renewPreviewLink();
    let position = event.client;
    if (!this._newPoint && this._pathEditor) {
      position = this._constrainIfNeeded(
        event.client,
        this._view.getWorldTransform(this._view.getScene().getActivePage()),
        this._pathRef,
      );
      const snapped = this._snapped(position);
      position = snapped.view;
      const point = this._constructNewPoint(event, snapped.scene);
      this._addPoint(point, true, false, true);
    } else if (this._editPt) {
      (this._pathEditor as ToolPathEditor).requestInvalidation();
      position = this._updatePoint(event.client);
      (this._pathEditor as ToolPathEditor).requestInvalidation();
    }
    if (this._editPt) {
      const path = this._pathRef as Path;
      const editor = this._pathEditor as ToolPathEditor;
      let start: AnchorPoint | null;
      let end: AnchorPoint | null;
      if (this._mode == Mode.Append) {
        start = path.getAnchorPoints().getFirstChild() as AnchorPoint | null;
        end = path.getAnchorPoints().getLastChild() as AnchorPoint | null;
      } else {
        // The old code took the last point for both; see "Pen prepend
        // cursor checks the last point twice" in QUESTIONS.md.
        start = path.getAnchorPoints().getLastChild() as AnchorPoint | null;
        end = path.getAnchorPoints().getLastChild() as AnchorPoint | null;
      }
      const worldTransform = this._view.getWorldTransform(this._view.getScene().getActivePage());
      if (editor.hitAnchorPoint(start, position, worldTransform, EditorOptions.annotDropDistance)) {
        this._setCursorForPosition(Cursor.PenEnd);
      } else if (
        editor.hitAnchorPoint(
          end,
          position,
          this._view.getWorldTransform(this._view.getScene().getActivePage()),
          EditorOptions.annotDropDistance,
        )
      ) {
        this._setCursorForPosition(Cursor.PenModify);
      } else if (this._hitSideConnectPoints(this._view.getViewTransform().mapPoint(position))) {
        this._setCursorForPosition(Cursor.PenEnd);
      } else this._setCursorForPosition(Cursor.Pen);
    } else {
      this._setCursorForPosition(null, this._snapped(position).view);
    }
  }

  /**
   * Sets the handles of the dragged point from `position` (view). Back on
   * the point the handles go; otherwise both handles mirror (symmetric),
   * or with Alt only the outgoing one moves. A connector point keeps its
   * handle on the line through the previous (or next) point. An Alt drag
   * from an existing point moves its outgoing handle by the drag.
   */
  _updateHandles(position: Point): void {
    const editPoint = this._editPt as AnchorPoint;
    const editor = this._pathEditor as ToolPathEditor;
    const preview = this._dpathRef as Path;
    let leftX: number | null;
    let leftY: number | null;
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
      if (this._mode != Mode.Edit) {
        if (this._mode == Mode.Append) {
          if (null !== editPoint.getProperty("hlx") && null !== editPoint.getProperty("hly")) {
            editPoint.setProperties(["tp", "hrx", "hry"], [Type.Symmetric, null, null]);
          } else editPoint.setProperties(["tp", "hrx", "hry"], [Type.Asymmetric, null, null]);
        } else if (null !== editPoint.getProperty("hrx") && null !== editPoint.getProperty("hry")) {
          editPoint.setProperties(["tp", "hlx", "hly"], [Type.Symmetric, null, null]);
        } else editPoint.setProperties(["tp", "hlx", "hly"], [Type.Asymmetric, null, null]);
      } else if (Platform.modifiers.optionKey) {
        editPoint.setProperties(["tp", "hrx", "hry"], [Type.Asymmetric, null, null]);
      } else {
        editPoint.setProperties(
          ["tp", "hlx", "hly", "hrx", "hry"],
          [Type.Asymmetric, null, null, null, null],
        );
      }
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
          let handleX: number | null = local.getX();
          let handleY: number | null = local.getY();
          if (Platform.modifiers.optionKey) {
            if (this._mode == Mode.Prepend) {
              editPoint.setProperties(["tp", "hlx", "hly"], [Type.Asymmetric, handleX, handleY]);
            } else {
              editPoint.setProperties(["tp", "hrx", "hry"], [Type.Asymmetric, handleX, handleY]);
            }
          } else {
            let pointType: unknown = Type.Symmetric;
            const isEnd =
              (null == editPoint.getPrevious() && null != editPoint.getNext()) ||
              (null != editPoint.getPrevious() && null == editPoint.getNext());
            if (
              this._mode == Mode.Edit ||
              this._newPoint ||
              preview.getProperty("closed") ||
              !isEnd
            ) {
              const mirrorX = x + x - (handleX as number);
              const mirrorY = y + y - (handleY as number);
              if (
                preview.getProperty("closed") &&
                isEnd &&
                this._mode != Mode.Edit &&
                !this._newPoint
              ) {
                // Closing onto an end point without an outgoing handle
                // keeps that side straight.
                const end = (
                  this._mode == Mode.Append
                    ? preview.getAnchorPoints().getLastChild()
                    : preview.getAnchorPoints().getFirstChild()
                ) as AnchorPoint | null;
                if (
                  end &&
                  end !== editPoint &&
                  !end.getProperty("hrx") &&
                  !end.getProperty("hry")
                ) {
                  pointType = Type.Asymmetric;
                  handleX = handleY = null;
                }
              }
              if (this._mode == Mode.Prepend) {
                editPoint.setProperties(
                  ["tp", "hrx", "hry", "hlx", "hly"],
                  [pointType, mirrorX, mirrorY, handleX, handleY],
                );
              } else {
                editPoint.setProperties(
                  ["tp", "hrx", "hry", "hlx", "hly"],
                  [pointType, handleX, handleY, mirrorX, mirrorY],
                );
              }
            } else if (this._mode == Mode.Prepend) {
              editPoint.setProperties(["tp", "hlx", "hly"], [pointType, handleX, handleY]);
            } else editPoint.setProperties(["tp", "hrx", "hry"], [pointType, handleX, handleY]);
          }
        } else if (
          this._mode == Mode.Append ||
          (this._mode == Mode.Edit && Platform.modifiers.optionKey)
        ) {
          leftX = null;
          leftY = null;
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
          editPoint.setProperties(["hlx", "hly", "hrx", "hry"], [leftX, leftY, rightX, rightY]);
        } else if (this._mode == Mode.Prepend) {
          rightX = null;
          rightY = null;
          const next = editPoint.getNext() as AnchorPoint | null;
          if (next) {
            const nx = next.getProperty("x") as number;
            const ny = next.getProperty("y") as number;
            const distance = Math.sqrt(GMath.ptSqrDist(x, y, nx, ny));
            if (GMath.isEqualEps(distance, 0)) {
              leftX = local.getX();
              leftY = local.getY();
            } else {
              const dirX = (x - nx) / distance;
              const dirY = (y - ny) / distance;
              const along = GMath.vDotProduct(dirX, dirY, local.getX() - x, local.getY() - y);
              if (along > 0) {
                leftX = x + dirX * along;
                leftY = y + dirY * along;
              } else {
                leftX = null;
                leftY = null;
              }
            }
          } else {
            leftX = local.getX();
            leftY = local.getY();
          }
          editPoint.setProperties(["hlx", "hly", "hrx", "hry"], [leftX, leftY, rightX, rightY]);
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
      }
    }
    editor.requestInvalidation();
  }

  override _mouseDrag(event: MouseEvent): void {
    if (this.isPanning()) this.panView(event.client, event.clientDelta);
    if (this._refPt && !this._editPt && !this._released) {
      const editor = this._pathEditor as ToolPathEditor;
      this._makePointMajor(this._refPt);
      this._editPt = editor.getPathPointPreview(this._refPt);
      this._dragStartPt = this._refPt;
      if (event.button == MouseEvent.BUTTON_LEFT) {
        (this._editPt as AnchorPoint).setProperty("tp", Type.Symmetric);
      }
      editor.requestInvalidation();
    }
    if (!this._released && this._editPt) {
      this._lastMouseEvent = event;
      this._setCursorForPosition(Cursor.PenDrag);
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

  /**
   * Ends the press: in Edit mode applies the drag (or the click on a
   * point); otherwise closes the path when the preview closed, or makes
   * the placed point real and applies its handles.
   */
  override _mouseRelease(event: MouseEvent): void {
    if (this._pathEditor) this._pathEditor.allowRemoval();
    this._editor.getGuides().invalidate();
    if (!this._released) {
      try {
        this._editor.updateByMousePosition(
          event.client,
          this._view.getWorldTransform(this._scene),
          false,
          this._view.getViewConfiguration(),
        );
        this._released = true;
        if (this._pathEditor && this._mode == Mode.Edit) {
          if (!this._dragStarted && this._refPt && !this._editPt) {
            this._mouseNoDragReleaseOnEdit(event.client);
          } else if (this._dragStarted) {
            this._updatePointProperties(event.client);
            if (this._transactionType == Transaction.NoTransaction) {
              this._startTransaction(Transaction.ModifyPointProperties);
            }
            this._pathEditor.applyTransform(this._pathRef);
            this._commitChanges();
            this._setCursorForPosition(null, event.client);
          } else {
            this._commitChanges();
            this._setCursorForPosition(null, event.client);
          }
        } else if (this._dpathRef) {
          let position = event.client;
          if (this._dragStarted) position = this._updatePointProperties(event.client);
          const editor = this._pathEditor as ToolPathEditor;
          const path = this._pathRef as Path;
          if (this._dpathRef.getProperty("closed")) {
            if (this._refPt) {
              this._startTransaction(Transaction.ModifyPathProperties);
              editor.selectOnePoint(this._refPt);
              editor.applyTransform(this._pathRef);
              editor.requestInvalidation();
              path.setProperties(["closed"], [true]);
              for (const layer of (path.getPaintLayers() as PaintLayers).getFillLayers()) {
                layer.setProperty("_vs", true);
              }
              editor.setActiveExtendingMode(PathBaseEditor.ExtendingMode.Off);
            }
            this._commitChanges();
            this._mode = Mode.Edit;
            this._setCursorForPosition(null, event.client);
          } else {
            if (this._newPoint) {
              this._addPoint(this._editPt as AnchorPoint, false, true);
              editor.requestInvalidation();
            }
            let otherEnd: AnchorPoint | null;
            if (this._mode == Mode.Append) {
              this._refPt = path.getAnchorPoints().getLastChild() as AnchorPoint;
              otherEnd = path.getAnchorPoints().getFirstChild() as AnchorPoint | null;
            } else {
              this._refPt = path.getAnchorPoints().getFirstChild() as AnchorPoint;
              otherEnd = path.getAnchorPoints().getLastChild() as AnchorPoint | null;
            }
            if (!this._newPoint) {
              if (this._transactionType == Transaction.NoTransaction) {
                this._startTransaction(Transaction.ModifyPointProperties);
              }
              editor.selectOnePoint(this._refPt);
              editor.applyTransform(this._pathRef);
            }
            if (
              otherEnd &&
              otherEnd != this._refPt &&
              editor.hitAnchorPoint(
                otherEnd,
                position,
                this._view.getWorldTransform(this._view.getScene().getActivePage()),
                EditorOptions.annotDropDistance,
              )
            ) {
              this._setCursorForPosition(Cursor.PenEnd);
            } else this._setCursorForPosition(Cursor.Pen);
            this._commitChanges();
          }
          this._refPt = null;
        }
      } finally {
        this._finishTransaction();
      }
    }
    this._dragStarted = false;
    this._dragStartPt = null;
    this._lastMouseEvent = null;
    this._firstAlt = false;
    this._allowDeactivation();
  }

  /**
   * For a rounded corner point: dragging sets its outgoing (Append) or
   * incoming (Prepend) shoulder length to the drag distance; back on the
   * point clears it.
   */
  _updateShoulders(position: Point): void {
    if ((this._mode == Mode.Append || this._mode == Mode.Prepend) && this._editPt) {
      const editor = this._pathEditor as ToolPathEditor;
      if (
        editor.hitAnchorPoint(
          this._editPt,
          position,
          this._view.getWorldTransform(this._view.getScene().getActivePage()),
          0,
        )
      ) {
        if (this._mode == Mode.Append) this._editPt.setProperty("cr", null);
        else if (this._mode == Mode.Prepend) this._editPt.setProperty("cl", null);
      } else {
        const transform = editor.getTransformFromNative(
          this._view.getWorldTransform(this._view.getScene().getActivePage()),
        );
        let point = new Point(
          this._editPt.getProperty("x") as number,
          this._editPt.getProperty("y") as number,
        );
        point = transform.mapPoint(point);
        const distance = GMath.ptDist(point.getX(), point.getY(), position.getX(), position.getY());
        if (this._mode == Mode.Append) this._editPt.setProperty("cr", distance);
        else if (this._mode == Mode.Prepend) this._editPt.setProperty("cl", distance);
      }
    }
  }

  /**
   * Applies a drag to `position` (view): shoulders for a rounded corner,
   * with Space moves the point itself, else the handles (Shift
   * constrained). Returns the position used.
   */
  _updatePointProperties(position: Point): Point {
    let result = position;
    (this._pathEditor as ToolPathEditor).requestInvalidation();
    if (this._editPt && this._editPt.getProperty("tp") == PathBase.CornerType.Rounded) {
      this._updateShoulders(position);
    } else if (Platform.modifiers.spaceKey) {
      if (this._lastMouseEvent && this._lastMouseEvent.clientDelta && this._editPt) {
        // The point moves by the pointer delta in view space. The old code
        // added the delta to the point's own coordinates and read that as
        // a view position (BUG-046 Pen: Space during a handle drag throws
        // the anchor off by the scroll).
        const editor = this._pathEditor as ToolPathEditor;
        const from = editor
          .getTransformFromNative(
            this._view.getWorldTransform(this._view.getScene().getActivePage()),
          )
          .mapPoint(
            new Point(
              this._editPt.getProperty("x") as number,
              this._editPt.getProperty("y") as number,
            ),
          );
        const moved = this._updatePoint(from.add(this._lastMouseEvent.clientDelta));
        editor.requestInvalidation();
        result = result.add(new Point(moved.getX() - from.getX(), moved.getY() - from.getY()));
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

  override toString(): string {
    return "[Object GPenTool]";
  }
}
