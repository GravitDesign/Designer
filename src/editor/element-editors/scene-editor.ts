// Old: chunk.vendor.js module 545 (GSceneEditor).
/**
 * The editor of the scene: the root of the editor tree. It paints the
 * page editors at their page position (multi-page view) and owns the
 * transform box of the selection, with its mode while the user drags it
 * (TBoxMode). While the box is active the selection's own editors hide
 * (the selection editor gets HideEditor, single editors only outline).
 */
import type { Color } from "../../engine/color/color.ts";
import { registerClass } from "../../engine/core/object.ts";
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { GMath } from "../../engine/math/math.ts";
import { Point } from "../../engine/math/point.ts";
import type { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import { Element } from "../../engine/scene/element.ts";
import { NodeFlag } from "../../engine/scene/node-change.ts";
import type { Node } from "../../engine/scene/node.ts";
import { Scene } from "../../engine/scene/scene.ts";
import { Cursor } from "../cursor.ts";
import { Editor } from "../editor.ts";
import { EditorOptions } from "../editor-options.ts";
import { EditorAnnotation } from "../handles/editor-annotation.ts";
import { BaseEditor, PartInfo, type EditorHost, type EditorPaintContext } from "./base-editor.ts";
import { EdTransformOptions } from "./box-editor.ts";
import { ElementEditor } from "./element-editor.ts";
import { PageEditor } from "./page-editor.ts";
import { TransformBox } from "./transform-box.ts";

const TBoxMode = {
  NA: 0,
  PASSIVE: 1,
  TBOXMOVE: 2,
  CNTRMOVE: 3,
  ROTATE: 4,
  RESIZE: 5,
  SKEW: 6,
} as const;

/** The pages and selection as the scene editor asks them (GScene, GPage). */
interface PageLike {
  getPosition(multiPage?: unknown): Point;
}

interface SceneLike {
  getActivePage(): PageLike | null;
  getWorkspace(): {
    getTransactionRecorder(): {
      afterTBoxChange(scene: unknown, oldBox: unknown, newBox: unknown): void;
    } | null;
  } | null;
  addEventListener(type: unknown, listener: (...args: never[]) => void, target: unknown): void;
  removeEventListener(type: unknown, listener: (...args: never[]) => void, target: unknown): void;
  __graphic_editor__?: SceneEditorHost;
}

/** Guides as the scene editor drives them (GGuides). */
interface SceneGuides {
  useExclusions(exclusions: unknown): void;
  beginMap(scopes?: unknown): void;
  finishMap(): void;
  mapPoint(point: Point): Point;
  invalidate(): void;
  getBBoxSnapZones(area: Rect, location: Point): [Point, Point][] | null;
}

/** What the scene editor calls on GEditor. */
export interface SceneEditorHost extends EditorHost {
  getIndividualSelection(): Node[] | null;
  getSelectionEditor(): BaseEditor | null;
  addEventListener(type: unknown, listener: (...args: never[]) => void, target: unknown): void;
  removeEventListener(type: unknown, listener: (...args: never[]) => void, target: unknown): void;
  getGuides(): SceneGuides;
  getAlignExclusions(childrenOnly?: unknown): unknown;
  getMappingScopes(): unknown;
  transformSelection(
    transform: Transform,
    partId: unknown,
    partData: unknown,
    options: unknown,
  ): void;
  applySelectionTransform(...args: unknown[]): void;
}

/** What updateTBoxUnderMouse gets of the view (GSceneWidget). */
export interface SceneEditorView {
  getViewConfiguration(): { multiPageView: unknown };
  getViewTransform(): Transform;
}

interface GeometryEvent {
  element: Node;
  type: number;
}

/** GEditor statics the scene editor uses. */
const EditorStatics = Editor as unknown as {
  getGroupTransformBBox(nodes: readonly Node[] | null, preview?: unknown): Rect | null;
  SelectionChangedEvent: unknown;
};

export class SceneEditor extends ElementEditor {
  static {
    registerClass(this, "GSceneEditor");
    ElementEditor.exports(this, Scene);
  }

  static TBoxMode = TBoxMode;

  declare _transformBox: TransformBox | null;
  /** Snap zone lines to paint once ([from, to] in view coordinates). */
  declare _visuals: [Point, Point][] | null;
  declare _visualsArea: Rect | null;
  declare _tBoxMode: number;
  declare _tBoxFlags: number;
  /** The part being dragged. */
  declare _tBoxData: PartInfo | null;
  /** The part under the mouse last time. */
  declare _mouseInfo: PartInfo | null;

  /** Page editors paint translated to their page's position. */
  override _paintChildren(
    transform: Transform,
    context: EditorPaintContext,
    filter?: (editor: BaseEditor) => boolean,
  ): void {
    if (this._editors) {
      for (let i = 0; i < this._editors.length; ++i) {
        const child = this._editors[i] as BaseEditor;
        if (!filter || filter(child)) {
          if (child instanceof PageEditor) {
            const position = (child.getElement() as unknown as PageLike).getPosition(
              (context.configuration as unknown as { multiPageView: unknown }).multiPageView,
            );
            const paged = transform.preMultiplied(
              new Transform(1, 0, 0, 1, position.getX(), position.getY()),
            );
            (this._editors[i] as BaseEditor).paint(paged, context);
          } else (this._editors[i] as BaseEditor).paint(transform, context);
        }
      }
    }
  }

  override paint(transform: Transform, context: EditorPaintContext): void {
    super.paint(transform, context);
    if (this._transformBox) {
      const scale = transform.getScaleFactor();
      const canvas = context.canvas as NonNullable<EditorPaintContext["canvas"]>;
      const origin = canvas.getOrigin() as Point;
      const multiPageView = (context.configuration as unknown as { multiPageView: unknown })
        .multiPageView;
      let position: Point | null = null;
      if (multiPageView) {
        this._getGraphicEditor().getIndividualSelection();
        const page = this._sceneNode().getActivePage();
        position = page ? page.getPosition(true) : null;
        if (position) canvas.setOrigin(origin.subtract(position.scale(scale)));
      }
      this._transformBox.paint(transform, context, this.getTBoxMode() == TBoxMode.ROTATE);
      if (multiPageView && position) canvas.setOrigin(origin);
      if (this._visuals) {
        for (let i = 0; i < this._visuals.length; ++i) {
          const visual = this._visuals[i] as [Point, Point];
          const from = visual[0];
          const to = visual[1];
          let offset = 0;
          if (EditorOptions.outlineWidth % 2 != 0) offset = 0.5;
          canvas.strokeLine(
            Math.floor(from.getX()) + offset,
            Math.floor(from.getY()) + offset,
            Math.floor(to.getX()) + offset,
            Math.floor(to.getY()) + offset,
            EditorOptions.outlineWidth,
            context.highlightOutlineColor,
          );
        }
        this._visuals = null;
      }
    }
    // The outline colour adapts to the background read once per paint.
    context.computedBackgroundColor = null as unknown as Color;
  }

  override getBBox(transform: Transform): Rect | null {
    let box = super.getBBox(transform);
    if (this._transformBox) {
      let boxArea: Rect | null = this._transformBox._calculateGeometryBBox();
      if (boxArea && !boxArea.isEmpty()) {
        const options = EditorOptions.annotationHandles.tranformBox;
        const margin = EditorAnnotation.getAnnotationPaintMargin(options.size);
        boxArea = (transform ? transform.mapRect(boxArea) : boxArea).expanded(
          margin,
          margin,
          margin,
          margin,
        );
        box = box ? box.united(boxArea) : boxArea;
      }
    }
    return box;
  }

  override _detach(): void {
    if (this._transformBox) this.setTransformBoxActive(false);
  }

  override isRelativeToPage(): boolean {
    return false;
  }

  isTransformBoxActive(): boolean {
    return null != this._transformBox;
  }

  /**
   * Turns the transform box on (true or null) or off. On: built around
   * the selection, with its pivot at `center` (or kept when rebuilt) and
   * `flags` (TransformBox.TBoxFlag) when given.
   */
  setTransformBoxActive(
    active: boolean | null,
    center?: Point | null,
    flags?: number | null,
  ): void {
    if (active || null === active) {
      const selectionEditor = this._getGraphicEditor().getSelectionEditor();
      if (selectionEditor && !selectionEditor.hasFlag(BaseEditor.Flag.HideEditor)) {
        selectionEditor.setFlag(BaseEditor.Flag.HideEditor);
      } else if (!selectionEditor) {
        const selection = this._getGraphicEditor().getIndividualSelection();
        if (selection) {
          for (let i = 0; i < selection.length; ++i) {
            const editor = ElementEditor.openEditor(selection[i] as Node) as ElementEditor;
            if (!editor.hasFlag(BaseEditor.Flag.Outline)) editor.setFlag(BaseEditor.Flag.Outline);
          }
        }
      }
      if (!this._transformBox) {
        this._element.addEventListener(
          Element.GeometryChangeEvent,
          this._geometryChange,
          this,
          null,
        );
        this._getGraphicEditor().addEventListener(
          EditorStatics.SelectionChangedEvent,
          this._selectionChanged,
          this,
        );
      }
      if (flags) this._tBoxFlags = flags;
      this._updateSelectionTransformBox(center, !center && null != this._transformBox);
    } else {
      if (this._transformBox) {
        this._element.removeEventListener(Element.GeometryChangeEvent, this._geometryChange, this);
        this._getGraphicEditor().removeEventListener(
          EditorStatics.SelectionChangedEvent,
          this._selectionChanged,
          this,
        );
        this.requestInvalidation();
        this._transformBox = null;
        this._updateTBoxMode(TBoxMode.NA);
        this.requestInvalidation();
      }
      const selectionEditor = this._getGraphicEditor().getSelectionEditor();
      if (selectionEditor && selectionEditor.hasFlag(BaseEditor.Flag.HideEditor)) {
        selectionEditor.removeFlag(BaseEditor.Flag.HideEditor);
      } else if (!selectionEditor) {
        const selection = this._getGraphicEditor().getIndividualSelection();
        if (selection) {
          for (let i = 0; i < selection.length; ++i) {
            const editor = ElementEditor.getEditor(selection[i]);
            if (editor && editor.hasFlag(BaseEditor.Flag.Outline)) {
              editor.removeFlag(BaseEditor.Flag.Outline);
            }
          }
        }
      }
    }
  }

  getTransformBox(): TransformBox | null {
    return this._transformBox;
  }

  /** With a selection on a moved page, the repaint area carries the page offset. */
  override requestInvalidation(args?: unknown): void {
    let pageTransform: Transform | null = null;
    const selection = this._getGraphicEditor().getIndividualSelection();
    if (selection && selection.length) {
      const page = this._sceneNode().getActivePage();
      const position = page ? page.getPosition(true) : null;
      if (
        position &&
        !(GMath.isEqualEps(position.getX(), 0) && GMath.isEqualEps(position.getY(), 0))
      ) {
        pageTransform = new Transform(1, 0, 0, 1, position.getX(), position.getY());
      }
    }
    if (pageTransform) {
      if (args) (args as { pageTransform?: Transform }).pageTransform = pageTransform;
      else args = { pageTransform: pageTransform };
    }
    this._getGraphicEditor().requestInvalidation(this, args);
  }

  getTBoxMode(): number {
    return this._tBoxMode;
  }

  _updateTBoxMode(mode: number): void {
    this._tBoxMode = mode;
  }

  hideTransformBox(): void {
    if (this._transformBox) this._transformBox.hide();
    this.requestInvalidation();
  }

  showTransformBox(): void {
    if (this._transformBox) this._transformBox.show();
    this.requestInvalidation();
  }

  getTransformBoxCenter(): Point | null {
    return this._transformBox ? new Point(this._transformBox.cx, this._transformBox.cy) : null;
  }

  _applyTBoxCenterTransform(): void {
    if (this._transformBox && (this._transformBox.trf || this._transformBox.cTrf)) {
      this._getGraphicEditor().beginTransaction();
      try {
        this._transformBox.applyCenterTransform();
      } finally {
        this._getGraphicEditor().commitTransaction(
          Locale.get(new LocaleKey("GEditor", "action.move")),
        );
      }
      this.requestInvalidation();
    }
  }

  /**
   * The cursor of a transform box part. OUTSIDE falls through to ROTATE
   * (no break in the old code), so the rotation zone shows the round
   * rotate cursor instead of the segment's rotate cursor (see "Scene
   * editor rotation zone shows the plain rotate cursor" in QUESTIONS.md).
   */
  override getCursor(partId: unknown, partData?: unknown): unknown {
    let cursor: unknown = Cursor.Select;
    switch (partId) {
      case TransformBox.INSIDE:
        cursor = Cursor.SelectCross;
        break;
      case TransformBox.OUTSIDE:
        {
          // The old case had no break: the segment cursor it looked up was
          // overwritten by the ROTATE case below. Spelled out, as TypeScript
          // forbids the fall-through; the lookup stays (it throws without
          // part data, as before).
          const segmentCursor =
            Cursor.SelectRotate[(partData as { rotationSegment: number }).rotationSegment];
          void segmentCursor;
          cursor = Cursor.SelectRotateRound;
        }
        break;
      case TransformBox.Handles.ROTATE:
        cursor = Cursor.SelectRotateRound;
        break;
      case TransformBox.OUTLINE:
        cursor = partData ? Cursor.SelectSkewHoriz : Cursor.SelectSkewVert;
        break;
      case TransformBox.Handles.SKEW_HORIZONTAL:
        cursor = Cursor.SelectSkewHoriz;
        break;
      case TransformBox.Handles.SKEW_VERTICAL:
        cursor = Cursor.SelectSkewVert;
        break;
      case TransformBox.Handles.TOP_CENTER:
      case TransformBox.Handles.BOTTOM_CENTER:
        cursor = Cursor.SelectResizeVert;
        break;
      case TransformBox.Handles.LEFT_CENTER:
      case TransformBox.Handles.RIGHT_CENTER:
        cursor = Cursor.SelectResizeHoriz;
        break;
      case TransformBox.Handles.TOP_LEFT:
      case TransformBox.Handles.BOTTOM_RIGHT:
        cursor = Cursor.SelectResizeUpLeftDownRight;
        break;
      case TransformBox.Handles.TOP_RIGHT:
      case TransformBox.Handles.BOTTOM_LEFT:
        cursor = Cursor.SelectResizeUpRightDownLeft;
        break;
      case TransformBox.Handles.ROTATION_CENTER:
        cursor = Cursor.SelectArrowOnly;
    }
    return cursor;
  }

  /**
   * Hit tests the transform box at `location` (view) and remembers the
   * part; while dragging the dragged part stays (with its rotation segment
   * updated). In passive mode over the inside, collects the snap zones of
   * the selection box to paint. Returns whether the part changed.
   */
  updateTBoxUnderMouse(
    location: Point,
    transform: Transform,
    view: SceneEditorView,
  ): { newPInfo: boolean; partInfo: PartInfo | null } {
    let part: PartInfo;
    const selection = this._getGraphicEditor().getIndividualSelection();
    let position: Point | null = null;
    let changed = false;
    if (view.getViewConfiguration().multiPageView) {
      const page = this._sceneNode().getActivePage();
      position = page ? page.getPosition(true) : null;
    }
    const box = this._transformBox as TransformBox;
    if (this._tBoxData) {
      part = new PartInfo(
        this._tBoxData.editor as BaseEditor,
        this._tBoxData.id,
        this._tBoxData.data,
        undefined,
        undefined,
      );
      if (TransformBox.isRotating(part.id)) {
        (part.data as { rotationSegment: number }).rotationSegment = position
          ? box.getRotationSegment(
              location,
              transform.preMultiplied(new Transform(1, 0, 0, 1, position.getX(), position.getY())),
            )
          : box.getRotationSegment(location, transform);
      }
    } else {
      part = this.getTBoxPartInfoAt(
        location,
        transform,
        EditorOptions.pickDistance,
        view.getViewConfiguration().multiPageView,
      );
    }
    if (!(this._mouseInfo && this._mouseInfo.id == part.id && this._mouseInfo.data == part.data)) {
      this._mouseInfo = part;
      changed = true;
    }
    let viewBox: Rect | null = null;
    this._visuals = null;
    let selectionBox = EditorStatics.getGroupTransformBBox(selection, true);
    if (selectionBox && !selectionBox.isEmpty()) {
      if (position) selectionBox = selectionBox.translated(-position.getX(), -position.getY());
      if (
        this._tBoxMode == TBoxMode.PASSIVE &&
        (this._mouseInfo as PartInfo).id == TransformBox.INSIDE
      ) {
        viewBox = transform.mapRect(selectionBox);
        const zones = this._getGraphicEditor().getGuides().getBBoxSnapZones(viewBox, location);
        if (zones && zones.length) this._visuals = zones;
      }
    }
    let area: Rect | null = (this._visuals && viewBox && viewBox.expanded(2, 2, 2, 2)) || null;
    area = area ? view.getViewTransform().mapRect(area) : null;
    if (this._visualsArea || area) {
      this.requestInvalidation();
      this._visualsArea = area;
      this.requestInvalidation();
    }
    return { newPInfo: changed, partInfo: this._mouseInfo };
  }

  getTBoxPartInfoAt(
    location: Point,
    transform: Transform,
    tolerance: number,
    multiPageView?: unknown,
  ): PartInfo {
    if (multiPageView) {
      const page = this._sceneNode().getActivePage();
      const position = page ? page.getPosition(true) : null;
      if (position) {
        transform = transform.preMultiplied(
          new Transform(1, 0, 0, 1, position.getX(), position.getY()),
        );
      }
    }
    return (this._transformBox as TransformBox).getPartInfoAt(location, transform, tolerance, this);
  }

  /** Starts dragging `part` of the box: the mode follows the part. */
  startTBoxTransform(part: PartInfo | null): void {
    if (part) {
      if (this._visualsArea) {
        this.requestInvalidation();
        this._visualsArea = null;
      }
      this._tBoxData = new PartInfo(
        part.editor as BaseEditor,
        part.id,
        part.data,
        undefined,
        undefined,
      );
      if (TransformBox.isSkewing(this._tBoxData.id)) this._updateTBoxMode(TBoxMode.SKEW);
      else if (TransformBox.isRotating(this._tBoxData.id)) this._updateTBoxMode(TBoxMode.ROTATE);
      else if (
        (this._tBoxData.id as number) >= 0 &&
        (this._tBoxData.id as number) < TransformBox.Handles.ROTATION_CENTER
      ) {
        this._updateTBoxMode(TBoxMode.RESIZE);
      } else if (this._tBoxData.id == TransformBox.Handles.ROTATION_CENTER) {
        this._updateTBoxMode(TBoxMode.CNTRMOVE);
      } else this._updateTBoxMode(TBoxMode.TBOXMOVE);
      this.hideTransformBox();
    }
  }

  /**
   * Previews the drag from `start` to `current` (scene coordinates): the
   * pivot moves itself, everything else transforms the selection. A skew
   * snaps to 10 px steps with shift when no step is given.
   */
  transformTBox(
    start: Point,
    current: Point,
    transform: Transform,
    fromCenter?: unknown,
    keepRatio?: unknown,
    step?: number | null,
    multiPage?: unknown,
  ): Transform | null | undefined {
    if (this._tBoxMode != TBoxMode.PASSIVE && this._tBoxMode != TBoxMode.NA) {
      const guides = this._getGraphicEditor().getGuides();
      guides.useExclusions(this._getGraphicEditor().getAlignExclusions(false));
      guides.beginMap(this._getGraphicEditor().getMappingScopes());
      let snapStep = step;
      if (!snapStep && this._tBoxMode == TBoxMode.SKEW) snapStep = 10;
      const result = (this._transformBox as TransformBox).calculateTransformation(
        this._tBoxData as PartInfo,
        transform,
        start,
        current,
        guides,
        fromCenter,
        keepRatio,
        snapStep,
      );
      guides.finishMap();
      this.requestInvalidation();
      if (this._tBoxMode != TBoxMode.CNTRMOVE) {
        (this._transformBox as TransformBox).setTransform(result as Transform);
        const options = new EdTransformOptions();
        options.isMultiPage = !!multiPage;
        options.fullContentsTransform = true;
        this._getGraphicEditor().transformSelection(result as Transform, null, null, options);
      } else {
        (this._transformBox as TransformBox).setCenterTransform(result as Transform);
        this.requestInvalidation();
      }
      return result;
    }
    return null;
  }

  applyTBoxTransform(arg?: unknown): void {
    this._getGraphicEditor().getGuides().invalidate();
    if (this._tBoxMode == TBoxMode.CNTRMOVE) {
      this._applyTBoxCenterTransform();
      this.showTransformBox();
    } else this._getGraphicEditor().applySelectionTransform(arg, false, false, true);
    this._updateTBoxMode(TBoxMode.PASSIVE);
    this._tBoxData = null;
    this._mouseInfo = null;
  }

  /** Rebuilds the box around the selection (keeping the pivot with `keepCenter`). */
  _updateSelectionTransformBox(center?: Point | null, keepCenter?: unknown): void {
    this.requestInvalidation();
    const selection = this._getGraphicEditor().getIndividualSelection();
    if (selection && selection.length) {
      const oldBox = this._transformBox;
      let cx: number | null = null;
      let cy: number | null = null;
      if (center) {
        cx = center.getX();
        cy = center.getY();
      } else if (this._transformBox && keepCenter) {
        cx = this._transformBox.cx;
        cy = this._transformBox.cy;
      }
      this._transformBox = null;
      let box = EditorStatics.getGroupTransformBBox(selection, true);
      if (box) {
        const page = this._sceneNode().getActivePage();
        const position = page ? page.getPosition(true) : null;
        if (position) box = box.translated(-position.getX(), -position.getY());
        this._transformBox = new TransformBox(box, cx, cy, this._tBoxFlags, this.getElement());
      }
      const scene = this._sceneNode();
      const workspace = scene.getWorkspace();
      const recorder = workspace ? workspace.getTransactionRecorder() : null;
      if (recorder) recorder.afterTBoxChange(this.getElement(), oldBox, this._transformBox);
      this.requestInvalidation();
      if (this._transformBox) this._updateTBoxMode(TBoxMode.PASSIVE);
      else this._updateTBoxMode(TBoxMode.NA);
      this._tBoxData = null;
      this._mouseInfo = null;
      if (this._visualsArea) this._visualsArea = null;
    } else this.setTransformBoxActive(false);
  }

  _geometryChange(event: GeometryEvent): void {
    if (
      this._transformBox &&
      event.element.hasFlag(NodeFlag.Selected) &&
      (event.type == Element.GeometryChangeEvent.Type.After ||
        event.type == Element.GeometryChangeEvent.Type.Child)
    ) {
      if (this._transformBox.trf || this._transformBox.cTrf)
        this._transformBox.applyCenterTransform();
      this._updateSelectionTransformBox(null, true);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the event isn't read
  _selectionChanged(event?: unknown): void {
    this.setTransformBoxActive(true);
  }

  _getGraphicEditor(): SceneEditorHost {
    return (this._element as unknown as SceneLike).__graphic_editor__ as SceneEditorHost;
  }

  _sceneNode(): SceneLike {
    return this._element as unknown as SceneLike;
  }

  override toString(): string {
    return "[Object GSceneEditor]";
  }
}

Object.assign(SceneEditor.prototype, {
  _transformBox: null,
  _visuals: null,
  _visualsArea: null,
  _tBoxMode: TBoxMode.NA,
  _tBoxFlags: 0,
  _tBoxData: null,
  _mouseInfo: null,
});
