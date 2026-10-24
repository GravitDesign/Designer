// Old: chunk.vendor.js module 335 (GFreehandTool).
/**
 * The freehand tool: a drag draws a path through the pointer positions,
 * smoothed on the fly by fitting cubic beziers (GVertexFitter) to runs of
 * the sampled points. A stroke whose end comes within 15 screen pixels of
 * its start closes, and a new closed path gets its fill shown.
 *
 * Shift continues the stroke with straight segments: while it is held the
 * last point follows the pointer and each release with Shift adds a
 * point; letting Shift go finishes the stroke. A press within 500 ms of
 * hovering after a release starts its smoothing from the hover position,
 * so a continued stroke joins smoothly. Digits set the new path's `_bop`.
 */
import { KeyEvent } from "../../engine/core/key-event.ts";
import { Key } from "../../engine/core/key.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { Locale } from "../../engine/core/locale/locale.ts";
import { ModifiersChangedEvent } from "../../engine/core/modifiers-changed-event.ts";
import { MouseEvent } from "../../engine/core/mouse-event.ts";
import { registerClass } from "../../engine/core/object.ts";
import { Platform } from "../../engine/core/platform.ts";
import { VertexFitter } from "../../engine/geometry/vertex-fitter.ts";
import { Point } from "../../engine/math/point.ts";
import { NodeFlag } from "../../engine/scene/node-change.ts";
import type { Node } from "../../engine/scene/node.ts";
import { AnchorPoint } from "../../engine/scene/path-base.ts";
import { Path } from "../../engine/scene/path.ts";
import type { PaintLayers } from "../../engine/style/paint-layers.ts";
import { Cursor } from "../cursor.ts";
import { EditorOptions } from "../editor-options.ts";
import { BaseEditor } from "../element-editors/base-editor.ts";
import { ElementEditor } from "../element-editors/element-editor.ts";
import { PathBaseEditor } from "../element-editors/path-base-editor.ts";
import { PathEditor } from "../element-editors/path-editor.ts";
import { DetailMapMode } from "../guides/guide.ts";
import type { EditorWidget } from "../view/editor-widget.ts";
import { Panning } from "../view/panning.ts";
import { ItemTool } from "./item-tool.ts";
import type { ToolManager } from "./tool-manager.ts";

const ExtendingMode = PathBaseEditor.ExtendingMode;

/** At most this many sampled points are fitted at once. */
const MAXPOINTS = 20;
/** A move counts once it is this far (squared) from the last sample. */
const SAMPLEDISTANCE = 1;
/** Fit when the run's summed squared steps exceed this (and it has more than 4 points). */
const MINFITDISTSQ = 400;

/** A pointer position hovered after a release, for continuing the stroke. */
interface ReleasedPosition {
  pt: Point;
  time: number;
}

/**
 * Turns the sampled pointer positions of a stroke into anchor points.
 * Every sample is appended as a plain point at once; when a run is long
 * enough the run's points are replaced by fitted curves (with tangents
 * that continue the previous run).
 */
class SmoothingManager {
  _current: Point | null = null;
  _currentPoints: Point[] | null = null;
  _fitter: VertexFitter | null = null;
  _firstTangent: Point | null = null;
  _lastTangent: Point | null = null;
  _cdist = 0;
  _path: Path | null = null;
  _lastPos: Point | null = null;
  /** The last anchor point of the fitted part. */
  _lastSmoothed: AnchorPoint | null = null;
  /** Where the stroke continues from (the first tangent points away from it). */
  _startingPoint: Point | null = null;

  begin(path: Path): void {
    this._path = path;
  }

  finish(): void {
    this._smoothCurrent();
  }

  start(startingPoint: Point | null): void {
    this._current = null;
    this._currentPoints = [];
    this._fitter = new VertexFitter(7);
    this._firstTangent = null;
    this._lastTangent = null;
    this._cdist = 0;
    this._lastPos = null;
    this._lastSmoothed = null;
    this._startingPoint = startingPoint;
  }

  move(position: Point): void {
    const points = this._currentPoints as Point[];
    let distance = 0;
    if (this._current) {
      const step = this._current.subtract(position);
      distance = step.dot(step);
      this._cdist += distance;
    }
    if (null == this._current || distance >= SAMPLEDISTANCE) {
      if (points.length === MAXPOINTS || (points.length > 4 && this._cdist > MINFITDISTSQ)) {
        this._smoothCurrent(position);
      }
      const anchor = new AnchorPoint();
      anchor.setProperties(["x", "y"], [position.getX(), position.getY()]);
      (this._path as Path).getAnchorPoints().appendChild(anchor);
      (this._currentPoints as Point[]).push(position);
      this._current = position;
    }
    this._lastPos = position;
  }

