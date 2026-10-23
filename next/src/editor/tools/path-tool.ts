// Old: chunk.vendor.js module 541 (GPathTool).
/**
 * The base of the pen, bezigon and knife tools: a path being drawn or
 * edited through its GPathEditor. The tool works on the editor's path
 * preview (`_dpathRef`) and copies it back to the path (`_pathRef`) when
 * a gesture ends.
 *
 * Mode says what a press does: Append and Prepend add points after the
 * last or before the first anchor point (new paths always append), Edit
 * edits an existing path (delete, insert, modify points). The tool keeps
 * at most one transaction open (`_transactionType`) and names the undo
 * step after it.
 *
 * The subclasses add the mouse move, drag and release handling; this
 * class has press/release bookkeeping, Esc/Enter, Shift constraining,
 * the cursor rules over a path, the Shift segment-middle marker and
 * joining with the end point of another open path.
 */
import type { Event } from "../../engine/core/event.ts";
import { KeyEvent } from "../../engine/core/key-event.ts";
import { Key } from "../../engine/core/key.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { Locale } from "../../engine/core/locale/locale.ts";
import { MouseEvent } from "../../engine/core/mouse-event.ts";
import { ModifiersChangedEvent } from "../../engine/core/modifiers-changed-event.ts";
import { registerClass } from "../../engine/core/object.ts";
import { Platform } from "../../engine/core/platform.ts";
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { GMath } from "../../engine/math/math.ts";
import { Point } from "../../engine/math/point.ts";
import type { Rect } from "../../engine/math/rect.ts";
import type { Transform } from "../../engine/math/transform.ts";
import { ElementFlag } from "../../engine/scene/element-change.ts";
import { NodeFlag } from "../../engine/scene/node-change.ts";
import type { Node } from "../../engine/scene/node.ts";
import { AnchorPoint } from "../../engine/scene/path-base.ts";
import { Path, type PathHit } from "../../engine/scene/path.ts";
import type { PaintContext } from "../../engine/paint/paint-context.ts";
import { Cursor } from "../cursor.ts";
import { Editor } from "../editor.ts";
import { EditorOptions } from "../editor-options.ts";
import { DetailMapMode } from "../guides/guide.ts";
import { EditorAnnotation } from "../handles/editor-annotation.ts";
import { BaseEditor, type PartInfo } from "../element-editors/base-editor.ts";
import { CompoundPathEditor } from "../element-editors/compound-path-editor.ts";
import { ElementEditor } from "../element-editors/element-editor.ts";
import { PathBaseEditor } from "../element-editors/path-base-editor.ts";
import {
  PathEditor,
  type PathPartId,
  type SegmentPartData,
} from "../element-editors/path-editor.ts";
import type { EditorWidget } from "../view/editor-widget.ts";
import { ItemTool } from "./item-tool.ts";
import type { ToolManager } from "./tool-manager.ts";

const ExtendingMode = PathBaseEditor.ExtendingMode;
const PointsSelectionType = PathEditor.PointsSelectionType;
const PartType = PathEditor.PartType;
const SegmentData = PathEditor.SegmentData;

/**
 * What the tool calls on its path editor. Usually a GPathEditor (or
 * GCompoundPathEditor); the knife tool is its own path editor.
 */
export interface ToolPathEditor {
  requestInvalidation(args?: unknown): void;
  releasePathPreview(): void;
  getPathPreview(full?: unknown, point?: AnchorPoint | null): Path | null;
  getPathPointPreview(point: AnchorPoint | null | undefined): AnchorPoint | null;
  movePoint(
    point: AnchorPoint,
    position: Point,
    transform?: Transform | null,
    source?: AnchorPoint | null,
  ): void;
  hitAnchorPoint(
    point: AnchorPoint | null,
    location: Point,
    transform: Transform | null,
    tolerance: number,
  ): boolean;
  constrainPosition(position: Point, worldToView: Transform, point: AnchorPoint): Point;
  getTransformFromNative(transform?: Transform | null): Transform;
  getPath(): Path;
  getElement(): Node;
  selectOnePoint(point: AnchorPoint): void;
  setActiveExtendingMode(mode: unknown): void;
  getActiveExtendingMode(): unknown;
  getPointsSelectionType(): string;
  shiftPreviewTable(delta: number, start?: number | null, end?: number | null): void;
  blockRemoval(): void;
  allowRemoval(): void;
  applyTransform(target: unknown, ...rest: unknown[]): void;
  updatePartSelection(toggle: unknown, partIds?: readonly unknown[] | null): void;
  getPartInfoAt(
    location: Point,
    transform: Transform,
    filter?: ((editor: BaseEditor) => unknown) | null,
    tolerance?: number | null,
  ): PartInfo | null;
  setFlag(flag: number, noInvalidation?: unknown): void;
  removeFlag(flag: number, noInvalidation?: unknown): void;
}

/** A node with children (GNode.Container). */
interface ContainerNode {
  removeChild(child: Node): void;
}

