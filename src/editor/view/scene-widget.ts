// Old: chunk.vendor.js module 363 (GSceneWidget).
/**
 * The canvas view of a scene: scroll and zoom, the tile renderer the scene
 * paints into, and the element canvas on screen, which shows the rendered
 * tiles plus whatever subclasses paint over them (the editor overlay).
 *
 * Repaints are collected as dirty rectangles in two lists: the scene list
 * (the scene must be rendered again there) and the element list (only the
 * screen must be composited again). One animation frame later _repaint
 * renders and composites both. Scrolling moves the existing pixels and
 * renders only the strips that came into view (_panSubAreas); while a pan
 * or zoom lasts the renderer runs without WebGL, and when it ends the view
 * renders everything that was skipped (finishPan, finishZoom). The steps
 * of a zoom gesture scale the tiles painted before it (ZoomFromTiles).
 *
 * Left out: the old RendererConfig.ENABLE_TIMING console timers in
 * _paintScene and the render callbacks of _repaint. ENABLE_TIMING is
 * always false, and the timers never paired up ("Compositing time" was
 * never ended, "rendering" ended but never started). The debug-canvas
 * clear in _scheduleRendering checks for a window for real; the old
 * check (`void 0 !== typeof window`) was always true. Both only matter
 * with debug flags that are off.
 */