  /** Replaces the current run's points by fitted curves; `next` gives the run's end tangent. */
  _smoothCurrent(next?: Point): void {
    let first = false;
    const end = next || (this._lastPos as Point);
    const points = this._currentPoints as Point[];
    if (points.length) {
      if (this._lastSmoothed) {
        const last = new Point(this._lastSmoothed.$x, this._lastSmoothed.$y);
        this._firstTangent = (points[0] as Point).subtract(last);
        this._lastTangent = (points[points.length - 1] as Point).subtract(end);
        const lastLength = this._lastTangent.dot(this._lastTangent);
        if (0 !== lastLength)
          this._lastTangent = this._lastTangent.scale(1 / Math.sqrt(lastLength));
      } else {
        first = true;
        if (points.length && this._startingPoint) {
          this._firstTangent = (points[0] as Point).subtract(this._startingPoint);
        } else this._firstTangent = new Point(0, 0);
      }
      const firstLength = this._firstTangent.dot(this._firstTangent);
      if (0 !== firstLength) {
        this._firstTangent = this._firstTangent.scale(1 / Math.sqrt(firstLength));
      }
      if (points.length > 2) {
        const anchors = (this._path as Path).getAnchorPoints();
        for (
          let point = this._lastSmoothed ? this._lastSmoothed.getNext() : anchors.getFirstChild();
          point;
        ) {
          const following = point.getNext();
          anchors.removeChild(point);
          point = following;
        }
        const curves = (this._fitter as VertexFitter).fitCurve(
          points,
          MAXPOINTS,
          this._firstTangent,
          this._lastTangent,
        );
        let anchor: AnchorPoint;
        if (first && curves && curves.length) {
          let curve = curves[0] as Point[];
          anchor = new AnchorPoint();
          anchor.setProperties(
            ["x", "y"],
            [(curve[0] as Point).getX(), (curve[0] as Point).getY()],
          );
          anchors.appendChild(anchor);
          for (let i = 0; i < curves.length; i++) {
            curve = curves[i] as Point[];
            appendCurve(anchors, anchor, curve);
            anchor = anchors.getLastChild() as AnchorPoint;
          }
        } else if (curves) {
          anchor = anchors.getLastChild() as AnchorPoint;
          for (let i = 0; i < curves.length; i++) {
            appendCurve(anchors, anchor, curves[i] as Point[]);
            anchor = anchors.getLastChild() as AnchorPoint;
          }
        }
      }
      this._currentPoints = [];
      this._lastSmoothed = (this._path as Path).getAnchorPoints().getLastChild() as AnchorPoint;
      this._cdist = 0;
    }
  }
}

/** Sets `from`'s right handle and appends the curve's end point with its left handle. */
function appendCurve(
  anchors: ReturnType<Path["getAnchorPoints"]>,
  from: AnchorPoint,
  curve: Point[],
): void {
  const [, c1, c2, p3] = curve as [Point, Point, Point, Point];
  from.setProperties(["hrx", "hry"], [c1.getX(), c1.getY()]);
  const anchor = new AnchorPoint();
  anchor.setProperties(["x", "y", "hlx", "hly"], [p3.getX(), p3.getY(), c2.getX(), c2.getY()]);
  anchors.appendChild(anchor);
}

const loc = (key: string): string => Locale.get(new LocaleKey("GFreehandTool", key)) as string;

function showFills(path: Path): void {
  for (const layer of (path.getPaintLayers() as PaintLayers).getFillLayers()) {
    layer.setProperty("_vs", true);
  }
}

export class FreehandTool extends Panning(ItemTool) {
  static {
    registerClass(this, "GFreehandTool");
  }

  static _SmoothingManager = SmoothingManager;
  static MAXPOINTS = MAXPOINTS;
  static SAMPLEDISTANCE = SAMPLEDISTANCE;
  static MINFITDISTSQ = MINFITDISTSQ;

  _smoothingManager: SmoothingManager | null = null;
  _released = true;
  _lastMouseEvent: MouseEvent | null = null;
  /** The path of the stroke being drawn. */
  _newPath: Path | null = null;
  /** The path of the last stroke (digits still act on it). */
  _createdPath: Path | null = null;
  _transactionStarted = false;
  _willMerge = true;
  /** The selection at the press (closed paths with hidden fill keep new fills hidden). */
  _startingSelection: Node[] | null = null;
  /** Pointer positions hovered since the last release, newest last (at most 10). */
  _lastReleasedPos: ReleasedPosition[] | null = null;
  _deactivationAllowed = true;
  /** Not declared on the old prototype (undefined until the first stroke). */
  _pathEditor: PathEditor | null = null;