/** A path part hit: its id and data typed. */
interface PathPartInfo extends PartInfo {
  editor: PathEditor;
  id: PathPartId;
  data: SegmentPartData;
}

/** The last part hit and the Shift segment-middle marker (red dot). */
interface PartCache {
  point: Point;
  partInfo: PartInfo | null;
  segmentNo: number | null;
  middlePoint: Point | null;
}

/** An end point of another open path the pen can join with. */
export interface SideConnectPoint {
  node: Path;
  pt: Point;
  /** 1: the first anchor point, 2: the last. */
  end: number;
}

const Transaction = {
  NoTransaction: 0,
  InsertPoint: 1,
  AppendPoint: 2,
  MovePoint: 3,
  DeletePoint: 4,
  ModifyPointProperties: 5,
  ModifyPathProperties: 6,
  InsertElement: 7,
  JoinPaths: 8,
} as const;

const Mode = {
  Append: 0,
  Prepend: 1,
  Edit: 2,
} as const;

type ModeValue = (typeof Mode)[keyof typeof Mode];
type TransactionValue = (typeof Transaction)[keyof typeof Transaction];

const loc = (key: string): string => Locale.get(new LocaleKey("GPathTool", key)) as string;

function pointOf(point: AnchorPoint): Point {
  return new Point(point.getProperty("x") as number, point.getProperty("y") as number);
}

function hasHandle(point: AnchorPoint): boolean {
  return (
    (null !== point.getProperty("hlx") && null !== point.getProperty("hly")) ||
    (null !== point.getProperty("hrx") && null !== point.getProperty("hry"))
  );
}

export class PathTool extends ItemTool {
  static {
    registerClass(this, "GPathTool");
  }

  static Transaction = Transaction;
  static Mode = Mode;

  /** Two presses closer than this (ms) are a double click (pathDbClickTime, default 300). */
  static get DBLCLICKTM(): number {
    return EditorOptions.pathDbClickTime || 300;
  }

  _pathRef: Path | null = null;
  _dpathRef: Path | null = null;
  _newPoint: boolean | null = null;
  _editPt: AnchorPoint | null = null;
  _refPt: AnchorPoint | null = null;
  _pathEditor: ToolPathEditor | null = null;
  _compoundPathEditor: CompoundPathEditor | null = null;
  _released = true;
  _dragStarted = false;
  /** The point whose handles a drag starts from (the pressed point). */
  _dragStartPt: AnchorPoint | null = null;
  /** Alt was down at the press (pen: edit the handle; knife: curved cut). */
  _firstAlt = false;
  _transactionType: TransactionValue = Transaction.NoTransaction;
  _mode: ModeValue = Mode.Append;
  _mDownTime = 0;
  _cursor: string | null = null;
  _lastMouseEvent: MouseEvent | null = null;
  _deactivationAllowed = true;
  _cached: PartCache | null = null;
  _sideConnectPoints: SideConnectPoint[] | null = null;
  /** The last deactivation was a light one (D, Space) whose path resize state is kept. */
  _lightDeactivationHandled = false;