import { Event } from "../../engine/core/event.ts";
import { MouseEvent, type MouseWheelEvent } from "../../engine/core/mouse-event.ts";
import { registerClass } from "../../engine/core/object.ts";
import { Platform } from "../../engine/core/platform.ts";
import { Hardware, System } from "../../engine/core/system.ts";
import { GMath } from "../../engine/math/math.ts";
import { Point } from "../../engine/math/point.ts";
import { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import { DirtyList, type DirtyMatcher } from "../../engine/paint/dirty-list.ts";
import { GLTextures } from "../../engine/paint/gl-textures.ts";
import { PaintCanvas, type Canvas2DPaintCanvas } from "../../engine/paint/paint-canvas.ts";
import { PaintContext } from "../../engine/paint/paint-context.ts";
import type { RenderParameters } from "../../engine/paint/render-job.ts";
import { RenderScheduler } from "../../engine/paint/render-scheduler.ts";
import { RendererConfig } from "../../engine/paint/renderer-config.ts";
import { ScenePaintConfiguration } from "../../engine/paint/scene-paint-configuration.ts";
import { TileRenderer } from "../../engine/paint/tile-renderer.ts";
import { AfterFlagChangeEvent } from "../../engine/scene/node-events.ts";
import { NodeFlag } from "../../engine/scene/node-change.ts";
import { Page } from "../../engine/scene/page.ts";
import { SceneOptions } from "../../engine/scene/scene-options.ts";
import {
  InvalidationFinishedEvent,
  InvalidationRequestEvent,
  RecordedTransactionFinishedEvent,
  RecordedTransactionStartedEvent,
  type Scene,
} from "../../engine/scene/scene.ts";
import { ZOOM_LIMITS, ZOOM_STOPS } from "./zoom.ts";
import { RulerWidget } from "./ruler-widget.ts";
import { Widget } from "./widget.ts";

// Module load: the renderer and its parameters, as the old module set
// them up when the engine bundle loaded.
RenderScheduler.init(RendererConfig.ENABLE_RENDERER, RendererConfig.ENABLE_DEBUG);
RenderScheduler.setRenderParameters({ offscreen: RendererConfig.USE_OFFSCREEN_ALWAYS });

/**
 * True from the start of a scene render until its final callback. While
 * it is set, a scheduled frame waits for the next frame instead of
 * running (one flag for every view, as in the old module).
 */
let renderInProgress = false;

/**
 * Not in the old app, which rendered the whole scene again on every step
 * of a zoom gesture (beginZoom to finishZoom: Ctrl + wheel, a trackpad
 * pinch). With `enabled`, a step only draws the tiles painted before the
 * gesture scaled to the view, without the page shadow, and the scene is
 * rendered once no step came for `renderAfterMs`, with the gesture's
 * render parameters: the render the old app made after each step, made
 * after the last one. finishZoom then renders everything at full
 * quality, as before. Kept out of RendererConfig, whose keys the parity
 * suite records.
 */
export const ZoomFromTiles = { enabled: true, renderAfterMs: 100 };

/** Fired after the view's zoom or scroll changed. */
export class SceneWidgetTransformEvent extends Event {
  static {
    registerClass(this, "GSceneWidget.TransformEvent");
  }

  override toString(): string {
    return "[Object GSceneWidget.TransformEvent]";
  }
}

/** The options of every scene view. */
export interface SceneWidgetOptions {
  minZoomFactor: number;
  maxZoomFactor: number;
  panOrZoomOnWheel: boolean;
  limitScrollingToView: boolean;
  pinchToZoomFactor: number;
}

/**
 * What a subclass sets up before the view builds itself: the old
 * subclasses assigned their fields before calling the GSceneWidget
 * constructor, which already calls their overrides.
 */
export interface SceneWidgetSetup {
  /** The configuration the view paints with; a ScenePaintConfiguration otherwise. */
  viewConfiguration?: ScenePaintConfiguration;
  /** Runs first, before any of the view's own setup. */
  init?: (widget: SceneWidget) => void;
}

/** Hands `widget` and the render result to a render callback. */
type RenderCallback = (
  graphic: HTMLCanvasElement | null,
  finished: boolean,
  skipped: boolean,
) => void;

/** A paint context field the old code read although it never existed. */
interface MaybeNoWebGL {
  noWebGL?: boolean;
}

export class SceneWidget extends Widget {
  static {
    registerClass(this, "GSceneWidget");
  }

  static UPDATEHEIGHT = 50;
  static GRAVIT_IME = "gravit-ime-textarea-608209";
  static options: SceneWidgetOptions = {
    minZoomFactor: ZOOM_LIMITS.min,
    maxZoomFactor: ZOOM_LIMITS.max,
    panOrZoomOnWheel: true,
    limitScrollingToView: false,
    pinchToZoomFactor: 100,
  };
  static TransformEvent = SceneWidgetTransformEvent;
  static TRANSFORMEVENT = new SceneWidgetTransformEvent();

  declare _repaintRequestFrameId: number | null;
  declare _resizeRequestFrameId: number | null;
  declare _finishPanRequestFrameId: number | null;
  declare _scene: Scene;
  declare _dirtyElementList: DirtyList;
  declare _dirtySceneList: DirtyList;
  declare _elementCanvas: Canvas2DPaintCanvas;
  declare _debugCanvas: Canvas2DPaintCanvas | null;
  declare _elementPaintContext: PaintContext;
  declare _sceneCanvas: TileRenderer;
  declare _panHelperCanvas: Canvas2DPaintCanvas;
  declare _watermarkHelperCanvas: Canvas2DPaintCanvas;
  declare _scenePaintContext: PaintContext;
  declare _horizontalRuler: RulerWidget | null;
  declare _verticalRuler: RulerWidget | null;
  declare _unitRuler: RulerWidget | null;
  declare _inlineHintDiv: HTMLDivElement;
  declare _fakeTextDiv: HTMLDivElement;
  declare _fakeTextBox: HTMLTextAreaElement;
  declare _viewOffset: number[];
  declare _viewMargin: number[];
  declare _scrollX: number;
  declare _scrollY: number;
  declare _scrollDX: number;
  declare _scrollDY: number;
  declare _zoom: number;
  declare _logicalPixels: boolean;
  declare _worldToViewTransform: Transform | null;
  declare _viewToWorldTransform: Transform | null;
  declare _lastInvalidatedWtoVtransform: Transform | null;
  declare _lastInvalidatedVtoWtransform: Transform | null;
  declare _panSubAreas: Rect[] | null;
  declare _cumulativeInvalidationArea: Rect[] | null;
  declare _viewConfiguration: ScenePaintConfiguration;
  declare _pendingInvalidationEvent: boolean;
  declare _duringRecordedTransaction: boolean;
  declare _zoomSteps: number[];
  /** A pending wheel timer id, or false/null when none runs. */
  declare _wheelScrollingOrZooming: ReturnType<typeof setTimeout> | boolean | null;
  declare _isPanning: boolean;
  declare _isZooming: boolean;
  /** The copy the tiles are scaled through when a zoom gesture stops drawing them scaled. */
  declare _zoomTiles: Canvas2DPaintCanvas | null;
  /** World to view of what the tiles show while a zoom gesture draws them scaled, null otherwise. */
  declare _zoomTilesTransform: Transform | null;
  /** The render a zoom gesture owes once its steps pause (ZoomFromTiles). */
  declare _zoomRenderTimer: ReturnType<typeof setTimeout> | null;

  constructor(scene: Scene, container?: HTMLElement | null, setup?: SceneWidgetSetup) {
    super(container);
    if (setup && setup.init) setup.init(this);
    if (setup && setup.viewConfiguration) this._viewConfiguration = setup.viewConfiguration;
    this._inputHtmlElement = this._createHTMLElement(true);
    this._htmlElement.appendChild(this._inputHtmlElement);
    this._htmlElement.className += " g-scene-widget";
    this._scene = scene;
    scene.increaseReferenceCounter();
    this._viewOffset = [0, 0, 0, 0];
    this._viewMargin = [0, 0, 0, 0];
    this._logicalPixels = true;
    if (!this._viewConfiguration) {
      this._viewConfiguration = new ScenePaintConfiguration();
      this._viewConfiguration.enableFxCache = !RendererConfig.WORKER_RENDERING_ENABLED;
    }
    if (SceneWidget.options.panOrZoomOnWheel)
      this.addEventListener(MouseEvent.Wheel, this._wheelListener, this);
    this.addEventListener(MouseEvent.Leave, this._leaveListener, this);
    this.addEventListener(MouseEvent.Enter, this._enterListener, this);
    this._dirtyElementList = new DirtyList();
    this._dirtySceneList = new DirtyList();
    this._elementCanvas = new PaintCanvas();
    this._elementCanvas.setRenderAlgorithm(PaintCanvas.RenderAlgorithm.Pixelated);
    this._elementCanvas.setImageSmoothingQuality(PaintCanvas.SmoothingQuality.Low);
    this._elementPaintContext = new PaintContext();
    this._elementPaintContext.configuration = this._viewConfiguration;
    this._elementPaintContext.canvas = this._elementCanvas;
    const elementCanvas = this._elementCanvas._canvasContext.canvas;
    elementCanvas.style.position = "absolute";
    elementCanvas.style.left = "0px";
    elementCanvas.style.top = "0px";
    this._htmlElement.insertBefore(elementCanvas, this._htmlElement.firstChild);
    if (RendererConfig.DEBUG_AREAS !== RendererConfig.DBG_AREAS_INFO.None) {
      this._debugCanvas = new PaintCanvas();
      const debugCanvas = this._debugCanvas._canvasContext.canvas;
      debugCanvas.style.position = "absolute";
      debugCanvas.style.left = "0px";
      debugCanvas.style.top = "0px";
      this._htmlElement.appendChild(debugCanvas);
    }
    if (System.hardware !== Hardware.Desktop) {
      RendererConfig.DELETE_EFFECT_TEXTURES_AFTER_DRAW = true;
      RendererConfig.DELETE_BLEND_AND_GRADIENT_TEXTURES_AFTER_DRAW = true;
    }
    this._panHelperCanvas = new PaintCanvas();
    this._panHelperCanvas.setRenderAlgorithm(PaintCanvas.RenderAlgorithm.Crisp);
    this._panHelperCanvas.setImageSmoothingQuality(PaintCanvas.SmoothingQuality.High);
    this._panHelperCanvas.prepare();
    this._sceneCanvas = new TileRenderer(
      RendererConfig.CANVAS_GRID_HORIZONTAL,
      RendererConfig.CANVAS_GRID_VERTICAL,
    );
    this._sceneCanvas.setRenderAlgorithm(PaintCanvas.RenderAlgorithm.Crisp);
    this._sceneCanvas.setImageSmoothingQuality(PaintCanvas.SmoothingQuality.High);
    this._scenePaintContext = new PaintContext();
    this._scenePaintContext.configuration = this._viewConfiguration;
    this._watermarkHelperCanvas = new PaintCanvas();
    this._watermarkHelperCanvas.setRenderAlgorithm(PaintCanvas.RenderAlgorithm.Crisp);
    this._watermarkHelperCanvas.setImageSmoothingQuality(PaintCanvas.SmoothingQuality.High);
    this._watermarkHelperCanvas.prepare();
    this._inlineHintDiv = document.createElement("div");
    this._inlineHintDiv.className = "inline-hint";
    this._inlineHintDiv.style.position = "absolute";
    this._inlineHintDiv.style.display = "none";
    this._htmlElement.appendChild(this._inlineHintDiv);
    // A hidden text box that takes text input (and IME composition) while
    // a text is edited inline.
    this._fakeTextDiv = document.createElement("div");
    this._fakeTextDiv.style.overflow = "hidden";
    this._fakeTextDiv.style.position = "absolute";
    this._fakeTextDiv.style.height = "0px";
    this._fakeTextDiv.style.display = "none";
    this._fakeTextBox = document.createElement("textarea");
    this._fakeTextBox.setAttribute("autocorrect", "off");
    this._fakeTextBox.setAttribute("autocapitalize", "off");
    this._fakeTextBox.setAttribute("spellcheck", "false");
    this._fakeTextBox.setAttribute("tabindex", "0");
    this._fakeTextBox.className = SceneWidget.GRAVIT_IME;
    this._fakeTextBox.style.position = "absolute";
    this._fakeTextBox.style.padding = "0px";
    this._fakeTextBox.style.width = "1000px";
    this._fakeTextBox.style.height = "1em";
    this._fakeTextBox.style.outline = "none";
    this._fakeTextBox.style.fontSize = "4px";
    this._fakeTextDiv.appendChild(this._fakeTextBox);
    this._htmlElement.appendChild(this._fakeTextDiv);
    scene.addEventListener(
      AfterFlagChangeEvent,
      this._afterFlagChange,
      this,
      undefined,
      undefined,
      true,
    );
    scene.addEventListener(
      InvalidationRequestEvent,
      this._sceneInvalidationRequest,
      this,
      undefined,
      undefined,
      true,
    );
    scene.addEventListener(
      RecordedTransactionStartedEvent,
      this._recordedTransactionStarted,
      this,
      undefined,
      undefined,
      true,
    );
    scene.addEventListener(
      RecordedTransactionFinishedEvent,
      this._recordedTranactionFinished,
      this,
      undefined,
      undefined,
      true,
    );
    this._updateViewTransforms(true, true);
  }

  hasRulers(): boolean {
    return null !== this._horizontalRuler;
  }

  /** All rendered tiles in one canvas. */
  getSceneCanvas(): Canvas2DPaintCanvas {
    return this._sceneCanvas.getConsolidatedCanvas();
  }

  /**
   * Shows `html` (newlines become line breaks) at `position` (device
   * pixels), anchored at `side` of the hint; no text hides the hint.
   */
  updateInlineHint(html?: string | null, position?: Point | null, side?: string): void {
    if (html && position) {
      side = side || Rect.Side.CENTER;
      html = html.replace(/\n/gi, "<br>");
      this._inlineHintDiv.innerHTML = html;
      let x = position.getX();
      let y = position.getY();
      const width = this._inlineHintDiv.offsetWidth;
      const height = this._inlineHintDiv.offsetHeight;
      const dpi = PaintCanvas.getScreenDPI();
      if (1 !== dpi) {
        x /= dpi;
        y /= dpi;
      }
      switch (side) {
        case Rect.Side.TOP_LEFT:
          break;
        case Rect.Side.TOP_CENTER:
          x -= width / 2;
          break;
        case Rect.Side.TOP_RIGHT:
          x -= width;
          break;
        case Rect.Side.RIGHT_CENTER:
          x -= width;
          y -= height / 2;
          break;
        case Rect.Side.BOTTOM_RIGHT:
          x -= width;
          y -= height;
          break;
        case Rect.Side.BOTTOM_CENTER:
          x -= width / 2;
          y -= height;
          break;
        case Rect.Side.BOTTOM_LEFT:
          y -= height;
          break;
        case Rect.Side.LEFT_CENTER:
          y -= height / 2;
          break;
        case Rect.Side.CENTER:
          y -= height / 2;
          x -= width / 2;
      }
      this._inlineHintDiv.style.left = x + "px";
      this._inlineHintDiv.style.top = y + "px";
      this._inlineHintDiv.style.display = "";
    } else this._inlineHintDiv.style.display = "none";
  }

  /** Shows or hides the horizontal and vertical rulers and the unit box. */
  setRulers(visible: boolean): void {
    if (visible && !this._horizontalRuler) {
      this._horizontalRuler = new RulerWidget(RulerWidget.Orientation.Horizontal, this._scene);
      this._verticalRuler = new RulerWidget(RulerWidget.Orientation.Vertical, this._scene);
      this._unitRuler = new RulerWidget(
        null,
        this._scene,
        undefined,
        true,
        this._viewConfiguration,
      );
      this._htmlElement.insertBefore(this._horizontalRuler._htmlElement, this._inlineHintDiv);
      this._htmlElement.insertBefore(this._verticalRuler._htmlElement, this._inlineHintDiv);
      this._htmlElement.insertBefore(this._unitRuler._htmlElement, this._inlineHintDiv);
      this._relayoutRulers();
      this.addEventListener(MouseEvent.Move, this._rulerMouseMoveListener, this);
    } else if (!visible && this._horizontalRuler) {
      const vertical = this._verticalRuler as RulerWidget;
      const unit = this._unitRuler as RulerWidget;
      this._htmlElement.removeChild(this._horizontalRuler._htmlElement);
      this._htmlElement.removeChild(vertical._htmlElement);
      this._htmlElement.removeChild(unit._htmlElement);
      this._horizontalRuler.release();
      vertical.release();
      unit.release();
      this._horizontalRuler = null;
      this._verticalRuler = null;
      this._unitRuler = null;
      this.removeEventListener(MouseEvent.Move, this._rulerMouseMoveListener, this);
    }
  }

  /**
   * Resizes the view to `width` x `height` CSS pixels (rounded). Canvases
   * get device pixels and everything is repainted; while a repaint or a
   * pan finish is pending, the resize waits for the next frame. `done`
   * runs after the resize.
   */
  override resize(width: number, height: number, force?: boolean, done?: () => void): void {
    width = Math.round(width);
    height = Math.round(height);
    if (width === this._width && height === this._height && !force) return;
    super.resize(width, height);
    const apply = (): void => {
      const input = this._inputHtmlElement as HTMLDivElement;
      input.style.width = this._htmlElement.style.width;
      input.style.height = this._htmlElement.style.height;
      const dpi = PaintCanvas.getScreenDPI();
      this._elementCanvas.resize(width * dpi, height * dpi);
      this._elementCanvas._canvasContext.canvas.style.width = width + "px";
      this._elementCanvas._canvasContext.canvas.style.height = height + "px";
      if (RendererConfig.DEBUG_AREAS !== RendererConfig.DBG_AREAS_INFO.None) {
        const debugCanvas = this._debugCanvas as Canvas2DPaintCanvas;
        debugCanvas.resize(width * dpi, height * dpi);
        debugCanvas._canvasContext.canvas.style.width = width + "px";
        debugCanvas._canvasContext.canvas.style.height = height + "px";
      }
      this._sceneCanvas.resize(width * dpi, height * dpi);
      this._panHelperCanvas.resize(width * dpi, height * dpi);
      this._watermarkHelperCanvas.resize(width * dpi, height * dpi);
      const elementArea = new Rect(0, 0, width * dpi, height * dpi);
      const sceneArea = new Rect(0, 0, width * dpi, height * dpi);
      this._dirtyElementList.setArea(elementArea);
      this._dirtySceneList.setArea(sceneArea);
      this.invalidate(null, true);
      this._relayoutRulers();
      if (done) done();
    };
    if (this._repaintRequestFrameId || this._finishPanRequestFrameId) {
      // A resize still waiting is dropped with its `done` (see "A deferred
      // resize drops the done callback of the one it replaces" in
      // QUESTIONS.md).
      if (this._resizeRequestFrameId) {
        Platform.cancelFrame(this._resizeRequestFrameId);
        this._resizeRequestFrameId = null;
      }
      this._scheduleRendering(() => {
        this.resize(width, height, true, done);
      }, true);
    } else apply();
  }

  /**
   * Runs `callback` on the next animation frame, as a resize (`resize`),
   * a pan finish (`finishPan`) or a repaint. While a scene render is in
   * progress the frame is pushed back to the next one, as long as the
   * request was not cancelled in between.
   */
  _scheduleRendering(callback: () => void, resize?: boolean, finishPan?: boolean): void {
    const run = (): void => {
      if (renderInProgress) {
        if (resize) {
          if (null !== this._resizeRequestFrameId)
            this._resizeRequestFrameId = Platform.scheduleFrame(run);
        } else if (finishPan) {
          if (null !== this._finishPanRequestFrameId)
            this._finishPanRequestFrameId = Platform.scheduleFrame(run);
        } else if (null !== this._repaintRequestFrameId)
          this._repaintRequestFrameId = Platform.scheduleFrame(run);
      } else {
        if (
          RendererConfig.DEBUG_AREAS !== RendererConfig.DBG_AREAS_INFO.None &&
          "undefined" !== typeof window
        ) {
          window.setTimeout(() => {
            const debugCanvas = this._debugCanvas as Canvas2DPaintCanvas;
            debugCanvas.clearRect(0, 0, debugCanvas.getWidth(), debugCanvas.getHeight());
          }, 2000);
        }
        callback();
      }
    };
    if (resize) this._resizeRequestFrameId = Platform.scheduleFrame(run);
    else if (finishPan) this._finishPanRequestFrameId = Platform.scheduleFrame(run);
    else this._repaintRequestFrameId = Platform.scheduleFrame(run);
  }

  getScene(): Scene {
    return this._scene;
  }

  getViewConfiguration(): ScenePaintConfiguration {
    return this._viewConfiguration;
  }

  /** CSS pixels on each side (left, top, right, bottom) covered by panels. */
  getViewOffset(): number[] {
    return this._viewOffset;
  }

  setViewOffset(offset: number[] | null | undefined): void {
    this._viewOffset = [0, 0, 0, 0];
    if (offset && offset.length > 0) {
      for (let i = 0; i < Math.min(4, offset.length); ++i)
        this._viewOffset[i] = offset[i] as number;
      this._relayoutRulers();
    }
  }

  /** CSS pixels kept free inside the view offset (zooming to fit leaves them out). */
  getViewMargin(): number[] {
    return this._viewMargin;
  }

  setViewMargin(margin: number[] | null | undefined): void {
    this._viewMargin = [0, 0, 0, 0];
    if (margin && margin.length > 0) {
      for (let i = 0; i < Math.min(4, margin.length); ++i) {
        this._viewMargin[i] = margin[i] as number;
        this.invalidate();
      }
    }
  }

  getScrollX(): number {
    return this._scrollX;
  }

  getScrollY(): number {
    return this._scrollY;
  }

  getZoom(): number {
    return this._zoom;
  }

  /** The zoom in device pixels per point: the zoom times the screen DPI. */
  getLogicalZoom(): number {
    return this._logicalPixels ? this._zoom * PaintCanvas.getScreenDPI() : this._zoom;
  }

  isLogicalPixels(): boolean {
    return this._logicalPixels;
  }

  setLogicalPixels(logicalPixels: boolean): void {
    if (this._logicalPixels !== logicalPixels) {
      this._logicalPixels = logicalPixels;
      this._updateViewTransforms();
    }
  }

  /**
   * World to view (device pixels) for `page` (or the scene, or no page):
   * pages add their position.
   */
  getWorldTransform(page?: Page | Scene | null): Transform {
    if (page === this._scene) return this._worldToViewTransform as Transform;
    const target = page as Page | null | undefined;
    let transform = this._worldToViewTransform as Transform;
    if (target) {
      const position = target.getPosition(this._viewConfiguration.multiPageView);
      transform = transform.preMultiplied(
        new Transform(1, 0, 0, 1, position.getX(), position.getY()),
      );
    }
    return transform;
  }

  /** View (device pixels) to world for `page`; the inverse of getWorldTransform. */
  getViewTransform(page?: Page | Scene | null): Transform {
    if (page === this._scene) return this._viewToWorldTransform as Transform;
    const target = page as Page | null | undefined;
    let transform = this._viewToWorldTransform as Transform;
    if (target) {
      const position = target.getPosition(this._viewConfiguration.multiPageView);
      transform = transform.multiplied(
        new Transform(1, 0, 0, 1, -position.getX(), -position.getY()),
      );
    }
    return transform;
  }

  /**
   * The visible part in CSS pixels: the view minus the offset, and minus
   * the margin unless `noMargin`.
   */
  getViewBox(noMargin?: boolean): Rect {
    const left = (this._viewOffset[0] as number) + (noMargin ? 0 : (this._viewMargin[0] as number));
    const top = (this._viewOffset[1] as number) + (noMargin ? 0 : (this._viewMargin[1] as number));
    return new Rect(
      left,
      top,
      this.getWidth() -
        ((this._viewOffset[2] as number) + (noMargin ? 0 : (this._viewMargin[2] as number)) + left),
      this.getHeight() -
        ((this._viewOffset[3] as number) + (noMargin ? 0 : (this._viewMargin[3] as number)) + top),
    );
  }

  _getSceneRect(): Rect {
    return new Rect(0, 0, this._sceneCanvas.getWidth(), this._sceneCanvas.getHeight());
  }

  /** Sets scroll and zoom at once. */
  transform(scrollX: number, scrollY: number, zoom: number): void {
    this._zoom = zoom;
    this._correctScrollPosition(scrollX, scrollY);
    this._updateViewTransforms();
  }

  /**
   * Zooms to `zoom` (clamped to the zoom limits; the current zoom when
   * not given) with world point `center` in the middle of the view box.
   */
  zoomAtCenter(center: Point, zoom?: number): void {
    zoom = zoom || this._zoom;
    const dpi = PaintCanvas.getScreenDPI();
    const viewCenter = this.getViewBox().scaled(dpi, dpi).getSide(Rect.Side.CENTER);
    const mapped = this.getWorldTransform().mapPoint(center);
    const clamped = Math.min(
      SceneWidget.options.maxZoomFactor,
      Math.max(zoom, SceneWidget.options.minZoomFactor),
    );
    if (clamped != this._zoom || !Point.equals(mapped, viewCenter)) {
      this._zoom = clamped;
      const logical = this.getLogicalZoom();
      const matrix = new Transform()
        .translated(-center.getX(), -center.getY())
        .scaled(logical, logical)
        .translated(viewCenter.getX(), viewCenter.getY())
        .getMatrix();
      const scrollX = -(matrix[4] as number);
      const scrollY = -(matrix[5] as number);
      this._correctScrollPosition(scrollX, scrollY);
      this._updateViewTransforms();
    }
  }

  /** Zooms to `zoom` keeping world point `point` where it is on screen. */
  zoomAt(point: Point, zoom: number): void {
    const dpi = PaintCanvas.getScreenDPI();
    const viewCenter = this.getViewBox().scaled(dpi, dpi).getSide(Rect.Side.CENTER);
    const offset = this.getViewTransform().mapPoint(viewCenter).subtract(point);
    const factor = zoom / this._zoom;
    this.zoomAtCenter(
      new Point(point.getX() + offset.getX() / factor, point.getY() + offset.getY() / factor),
      zoom,
    );
  }

  /**
   * Fits `area` into the view box. With `reduceOnly` it only zooms out.
   * With `relativeToPage` in the multi-page view, `area` is in page
   * coordinates of the active page.
   */
  zoomAll(area: Rect, reduceOnly?: boolean, relativeToPage?: boolean): void {
    let center = area.getSide(Rect.Side.CENTER);
    const width = area.getWidth();
    const height = area.getHeight();
    const viewBox = this.getViewBox();
    if (relativeToPage && this._viewConfiguration.multiPageView) {
      const page = this._scene.getActivePage();
      if (page) center = center.add(page.getPosition(true));
    }
    if (reduceOnly) {
      const mapped = this.getWorldTransform().mapRect(
        new Rect(center.getX() - width / 2, center.getY() - height / 2, width, height),
      );
      const zoom =
        this._zoom *
        Math.min(
          1,
          Math.max(
            mapped.getWidth() / viewBox.getWidth(),
            mapped.getHeight() / viewBox.getHeight(),
          ),
        );
      this.zoomAtCenter(center, zoom);
    } else
      this.zoomAtCenter(
        center,
        1 / Math.max(width / viewBox.getWidth(), height / viewBox.getHeight()),
      );
  }

  /**
   * Scrolls by device pixels; moves under half a pixel are ignored (null).
   * Returns the scroll actually made.
   */
  scrollBy(dx: number, dy: number): Point | null {
    if ((0 != dx && Math.abs(dx) > 0.5) || (0 != dy && Math.abs(dy) > 0.5)) {
      this._correctScrollPosition(this._scrollX + dx, this._scrollY + dy);
      this._updateViewTransforms();
      return new Point(this._scrollDX, this._scrollDY);
    }
    return null;
  }

  /** Drops the cached tiles of `area` (everything by default) and repaints it. */
  invalidateAndResetCache(area?: Rect | null): void {
    if (!area) area = this._dirtySceneList.getArea();
    if (area && !area.isEmpty()) {
      this._sceneCanvas.setDirtyCache(area, this.getLogicalZoom(), this._scrollX, this._scrollY);
      this.invalidate(area, true);
    }
  }

  /**
   * Marks `area` (device pixels; everything when null) dirty and schedules
   * a repaint. With `scene` the scene is rendered again there, and the
   * screen is composited again in `elementArea` (the same area when
   * undefined, everything when null). Returns whether anything became
   * dirty; when nothing did and nothing is pending, the scene gets an
   * InvalidationFinishedEvent (after a recorded transaction ends, if one
   * runs).
   */
  invalidate(area?: Rect | null, scene?: boolean, elementArea?: Rect | null): boolean {
    // A scene change during a zoom gesture is painted over the scaled
    // tiles; the gesture's render still follows when its steps pause.
    if (scene && this._zoomTilesTransform) this._endZoomFromTiles();
    const list = scene ? this._dirtySceneList : this._dirtyElementList;
    if (area) {
      if (area.isEmpty()) return false;
    } else {
      list.reset();
      area = list.getArea();
    }
    if (area && list.dirty(area.getX(), area.getY(), area.getWidth(), area.getHeight())) {
      if (scene) {
        if (RendererConfig.DEBUG_AREAS & RendererConfig.DBG_AREAS_INFO.Scene)
          (this._debugCanvas as Canvas2DPaintCanvas).fillRect(
            area.getX(),
            area.getY(),
            area.getWidth(),
            area.getHeight(),
            "#f00",
            0.2,
          );
        if (null === elementArea) {
          this._dirtyElementList.reset();
          elementArea = this._dirtyElementList.getArea();
        } else if (undefined === elementArea) elementArea = area;
        const element = elementArea as Rect;
        this._dirtyElementList.dirty(
          element.getX(),
          element.getY(),
          element.getWidth(),
          element.getHeight(),
        );
      } else if (RendererConfig.DEBUG_AREAS & RendererConfig.DBG_AREAS_INFO.Editor) {
        (this._debugCanvas as Canvas2DPaintCanvas).fillRect(
          area.getX(),
          area.getY(),
          area.getWidth(),
          area.getHeight(),
          "#0f0",
          0.05,
        );
      }
      if (null == this._repaintRequestFrameId) this._scheduleRendering(this._repaint.bind(this));
      return true;
    }
    if (null === this._repaintRequestFrameId && null === this._finishPanRequestFrameId) {
      if (this._duringRecordedTransaction) this._pendingInvalidationEvent = true;
      else
        this._scene.trigger(
          new InvalidationFinishedEvent(this._scene, this._viewConfiguration, false),
        );
    }
    return false;
  }

  _recordedTransactionStarted(): void {
    this._duringRecordedTransaction = true;
  }

  // The old name, typo included.
  _recordedTranactionFinished(): void {
    this._duringRecordedTransaction = false;
    if (this._scene && null === this._repaintRequestFrameId && this._pendingInvalidationEvent)
      this._scene.trigger(
        new InvalidationFinishedEvent(this._scene, this._viewConfiguration, false),
      );
    this._pendingInvalidationEvent = false;
  }

  /**
   * Lets go of everything: rulers, listeners (also every listener on the
   * scene, its dictionaries, its editor and its pages, persistent ones
   * included), canvases and pending frames, and releases the scene's
   * dictionaries.
   */
  release(): void {
    this.setRulers(false);
    this.removeAllEventListeners(true);
    this._scene.removeAllEventListeners(true);
    this._scene.getDictionary().removeAllEventListeners(true);
    this._scene.getSymbolDictionary().removeAllEventListeners(true);
    const editor = (
      this._scene as Scene & {
        __graphic_editor__?: { removeAllEventListeners(force?: boolean): void };
      }
    ).__graphic_editor__;
    if (editor) editor.removeAllEventListeners(true);
    this._scene.iteratePages((page) => {
      page.removeAllEventListeners(true);
    }, true);
    this._scene.decreaseReferenceCounter();
    this._cancelZoomRender();
    this._zoomTilesTransform = null;
    if (this._zoomTiles) {
      this._zoomTiles.destroy();
      this._zoomTiles = null;
    }
    this._sceneCanvas.destroy();
    if (this._debugCanvas) this._debugCanvas.destroy();
    this._panHelperCanvas.destroy();
    this._watermarkHelperCanvas.destroy();
    this._elementCanvas.destroy();
    this._scenePaintContext.destroy();
    this._elementPaintContext.destroy();
    this._scene.releaseDictionaries();
    GLTextures.destroyTextures();
    this._pendingInvalidationEvent = false;
    this._duringRecordedTransaction = false;
    if (this._repaintRequestFrameId) {
      Platform.cancelFrame(this._repaintRequestFrameId);
      this._repaintRequestFrameId = null;
    }
    if (this._resizeRequestFrameId) {
      Platform.cancelFrame(this._resizeRequestFrameId);
      this._resizeRequestFrameId = null;
    }
    if (this._finishPanRequestFrameId) {
      Platform.cancelFrame(this._finishPanRequestFrameId);
      this._finishPanRequestFrameId = null;
    }
  }

  /**
   * Takes the new scroll position. With limitScrollingToView it keeps the
   * content within reach; nothing turns it on (see "limitScrollingToView
   * and the view watermark are unused" in QUESTIONS.md).
   */
  _correctScrollPosition(scrollX: number, scrollY: number): void {
    const previousX = this._scrollX;
    const previousY = this._scrollY;
    if (previousX === scrollX && previousY === scrollY) return;
    this._scrollDX = scrollX - previousX;
    this._scrollDY = scrollY - previousY;
    this._scrollX = scrollX;
    this._scrollY = scrollY;
    if (!SceneWidget.options.limitScrollingToView) return;
    this._limitScrollPosition(previousX, previousY);
  }

  /** The limitScrollingToView part of _correctScrollPosition. */
  _limitScrollPosition(previousX: number, previousY: number): void {
    const dpi = PaintCanvas.getScreenDPI();
    const viewBox = this.getViewBox().scaled(dpi, dpi);
    const multiPageView = this._viewConfiguration.multiPageView;
    const output = this._viewConfiguration.paintMode === ScenePaintConfiguration.PaintMode.Output;
    // The old code used both boxes without a null check.
    const sceneBox = (): Rect =>
      (output
        ? this._scene.getGeometryBBox(false, multiPageView)
        : this._scene.getPaintBBox(multiPageView)) as Rect;
    let contentBox: Rect | null = sceneBox().scaled(this.getLogicalZoom(), this.getLogicalZoom());
    const translationTo = (target: Point, source: Point): Point =>
      new Transform()
        .translated(-source.getX(), -source.getY())
        .scaled(this.getLogicalZoom(), this.getLogicalZoom())
        .translated(target.getX(), target.getY())
        .getTranslation();
    const gap = (1 * (SceneOptions.pageGap || 20)) / this.getLogicalZoom();
    const centered = translationTo(
      viewBox.getSide(Rect.Side.CENTER),
      sceneBox().getSide(Rect.Side.CENTER),
    );
    const bottomRight = viewBox.getSide(Rect.Side.BOTTOM_RIGHT);
    let last = this._scene && this._scene.getLastChild();
    while (last && !(last instanceof Page)) last = last.getPrevious();
    if (!last) return;
    const lastPage = last as Page;
    let lastBox = (output ? lastPage.getGeometryBBox() : lastPage.getPaintBBox()) as Rect;
    const labelHeight = this._scene.getLabelBBox(lastPage.getScaleLabelFactor()).getHeight();
    const position = lastPage.getPosition(multiPageView);
    lastBox = lastBox.translated(position.getX(), position.getY()).expanded(0, labelHeight, 0, 0);
    const end = translationTo(
      bottomRight,
      lastBox.getSide(Rect.Side.BOTTOM_RIGHT).add(new Point(gap, gap)),
    );
    const topLeft = viewBox.getSide(Rect.Side.TOP_LEFT);
    let startPoint: Point | null;
    if (output) {
      const active = this._scene.getActivePage();
      // The old code reused its content box variable here, so the size
      // checks below use the active page's unscaled box in output mode
      // (see "limitScrollingToView measures the unscaled page in output
      // mode" in QUESTIONS.md).
      contentBox = active && active.getGeometryBBox();
      startPoint = contentBox && contentBox.getSide(Rect.Side.TOP_LEFT).add(new Point(-gap, 0));
    } else startPoint = sceneBox().getSide(Rect.Side.TOP_LEFT).add(new Point(-gap, 0));
    if (!startPoint) return;
    const start = translationTo(topLeft, startPoint);
    const box = contentBox as Rect;
    if (previousY !== this._scrollY) {
      if (box.getHeight() > viewBox.getHeight()) {
        if (this._scrollY < 0) this._scrollY = -start.getY();
        else this._scrollY = Math.min(-end.getY(), this._scrollY);
      } else this._scrollY = -centered.getY();
    }
    if (previousX !== this._scrollX) {
      if (box.getWidth() > viewBox.getWidth()) {
        if (previousX < this._scrollX) this._scrollX = Math.min(-end.getX(), this._scrollX);
        else this._scrollX = Math.max(-start.getX(), this._scrollX);
      } else this._scrollX = -centered.getX();
    }
    this._scrollDX = this._scrollX - previousX;
    this._scrollDY = this._scrollY - previousY;
  }

  /** Queues a render of the scene into the tiles. */
  _paintScene(screen: Rect | null, panRepaint: boolean, callback: RenderCallback): void {
    renderInProgress = true;
    this._sceneCanvas.paintAndRender(
      this._scene,
      this._scenePaintContext,
      this.getViewTransform(),
      new Point(this._scrollX, this._scrollY),
      this.getLogicalZoom(),
      screen,
      panRepaint,
      callback,
    );
  }

  /**
   * Composites the tiles into the element canvas; subclasses paint over
   * them. During a zoom gesture's steps the tiles still show the view
   * before it, and are drawn scaled to the current one (ZoomFromTiles).
   */
  _paintElement(
    worldToView?: Transform | null,
    viewToWorld?: Transform | null,
    finished?: boolean,
    graphic?: HTMLCanvasElement | null,
  ): void {
    const dirty = this._elementPaintContext.dirtyMatcher;
    if (this._zoomTilesTransform)
      this._sceneCanvas.drawScaledTo(this._elementCanvas, this._zoomTilesToView());
    else if (RendererConfig.DRAW_DURING_RENDERING || RendererConfig.SHOW_LOWRES_GIMMICK)
      this._sceneCanvas.drawTo(this._elementCanvas, dirty, graphic);
    else this._sceneCanvas.drawTo(this._elementCanvas, dirty);
  }

  /**
   * Paints the element canvas in `dirty`: the watermark's saved pixels
   * first (`restoreWatermark`), then the tiles and the overlay, then the
   * watermark again.
   */
  _finishPaint(
    dirty: DirtyMatcher | null,
    restoreWatermark: boolean,
    worldToView: Transform,
    viewToWorld: Transform,
    finished: boolean,
    graphic?: HTMLCanvasElement | null,
  ): void {
    if (!dirty) return;
    let partial: DirtyMatcher | null | undefined;
    if (RendererConfig.DRAW_DURING_RENDERING && !RendererConfig.SHOW_LOWRES_GIMMICK && graphic) {
      const tile = this._sceneCanvas.getSubCanvasContainingGraphic(graphic);
      // Deliberate deviation: the old code read tile.cx of the missing tile
      // and threw, skipping the renderInProgress reset and the noWebGL
      // restore of the render callback. Only reachable with
      // DRAW_DURING_RENDERING, which is off.
      if (!tile) return;
      const tileRect = new Rect(tile.cx, tile.cy, tile.canvas.getWidth(), tile.canvas.getHeight());
      if (!(partial = dirty.intersect(tileRect))) return;
    }
    try {
      if (restoreWatermark && this._viewConfiguration.watermark) {
        this._elementCanvas.clearRect(
          0,
          0,
          this._elementCanvas.getWidth(),
          this._elementCanvas.getHeight(),
        );
        this._elementCanvas.drawImage(this._watermarkHelperCanvas, 0, 0);
      }
      if (partial) {
        this._elementCanvas.prepare(partial.getDirtyRectangles());
        this._elementPaintContext.dirtyMatcher = partial;
      } else {
        this._elementCanvas.prepare(dirty.getDirtyRectangles());
        this._elementPaintContext.dirtyMatcher = dirty;
      }
      this._paintElement(worldToView, viewToWorld, finished, graphic);
    } catch (error) {
      console.error("Editor render error:" + String(error));
    } finally {
      if (finished) this._elementPaintContext.dirtyMatcher = null;
      this._elementCanvas.finish();
      this._paintWatermark();
    }
  }

  /**
   * Covers the screen with the configuration's watermark texture, after
   * saving the screen without it. The app only ever sets the watermark to
   * null (see "limitScrollingToView and the view watermark are unused" in
   * QUESTIONS.md).
   */
  _paintWatermark(): void {
    if (!this._viewConfiguration.watermark) return;
    const texture = this._elementCanvas.createTexture(
      this._viewConfiguration.watermark as CanvasImageSource,
    );
    this._watermarkHelperCanvas.clearRect(
      0,
      0,
      this._watermarkHelperCanvas.getWidth(),
      this._watermarkHelperCanvas.getHeight(),
    );
    this._watermarkHelperCanvas.drawImage(this._elementCanvas, 0, 0);
    this._elementCanvas.fillRect(
      0,
      0,
      this._elementCanvas.getWidth(),
      this._elementCanvas.getHeight(),
      texture,
    );
  }

  /**
   * The world area the renderer may paint for an infinite canvas: the view
   * box grown by its own size on every side. Null for a fixed-size scene.
   */
  getScreenBox(): Rect | null {
    let box: Rect | null = null;
    if (!this._scene.isFixedSized()) {
      const dpi = PaintCanvas.getScreenDPI();
      let viewBox = this.getViewBox().scaled(dpi, dpi);
      const width = viewBox.getWidth();
      const height = viewBox.getHeight();
      viewBox = viewBox.expanded(width, height, width, height);
      box = this.getViewTransform(this._scene).mapRect(viewBox);
    }
    return box;
  }

  /** The scheduled repaint: renders the dirty scene areas and composites the screen. */
  _repaint(): void {
    try {
      const elementDirty = this._dirtyElementList.flush();
      const sceneDirty = this._dirtySceneList.flush();
      const worldToView = this.getWorldTransform();
      const viewToWorld = this.getViewTransform();
      if (this._panSubAreas) {
        if (null !== elementDirty && null !== sceneDirty) {
          if (!this._lastInvalidatedVtoWtransform) {
            this._lastInvalidatedVtoWtransform = this._viewToWorldTransform;
            this._lastInvalidatedWtoVtransform = this._worldToViewTransform;
          }
          const lastViewToWorld = this._lastInvalidatedVtoWtransform as Transform;
          const lastWorldToView = this._lastInvalidatedWtoVtransform as Transform;
          const sceneArea = this._dirtySceneList.getArea() as Rect;
          // Where the old pixels land now (to) and where they were (from).
          let to = (this._worldToViewTransform as Transform)
            .mapRect(lastViewToWorld.mapRect(sceneArea))
            .intersected(sceneArea);
          let from = lastWorldToView.mapRect((this._viewToWorldTransform as Transform).mapRect(to));
          to = new Rect(
            Math.round(to.getX()),
            Math.round(to.getY()),
            Math.round(to.getWidth()),
            Math.round(to.getHeight()),
          );
          from = new Rect(
            Math.round(from.getX()),
            Math.round(from.getY()),
            Math.round(from.getWidth()),
            Math.round(from.getHeight()),
          );
          const sceneRect = this._getSceneRect();
          to = to.intersected(sceneRect);
          from = from.intersected(sceneRect);
          if (this._viewConfiguration.watermark) {
            this._elementCanvas.clearRect(
              0,
              0,
              this._elementCanvas.getWidth(),
              this._elementCanvas.getHeight(),
            );
            this._elementCanvas.drawImage(this._watermarkHelperCanvas, 0, 0);
          }
          this._panHelperCanvas.clearRect(
            0,
            0,
            this._panHelperCanvas.getWidth(),
            this._panHelperCanvas.getHeight(),
          );
          this._panHelperCanvas.drawImageFragment(
            this._elementCanvas,
            from.getX(),
            from.getY(),
            from.getX(),
            from.getY(),
            from.getWidth(),
            from.getHeight(),
          );
          this._elementCanvas.clearRect(
            0,
            0,
            this._elementCanvas.getWidth(),
            this._elementCanvas.getHeight(),
          );
          this._elementCanvas.drawImageFragment(
            this._panHelperCanvas,
            from.getX(),
            from.getY(),
            to.getX(),
            to.getY(),
            to.getWidth(),
            to.getHeight(),
          );
          this._sceneCanvas.moveContent(from, to);
          this._scenePaintContext.dirtyMatcher = sceneDirty;
          const savedNoWebGL = (this._scenePaintContext as unknown as MaybeNoWebGL).noWebGL;
          (this._scenePaintContext.configuration as ScenePaintConfiguration).noWebGL = !(
            !RenderScheduler.getRenderParameters().quickRender &&
            !RenderScheduler.getRenderParameters().noWebGL
          );
          const panAreas = this._panSubAreas.slice();
          const fromViewToWorld = this._lastInvalidatedVtoWtransform as Transform;
          const toWorldToView = this._worldToViewTransform as Transform;
          if (this._cumulativeInvalidationArea)
            this._cumulativeInvalidationArea = this._cumulativeInvalidationArea
              .map((rect) => toWorldToView.mapRect(fromViewToWorld.mapRect(rect)))
              .concat(panAreas);
          else this._cumulativeInvalidationArea = panAreas;
          this._paintScene(this.getScreenBox(), true, (graphic, finished) => {
            if (
              finished ||
              RendererConfig.DRAW_DURING_RENDERING ||
              RendererConfig.SHOW_LOWRES_GIMMICK
            ) {
              this._finishPaint(elementDirty, false, worldToView, viewToWorld, finished, graphic);
              if (finished) {
                (this._scenePaintContext.configuration as ScenePaintConfiguration).noWebGL =
                  savedNoWebGL as boolean;
                this._scenePaintContext.dirtyMatcher = null;
                renderInProgress = false;
              }
            }
          });
        }
      } else if (null !== sceneDirty) {
        this._scenePaintContext.dirtyMatcher = sceneDirty;
        const savedNoWebGL = (this._scenePaintContext as unknown as MaybeNoWebGL).noWebGL;
        (this._scenePaintContext.configuration as ScenePaintConfiguration).noWebGL = !(
          !RenderScheduler.getRenderParameters().quickRender &&
          !RenderScheduler.getRenderParameters().noWebGL
        );
        this._paintScene(this.getScreenBox(), false, (graphic, finished, skipped) => {
          if (
            finished ||
            RendererConfig.DRAW_DURING_RENDERING ||
            RendererConfig.SHOW_LOWRES_GIMMICK
          ) {
            this._finishPaint(elementDirty, true, worldToView, viewToWorld, finished, graphic);
            if (finished) {
              (this._scenePaintContext.configuration as ScenePaintConfiguration).noWebGL =
                savedNoWebGL as boolean;
              this._scenePaintContext.dirtyMatcher = null;
              renderInProgress = false;
              if (!skipped && this._finishPanRequestFrameId) {
                this._cumulativeInvalidationArea = null;
                this._finishPanRequestFrameId = null;
              }
            }
          }
        });
      } else this._finishPaint(elementDirty, true, worldToView, viewToWorld, true);
      if (this._panSubAreas) this._panSubAreas = null;
    } finally {
      this._repaintRequestFrameId = null;
      this._lastInvalidatedWtoVtransform = this._worldToViewTransform;
      this._lastInvalidatedVtoWtransform = this._viewToWorldTransform;
    }
  }

  /** Starts a zoom gesture: renders quick and without WebGL until finishZoom. */
  beginZoom(parameters?: RenderParameters): void {
    this._isZooming = true;
    if (null !== this._repaintRequestFrameId) {
      Platform.cancelFrame(this._repaintRequestFrameId);
      this._repaintRequestFrameId = null;
    }
    RenderScheduler.setRenderParameters(
      parameters || {
        quickRender: RendererConfig.QUICK_RENDER_WHEN_ZOOMING,
        noWebGL: RendererConfig.NO_WEBGL_WHEN_ZOOMING,
      },
    );
  }

  /**
   * A step of a zoom gesture (ZoomFromTiles): from the first step on, the
   * tiles keep what they showed before it and are drawn scaled to the
   * view, and the scene renders once the steps pause. False when the step
   * must render as before: outside a zoom gesture, or before anything was
   * painted.
   */
  _zoomFromTiles(): boolean {
    if (!this._isZooming || !ZoomFromTiles.enabled) return false;
    if (!this._zoomTilesTransform) {
      // The tiles show the view as of the last repaint.
      const shown = this._lastInvalidatedWtoVtransform;
      if (!shown) return false;
      this._zoomTilesTransform = shown;
      // Made now, while the view is set up: the copy is taken when the
      // gesture stops drawing the tiles scaled, on a timer.
      if (!this._zoomTiles) this._zoomTiles = new PaintCanvas(false, true);
      // Areas still waiting for a render, and pan strips, are rendered with
      // everything else when the steps pause.
      this._dirtySceneList.reset();
      this._panSubAreas = null;
    }
    this._cancelZoomRender();
    this._zoomRenderTimer = setTimeout(() => {
      this._zoomRenderTimer = null;
      this._endZoomFromTiles();
      this.invalidate(null, true);
    }, ZoomFromTiles.renderAfterMs);
    this.invalidate(null, false);
    return true;
  }

  /** From the view the tiles show during a zoom gesture's steps to the current view. */
  _zoomTilesToView(): Transform {
    const shown = this._zoomTilesTransform as Transform;
    return (shown.inverted() as Transform).multiplied(this._worldToViewTransform as Transform);
  }

  /**
   * Stops drawing the tiles scaled: they are scaled to the current view
   * themselves (through a copy), and count as showing it from now on. A
   * render the gesture owes stays due.
   */
  _endZoomFromTiles(): void {
    if (!this._zoomTilesTransform) return;
    const copy = this._zoomTiles as Canvas2DPaintCanvas;
    this._sceneCanvas.copyTo(copy);
    this._sceneCanvas.drawScaled(copy, this._zoomTilesToView());
    this._zoomTilesTransform = null;
    this._lastInvalidatedWtoVtransform = this._worldToViewTransform;
    this._lastInvalidatedVtoWtransform = this._viewToWorldTransform;
  }

  _cancelZoomRender(): void {
    if (null !== this._zoomRenderTimer) {
      clearTimeout(this._zoomRenderTimer);
      this._zoomRenderTimer = null;
    }
  }

  /**
   * The zoom gesture ended (finishZoom, or a pan took over): what follows
   * renders everything, so the render the gesture owes is dropped.
   */
  _stopZooming(): void {
    this._isZooming = false;
    this._endZoomFromTiles();
    this._cancelZoomRender();
  }

  /** Ends a zoom gesture and renders everything again at full quality. */
  finishZoom(): void {
    if (this._isZooming && !this._isPanning) {
      this._stopZooming();
      this._scheduleRendering(() => {
        RenderScheduler.setRenderParameters({ quickRender: false, noWebGL: false });
        const sceneRect = this._getSceneRect();
        this.invalidate(sceneRect, true);
        this._repaint();
      });
    }
  }

  /** Starts a pan gesture (a pan finish still pending is cancelled). */
  beginPan(parameters?: RenderParameters): void {
    this._isPanning = true;
    if (null !== this._finishPanRequestFrameId) {
      Platform.cancelFrame(this._finishPanRequestFrameId);
      this._finishPanRequestFrameId = null;
      RenderScheduler.setRenderParameters({
        quickRender: RendererConfig.QUICK_RENDER_WHEN_PANNING,
        noWebGL: RendererConfig.NO_WEBGL_WHEN_PANNING,
      });
    } else
      RenderScheduler.setRenderParameters(
        parameters || {
          quickRender: RendererConfig.QUICK_RENDER_WHEN_PANNING,
          noWebGL: RendererConfig.NO_WEBGL_WHEN_PANNING,
        },
      );
  }

  /**
   * Ends a pan gesture: on the next frame the areas rendered during the
   * pan are rendered again at full quality, then `done` runs.
   */
  finishPan(done?: () => void): void {
    if (!this._isPanning) return;
    if (this._isZooming) {
      if ("number" == typeof this._wheelScrollingOrZooming) {
        clearTimeout(this._wheelScrollingOrZooming);
        this._wheelScrollingOrZooming = null;
      }
      this._stopZooming();
      this._cumulativeInvalidationArea = [this._getSceneRect()];
    }
    this._isPanning = false;
    this._scheduleRendering(
      () => {
        RenderScheduler.setRenderParameters({ quickRender: false, noWebGL: false });
        const sceneRect = this._getSceneRect();
        (this._cumulativeInvalidationArea || []).forEach((area) => {
          this.invalidate(area.intersected(sceneRect), true);
        });
        if (done) done();
      },
      false,
      true,
    );
  }

  /**
   * Rebuilds the transforms from scroll and zoom. When they changed, the
   * scene's screen box is updated and the view repaints: only the strips
   * that came into view when only the scroll changed (the rest is moved
   * in _repaint), everything otherwise. `noEvent` skips the
   * TransformEvent, `noInvalidation` the repaint.
   */
  _updateViewTransforms(noEvent?: boolean, noInvalidation?: boolean): void {
    this._scrollX = Math.round(this._scrollX);
    this._scrollY = Math.round(this._scrollY);
    this._scrollDX = Math.round(this._scrollDX);
    this._scrollDY = Math.round(this._scrollDY);
    if (this._isPanning) {
      this._dirtyElementList.translate(-this._scrollDX, -this._scrollDY);
      this._dirtySceneList.translate(-this._scrollDX, -this._scrollDY);
    }
    const previousViewToWorld = this._lastInvalidatedVtoWtransform || this._viewToWorldTransform;
    const zoom = this.getLogicalZoom();
    const worldToView = new Transform()
      .scaled(zoom, zoom)
      .translated(-this._scrollX, -this._scrollY);
    if (!Transform.equals(worldToView, this._worldToViewTransform)) {
      this._worldToViewTransform = worldToView;
      this._viewToWorldTransform = worldToView.inverted() as Transform;
      SceneOptions.scaleLabelFactor = this._viewToWorldTransform.getScaleFactor();
      if (!noInvalidation) {
        // A zoom gesture's step (scrolling included) is drawn from the tiles.
        const fromTiles = this._zoomFromTiles();
        let panned = fromTiles;
        if (!fromTiles && previousViewToWorld && this._viewToWorldTransform) {
          const dpi = PaintCanvas.getScreenDPI();
          const before = previousViewToWorld.mapRect(
            new Rect(0, 0, this.getWidth() * dpi, this.getHeight() * dpi),
          );
          const after = this._viewToWorldTransform.mapRect(
            new Rect(0, 0, this.getWidth() * dpi, this.getHeight() * dpi),
          );
          if (
            GMath.isEqualEps(before.getWidth(), after.getWidth(), 1e-6) &&
            GMath.isEqualEps(before.getHeight(), after.getHeight(), 1e-6)
          ) {
            const exposed = after.subtracted(before, true);
            const areas: Rect[] =
              exposed instanceof Array
                ? exposed.map((rect) => worldToView.mapRect(rect))
                : [worldToView.mapRect(exposed)];
            let invalidated = false;
            for (let i = 0; i < areas.length; i++)
              invalidated = this.invalidate(areas[i] as Rect, true) || invalidated;
            if ((!RendererConfig.ENABLE_RENDERER && invalidated) || RendererConfig.ENABLE_RENDERER)
              this._panSubAreas = areas;
            panned = true;
          }
        }
        const dpi = PaintCanvas.getScreenDPI();
        let viewBox = this.getViewBox().scaled(dpi, dpi);
        const width = viewBox.getWidth();
        const height = viewBox.getHeight();
        viewBox = viewBox.expanded(width, height, width, height);
        this._scene.setScreenBox(this.getViewTransform(this._scene).mapRect(viewBox));
        if (!panned) this.invalidate(null, true);
      }
      if (!noEvent && this.hasEventListeners(SceneWidgetTransformEvent))
        this.trigger(SceneWidget.TRANSFORMEVENT);
    }
    this._relayoutRulers();
  }

  /** Sizes and places the rulers along the view offset and repaints their ticks. */
  _relayoutRulers(): void {
    if (!this._horizontalRuler || !this._verticalRuler || !this._unitRuler) return;
    const dpi = PaintCanvas.getScreenDPI();
    let origin = new Point(0, 0);
    const page = this._scene.getActivePage();
    if (page) {
      const box = page.getGeometryBBox();
      if (box) {
        const zero = this.getWorldTransform().mapPoint(origin);
        origin = this.getWorldTransform(page)
          .mapPoint(new Point(box.getX(), box.getY()))
          .subtract(zero);
      }
    }
    const left = this._viewOffset[0] as number;
    const top = this._viewOffset[1] as number;
    const right = this._viewOffset[2] as number;
    const bottom = this._viewOffset[3] as number;
    const size = this._horizontalRuler.getHeight();
    const leftFill = this._viewConfiguration.rulerLeftFill;
    const ignoreOffsets = this._viewConfiguration.ignoreRulerOffsets;
    this._horizontalRuler.resize(this.getWidth() - size - left - (ignoreOffsets ? 0 : right), size);
    this._verticalRuler.resize(
      size + (leftFill ? left : 0),
      this.getHeight() - size - top - (ignoreOffsets ? 0 : bottom),
    );
    this._unitRuler.resize(size + (leftFill ? left : 0), size);
    this._horizontalRuler.move(size + left, top);
    this._verticalRuler.move(leftFill ? 0 : left, size + top);
    this._unitRuler.move(leftFill ? 0 : left, top);
    this._horizontalRuler.updateView(
      -this._scrollX - left * dpi - size * dpi + origin.getX(),
      this.getLogicalZoom(),
    );
    this._verticalRuler.updateView(
      -this._scrollY - top * dpi - size * dpi + origin.getY(),
      this.getLogicalZoom(),
    );
  }

  /** A scene invalidation: repaints its area (in world or page coordinates) and drops its cached tiles. */
  _sceneInvalidationRequest(event: InvalidationRequestEvent): void {
    let area = event.area;
    if (area) {
      if (event.page && !this.getViewConfiguration().multiPageView) {
        const active = this._scene && this._scene.getActivePage();
        if (active && active !== event.page) return;
      }
      area = this.getWorldTransform(event.page || this._scene)
        .mapRect(area)
        .expanded(2, 2, 2, 2);
    }
    this.invalidate(area, true);
    this._sceneCanvas.setDirtyCache(area, this.getLogicalZoom(), this._scrollX, this._scrollY);
  }

  /** The view box without offsets and rulers, in device pixels. */
  getViewVisibleArea(): Rect {
    let left = this._viewOffset[0] as number;
    if (this._verticalRuler) left += this._verticalRuler.getWidth();
    let top = this._viewOffset[1] as number;
    if (this._horizontalRuler) top += this._horizontalRuler.getHeight();
    const right = (this._width as number) - (this._viewOffset[2] as number);
    const bottom = (this._height as number) - (this._viewOffset[3] as number);
    const dpi = PaintCanvas.getScreenDPI();
    return new Rect(left * dpi, top * dpi, (right - left) * dpi, (bottom - top) * dpi);
  }

  /**
   * Ctrl/Cmd + wheel (or a pinch, which arrives as a wheel with ctrlKey)
   * zooms at the pointer in steps that stop at the zoom stops; a plain
   * wheel scrolls, sideways with Shift. Each gesture renders quick until
   * the wheel rests (RERENDER_ZOOM_AFTER_MS, RERENDER_PAN_AFTER_MS).
   */
  _wheelListener(event: MouseWheelEvent): void {
    if (Platform.modifiers.metaKey || Platform.modifiers.ctrlKey || event.zoom) {
      if ("number" == typeof this._wheelScrollingOrZooming) {
        clearTimeout(this._wheelScrollingOrZooming);
        this._cumulativeInvalidationArea = null;
        this._isPanning = false;
        this._wheelScrollingOrZooming = null;
      }
      this._wheelScrollingOrZooming = setTimeout(() => {
        this._wheelScrollingOrZooming = null;
        this.finishZoom();
      }, RendererConfig.RERENDER_ZOOM_AFTER_MS);
      this.beginZoom();
      let delta = 0 !== event.deltaX ? event.deltaX : event.deltaY;
      const zoom = this.getZoom();
      let next: number | null;
      if (Math.abs(delta) > 20) delta = 20 * (delta < 0 ? -1 : 1);
      if (delta < 0) {
        const step = zoom / 1.6;
        if (
          (next = zoom + ((-1 * delta) / RendererConfig.ZOOM_STEP) * step) >=
          SceneWidget.options.maxZoomFactor
        )
          next = SceneWidget.options.maxZoomFactor;
      } else {
        const step = zoom / 1.6;
        if (
          (next = zoom - (delta / RendererConfig.ZOOM_STEP) * step) <=
          SceneWidget.options.minZoomFactor
        )
          next = SceneWidget.options.minZoomFactor;
      }
      // Passing a zoom stop lands on it.
      for (let i = 0; i < this._zoomSteps.length; ++i) {
        const stop = this._zoomSteps[i] as number;
        if ((next > stop && zoom < stop) || (next < stop && zoom > stop)) next = stop;
      }
      if (null !== next && next !== zoom) {
        const at = this.getViewTransform().mapPoint(event.client);
        this.zoomAt(at, next);
      }
    } else {
      if ("number" == typeof this._wheelScrollingOrZooming) {
        clearTimeout(this._wheelScrollingOrZooming);
        if (this._isZooming) {
          this._stopZooming();
          this._cumulativeInvalidationArea = [this._getSceneRect()];
        }
        this._wheelScrollingOrZooming = null;
      }
      this._wheelScrollingOrZooming = setTimeout(() => {
        this._wheelScrollingOrZooming = null;
        this.finishPan();
      }, RendererConfig.RERENDER_PAN_AFTER_MS);
      this.beginPan();
      if (Platform.modifiers.shiftKey) this.scrollBy(event.deltaY, event.deltaX);
      else this.scrollBy(event.deltaX, event.deltaY);
    }
  }

  _rulerMouseMoveListener(event: MouseEvent): void {
    const horizontal = this._horizontalRuler as RulerWidget;
    const size = horizontal.getHeight();
    const dpi = PaintCanvas.getScreenDPI();
    horizontal.setMousePosition(event.client.getX() / dpi - size - (this._viewOffset[0] as number));
    (this._verticalRuler as RulerWidget).setMousePosition(
      event.client.getY() / dpi - size - (this._viewOffset[1] as number),
    );
  }

  _leaveListener(): void {
    if (this._horizontalRuler) {
      this._horizontalRuler.setMousePosition(-999);
      (this._verticalRuler as RulerWidget).setMousePosition(-999);
    }
    this._inlineHintDiv.style.visibility = "hidden";
  }

  _enterListener(): void {
    if ("hidden" === this._inlineHintDiv.style.visibility)
      this._inlineHintDiv.style.visibility = "";
  }

  /** A newly activated page moves the rulers' zero. */
  _afterFlagChange(event: AfterFlagChangeEvent): void {
    if (event.node instanceof Page && event.flag === NodeFlag.Active && event.set)
      this._relayoutRulers();
  }

  startTouchMode(): void {
    RenderScheduler.setRenderParameters({
      quickRender: RendererConfig.QUICK_RENDER_WHEN_ZOOMING,
      noWebGL: RendererConfig.NO_WEBGL_WHEN_ZOOMING,
    });
  }

  endTouchMode(): void {
    RenderScheduler.setRenderParameters({ quickRender: false, noWebGL: false });
    this.invalidate(null, true);
  }

  /** Drops the tiles cached per zoom level. */
  cleanCache(): void {
    this._sceneCanvas.cleanCache();
  }

  /** Sizes the tile cache for the hardware. */
  configureCache(): void {
    if (!RendererConfig.ENABLE_CACHE) return;
    switch (System.hardware) {
      case Hardware.Desktop:
        RendererConfig.MAX_CACHED_ZOOM_LEVELS = 5;
        RendererConfig.MAX_CACHED_PER_ONE_ZOOM = 64;
        break;
      default:
        RendererConfig.MAX_CACHED_ZOOM_LEVELS = 3;
        RendererConfig.MAX_CACHED_PER_ONE_ZOOM = 21;
    }
  }

  override toString(): string {
    return "[Object GSceneWidget]";
  }
}

// Prototype defaults, as in the old module: the constructor and the
// subclass setup read some of them before assigning.
const prototype = SceneWidget.prototype;
prototype._repaintRequestFrameId = null;
prototype._resizeRequestFrameId = null;
prototype._finishPanRequestFrameId = null;
prototype._debugCanvas = null;
prototype._horizontalRuler = null;
prototype._verticalRuler = null;
prototype._unitRuler = null;
prototype._scrollX = 0;
prototype._scrollY = 0;
prototype._scrollDX = 0;
prototype._scrollDY = 0;
prototype._zoom = 1;
prototype._logicalPixels = false;
prototype._worldToViewTransform = null;
prototype._viewToWorldTransform = null;
prototype._lastInvalidatedWtoVtransform = null;
prototype._lastInvalidatedVtoWtransform = null;
prototype._panSubAreas = null;
prototype._cumulativeInvalidationArea = null;
prototype._pendingInvalidationEvent = false;
prototype._duringRecordedTransaction = false;
prototype._zoomSteps = ZOOM_STOPS;
prototype._wheelScrollingOrZooming = false;
prototype._isPanning = false;
prototype._isZooming = false;
prototype._zoomTiles = null;
prototype._zoomTilesTransform = null;
prototype._zoomRenderTimer = null;