  override getCursor(): string {
    return Cursor.PenStart;
  }

  override activate(view: EditorWidget, light?: boolean): void {
    super.activate(view, light);
    if (!light) {
      view.addEventListener(MouseEvent.Down, this._mouseDown, this);
      view.addEventListener(MouseEvent.Release, this._mouseRelease, this);
      view.addEventListener(MouseEvent.DragEnd, this._mouseDragEnd, this);
      view.addEventListener(KeyEvent.Down, this._keyDown, this);
      view.addEventListener(MouseEvent.DragStart, this._mouseDragStart, this);
      view.addEventListener(MouseEvent.Drag, this._mouseDrag, this);
      view.addEventListener(MouseEvent.Move, this._mouseMove, this);
      view.addEventListener(MouseEvent.DblClick, this._mouseDblClick, this);
      Platform.addEventListener(ModifiersChangedEvent, this._modifiersChanged, this);
    }
    this._smoothingManager = new SmoothingManager();
    this._editor.setPathResize(false, true);
  }

  override deactivate(view: EditorWidget, light?: boolean): void {
    this._finishTransaction();
    this._allowDeactivation();
    this._reset();
    super.deactivate(view, light);
    view.removeEventListener(MouseEvent.Down, this._mouseDown);
    view.removeEventListener(MouseEvent.Release, this._mouseRelease);
    view.removeEventListener(KeyEvent.Down, this._keyDown);
    view.removeEventListener(MouseEvent.Drag, this._mouseDrag);
    view.removeEventListener(MouseEvent.DragStart, this._mouseDragStart, this);
    view.removeEventListener(MouseEvent.DragEnd, this._mouseDragEnd, this);
    view.removeEventListener(MouseEvent.Move, this._mouseMove);
    view.removeEventListener(MouseEvent.DblClick, this._mouseDblClick);
    Platform.removeEventListener(ModifiersChangedEvent, this._modifiersChanged, this);
  }

  _mouseDragStart(event: MouseEvent): void {
    void event;
    this.beginPan();
  }

