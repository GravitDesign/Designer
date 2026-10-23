// Old: chunk.vendor.js module 753 (GPathsGraphTool).
/**
 * The paths graph tool: draws lines into a paths graph, pen style. The
 * first press on empty canvas makes a new paths graph with one anchor;
 * every further press adds a point to the outgoing line (a bare GPathBase
 * edited through the graph editor's path base editor), a drag pulls its
 * handles. Pressing on an anchor or an edge of the graph ends the line
 * there (an edge is split for it); Esc ends it open. Each finished line
 * goes into the graph with addGraphLine, which splits it and the edges it
 * crosses.
 *
 * Mode Append means a line is being drawn; in Edit mode a press on an
 * anchor or edge starts a new line from there.
 *
 * The tool is registered in the tool manager but has no toolbar entry.
 */
import { KeyEvent } from "../../engine/core/key-event.ts";
import { Key } from "../../engine/core/key.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { Locale } from "../../engine/core/locale/locale.ts";
import { ModifiersChangedEvent } from "../../engine/core/modifiers-changed-event.ts";
import { MouseEvent } from "../../engine/core/mouse-event.ts";
import { registerClass } from "../../engine/core/object.ts";
import { Platform } from "../../engine/core/platform.ts";
import { Point } from "../../engine/math/point.ts";
import type { Transform } from "../../engine/math/transform.ts";
import { NodeFlag } from "../../engine/scene/node-change.ts";
import type { Node } from "../../engine/scene/node.ts";
import { AnchorPoint, PathBase } from "../../engine/scene/path-base.ts";
import { PathsGraph } from "../../engine/scene/paths-graph/paths-graph.ts";
import { PGAnchor } from "../../engine/scene/paths-graph/pg-anchor.ts";
import { Cursor } from "../cursor.ts";
import { EditorOptions } from "../editor-options.ts";
import { BaseEditor, type PartInfo } from "../element-editors/base-editor.ts";
import { BoxEditor } from "../element-editors/box-editor.ts";
import { ElementEditor } from "../element-editors/element-editor.ts";
import { PathBaseEditor } from "../element-editors/path-base-editor.ts";
import { DetailMapMode } from "../guides/guide.ts";
import { ItemTool } from "../tools/item-tool.ts";
import type { ToolManager } from "../tools/tool-manager.ts";
import type { EditorWidget } from "../view/editor-widget.ts";
import {
  PathsGraphEditor,
  type EditedPathsGraph,
  type GraphPartId,
  type GraphSegmentData,
} from "./paths-graph-editor.ts";

const PartType = PathsGraphEditor.PartType;
const SegmentData = PathsGraphEditor.SegmentData;
const ExtendingMode = PathBaseEditor.ExtendingMode;
const Type = AnchorPoint.Type;

const Transaction = {
  NoTransaction: 0,
  InsertPoint: 1,
  AppendPoint: 2,
  MovePoint: 3,
  DeletePoint: 4,
  ModifyPointProperties: 5,
  ModifyPathProperties: 6,
  InsertElement: 7,
} as const;

const Mode = {
  Append: 0,
  Edit: 1,
} as const;

type TransactionValue = (typeof Transaction)[keyof typeof Transaction];
type ModeValue = (typeof Mode)[keyof typeof Mode];

/** A part hit of the graph editor, typed. */
interface GraphPartInfo extends PartInfo {
  editor: PathsGraphEditor;
  id: GraphPartId;
  data: GraphSegmentData;
}

/** The last part hit, keyed by the (identical) view point object. */
interface PartCache {
  point: Point;
  partInfo: PartInfo | null;
}

const loc = (key: string): string => Locale.get(new LocaleKey("GPathsGraphTool", key)) as string;

function pointOf(point: AnchorPoint): Point {
  return new Point(point.getProperty("x") as number, point.getProperty("y") as number);
}

export class PathsGraphTool extends ItemTool {
  static {
    registerClass(this, "GPathsGraphTool");
  }

  static Transaction = Transaction;
  static Mode = Mode;

  /** Two presses closer than this (ms) are a double click (pathDbClickTime, default 300). */
  static get DBLCLICKTM(): number {
    return EditorOptions.pathDbClickTime || 300;
  }