  override _getRelatedItemClass(): typeof Path {
    return Path;
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
      Platform.addEventListener(ModifiersChangedEvent, this._modifiersChanged, this);
      this._editor.addEventListener(
        Editor.MODIFIED_EVENT as unknown as typeof Event,
        this._sceneModified,
        this,
      );
    }
    this._cursor = Cursor.PenStart;
    this._transactionType = Transaction.NoTransaction;
    this._editor.setPathResize(false, true);
    this._initialSelectCorrection();
    this._findSideConnectPoints();
    this._lightDeactivationHandled = false;
  }

  override deactivate(view: EditorWidget, light?: boolean): void {
    if (this._pathEditor && this._pathEditor instanceof PathEditor && !light) {
      this._pathEditor.setActiveExtendingMode(ExtendingMode.Off);
    }
    if (this._pathEditor && (this._newPoint || this._dpathRef)) {
      this._pathEditor.requestInvalidation();
      this._pathEditor.releasePathPreview();
      this._pathEditor.requestInvalidation();
    }
    this._finishTransaction();
    this._allowDeactivation();
    this._reset();
    if (this._editor) {
      this._editor.getGuides().invalidate();
      this._editor.removeEventListener(Editor.MODIFIED_EVENT as never, this._sceneModified);
      if (!light && !this._lightDeactivationHandled) this._editor.setPathResize(true);
    }
    super.deactivate(view, light);
    view.removeEventListener(MouseEvent.Down, this._mouseDown);
    view.removeEventListener(MouseEvent.Release, this._mouseRelease);
    view.removeEventListener(KeyEvent.Down, this._keyDown);
    Platform.removeEventListener(ModifiersChangedEvent, this._modifiersChanged);
    this._lightDeactivationHandled = !!light;
  }

  override isDeactivatable(): boolean {
    return this._deactivationAllowed;
  }

  /** Paints the Shift segment-middle marker. */
  override paint(context: PaintContext): void {
    if (this._cached && this._cached.middlePoint) {
      const handle = EditorOptions.annotationHandles.path.center;
      EditorAnnotation.paintAnnotation(
        context,
        this._view.getWorldTransform(this._view.getScene().getActivePage()),
        this._cached.middlePoint,
        handle.type,
        false,
        handle.size,
        RGBColor.WHITE,
        context.annotationColor,
      );
    }
  }

  _allowDeactivation(): void {
    this._deactivationAllowed = true;
  }

  _blockDeactivation(): void {
    this._deactivationAllowed = false;
  }

  /** Opens the editor of the selected path (or compound path) in detail mode. */
  _checkPathEditor(): void {
    const path = this._editor.getPathSelection();
    if (path) {
      this._pathEditor = ElementEditor.openEditor(
        path as unknown as Node,
      ) as unknown as ToolPathEditor;
      this._pathEditor.setFlag(BaseEditor.Flag.Detail);
      this._compoundPathEditor =
        this._pathEditor instanceof CompoundPathEditor ? this._pathEditor : null;
    }
  }

  /**
   * Picks the mode from the selection: Edit for compound paths, closed
   * paths and paths with no, several or a middle point selected; Append
   * or Prepend when the last or first point is selected; Append (new
   * path) without a path selection.
   */
  _checkMode(): void {
    this._checkPathEditor();
    if (this._pathEditor) {
      if (this._compoundPathEditor) {
        this._mode = Mode.Edit;
        if (!this._compoundPathEditor.getElement().getWorkspace()) {
          this._pathRef = null;
          this._compoundPathEditor = null;
          this._pathEditor = null;
        }
      } else if (this._pathEditor.getPath().getWorkspace()) {
        this._pathRef = this._pathEditor.getPath();
        if (this._pathRef.getProperty("closed")) this._mode = Mode.Edit;
        else {
          const type = this._pathEditor.getPointsSelectionType();
          if (
            type == PointsSelectionType.No ||
            type == PointsSelectionType.Several ||
            type == PointsSelectionType.Middle
          ) {
            this._mode = Mode.Edit;
          } else if (type == PointsSelectionType.Last) this._mode = Mode.Append;
          else if (type == PointsSelectionType.First) this._mode = Mode.Prepend;
        }
      } else {
        this._mode = Mode.Append;
        this._pathRef = null;
        this._compoundPathEditor = null;
        this._pathEditor = null;
      }
    } else {
      this._mode = Mode.Append;
      this._pathRef = null;
    }
  }

  /**
   * On activation: a closed path stops extending; an open path that was
   * being extended gets its extended end point selected.
   */
  _initialSelectCorrection(): void {
    this._checkPathEditor();
    if (this._pathEditor && this._pathEditor instanceof PathEditor) {
      const path: Path = this._pathEditor.getPath();
      this._pathRef = path;
      if (path.getProperty("closed")) {
        this._pathEditor.setActiveExtendingMode(ExtendingMode.Off);
      } else if (this._pathEditor.getActiveExtendingMode()) {
        const type = this._pathEditor.getPointsSelectionType();
        if (type != PointsSelectionType.Last && type != PointsSelectionType.First) {
          this._pathEditor.selectOnePoint(
            (this._pathEditor.getActiveExtendingMode() == ExtendingMode.Beginning
              ? path.getAnchorPoints().getFirstChild()
              : path.getAnchorPoints().getLastChild()) as AnchorPoint,
          );
        }
        this._cursor = Cursor.Pen;
      }
    }
  }

  _renewPreviewLink(): void {
    this._dpathRef = this._pathEditor ? this._pathEditor.getPathPreview() : null;
  }

  /**
   * Moves the edited preview point to `position` (view), constrained
   * with Shift and snapped to the guides. Returns the view position used.
   */
  _updatePoint(position: Point): Point {
    let result: Point = null as unknown as Point;
    if (this._pathRef && this._editPt) {
      const worldTransform = this._view.getWorldTransform(this._view.getScene().getActivePage());
      result =
        this._mode != Mode.Edit
          ? this._constrainIfNeeded(position, worldTransform, this._pathRef)
          : this._constrainIfNeeded(
              position,
              worldTransform,
              this._pathRef,
              (this._dpathRef as Path).getAnchorPoints().getPreviousPoint(this._editPt),
            );
      const guides = this._editor.getGuides();
      guides.beginMap(this._editor.getMappingScopes() as never);
      result = this._view
        .getWorldTransform(this._view.getScene().getActivePage())
        .mapPoint(
          guides.mapPoint(
            this._view.getViewTransform(this._view.getScene().getActivePage()).mapPoint(result),
            DetailMapMode.DetailOnFilterOn,
          ),
        );
      guides.finishMap();
      (this._pathEditor as ToolPathEditor).movePoint(
        this._editPt,
        result,
        this._view.getWorldTransform(this._view.getScene().getActivePage()),
        this._dragStartPt,
      );
    }
    return result;
  }

  /**
   * Adds `point`. With `toPreview` it goes into the preview (the point
   * that follows the pointer); otherwise into the path itself. Without a
   * path editor a new path is created around the point. `sceneCoords`
   * says the point is in page coordinates already (else it is mapped
   * into the path's space); `keepSelection` leaves the Selected flags.
   */
  _addPoint(
    point: AnchorPoint,
    toPreview: boolean,
    sceneCoords: boolean,
    keepSelection?: boolean,
  ): void {
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
    if (toPreview) {
      if (this._pathEditor) {
        const preview = this._dpathRef as Path;
        this._pathEditor.requestInvalidation();
        if (this._mode == Mode.Append) {
          if (!keepSelection) {
            (preview.getAnchorPoints().getLastChild() as AnchorPoint).removeFlag(NodeFlag.Selected);
          }
          preview.getAnchorPoints().appendChild(point);
          if (!keepSelection) point.setFlag(NodeFlag.Selected);
          this._editPt = preview.getAnchorPoints().getLastChild() as AnchorPoint;
          this._newPoint = true;
          this._pathEditor.setActiveExtendingMode(ExtendingMode.End);
        } else if (this._mode == Mode.Prepend) {
          if (!keepSelection) {
            (preview.getAnchorPoints().getFirstChild() as AnchorPoint).removeFlag(
              NodeFlag.Selected,
            );
          }
          preview.getAnchorPoints().insertChild(point, preview.getAnchorPoints().getFirstChild());
          if (!keepSelection) point.setFlag(NodeFlag.Selected);
          this._pathEditor.shiftPreviewTable(1);
          this._editPt = preview.getAnchorPoints().getFirstChild() as AnchorPoint;
          this._newPoint = true;
          this._pathEditor.setActiveExtendingMode(ExtendingMode.Beginning);
        }
        this._pathEditor.requestInvalidation();
      } else {
        this._startTransaction(Transaction.InsertElement);
        this._createAndAppendPath(point);
        if (this._pathEditor) {
          this._findSideConnectPoints();
          this._currentPathEditor().selectOnePoint(point);
          this._checkMode();
          this._renewPreviewLink();
          this._editPt = (this._dpathRef as Path).getAnchorPoints().getLastChild() as AnchorPoint;
          this._currentPathEditor().requestInvalidation();
          this._currentPathEditor().setActiveExtendingMode(ExtendingMode.End);
        } else this._finishTransaction();
      }
    } else if (this._pathEditor) {
      const path = this._pathRef as Path;
      this._pathEditor.requestInvalidation();
      if (this._mode == Mode.Append) {
        if (this._dpathRef) {
          this._dpathRef.getAnchorPoints().removeChild(point);
          this._dpathRef = null;
          if (point.hasFlag(NodeFlag.Selected)) point.removeFlag(NodeFlag.Selected);
        }
        this._pathEditor.releasePathPreview();
        this._pathEditor.requestInvalidation();
        this._startTransaction(Transaction.AppendPoint);
        path.getAnchorPoints().appendChild(point);
        this._pathEditor.selectOnePoint(point);
        this._pathEditor.setActiveExtendingMode(ExtendingMode.End);
      } else if (this._mode == Mode.Prepend) {
        if (this._dpathRef) {
          this._dpathRef.getAnchorPoints().removeChild(point);
          this._dpathRef = null;
          if (point.hasFlag(NodeFlag.Selected)) point.removeFlag(NodeFlag.Selected);
        }
        this._pathEditor.releasePathPreview();
        this._pathEditor.requestInvalidation();
        this._startTransaction(Transaction.AppendPoint);
        path.getAnchorPoints().insertChild(point, path.getAnchorPoints().getFirstChild());
        this._pathEditor.selectOnePoint(point);
        this._pathEditor.setActiveExtendingMode(ExtendingMode.Beginning);
      }
      this._pathEditor.requestInvalidation();
    } else {
      this._startTransaction(Transaction.InsertElement);
      this._createAndAppendPath(point);
      this._findSideConnectPoints();
      this._currentPathEditor().selectOnePoint(point);
      this._checkMode();
      this._renewPreviewLink();
      this._currentPathEditor().requestInvalidation();
      this._currentPathEditor().setActiveExtendingMode(ExtendingMode.End);
    }
  }

  /**
   * The path editor, which the caller knows is open. The old code read
   * `this._pathEditor` afresh for every call (_checkMode can replace it).
   */
  _currentPathEditor(): ToolPathEditor {
    return this._pathEditor as ToolPathEditor;
  }

  /** Copies the preview back (releasing it) and forgets the path. */
  _commitChanges(): void {
    const editor = this._pathEditor as ToolPathEditor;
    editor.requestInvalidation();
    editor.releasePathPreview();
    editor.requestInvalidation();
    this._reset();
  }

  /**
   * Inserts a new path with `point` as its only anchor point, on the page
   * under the point (whose coordinates are moved to that page).
   */
  _createAndAppendPath(point: AnchorPoint): void {
    let position = new Point(point.$x, point.$y);
    const page = this._view.getScene().getActivePage();
    const viewPosition = this._view.getWorldTransform(page).mapPoint(position);
    this._editor.updateByMousePosition(
      viewPosition,
      this._view.getWorldTransform(this._scene),
      false,
      this._view.getViewConfiguration(),
    );
    const activePage = this._view.getScene().getActivePage();
    if (page !== activePage) {
      position = this._view.getViewTransform(activePage).mapPoint(viewPosition);
      point.setProperties(["x", "y"], [position.getX(), position.getY()]);
    }
    const ItemClass = this._getRelatedItemClass();
    const path = new ItemClass();
    path.getAnchorPoints().appendChild(point);
    path.setFlag(NodeFlag.Selected);
    this._editor.insertElements([path], false, true, true);
    point.setFlag(NodeFlag.Selected);
    this._checkPathEditor();
  }

  _mouseDown(event: MouseEvent): void {
    void event;
    this._released = false;
    if (this._pathEditor) this._pathEditor.blockRemoval();
  }

  /** Ends the path: deselects its points, commits and goes to Edit mode. */
  _mouseDblClick(event: MouseEvent): void {
    this._lastMouseEvent = null;
    this._checkMode();
    if (this._pathEditor) {
      this._pathEditor.updatePartSelection(false);
      if (this._pathEditor instanceof PathEditor) {
        this._pathEditor.setActiveExtendingMode(ExtendingMode.Off);
      }
      this._commitChanges();
    }
    this._mode = Mode.Edit;
    this._setCursorForPosition(null, event.client);
  }

  _mouseRelease(event: MouseEvent): void {
    void event;
    this._released = true;
    this._dragStarted = false;
    this._dragStartPt = null;
    if (this._pathEditor) this._pathEditor.allowRemoval();
    this._editor.getGuides().invalidate();
  }

  _mouseMove(event: MouseEvent): void {
    void event;
  }

  /** The subclasses' drag handling; _modifiersChanged replays the last drag through it. */
  _mouseDrag(event: MouseEvent): void {
    void event;
  }

  _reset(): void {
    if (this._compoundPathEditor) this._compoundPathEditor.removeFlag(BaseEditor.Flag.Detail);
    else if (this._pathEditor) this._pathEditor.removeFlag(BaseEditor.Flag.Detail);
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

  /**
   * Shift replays the last move or drag (to constrain it); Alt during a
   * press re-runs the drag, and Alt pressed before the drag started
   * marks it as an Alt drag (`_firstAlt`).
   */
  _modifiersChanged(event: ModifiersChangedEvent): void {
    if (event.changed.shiftKey && this._lastMouseEvent) {
      if (this._released) this._mouseMove(this._lastMouseEvent);
      else this._mouseDrag(this._lastMouseEvent);
    } else if (event.changed.optionKey) {
      this._firstAlt = false;
      if (!this._released) {
        if (Platform.modifiers.optionKey) this._firstAlt = !this._dragStarted;
        if (this._lastMouseEvent) this._mouseDrag(this._lastMouseEvent);
      }
    }
  }

  /** Esc: ends the path (deselected) and returns to the default tool. */
  _escAction(): void {
    if (this._released) {
      this._checkMode();
      if (this._pathEditor) {
        this._pathEditor.updatePartSelection(false);
        if (this._pathEditor instanceof PathEditor) {
          this._pathEditor.setActiveExtendingMode(ExtendingMode.Off);
          if (this._pathRef) this._pathRef.removeFlag(NodeFlag.Selected);
        }
        this._commitChanges();
      }
      this._setCursorForPosition(Cursor.PenStart);
      (this._manager as ToolManager).notifyJobDone(this);
    }
  }

  /** Enter: ends the path and switches to the subselect tool. */
  _enterAction(): void {
    if (this._released) {
      this._checkMode();
      if (this._pathEditor) {
        if (this._pathEditor instanceof PathEditor) {
          this._pathEditor.setActiveExtendingMode(ExtendingMode.Off);
        }
        this._commitChanges();
      }
      (this._manager as ToolManager).activateSubSelect();
    }
  }

  /**
   * With Shift: `position` (view) constrained to 45° steps around
   * `reference`, or around the end point being extended.
   */
  _constrainIfNeeded(
    position: Point,
    worldToView: Transform,
    path?: Path | null,
    reference?: AnchorPoint | null,
  ): Point {
    let result = position;
    if (Platform.modifiers.shiftKey) {
      let anchor: AnchorPoint | null = null;
      if (reference) anchor = reference;
      else if (path) {
        if (this._mode == Mode.Append) {
          anchor = path.getAnchorPoints().getLastChild() as AnchorPoint | null;
        } else if (this._mode == Mode.Prepend) {
          anchor = path.getAnchorPoints().getFirstChild() as AnchorPoint | null;
        }
      }
      if (anchor) {
        result = (this._pathEditor as ToolPathEditor).constrainPosition(
          position,
          worldToView,
          anchor,
        );
      }
    }
    return result;
  }

  /** Makes `point` the only selected point and restarts the preview around it. */
  _makePointMajor(point: AnchorPoint): void {
    if (this._compoundPathEditor) {
      this._compoundPathEditor.updatePartSelection(false);
      this._compoundPathEditor.releasePathPreview();
      this._compoundPathEditor.requestInvalidation();
    }
    const editor = this._pathEditor as ToolPathEditor;
    editor.selectOnePoint(point);
    this._dpathRef = null;
    editor.releasePathPreview();
    editor.requestInvalidation();
    this._dpathRef = editor.getPathPreview(false, point);
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
          break;
        case Transaction.JoinPaths:
          this._editor.commitTransaction(loc("action.join-paths"));
      }
    } finally {
      this._transactionType = Transaction.NoTransaction;
    }
  }

  /** Whether `info` hits a segment exactly at its middle (the Shift insert). */
  _isSegmentMiddle(info: PartInfo): boolean {
    const data = info.data as SegmentPartData;
    return data.type == SegmentData.HitRes && !!data.hitRes.outline && 0.5 === data.hitRes.slope;
  }

  /**
   * A press in Edit mode: on an end point of an open path continue from
   * it; on another point remember it (released without a drag it loses
   * its handles or is deleted); on a segment insert a point (exactly at
   * the middle with Shift, `prepare` gets the new point); elsewhere end
   * the edit and go back to Append.
   */
  _mouseDownOnEdit(event: MouseEvent, prepare?: (point: AnchorPoint) => void): void {
    const position = event.client;
    if (this._pathEditor && this._pathEditor.getElement().getWorkspace()) {
      this._pathEditor.requestInvalidation();
      this._pathEditor.releasePathPreview();
      this._pathEditor.requestInvalidation();
      const info = this._getPartInfo(position) as PathPartInfo | null;
      if (info) {
        this._pathEditor = info.editor as unknown as ToolPathEditor;
        this._pathRef = this._pathEditor.getPath();
      }
      const path = this._pathRef as Path;
      if (info && info.id.type == PartType.Point) {
        const point = info.id.point as AnchorPoint;
        if (path.getProperty("closed") || point !== path.getAnchorPoints().getLastChild()) {
          if (path.getProperty("closed") || point !== path.getAnchorPoints().getFirstChild()) {
            this._refPt = point;
            if (hasHandle(this._refPt)) this._setCursorForPosition(Cursor.PenModify);
            else this._setCursorForPosition(Cursor.PenMinus);
          } else {
            this._mode = Mode.Prepend;
            this._makePointMajor(point);
          }
        } else {
          this._mode = Mode.Append;
          this._makePointMajor(point);
        }
      } else if (info && info.id.type == PartType.Segment && info.data.type == SegmentData.HitRes) {
        if (Platform.modifiers.shiftKey && this._cached && this._cached.middlePoint) {
          info.data.hitRes.slope = 0.5;
          const area = this._getPaintRect() as Rect;
          this._cached = null;
          this.invalidateArea(area);
        }
        if (this._isSegmentMiddle(info)) this._setCursorForPosition(Cursor.PenPlusMiddle);
        else this._setCursorForPosition(Cursor.PenPlus);
        this._startTransaction(Transaction.InsertPoint);
        const point = path.insertHitPoint(info.data.hitRes as unknown as PathHit);
        if (point) {
          if (event.button == MouseEvent.BUTTON_RIGHT && Platform.modifiers.optionKey) {
            if (point.getProperty("tp") == AnchorPoint.Type.Asymmetric) {
              point.setProperty("tp", AnchorPoint.Type.Connector);
            }
          }
          if (prepare) prepare(point);
          this._makePointMajor(point);
          this._refPt = point;
          this._editPt = (this._pathEditor as ToolPathEditor).getPathPointPreview(point);
          (this._pathEditor as ToolPathEditor).requestInvalidation();
          this._mode = Mode.Edit;
        } else {
          this._finishTransaction();
          this._reset();
          this._mode = Mode.Append;
        }
      } else {
        this._setCursorForPosition(Cursor.PenStart);
        this._pathEditor.updatePartSelection(false);
        this._commitChanges();
        this._mode = Mode.Append;
      }
    }
  }

  /**
   * A click without a drag on a point in Edit mode: a point with handles
   * loses them, a point without handles is deleted (unless it is the
   * only one).
   */
  _mouseNoDragReleaseOnEdit(position: Point): void {
    if (this._refPt) {
      const path = this._pathRef as Path;
      if (
        null != this._refPt.getProperty("hlx") ||
        null != this._refPt.getProperty("hly") ||
        null != this._refPt.getProperty("hrx") ||
        null != this._refPt.getProperty("hry")
      ) {
        if (this._transactionType == Transaction.NoTransaction) {
          this._startTransaction(Transaction.ModifyPointProperties);
        }
        this._refPt.setProperties(
          ["ah", "hlx", "hly", "hrx", "hry"],
          [false, null, null, null, null],
        );
        this._makePointMajor(this._refPt);
        this._setCursorForPosition(Cursor.PenMinus);
      } else {
        if (path.getAnchorPoints().getFirstChild() != path.getAnchorPoints().getLastChild()) {
          if (this._transactionType == Transaction.NoTransaction) {
            this._startTransaction(Transaction.DeletePoint);
          } else this._transactionType = Transaction.DeletePoint;
          path.getAnchorPoints().removeChild(this._refPt);
        }
        this._setCursorForPosition(null, position);
      }
      this._refPt = null;
      this._commitChanges();
    }
  }

  /**
   * Sets `cursor`, or with null the cursor for what is under `position`
   * (view) in the current mode; PenStart without a position.
   */
  _setCursorForPosition(cursor: string | null, position?: Point | null): void {
    if (null !== cursor) this._cursor = cursor;
    else if (position) {
      if (!this._pathEditor) this._checkPathEditor();
      if (this._pathEditor) {
        const info = this._getPartInfo(position) as PathPartInfo | null;
        if (info && info.id.type == PartType.Point) {
          const point = info.id.point as AnchorPoint;
          const path = info.editor.getPath();
          if (
            path.getProperty("closed") ||
            (point !== path.getAnchorPoints().getFirstChild() &&
              point !== path.getAnchorPoints().getLastChild())
          ) {
            if (this._mode == Mode.Edit) {
              this._cursor = hasHandle(point) ? Cursor.PenModify : Cursor.PenMinus;
            } else this._cursor = Cursor.Pen;
          } else if (
            (this._mode == Mode.Append && point === path.getAnchorPoints().getFirstChild()) ||
            (this._mode == Mode.Prepend && point === path.getAnchorPoints().getLastChild())
          ) {
            this._cursor = Cursor.PenEnd;
          } else if (
            (this._mode == Mode.Append && point === path.getAnchorPoints().getLastChild()) ||
            (this._mode == Mode.Prepend && point === path.getAnchorPoints().getFirstChild())
          ) {
            this._cursor = Cursor.PenModify;
          } else this._cursor = Cursor.Pen;
        } else if (this._mode == Mode.Edit) {
          if (info && info.id.type == PartType.Segment) {
            this._cursor =
              Platform.modifiers.shiftKey || this._isSegmentMiddle(info)
                ? Cursor.PenPlusMiddle
                : Cursor.PenPlus;
          } else this._cursor = Cursor.PenStart;
        } else this._cursor = Cursor.Pen;
      } else this._cursor = Cursor.PenStart;
    } else this._cursor = Cursor.PenStart;
    this.updateCursor();
  }

  /**
   * The path editor's part at `position` (view), cached per position.
   * The cache also keeps the Shift segment-middle marker while Shift is
   * held over the same segment.
   */
  _getPartInfo(position: Point): PartInfo | null {
    let info: PartInfo | null = null;
    if (this._pathEditor) {
      if (this._cached && this._cached.point == position) {
        info = this._cached.partInfo;
        if (!Platform.modifiers.shiftKey && this._cached.middlePoint) {
          const area = this._getPaintRect() as Rect;
          this._cached.middlePoint = null;
          this._cached.segmentNo = null;
          this.invalidateArea(area);
        }
      } else {
        info = this._pathEditor.getPartInfoAt(
          position,
          this._view.getWorldTransform(this._view.getScene().getActivePage()),
          null,
          EditorOptions.pickDistance,
        );
        let middlePoint: Point | null = null;
        let segmentNo: number | null = null;
        const data = info ? (info.data as SegmentPartData) : null;
        if (
          this._cached &&
          null !== this._cached.segmentNo &&
          Platform.modifiers.shiftKey &&
          (!info ||
            ((info.id as PathPartId).type == PartType.Segment &&
              (data as SegmentPartData).type == SegmentData.HitRes &&
              (data as SegmentPartData).hitRes.outline &&
              (data as SegmentPartData).hitRes.segment === this._cached.segmentNo))
        ) {
          segmentNo = this._cached.segmentNo;
          middlePoint = this._cached.middlePoint;
        } else if (this._cached && this._cached.middlePoint) {
          this.invalidateArea(this._getPaintRect() as Rect);
        }
        this._cached = { point: position, partInfo: info, segmentNo, middlePoint };
      }
    }
    return info;
  }

  /** With Shift over a segment: shows the marker at the segment's middle. */
  _highlightMiddle(position: Point): void {
    if (this._pathEditor) {
      const info = this._getPartInfo(position) as PathPartInfo | null;
      const cache = this._cached as PartCache;
      if (
        !cache.middlePoint &&
        info &&
        info.id.type == PartType.Segment &&
        info.data.type == SegmentData.HitRes &&
        info.data.hitRes.outline
      ) {
        const middle = (info.editor.getElement() as Path).getSegmentMiddle(
          info.data.hitRes.segment as number,
        );
        if (middle) {
          cache.segmentNo = info.data.hitRes.segment as number;
          cache.middlePoint = middle;
          this.invalidateArea(this._getPaintRect() as Rect);
        }
      }
    }
  }

  /** The view area of the segment-middle marker, or null. */
  _getPaintRect(): Rect | null {
    if (this._cached && this._cached.middlePoint) {
      const handle = EditorOptions.annotationHandles.path.center;
      return EditorAnnotation.getAnnotationBBox(
        this._view.getWorldTransform(this._view.getScene().getActivePage()),
        this._cached.middlePoint,
        handle.size,
        true,
      );
    }
    return null;
  }

  _sceneModified(event: unknown): void {
    void event;
    this._findSideConnectPoints();
  }

  /**
   * Collects the end points (in page coordinates) of every unlocked open
   * path on the active page except the one being drawn.
   */
  _findSideConnectPoints(): void {
    const page = this._scene.getActivePage() as Node;
    this._sideConnectPoints = null;
    this._checkPathEditor();
    const current = this._pathRef
      ? this._pathRef
      : this._pathEditor && this._pathEditor instanceof PathEditor
        ? this._pathEditor.getPath()
        : null;
    page.accept(
      (node: Node) => {
        if (
          node instanceof Path &&
          !node.hasFlag(ElementFlag.FullLocked) &&
          !node.getProperty("closed") &&
          node != current
        ) {
          const points = node.getAnchorPoints();
          const first = points.getFirstChild() as AnchorPoint;
          let position = pointOf(first);
          const transform = node.getProperty("trf") as Transform | null;
          position = transform ? transform.mapPoint(position) : position;
          const entry: SideConnectPoint = { node, pt: position, end: 1 };
          if (this._sideConnectPoints) this._sideConnectPoints.push(entry);
          else this._sideConnectPoints = [entry];
          if (points.getFirstChild() != points.getLastChild()) {
            position = pointOf(points.getLastChild() as AnchorPoint);
            position = transform ? transform.mapPoint(position) : position;
            this._sideConnectPoints.push({ node, pt: position, end: 2 });
          }
        }
        return true;
      },
      false,
      true,
    );
  }

  /** The other path's end point at exactly `position` (page coordinates), or null. */
  _hitSideConnectPoints(position: Point): SideConnectPoint | null {
    if (this._sideConnectPoints) {
      for (let i = 0; i < this._sideConnectPoints.length; ++i) {
        const entry = this._sideConnectPoints[i] as SideConnectPoint;
        if (
          GMath.isEqualEps(entry.pt.getX(), position.getX()) &&
          GMath.isEqualEps(entry.pt.getY(), position.getY())
        ) {
          return entry;
        }
      }
    }
    return null;
  }

  /**
   * Appends the points of `target`'s path (reversed when its last point
   * was hit) to the path being drawn, removes the other path and goes to
   * Edit mode on the first joined point.
   */
  _connectPaths(target: SideConnectPoint): void {
    if (this._pathRef) {
      const ownTransform = this._pathRef.getProperty("trf") as Transform | null;
      const otherTransform = target.node.getProperty("trf") as Transform | null;
      let transform: Transform | null = null;
      if (null != ownTransform || null != otherTransform) {
        transform = otherTransform || null;
        const inverse = ownTransform ? (ownTransform.inverted() as Transform) : null;
        if (inverse) transform = transform ? transform.multiplied(inverse) : inverse;
      }
      const joined = new Path();
      joined.getAnchorPoints().deserialize(target.node.getAnchorPoints().serialize(transform));
      if (2 == target.end) joined.reverseOrder();
      const editor = this._pathEditor as ToolPathEditor;
      editor.requestInvalidation();
      editor.releasePathPreview();
      this._startTransaction(Transaction.JoinPaths);
      if (this._pathRef && this._mode == Mode.Prepend) this._pathRef.reverseOrder();
      (target.node.getParent() as unknown as ContainerNode).removeChild(target.node);
      this._refPt = null;
      for (
        let point = joined.getAnchorPoints().getFirstChild() as AnchorPoint | null;
        null != point;
        point = joined.getAnchorPoints().getFirstChild() as AnchorPoint | null
      ) {
        joined.getAnchorPoints().removeChild(point);
        this._pathRef.getAnchorPoints().appendChild(point);
        if (!this._refPt) this._refPt = point;
      }
      this._makePointMajor(this._refPt as AnchorPoint);
      editor.setActiveExtendingMode(ExtendingMode.Off);
      this._finishTransaction();
      this._mode = Mode.Edit;
      this._editPt = editor.getPathPointPreview(this._refPt);
      this._findSideConnectPoints();
    }
  }

  override toString(): string {
    return "[Object GPathTool]";
  }
}