  _mouseDragEnd(event: MouseEvent): void {
    void event;
    this.endPan();
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

  /** Inserts an empty path (fills hidden, not selected) and opens its editor. */
  _createAndAppendPath(): Path | null {
    const ItemClass = this._getRelatedItemClass();
    const path = new ItemClass();
    this._editor.insertElements([path], false, true, true);
    for (const layer of (path.getPaintLayers() as PaintLayers).getFillLayers()) {
      layer.setProperty("_vs", false);
    }
    path.removeFlag(NodeFlag.Selected);
    this._pathEditor = ElementEditor.openEditor(path) as unknown as PathEditor;
    this._pathEditor.setFlag(BaseEditor.Flag.Detail);
    return path;
  }

  _reset(): void {
    this._createdPath = this._newPath;
    this._newPath = null;
    this._lastMouseEvent = null;
  }

  override _keyDown(event: KeyEvent): void {
    super._keyDown(event);
    if (event.key === Key.Constant.ESC) {
      this._lastMouseEvent = null;
      this._escAction();
    } else if (event.key === Key.Constant.ENTER) {
      this._lastMouseEvent = null;
      this._enterAction();
    } else if (
      ("string" == typeof event.key || (event.key as unknown) instanceof String) &&
      (event.key as string).match(/^[0-9]$/)
    ) {
      // Sets the legacy border opacity, which a path neither paints nor
      // saves; see "Freehand digits set _bop" in QUESTIONS.md.
      const digit = parseInt(event.key as string);
      const path = this._newPath || this._createdPath;
      if (path) {
        const opacity = 0 === digit ? 1 : digit / 10;
        if (this._transactionStarted) path.setProperty("_bop", opacity);
        else {
          try {
            this._startTransaction();
            path.setProperty("_bop", opacity);
          } finally {
            this._finishTransaction();
          }
        }
      }
    }
  }

  _escAction(): void {
    if (this._released) {
      if (this._pathEditor) {
        this._pathEditor.updatePartSelection(false);
        if (this._pathEditor instanceof PathEditor) {
          this._pathEditor.setActiveExtendingMode(ExtendingMode.Off);
          if (this._newPath) this._newPath.removeFlag(NodeFlag.Selected);
        }
      }
      (this._manager as ToolManager).notifyJobDone(this);
    }
  }

  _enterAction(): void {
    if (this._released) {
      if (this._pathEditor && this._pathEditor instanceof PathEditor) {
        this._pathEditor.setActiveExtendingMode(ExtendingMode.Off);
      }
      (this._manager as ToolManager).activateSubSelect();
    }
  }

  _startTransaction(): void {
    this._editor.beginTransaction();
    this._transactionStarted = true;
  }

  _finishTransaction(): void {
    if (this._transactionStarted) {
      this._editor.commitTransaction(loc("action.create-freehand-path"));
      this._transactionStarted = false;
    }
  }

  /**
   * Starts a stroke (a left press without Shift; with Shift the press
   * only marks the button down). The newest hover position younger than
   * 500 ms and more than about 3 px from the press becomes the smoothing
   * start point.
   */
  _mouseDown(event: MouseEvent): void {
    if (event.button !== MouseEvent.BUTTON_LEFT) return;
    if (Platform.modifiers.shiftKey) {
      this._released = false;
      return;
    }
    if (this._pathEditor) this._pathEditor.blockRemoval();
    this._lastMouseEvent = event;
    this._startingSelection = this._editor.getSelection();
    if (this._startingSelection) this._startingSelection = this._startingSelection.slice();
    let position = this._view
      .getViewTransform(this._view.getScene().getActivePage())
      .mapPoint(event.client);
    let startingPoint: Point | null = null;
    if (this._lastReleasedPos) {
      for (let now = Date.now(), i = this._lastReleasedPos.length - 2; i >= 0; i--) {
        const hovered = this._lastReleasedPos[i] as ReleasedPosition;
        if (!(now - hovered.time < 500)) break;
        const step = hovered.pt.subtract(position);
        if (step.dot(step) > 10) {
          startingPoint = hovered.pt;
          break;
        }
      }
      this._lastReleasedPos = [];
    }
    this._mouseMove(event);
    this._released = false;
    this._blockDeactivation();
    const guides = this._editor.getGuides();
    guides.beginMap(this._editor.getMappingScopes() as never);
    position = guides.mapPoint(position, DetailMapMode.DetailOnFilterOn);
    guides.finishMap();
    this._editor.updateByMousePosition(
      event.client,
      this._view.getWorldTransform(this._scene),
      false,
      this._view.getViewConfiguration(),
    );
    this._startTransaction();
    this._newPath = this._createAndAppendPath();
    if (this._newPath) {
      const smoothing = this._smoothingManager as SmoothingManager;
      const editor = this._pathEditor as PathEditor;
      smoothing.begin(this._newPath);
      smoothing.start(startingPoint);
      smoothing.move(position);
      editor.selectOnePoint(this._newPath.getAnchorPoints().getFirstChild() as AnchorPoint);
      editor.requestInvalidation();
      editor.setActiveExtendingMode(ExtendingMode.End);
    }
  }

  /**
   * Shift down: fits what was drawn and continues straight to the pointer;
   * Shift up after a Shift release: finishes the stroke.
   */
  _modifiersChanged(event: ModifiersChangedEvent): void {
    if (event.changed.shiftKey && this._lastMouseEvent && this._newPath) {
      if (Platform.modifiers.shiftKey) {
        (this._smoothingManager as SmoothingManager)._smoothCurrent();
        this._mouseDrag(this._lastMouseEvent);
      } else if (this._released) {
        this._released = false;
        // Finishes at the last pointer position. The old code passed the
        // modifiers event, whose missing client made updateByMousePosition
        // throw in the multi-page view (BUG-042 Finishing a freehand
        // stroke with Shift up throws in the multi-page view).
        this._mouseRelease(this._lastMouseEvent);
      }
    }
  }

  _mouseMove(event: MouseEvent): void {
    this._lastMouseEvent = event;
    if (this._released) {
      if (!this._lastReleasedPos) this._lastReleasedPos = [];
      this._lastReleasedPos.push({
        pt: this._view
          .getViewTransform(this._view.getScene().getActivePage())
          .mapPoint(event.client),
        time: Date.now(),
      });
      if (this._lastReleasedPos.length > 10) this._lastReleasedPos.shift();
      if (Platform.modifiers.shiftKey) this._mouseDrag(event);
    } else if (event.button == MouseEvent.BUTTON_RIGHT) this._mouseDrag(event);
  }

  _mouseDrag(event: MouseEvent): void {
    if (this._newPath) {
      if (this.isPanning()) this.panView(event.client, event.clientDelta);
      const position = this._view
        .getViewTransform(this._view.getScene().getActivePage())
        .mapPoint(event.client);
      this._lastMouseEvent = event;
      if (Platform.modifiers.shiftKey) {
        (this._newPath.getAnchorPoints().getLastChild() as AnchorPoint).setProperties(
          ["x", "y"],
          [position.getX(), position.getY()],
        );
      } else (this._smoothingManager as SmoothingManager).move(position);
      if (this._closeIfNeeded(true)) {
        if (this._newPath.hasFlag(NodeFlag.Highlighted)) {
          (this._pathEditor as PathEditor).requestInvalidation();
        } else this._newPath.setFlag(NodeFlag.Highlighted);
      } else if (this._newPath && this._newPath.hasFlag(NodeFlag.Highlighted)) {
        this._newPath.removeFlag(NodeFlag.Highlighted);
      }
    }
  }

  /**
   * With Shift: fixes the straight segment and starts the next one.
   * Without: finishes the stroke (a one-point stroke gets a second point
   * 1 to the right), closes it if needed and selects it. After a click
   * the closing merges the two points again; see "Freehand click makes a
   * closed one-point path" in QUESTIONS.md.
   */
  _mouseRelease(event: MouseEvent): void {
    if (Platform.modifiers.shiftKey) {
      if (this._newPath) {
        const smoothing = this._smoothingManager as SmoothingManager;
        smoothing._smoothCurrent();
        const position = this._view
          .getViewTransform(this._view.getScene().getActivePage())
          .mapPoint(event.client);
        smoothing.move(position);
      }
      this._released = true;
      return;
    }
    if (this._pathEditor) this._pathEditor.allowRemoval();
    this._lastMouseEvent = event;
    if (!this._released) {
      try {
        (this._smoothingManager as SmoothingManager).finish();
        this._editor.updateByMousePosition(
          event.client,
          this._view.getWorldTransform(this._scene),
          false,
          this._view.getViewConfiguration(),
        );
        this._released = true;
        const newPath = this._newPath as Path;
        const anchors = newPath.getAnchorPoints();
        if (anchors.getFirstChild() === anchors.getLastChild()) {
          const first = anchors.getFirstChild() as AnchorPoint;
          const point = new AnchorPoint();
          point.setProperties(["x", "y"], [first.$x + 1, first.$y]);
          anchors.appendChild(point);
        }
        this._finalizeDrawing();
        if (newPath.hasFlag(NodeFlag.Highlighted)) newPath.removeFlag(NodeFlag.Highlighted);
      } finally {
        this._finishTransaction();
      }
    }
    this._lastMouseEvent = null;
    this._reset();
    this._allowDeactivation();
  }

  _finalizeDrawing(): void {
    if (this._closeIfNeeded()) this._correctFillVisibility();
    (this._newPath as Path).setFlag(NodeFlag.Selected);
  }

  /**
   * Shows the new closed path's fill, unless the selection at the press
   * had a closed path with its fill hidden (`fvs` false).
   */
  _correctFillVisibility(): void {
    if (this._newPath) {
      if (this._startingSelection && this._startingSelection.length) {
        let hiddenFill: Node | null = null;
        for (let i = this._startingSelection.length - 1; i >= 0; i--) {
          const node = this._startingSelection[i] as Node;
          if (
            node instanceof Path &&
            true === node.getProperty("closed") &&
            false === node.getProperty("fvs")
          ) {
            hiddenFill = node;
            break;
          }
        }
        if (!hiddenFill) showFills(this._newPath);
      } else showFills(this._newPath);
    }
  }

  /**
   * Whether the stroke's end is within 15 screen pixels of its start;
   * unless `checkOnly`, also moves the end onto the start and closes.
   */
  _closeIfNeeded(checkOnly?: boolean): boolean {
    if (!this._newPath) return false;
    const anchors = this._newPath.getAnchorPoints();
    const first = anchors.getFirstChild() as AnchorPoint;
    const last = anchors.getLastChild() as AnchorPoint;
    const distance =
      (first.$x - last.$x) * (first.$x - last.$x) + (first.$y - last.$y) * (first.$y - last.$y);
    const scale = window.devicePixelRatio / this._view.getZoom();
    if (distance < 225 * scale * scale) {
      if (!checkOnly) {
        last.setProperties(["x", "y"], [first.$x, first.$y]);
        this._newPath.correctClosedAttribute();
      }
      return true;
    }
    return false;
  }

  override _getRelatedItemClass(): typeof Path {
    return Path;
  }

  _mouseDblClick(event: MouseEvent): void {
    void event;
    if ("edit" == EditorOptions.selectDoubleClickBehavior) {
      (this._manager as ToolManager).notifyJobDone(this);
    }
  }

  override toString(): string {
    return "[Object GFreehandTool]";
  }
}