  _pathsGraphRef: PathsGraph | null = null;
  /** The preview of the outgoing line (the path base editor's preview). */
  _dpathRef: PathBase | null = null;
  /** The outgoing line being drawn. */
  _pathBaseRef: PathBase | null = null;
  _graphRef: EditedPathsGraph | null = null;
  /** The point following the pointer is a preview point, not yet added. */
  _newPoint: boolean | null = null;
  _editPt: AnchorPoint | null = null;
  _refPt: AnchorPoint | null = null;
  _mouseDownPartInfo: GraphPartInfo | null = null;
  _graphEditor: PathsGraphEditor | null = null;
  _released = true;
  _dragStarted = false;
  _dragStartPt: AnchorPoint | null = null;
  _firstAlt = false;
  _transactionType: TransactionValue = Transaction.NoTransaction;
  _mode: ModeValue = Mode.Append;
  _mDownTime = 0;
  _cursor: string | null = null;
  _lastMouseEvent: MouseEvent | null = null;
  _deactivationAllowed = true;
  _cached: PartCache | null = null;

  override _getRelatedItemClass(): typeof PathsGraph {
    return PathsGraph;
  }

  override getCursor(): string {
    return this._cursor as string;
  }

  override catchesContextMenu(fromKeyboard?: unknown): boolean {
    return !fromKeyboard;
  }

  override activate(view: EditorWidget, light?: boolean): void {
    super.activate(view, light);
    if (!light) {
      view.addEventListener(MouseEvent.Down, this._mouseDown, this);
      view.addEventListener(MouseEvent.Release, this._mouseRelease, this);
      view.addEventListener(KeyEvent.Down, this._keyDown, this);
      view.addEventListener(MouseEvent.Drag, this._mouseDrag, this);
      view.addEventListener(MouseEvent.Move, this._mouseMove, this);
      Platform.addEventListener(ModifiersChangedEvent, this._modifiersChanged, this);
    }
    this._cursor = Cursor.PenStart;
    this._transactionType = Transaction.NoTransaction;
    this._editor.setPathResize(false, true);
  }

  override deactivate(view: EditorWidget, light?: boolean): void {
    this._checkMode();
    if (this._graphEditor && (this._newPoint || this._dpathRef)) {
      this._graphEditor.requestInvalidation();
      this._graphEditor.releasePreview();
      this._graphEditor.requestInvalidation();
    }
    this._finishTransaction();
    this._allowDeactivation();
    this._reset();
    if (this._editor) {
      this._editor.getGuides().invalidate();
      if (!light) this._editor.setPathResize(true);
    }
    super.deactivate(view, light);
    view.removeEventListener(MouseEvent.Down, this._mouseDown);
    view.removeEventListener(MouseEvent.Release, this._mouseRelease);
    view.removeEventListener(KeyEvent.Down, this._keyDown);
    view.removeEventListener(MouseEvent.Drag, this._mouseDrag);
    view.removeEventListener(MouseEvent.Move, this._mouseMove);
    Platform.removeEventListener(ModifiersChangedEvent, this._modifiersChanged);
  }

  override isDeactivatable(): boolean {
    return this._deactivationAllowed;
  }

  _allowDeactivation(): void {
    this._deactivationAllowed = true;
  }

  _blockDeactivation(): void {
    this._deactivationAllowed = false;
  }

  /** Opens the editor of the one selected paths graph, in detail mode without the box. */
  _checkPathsGraphEditor(): void {
    const selection = this._editor.getSelection();
    let graph: Node | null = null;
    if (selection && 1 == selection.length && selection[0] instanceof PathsGraph) {
      graph = selection[0] as unknown as Node;
    }
    if (graph) {
      this._graphEditor = ElementEditor.openEditor(graph) as PathsGraphEditor;
      this._graphEditor.setFlag(BaseEditor.Flag.Detail);
      this._graphEditor.removeFlag(BoxEditor.Flag.ResizeAll);
      if (!this._pathBaseRef) this._pathBaseRef = this._graphEditor.getPathBaseInEdit();
    }
  }

  /** Append while the graph editor extends a line, Edit otherwise; Append without a graph. */
  _checkMode(): void {
    this._checkPathsGraphEditor();
    if (this._graphEditor) {
      if (this._graphEditor.getGraph().getWorkspace()) {
        this._graphRef = this._graphEditor.getGraph();
        if (this._graphEditor.getActiveExtendingMode()) this._mode = Mode.Append;
        else this._mode = Mode.Edit;
      } else {
        this._mode = Mode.Append;
        this._graphRef = null;
        this._graphEditor = null;
      }
    } else {
      this._mode = Mode.Append;
      this._graphRef = null;
    }
  }

  /** Points `_dpathRef` at the editor's current line preview; drops a stale edit point. */
  _renewPreviewLink(): void {
    if (this._graphEditor) {
      const preview = this._graphEditor.getPathBasePreview();
      if (this._editPt) {
        let last: Node | null = null;
        if (this._mode == Mode.Append && preview) last = preview.getAnchorPoints().getLastChild();
        if (this._editPt != last) {
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
   * Adds `point` to the line (`add`) or takes the preview point back and
   * appends it to the line for real. `local` says the point is already in
   * graph coordinates; `preview` adds it as the pointer-following point
   * without selecting it. Without a graph, makes one.
   */
  _addPoint(point: AnchorPoint, add: boolean, local: boolean, preview?: boolean): void {
    if (this._graphEditor && !local) {
      const own = (this._graphRef as EditedPathsGraph).getTransform();
      if (own) {
        let position = pointOf(point);
        position = (own.inverted() as Transform).mapPoint(position);
        point.setProperties(["x", "y"], [position.getX(), position.getY()]);
      }
    }
    if (add) {
      if (this._graphEditor) {
        this._graphEditor.requestInvalidation();
        if (this._mode == Mode.Append) {
          if (this._dpathRef) {
            if (!preview) {
              (this._dpathRef.getAnchorPoints().getLastChild() as AnchorPoint).removeFlag(
                NodeFlag.Selected,
              );
            }
            this._dpathRef.getAnchorPoints().appendChild(point);
            if (!preview) point.setFlag(NodeFlag.Selected);
            this._newPoint = true;
          } else {
            const line = new PathBase();
            line.setProperty("fpt", null);
            line.getAnchorPoints().appendChild(point);
            line.setFlag(NodeFlag.Selected);
            this._pathBaseRef = line;
            const anchor = new PGAnchor();
            anchor.setProperties(["x", "y"], [point.getProperty("x"), point.getProperty("y")]);
            if (this._transactionType == Transaction.NoTransaction) {
              this._startTransaction(Transaction.InsertPoint);
            }
            this._graphEditor.getElement().addAnchor(anchor);
            this._finishTransaction();
            this._graphEditor.setOutgoingPathBase(anchor, this._pathBaseRef);
            this._graphEditor.selectOnePoint(point);
            this._checkMode();
            this._renewPreviewLink();
          }
          if (this._dpathRef) {
            this._editPt = this._dpathRef.getAnchorPoints().getLastChild() as AnchorPoint;
            (this._graphEditor as PathsGraphEditor).setActiveExtendingMode(ExtendingMode.End);
          }
          (this._graphEditor as PathsGraphEditor).requestInvalidation();
        }
      } else {
        this._createPathsGraph(point);
        if (!this._graphEditor || !this._pathBaseRef) return;
        const editor = this._graphEditor as PathsGraphEditor;
        editor.selectOnePoint(point);
        this._checkMode();
        this._renewPreviewLink();
        this._editPt = (this._dpathRef as PathBase).getAnchorPoints().getLastChild() as AnchorPoint;
        editor.requestInvalidation();
        editor.setActiveExtendingMode(ExtendingMode.End);
      }
    } else if (this._graphEditor) {
      this._graphEditor.requestInvalidation();
      if (this._mode == Mode.Append) {
        if (this._dpathRef) {
          this._dpathRef.getAnchorPoints().removeChild(point);
          this._dpathRef = null;
          if (point.hasFlag(NodeFlag.Selected)) point.removeFlag(NodeFlag.Selected);
        }
        this._graphEditor.releasePreview();
        this._graphEditor.requestInvalidation();
        (this._pathBaseRef as PathBase).getAnchorPoints().appendChild(point);
        this._graphEditor.selectOnePoint(point);
        this._graphEditor.setActiveExtendingMode(ExtendingMode.End);
        this._graphEditor.requestInvalidation();
      }
    }
  }

  _commitChanges(): void {
    const editor = this._graphEditor as PathsGraphEditor;
    editor.requestInvalidation();
    editor.releasePreview();
    editor.requestInvalidation();
    this._reset();
  }

  /** Makes a paths graph with one anchor at `point` and starts the line there. */
  _createPathsGraph(point: AnchorPoint): void {
    const line = new PathBase();
    line.setProperty("fpt", null);
    line.getAnchorPoints().appendChild(point);
    line.setFlag(NodeFlag.Selected);
    this._pathBaseRef = line;
    this._startTransaction(Transaction.InsertElement);
    const graph = new PathsGraph();
    const anchor = new PGAnchor();
    anchor.setProperties(["x", "y"], [point.getProperty("x"), point.getProperty("y")]);
    graph.addAnchor(anchor);
    this._editor.updateByMousePosition(
      pointOf(point),
      null,
      false,
      this._view.getViewConfiguration() as never,
    );
    this._editor.insertElements([graph], false, true, true);
    graph.setFlag(NodeFlag.Selected);
    point.setFlag(NodeFlag.Selected);
    this._finishTransaction();
    this._checkPathsGraphEditor();
    if (this._graphEditor) this._graphEditor.setOutgoingPathBase(anchor, this._pathBaseRef);
  }

  _mouseDown(event: MouseEvent): void {
    const now = new Date().getTime();
    if (now - this._mDownTime < PathsGraphTool.DBLCLICKTM) {
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
    if (this._graphEditor) this._graphEditor.blockRemoval();
    if (this._mode == Mode.Edit) this._mouseDownOnEdit(event);
    if (this._mode == Mode.Append) {
      this._renewPreviewLink();
      if (this._newPoint && this._graphEditor) {
        const editPoint = this._editPt as AnchorPoint;
        if (this._firstAlt) editPoint.setProperties(["ah", "tp"], [true, Type.Symmetric]);
        const part = this._getPartInfo(event.client) as GraphPartInfo | null;
        if (part) {
          this._mouseDownPartInfo = part;
          if (this._mouseDownPartInfo.id.type == PartType.Anchor) {
            let position = (this._mouseDownPartInfo.id.point as PGAnchor).getPoint();
            const own = (this._graphRef as EditedPathsGraph).getTransform();
            if (own) position = own.mapPoint(position);
            this._graphEditor.movePoint(
              editPoint,
              this._view
                .getWorldTransform(this._view.getScene().getActivePage())
                .mapPoint(position),
              this._view.getWorldTransform(this._view.getScene().getActivePage()),
              null,
            );
          } else this._updatePoint(event.client);
        } else this._updatePoint(event.client);
        const previous = editPoint.getPrevious();
        if (previous) {
          previous.removeFlag(NodeFlag.Selected);
          editPoint.setFlag(NodeFlag.Selected);
        }
        this._graphEditor.requestInvalidation();
      } else if (this._mouseDownPartInfo) {
        this._mouseDownPartInfo = null;
        this._editPt = (this._dpathRef as PathBase).getAnchorPoints().getLastChild() as AnchorPoint;
        this._mode = Mode.Edit;
      } else {
        let position = this._view
          .getViewTransform(this._view.getScene().getActivePage())
          .mapPoint(event.client);
        this._editor.getGuides().beginMap(this._editor.getMappingScopes() as never);
        position = this._editor.getGuides().mapPoint(position, DetailMapMode.DetailOnFilterOn);
        this._editor.getGuides().finishMap();
        const point = this._constructNewPoint(event, position);
        this._addPoint(point, true, false);
      }
    }
  }

  /** A new automatic anchor point at `position` (symmetric with Alt). */
  _constructNewPoint(event: MouseEvent, position: Point): AnchorPoint {
    void event;
    const point = new AnchorPoint();
    point.setProperties(["x", "y", "ah"], [position.getX(), position.getY(), true]);
    if (Platform.modifiers.optionKey) point.setProperties(["ah", "tp"], [true, Type.Symmetric]);
    return point;
  }

  _graphHitAction(): void {}

  /**
   * While no button is down: in Append mode the pointer-following point
   * is added (or moved), else only the cursor follows the snapped
   * position.
   */
  _mouseMove(event: MouseEvent): void {
    if (!(new Date().getTime() - this._mDownTime < PathsGraphTool.DBLCLICKTM) && this._released) {
      this._lastMouseEvent = event;
      this._checkMode();
      const page = (): ReturnType<EditorWidget["getScene"]> => this._view.getScene();
      if (this._mode == Mode.Append) {
        this._renewPreviewLink();
        let position = event.client;
        if (!this._newPoint && this._graphEditor) {
          position = this._constrainIfNeeded(
            event.client,
            this._view.getWorldTransform(page().getActivePage()),
            this._graphRef,
          );
          let scenePosition = this._view
            .getViewTransform(page().getActivePage())
            .mapPoint(position);
          this._editor.getGuides().beginMap(this._editor.getMappingScopes() as never);
          scenePosition = this._editor
            .getGuides()
            .mapPoint(scenePosition, DetailMapMode.DetailOnFilterOn);
          this._editor.getGuides().finishMap();
          position = this._view.getWorldTransform(page().getActivePage()).mapPoint(scenePosition);
          const point = this._constructNewPoint(event, scenePosition);
          this._addPoint(point, true, false, true);
          this._setCursorForPosition(null, position);
        } else if (this._editPt) {
          (this._graphEditor as PathsGraphEditor).requestInvalidation();
          this._updatePoint(event.client);
          (this._graphEditor as PathsGraphEditor).requestInvalidation();
          this._setCursorForPosition(null, event.client);
        } else {
          let scenePosition = this._view
            .getViewTransform(page().getActivePage())
            .mapPoint(position);
          this._editor.getGuides().beginMap(this._editor.getMappingScopes() as never);
          scenePosition = this._editor
            .getGuides()
            .mapPoint(scenePosition, DetailMapMode.DetailOnFilterOn);
          this._editor.getGuides().finishMap();
          position = this._view.getWorldTransform(page().getActivePage()).mapPoint(scenePosition);
          this._setCursorForPosition(null, position);
        }
      } else {
        let scenePosition = this._view
          .getViewTransform(page().getActivePage())
          .mapPoint(event.client);
        this._editor.getGuides().beginMap(this._editor.getMappingScopes() as never);
        scenePosition = this._editor
          .getGuides()
          .mapPoint(scenePosition, DetailMapMode.DetailOnFilterOn);
        this._editor.getGuides().finishMap();
        const position = this._view
          .getWorldTransform(page().getActivePage())
          .mapPoint(scenePosition);
        this._setCursorForPosition(null, position);
      }
    }
  }

  /** Moves the edit point to `position` (view), constrained and snapped; returns where it went. */
  _updatePoint(position: Point): Point | null {
    let target: Point | null = null;
    if (this._pathBaseRef && this._editPt) {
      const page = this._view.getScene().getActivePage();
      target =
        this._mode != Mode.Edit
          ? this._constrainIfNeeded(position, this._view.getWorldTransform(page), this._pathBaseRef)
          : this._constrainIfNeeded(
              position,
              this._view.getWorldTransform(page),
              this._pathBaseRef,
              (this._dpathRef as PathBase)
                .getAnchorPoints()
                .getPreviousPoint(this._editPt) as AnchorPoint | null,
            );
      this._editor.getGuides().beginMap(this._editor.getMappingScopes() as never);
      target = this._view
        .getWorldTransform(page)
        .mapPoint(
          this._editor
            .getGuides()
            .mapPoint(
              this._view.getViewTransform(page).mapPoint(target),
              DetailMapMode.DetailOnFilterOn,
            ),
        );
      this._editor.getGuides().finishMap();
      (this._graphEditor as PathsGraphEditor).movePoint(
        this._editPt,
        target,
        this._view.getWorldTransform(page),
        this._dragStartPt,
      );
    }
    return target;
  }

  /**
   * Sets the edit point's handles from a drag to `position` (view): back
   * on the point it removes them; Alt drags only the right handle;
   * otherwise the handles mirror (only the right one on a line's first
   * point while appending).
   */
  _updateHandles(position: Point): void {
    const editPoint = this._editPt as AnchorPoint;
    const editor = this._graphEditor as PathsGraphEditor;
    const type = editPoint.getProperty("tp");
    const x = editPoint.getProperty("x") as number;
    const y = editPoint.getProperty("y") as number;
    const page = this._view.getScene().getActivePage();
    if (editor.hitAnchorPoint(editPoint, position, this._view.getWorldTransform(page), 0)) {
      if (type == Type.Symmetric) {
        editPoint.setProperties(
          ["tp", "hlx", "hly", "hrx", "hry"],
          [Type.Asymmetric, null, null, null, null],
        );
      } else editPoint.setProperties(["hrx", "hry"], [null, null]);
    } else {
      const local = (
        editor.getTransformFromNative(this._view.getWorldTransform(page)).inverted() as Transform
      ).mapPoint(position);
      if (
        this._newPoint ||
        !Platform.modifiers.optionKey ||
        !this._firstAlt ||
        type == Type.Connector ||
        (null == editPoint.getPrevious() && null == editPoint.getNext())
      ) {
        editPoint.setProperty("ah", false);
        const hx = local.getX();
        const hy = local.getY();
        if (Platform.modifiers.optionKey) {
          editPoint.setProperties(["tp", "hrx", "hry"], [Type.Asymmetric, hx, hy]);
        } else {
          const symmetric = Type.Symmetric;
          const lineEnd =
            (null == editPoint.getPrevious() && null != editPoint.getNext()) ||
            (null != editPoint.getPrevious() && null == editPoint.getNext());
          if (this._mode != Mode.Edit && !this._newPoint && lineEnd) {
            editPoint.setProperties(["tp", "hrx", "hry"], [symmetric, hx, hy]);
          } else {
            const lx = x + x - hx;
            const ly = y + y - hy;
            editPoint.setProperties(
              ["tp", "hrx", "hry", "hlx", "hly"],
              [symmetric, hx, hy, lx, ly],
            );
          }
        }
      } else {
        const dx = local.getX() - x;
        const dy = local.getY() - y;
        editPoint.setProperty("ah", false);
        const startPoint = this._dragStartPt as AnchorPoint;
        const startX = startPoint.getProperty("hrx") as number | null;
        const hx = null != startX ? startX + dx : local.getX();
        const startY = startPoint.getProperty("hry") as number | null;
        const hy = null != startY ? startY + dy : local.getY();
        editPoint.setProperty("ah", false);
        editPoint.setProperties(["tp", "hrx", "hry"], [Type.Asymmetric, hx, hy]);
      }
    }
    editor.requestInvalidation();
  }

  _updatePointProperties(position: Point): Point {
    (this._graphEditor as PathsGraphEditor).requestInvalidation();
    const target = this._constrainIfNeeded(
      position,
      this._view.getWorldTransform(this._view.getScene().getActivePage()),
      this._pathBaseRef,
      this._dragStartPt,
    );
    this._updateHandles(target);
    return target;
  }

  _mouseDrag(event: MouseEvent): void {
    if (!this._released && this._editPt) {
      this._lastMouseEvent = event;
      this._setCursorForPosition(Cursor.PenDrag);
      if (!this._dragStartPt) {
        this._dragStartPt = this._refPt ? this._refPt : this._editPt;
        this._editPt.setProperties(["ah", "tp"], [false, Type.Symmetric]);
        const previous = this._editPt.getPrevious() as AnchorPoint | null;
        if (previous) previous.setProperty("ah", false);
      }
      this._dragStarted = true;
      this._updatePointProperties(event.client);
    }
  }

  _mouseDblClick(event: MouseEvent): void {
    this._lastMouseEvent = null;
    this._checkMode();
    if (this._graphEditor) {
      this._graphEditor.updatePartSelection(false);
      this._commitChanges();
    }
    this._mode = Mode.Edit;
    this._setCursorForPosition(null, event.client);
  }

  /**
   * Ends a press. In Edit mode applies a handle drag; while appending,
   * takes the preview point into the line and, when the press was on an
   * anchor or edge of the graph, ends the line there.
   */
  _mouseRelease(event: MouseEvent): void {
    if (this._graphEditor) this._graphEditor.allowRemoval();
    this._editor.getGuides().invalidate();
    if (!this._released) {
      try {
        this._editor.updateByMousePosition(
          event.client,
          this._view.getWorldTransform(this._scene),
          false,
          this._view.getViewConfiguration() as never,
        );
        this._released = true;
        if (this._graphEditor && this._mode == Mode.Edit) {
          if (this._dragStarted || !this._refPt || this._editPt) {
            if (this._dragStarted) {
              this._updatePointProperties(event.client);
              this._graphEditor.applyTransform(this._pathBaseRef);
              this._commitChanges();
              this._setCursorForPosition(null, event.client);
            } else {
              this._commitChanges();
              this._setCursorForPosition(null, event.client);
            }
          } else this._mouseNoDragReleaseOnEdit(event.client);
        } else if (this._dpathRef) {
          if (this._dragStarted) this._updatePointProperties(event.client);
          if (this._newPoint) {
            const last =
              this._dragStarted &&
              this._pathBaseRef &&
              this._pathBaseRef.getAnchorPoints().getLastChild()
                ? (this._pathBaseRef.getAnchorPoints().getLastChild() as AnchorPoint)
                : null;
            this._addPoint(this._editPt as AnchorPoint, false, true);
            if (last) last.setProperty("ah", false);
            (this._graphEditor as PathsGraphEditor).requestInvalidation();
          }
          let anchor: PGAnchor | null = null;
          if (this._mouseDownPartInfo) {
            this._graphEditor = this._mouseDownPartInfo.editor;
            this._graphRef = this._graphEditor.getGraph();
            if (this._mouseDownPartInfo.id.type == PartType.Anchor) {
              anchor = this._mouseDownPartInfo.id.point as PGAnchor;
            } else {
              this._startTransaction(Transaction.InsertPoint);
              anchor = this._graphEditor.splitEdge(this._mouseDownPartInfo, true);
              this._finishTransaction();
            }
          }
          this._mouseDownPartInfo = null;
          if (anchor) {
            const editor = this._graphEditor as PathsGraphEditor;
            editor.updatePartSelection(false);
            editor.setActiveExtendingMode(ExtendingMode.Off);
            this._startTransaction(Transaction.InsertElement);
            editor.insertOutgoingPathBase(anchor);
            this._finishTransaction();
            this._commitChanges();
            this._setCursorForPosition(null, event.client);
          } else {
            this._commitChanges();
            this._setCursorForPosition(Cursor.Pen);
          }
        }
        this._refPt = null;
      } finally {
        this._finishTransaction();
      }
    }
    this._released = true;
    this._dragStarted = false;
    this._dragStartPt = null;
    this._lastMouseEvent = null;
    this._firstAlt = false;
    this._allowDeactivation();
  }

  _reset(): void {
    if (this._graphEditor) this._graphEditor.removeFlag(BaseEditor.Flag.Detail);
    this._dpathRef = null;
    this._graphRef = null;
    this._graphEditor = null;
    this._newPoint = false;
    this._editPt = null;
    this._dragStartPt = null;
    this._refPt = null;
    this._mouseDownPartInfo = null;
  }

  override _keyDown(event: KeyEvent): void {
    super._keyDown(event);
    if (event.key === Key.Constant.ESC) {
      this._lastMouseEvent = null;
      this._escAction();
    } else if (event.key === Key.Constant.ENTER) {
      this._lastMouseEvent = null;
      this._enterAction();
    }
  }

  /** Shift re-runs the move or drag; Alt flips the preview point between symmetric and asymmetric. */
  _modifiersChanged(event: ModifiersChangedEvent): void {
    if (event.changed.shiftKey && this._lastMouseEvent) {
      if (this._released) this._mouseMove(this._lastMouseEvent);
      else this._mouseDrag(this._lastMouseEvent);
    } else if (event.changed.optionKey) {
      this._firstAlt = false;
      if (this._released) {
        if (this._newPoint) {
          (this._editPt as AnchorPoint).setProperties(
            ["tp"],
            [Platform.modifiers.optionKey ? Type.Symmetric : Type.Asymmetric],
          );
          (this._graphEditor as PathsGraphEditor).requestInvalidation();
        }
      } else {
        if (Platform.modifiers.optionKey) this._firstAlt = !this._dragStarted;
        this._mouseDrag(this._lastMouseEvent as MouseEvent);
      }
    }
  }

  /** Esc ends the line open. */
  _escAction(): void {
    if (this._released) {
      this._checkMode();
      if (this._graphEditor) {
        this._graphEditor.updatePartSelection(false);
        this._graphEditor.setActiveExtendingMode(ExtendingMode.Off);
        this._startTransaction(Transaction.InsertElement);
        this._graphEditor.insertOutgoingPathBase();
        this._finishTransaction();
        this._commitChanges();
      }
      this._setCursorForPosition(Cursor.PenStart);
    }
  }

  /** Enter drops the line and switches to the subselect tool. */
  _enterAction(): void {
    if (this._released) {
      this._checkMode();
      if (this._graphEditor) {
        this._graphEditor.setActiveExtendingMode(ExtendingMode.Off);
        this._commitChanges();
      }
      (this._manager as ToolManager).activateSubSelect();
    }
  }

  /**
   * With Shift, `position` (view) constrained to the cursor angles around
   * `reference`, else around the line's last point (Append) or first.
   */
  _constrainIfNeeded(
    position: Point,
    worldTransform: Transform,
    line: unknown,
    reference?: AnchorPoint | null,
  ): Point {
    let result = position;
    if (Platform.modifiers.shiftKey) {
      let point: Node | null = null;
      if (reference) point = reference;
      else if (line) {
        // The mouse move passes the graph itself, which has no anchor
        // points: Shift there throws (see "Shift while hovering with the
        // paths graph tool" in the BUGS-FIXED candidates).
        const points = (line as PathBase).getAnchorPoints();
        point = this._mode == Mode.Append ? points.getLastChild() : points.getFirstChild();
      }
      if (point) {
        result = (this._graphEditor as PathsGraphEditor).constrainPosition(
          position,
          worldTransform,
          point,
        );
      }
    }
    return result;
  }

  _makePointMajor(point: AnchorPoint): void {
    const editor = this._graphEditor as PathsGraphEditor;
    editor.selectOnePoint(point);
    this._dpathRef = null;
    editor.releasePreview();
    editor.requestInvalidation();
    this._dpathRef = editor.getPathBasePreview(point);
  }

  _startTransaction(type: TransactionValue): void {
    if (this._transactionType == Transaction.NoTransaction) this._editor.beginTransaction();
    this._transactionType = type;
  }

  _finishTransaction(): void {
    try {
      switch (this._transactionType) {
        case Transaction.AppendPoint:
          this._editor.commitTransaction(loc("action.append-point"));
          break;
        case Transaction.InsertElement:
          this._editor.commitTransaction(loc("action.insert-elements"));
          break;
        case Transaction.InsertPoint:
          this._editor.commitTransaction(loc("action.insert-point"));
          break;
        case Transaction.MovePoint:
          this._editor.commitTransaction(loc("action.move-point"));
          break;
        case Transaction.DeletePoint:
          this._editor.commitTransaction(loc("action.delete-point"));
          break;
        case Transaction.ModifyPointProperties:
          this._editor.commitTransaction(loc("action.modify-point-properties"));
          break;
        case Transaction.ModifyPathProperties:
          this._editor.commitTransaction(loc("action.modify-path-properties"));
      }
    } finally {
      this._transactionType = Transaction.NoTransaction;
    }
  }

  _isSegmentMiddle(part: GraphPartInfo): boolean {
    return !!(
      part.data.type == SegmentData.HitRes &&
      (part.data.hitRes as unknown as { outline: unknown }).outline &&
      0.5 === part.data.hitRes.slope
    );
  }

  /**
   * A press in Edit mode: on an anchor or edge (split there) starts a new
   * line from it in Append mode, elsewhere clears the selection.
   */
  _mouseDownOnEdit(event: MouseEvent): void {
    const position = event.client;
    const editor = this._graphEditor as PathsGraphEditor;
    if (editor.getElement().getWorkspace()) {
      editor.requestInvalidation();
      editor.releasePreview();
      editor.requestInvalidation();
      let anchor: PGAnchor | null = null;
      const part = this._getPartInfo(position) as GraphPartInfo | null;
      if (part) {
        this._graphEditor = part.editor;
        this._graphRef = this._graphEditor.getGraph();
        if (part.id.type == PartType.Anchor) anchor = part.id.point as PGAnchor;
        else {
          if (this._transactionType == Transaction.NoTransaction) {
            this._startTransaction(Transaction.InsertPoint);
          }
          anchor = this._graphEditor.splitEdge(part);
          this._finishTransaction();
        }
      }
      if (anchor) {
        const graphEditor = this._graphEditor as PathsGraphEditor;
        const point = this._constructNewPoint(event, anchor.getPoint());
        this._pathBaseRef = new PathBase();
        this._pathBaseRef.setProperty("fpt", null);
        this._pathBaseRef.getAnchorPoints().appendChild(point);
        this._pathBaseRef.setFlag(NodeFlag.Selected);
        graphEditor.setOutgoingPathBase(anchor, this._pathBaseRef);
        graphEditor.setActiveExtendingMode(ExtendingMode.End);
        graphEditor.selectOnePoint(point);
        this._renewPreviewLink();
        this._mode = Mode.Append;
        this._editPt = (this._dpathRef as PathBase).getAnchorPoints().getLastChild() as AnchorPoint;
        this._mouseDownPartInfo = part;
      } else {
        this._setCursorForPosition(Cursor.PenStart);
        (this._graphEditor as PathsGraphEditor).updatePartSelection(false);
        this._pathBaseRef = null;
        this._renewPreviewLink();
        this._mode = Mode.Append;
      }
    }
  }

  /** A click without a drag on the reference point removes its handles. */
  _mouseNoDragReleaseOnEdit(position: Point): void {
    void position;
    if (this._refPt) {
      if (!(
        null == this._refPt.getProperty("hlx") &&
        null == this._refPt.getProperty("hly") &&
        null == this._refPt.getProperty("hrx") &&
        null == this._refPt.getProperty("hry")
      )) {
        if (this._transactionType == Transaction.NoTransaction) {
          this._startTransaction(Transaction.ModifyPointProperties);
        }
        this._refPt.setProperties(
          ["ah", "hlx", "hly", "hrx", "hry"],
          [false, null, null, null, null],
        );
        this._finishTransaction();
        this._makePointMajor(this._refPt);
        this._setCursorForPosition(Cursor.PenMinus);
      }
      this._refPt = null;
      this._commitChanges();
    }
  }

  /** Sets `cursor`, or with null the cursor for what lies under `position` (view). */
  _setCursorForPosition(cursor: string | null, position?: Point | null): void {
    if (null !== cursor) this._cursor = cursor;
    else if (position) {
      if (!this._graphEditor) this._checkPathsGraphEditor();
      if (this._graphEditor) {
        const part = this._getPartInfo(position) as GraphPartInfo | null;
        if (this._mode == Mode.Edit) {
          this._cursor = part
            ? part.id.type == PartType.Anchor
              ? Cursor.PenEnd
              : part.id.type == PartType.Point
                ? Cursor.PenModify
                : Cursor.PenPlus
            : Cursor.PenStart;
        } else {
          this._cursor = part
            ? part.id.type == PartType.Anchor
              ? Cursor.PenEnd
              : part.id.type == PartType.Point
                ? Cursor.PenModify
                : Cursor.PenPlus
            : Cursor.Pen;
        }
      } else this._cursor = Cursor.PenStart;
    }
    this.updateCursor();
  }

  /** The graph editor's part at `position` (view), facets excluded; cached per point object. */
  _getPartInfo(position: Point): PartInfo | null {
    let part: PartInfo | null = null;
    if (this._graphEditor) {
      if (this._cached && this._cached.point == position) part = this._cached.partInfo;
      else {
        part = this._graphEditor.getPartInfoAt(
          position,
          this._view.getWorldTransform(this._view.getScene().getActivePage()),
          null,
          EditorOptions.pickDistance,
        );
        if (part && (part.id as GraphPartId).type == PartType.Facet) part = null;
        this._cached = { point: position, partInfo: part };
      }
    }
    return part;
  }

  override toString(): string {
    return "[Object GPathsGraphTool]";
  }
}
