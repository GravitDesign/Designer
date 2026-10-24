// Old: chunk.vendor.js module 1081 (GEditorWidget).
/**
 * The scene view of the editor. Over the rendered scene it paints the page
 * backgrounds and shadows (under the scene, on the element canvas), the
 * element editors (selection), the active tool, the page margins, the
 * guides and the distance helper. It repaints when the editor, its guides,
 * the tool manager or scene settings ask for it, lets the user drag guide
 * lines out of the rulers, handles drops (files, nodes, patterns, fonts,
 * text) and hosts the hidden text box of inline text editing.
 */
import { MouseEvent } from "../../engine/core/mouse-event.ts";
import type { ModifiersChangedEvent } from "../../engine/core/modifiers-changed-event.ts";
import { registerClass } from "../../engine/core/object.ts";
import { Platform } from "../../engine/core/platform.ts";
import { containsOneOf } from "../../engine/core/util.ts";
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { ModifiersChangedEvent as ModifiersChangedEventClass } from "../../engine/core/modifiers-changed-event.ts";
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { Point } from "../../engine/math/point.ts";
import { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import { PaintCanvas } from "../../engine/paint/paint-canvas.ts";
import { ScenePaintConfiguration } from "../../engine/paint/scene-paint-configuration.ts";
import { RendererConfig } from "../../engine/paint/renderer-config.ts";
import { Element } from "../../engine/scene/element.ts";
import { ElementFlag } from "../../engine/scene/element-change.ts";
import type { TransformElement } from "../../engine/scene/element-transform.ts";
import { Node } from "../../engine/scene/node.ts";
import { AfterPropertiesChangeEvent } from "../../engine/scene/node-events.ts";
import { Page } from "../../engine/scene/page.ts";
import type { Scene } from "../../engine/scene/scene.ts";
import { SceneOptions } from "../../engine/scene/scene-options.ts";
import { Symbol as SymbolNode } from "../../engine/scene/symbol.ts";
import { Gradient } from "../../engine/style/gradient.ts";
import { Pattern } from "../../engine/style/pattern.ts";
import { Editor, type EditorInvalidationRequestEvent } from "../editor.ts";
import { EditorOptions } from "../editor-options.ts";
import { EditorWorkspace } from "../editor-workspace.ts";
import { EditorPaintConfiguration } from "../editor-paint-configuration.ts";
import { ElementEditor } from "../element-editors/element-editor.ts";
import { BBoxGuide } from "../guides/bbox-guide.ts";
import {
  DistanceHelper,
  type DistanceHelperInvalidationRequestEvent,
} from "../guides/distance-helper.ts";
import { FullPixelsGuide } from "../guides/full-pixels-guide.ts";
import { Guides, type GuidesInvalidationRequestEvent } from "../guides/guides.ts";
import {
  InvalidationRequestEvent as ToolInvalidationRequestEvent,
  type ToolManager,
} from "../tools/tool-manager.ts";
import type { RulerWidget } from "./ruler-widget.ts";
import { SceneWidget } from "./scene-widget.ts";

/** The missing tool manager warning was printed. */
let missingToolManagerWarned = false;

/**
 * The tool manager of the scene's workspace (GEditorWorkspace). The old
 * view called `scene.getWorkspace().getToolManager()` and threw on a
 * workspace without one; here such a view (a plain engine workspace, as
 * in unit tests, or the tools never loaded) paints no tool, and a
 * development build warns once.
 */
function getWorkspaceToolManager(scene: Scene): ToolManager | null {
  const workspace = scene.getWorkspace();
  const toolManager = workspace instanceof EditorWorkspace ? workspace.getToolManager() : null;
  if (
    !toolManager &&
    !missingToolManagerWarned &&
    import.meta.env.DEV &&
    import.meta.env.MODE !== "test"
  ) {
    missingToolManagerWarned = true;
    console.warn(
      "GEditorWidget: the scene's workspace has no tool manager, so no tool paints or " +
        "repaints in this view. Use a GEditorWorkspace and import editor/index.ts.",
    );
  }
  return toolManager;
}

/** The chessboard behind transparent pages, made once. */
let chessboard: HTMLCanvasElement | null = null;
/** The Firefox shadow warning was printed. */
let firefoxShadowWarned = false;

/** The guide line being dragged out of a ruler (index -1: a new one). */
interface GuideLineInfo {
  isVertical: boolean;
  guideIndex: number;
}

/** What one drop carries, per data type. */
interface DropSource {
  type: number | null;
  source: unknown;
}

export class EditorWidget extends SceneWidget {
  static {
    registerClass(this, "GEditorWidget");
  }

  declare _editor: Editor;
  declare _viewConfiguration: EditorPaintConfiguration;
  _guideLineDiv: HTMLDivElement | null = null;
  _guideLineViewPoint: Point | null = null;
  _guideLinePosition: Point | null = null;
  _guideLineInfo: GuideLineInfo | null = null;
  _lastFocus: globalThis.Element | null = null;
  _inputListener: ((event: globalThis.Event) => void) | null = null;
  _inputListenerCompStart: ((event: globalThis.Event) => void) | null = null;
  _inputListenerCompEnd: ((event: globalThis.Event) => void) | null = null;
  _inputListenerCompUpd: ((event: globalThis.Event) => void) | null = null;
  _dragEventerEvent: (event: DragEvent) => void;
  _dragOverEvent: (event: DragEvent) => void;
  _dropEvent: (event: DragEvent) => boolean;

  constructor(editor: Editor, container?: HTMLElement | null) {
    const viewConfiguration = new EditorPaintConfiguration();
    viewConfiguration.enableFxCache = !RendererConfig.WORKER_RENDERING_ENABLED;
    super(editor.getScene(), container, {
      viewConfiguration,
      init: (widget) => {
        (widget as EditorWidget)._editor = editor;
      },
    });
    this._htmlElement.className += " g-editor-widget";
    const guides = this._editor.getGuides();
    if (guides) {
      guides.setView(this);
      guides.addEventListener(
        Guides.InvalidationRequestEvent,
        this._editorHelpersInvalidationRequest,
        this,
      );
    }
    const distanceHelper = this._editor.getDistanceHelper();
    if (distanceHelper) {
      distanceHelper.setView(this);
      distanceHelper.addEventListener(
        DistanceHelper.InvalidationRequestEvent,
        this._editorHelpersInvalidationRequest,
        this,
      );
    }
    this._dragEventerEvent = (event: DragEvent): void => {
      event.preventDefault();
      event.stopPropagation();
    };
    this._dragOverEvent = (event: DragEvent): void => {
      event.preventDefault();
      event.stopPropagation();
      (event.dataTransfer as DataTransfer).dropEffect = "move";
    };
    this._dropEvent = (event: DragEvent): boolean => {
      event.preventDefault();
      event.stopPropagation();
      this.handleDropEvent(event);
      return false;
    };
    const input = this._inputHtmlElement as HTMLDivElement;
    input.addEventListener("dragenter", this._dragEventerEvent);
    input.addEventListener("dragover", this._dragOverEvent);
    input.addEventListener("drop", this._dropEvent);
    this._editor.addEventListener(
      Editor.InvalidationRequestEvent,
      this._editorInvalidationRequest,
      this,
      undefined,
      undefined,
      true,
    );
    this._scene.addEventListener(
      AfterPropertiesChangeEvent,
      this._afterPropertiesChanged,
      this,
      undefined,
      undefined,
      true,
    );
    const toolManager = getWorkspaceToolManager(this._scene);
    if (toolManager)
      toolManager.addEventListener(
        ToolInvalidationRequestEvent,
        this._toolInvalidationRequest,
        this,
      );
  }

  /** The rulers, which also start guide line drags. */
  override setRulers(visible: boolean): void {
    // hasRulers() is the old `!this._horizontalRuler` check; unlike the
    // field it doesn't narrow the rulers to null for the code after super.
    if (visible && !this.hasRulers()) {
      super.setRulers(visible);
      // Both made by the call above.
      const horizontal = this._horizontalRuler as RulerWidget;
      const vertical = this._verticalRuler as RulerWidget;
      horizontal.addEventListener(MouseEvent.Down, this._rulerDownLister, this);
      vertical.addEventListener(MouseEvent.Down, this._rulerDownLister, this);
    } else if (!visible && this.hasRulers()) {
      const horizontal = this._horizontalRuler as RulerWidget;
      const vertical = this._verticalRuler as RulerWidget;
      horizontal.removeEventListener(MouseEvent.Down, this._rulerDownLister, this);
      vertical.removeEventListener(MouseEvent.Down, this._rulerDownLister, this);
      super.setRulers(visible);
    }
  }

  getHtmlElement(): HTMLDivElement {
    return this._htmlElement;
  }

  /**
   * Starts dragging guide line `guideIndex` of the scene's vertical (`vgl`)
   * or horizontal (`hgl`) guides; -1 starts a new one, hidden until moved.
   */
  startMoveGuideLine(isVertical: boolean, guideIndex: number): void {
    this._guideLineInfo = { isVertical, guideIndex };
    const property = isVertical ? "vgl" : "hgl";
    const lines = this._editor.getScene().getProperty(property) as number[];
    const value = guideIndex >= 0 ? (lines[guideIndex] as number) : 0;
    const position = new Point(value, value);
    const mapped = this.getWorldTransform().mapPoint(position);
    this._guideLinePosition = position;
    const line = document.createElement("div");
    line.style.position = "absolute";
    line.style.backgroundColor = String(EditorOptions.guideLineHintColor);
    if (guideIndex < 0) line.style.visibility = "hidden";
    this._htmlElement.insertBefore(line, this._inlineHintDiv);
    if (isVertical) {
      line.style.top = "0px";
      line.style.bottom = "0px";
      line.style.width = "1px";
      line.style.left = mapped.getX() + "px";
    } else {
      line.style.left = "0px";
      line.style.right = "0px";
      line.style.height = "1px";
      line.style.top = mapped.getY() + "px";
    }
    this._guideLineDiv = line;
    Platform.addEventListener(
      ModifiersChangedEventClass,
      this._guideMoveModifierChangeListener,
      this,
    );
  }

  /** Moves the dragged guide line to view point `point`, snapped by the guides. */
  moveGuideLine(point: Point): void {
    if (!this._guideLineInfo) return;
    this._guideLineViewPoint = point;
    const guides = this._editor.getGuides();
    let world = this.getViewTransform().mapPoint(point);
    guides.beginMap();
    world = guides.mapPoint(world, null, [BBoxGuide.ID, FullPixelsGuide.ID]);
    guides.finishMap();
    point = this.getWorldTransform().mapPoint(world);
    this._guideLinePosition = world;
    const dpi = PaintCanvas.getScreenDPI();
    const line = this._guideLineDiv as HTMLDivElement;
    const scene = this._editor.getScene();
    if (this._guideLineInfo.isVertical) {
      line.style.left = point.getX() / dpi + "px";
      const top = this._horizontalRuler
        ? (this._horizontalRuler.getY() as number) + this._horizontalRuler.getHeight()
        : (this._viewOffset[1] as number);
      this.updateInlineHint(
        scene.pointToString(world.getX(), 1) + String(scene.getProperty("ut")),
        new Point(point.getX(), dpi * top + 3),
        Rect.Side.TOP_CENTER,
      );
    } else {
      line.style.top = point.getY() / dpi + "px";
      const left = this._verticalRuler
        ? (this._verticalRuler.getX() as number) + this._verticalRuler.getWidth()
        : (this._viewOffset[0] as number);
      this.updateInlineHint(
        scene.pointToString(world.getY(), 1) + String(scene.getProperty("ut")),
        new Point(dpi * left + 3, point.getY()),
        Rect.Side.LEFT_CENTER,
      );
    }
    line.style.visibility = "";
  }

  /**
   * Ends a guide line drag: dropped back on its ruler the line is removed,
   * elsewhere it is added or moved, each as one undo step.
   */
  finishMoveGuideLine(): void {
    if (!this._guideLineInfo) return;
    Platform.removeEventListener(
      ModifiersChangedEventClass,
      this._guideMoveModifierChangeListener,
      this,
    );
    this._editor.getGuides().invalidate();
    const isVertical = this._guideLineInfo.isVertical;
    const index = this._guideLineInfo.guideIndex;
    const property = isVertical ? "vgl" : "hgl";
    const scene = this._editor.getScene();
    let lines = scene.getProperty(property) as number[] | null;
    lines = lines ? lines.slice() : [];
    const rulerRight = this._verticalRuler
      ? (this._verticalRuler.getX() as number) + this._verticalRuler.getWidth()
      : (this._viewOffset[0] as number) + EditorOptions.pickDistance;
    const rulerBottom = this._horizontalRuler
      ? (this._horizontalRuler.getY() as number) + this._horizontalRuler.getHeight()
      : (this._viewOffset[1] as number) + EditorOptions.pickDistance;
    const rulerLeft = this._verticalRuler ? (this._verticalRuler.getX() as number) : -100;
    const rulerTop = this._horizontalRuler ? (this._horizontalRuler.getY() as number) : -100;
    const line = this._guideLineDiv as HTMLDivElement;
    if (
      (!isVertical && line.offsetTop >= rulerTop && line.offsetTop <= rulerBottom) ||
      (isVertical && line.offsetLeft >= rulerLeft && line.offsetLeft <= rulerRight)
    ) {
      if (index >= 0) {
        lines.splice(index, 1);
        this._editor.beginTransaction();
        try {
          scene.setProperties([property], [lines]);
        } finally {
          this._editor.commitTransaction(
            Locale.get(new LocaleKey("GEditorWidget", "action.remove-guide-line")),
          );
        }
      }
    } else {
      const position = this._guideLinePosition as Point;
      const value = isVertical ? position.getX() : position.getY();
      if (index < 0 || (index >= 0 && lines[index] !== value)) {
        if (index >= 0) lines[index] = value;
        else lines.push(value);
        this._editor.beginTransaction();
        try {
          scene.setProperties([property], [lines]);
        } finally {
          this._editor.commitTransaction(
            index >= 0
              ? Locale.get(new LocaleKey("GEditorWidget", "action.change-guide-line"))
              : Locale.get(new LocaleKey("GEditorWidget", "action.add-guide-line")),
          );
        }
      }
    }
    this._htmlElement.removeChild(line);
    this._guideLineDiv = null;
    this._guideLinePosition = null;
    this._guideLineViewPoint = null;
    this._guideLineInfo = null;
    this.updateInlineHint(null);
  }

  getEditor(): Editor {
    return this._editor;
  }

  override getViewConfiguration(): EditorPaintConfiguration {
    return this._viewConfiguration;
  }

  override hasFocus(): boolean {
    return (
      !(!this._fakeTextBox || document.activeElement !== this._fakeTextBox) || super.hasFocus()
    );
  }

  /** The hidden text box while text input is captured, else the view. */
  override focus(): boolean {
    if ("none" !== this._fakeTextDiv.style.display) {
      this._fakeTextBox.focus();
      return true;
    }
    return super.focus();
  }

  isCapturingInput(): boolean {
    return !!this._inputListener;
  }

  /**
   * Routes text input to `onInput` through the hidden text box (shown and
   * focused), with the composition listeners for IME input. Clipboard
   * events in the box are blocked.
   */
  startCaptureInput(
    onInput: (event: globalThis.Event) => void,
    onCompositionStart?: ((event: globalThis.Event) => void) | null,
    onCompositionEnd?: ((event: globalThis.Event) => void) | null,
    onCompositionUpdate?: ((event: globalThis.Event) => void) | null,
  ): void {
    if (this.isCapturingInput()) return;
    this._lastFocus = document.activeElement;
    this._fakeTextDiv.style.display = "";
    this._fakeTextBox.value = "";
    this._fakeTextBox.addEventListener("input", onInput);
    this._fakeTextBox.addEventListener("keydown", onInput);
    this._fakeTextBox.addEventListener("paste", this._preventListener);
    this._fakeTextBox.addEventListener("copy", this._preventListener);
    this._fakeTextBox.addEventListener("cut", this._preventListener);
    if (onCompositionStart)
      this._fakeTextBox.addEventListener("compositionstart", onCompositionStart);
    if (onCompositionEnd) this._fakeTextBox.addEventListener("compositionend", onCompositionEnd);
    if (onCompositionUpdate)
      this._fakeTextBox.addEventListener("compositionupdate", onCompositionUpdate);
    this._fakeTextBox.focus();
    this._inputListener = onInput;
    this._inputListenerCompStart = onCompositionStart || null;
    this._inputListenerCompEnd = onCompositionEnd || null;
    this._inputListenerCompUpd = onCompositionUpdate || null;
  }

  /**
   * Stops capturing text input and hides the text box. The old code
   * assigned the saved element to document.activeElement, a read-only
   * property, so the focus does not go back (see "endCaptureInput does not
   * give the focus back" in QUESTIONS.md).
   */
  endCaptureInput(): void {
    if (!this.isCapturingInput()) return;
    // A no-op assignment in sloppy mode; in this module it would throw.
    void this._lastFocus;
    this._fakeTextDiv.style.display = "none";
    const listener = this._inputListener as (event: globalThis.Event) => void;
    this._fakeTextBox.removeEventListener("input", listener);
    this._fakeTextBox.removeEventListener("keydown", listener);
    this._fakeTextBox.removeEventListener("keypress", listener);
    this._fakeTextBox.removeEventListener("paste", this._preventListener);
    this._fakeTextBox.removeEventListener("copy", this._preventListener);
    this._fakeTextBox.removeEventListener("cut", this._preventListener);
    if (this._inputListenerCompEnd)
      this._fakeTextBox.removeEventListener("compositionend", this._inputListenerCompEnd);
    if (this._inputListenerCompStart)
      this._fakeTextBox.removeEventListener("compositionstart", this._inputListenerCompStart);
    if (this._inputListenerCompUpd)
      this._fakeTextBox.removeEventListener("compositionupdate", this._inputListenerCompUpd);
    this._lastFocus = null;
    this._inputListener = null;
  }

  _preventListener(event: globalThis.Event): void {
    event.preventDefault();
  }

  /** Moves the hidden text box to world point (x, y), so the IME pops up there. */
  updateInputBox(x: number, y: number): void {
    if (isNaN(x) || isNaN(y)) return;
    const mapped = this.getWorldTransform().mapPoint(new Point(x, y));
    const dpi = PaintCanvas.getScreenDPI();
    this._fakeTextDiv.style.left = mapped.getX() / dpi + "px";
    this._fakeTextDiv.style.top = mapped.getY() / dpi + "px";
  }

  resetInputBoxCursor(): void {
    if (
      this._fakeTextBox &&
      "function" == typeof this._fakeTextBox.setSelectionRange &&
      this._fakeTextBox.selectionStart !== this._fakeTextBox.value.length
    )
      this._fakeTextBox.setSelectionRange(
        this._fakeTextBox.value.length,
        this._fakeTextBox.value.length,
      );
  }

  resetInputBoxContent(): void {
    if (this._fakeTextBox) this._fakeTextBox.value = "";
  }

  override release(): void {
    const input = this._inputHtmlElement as HTMLDivElement;
    input.removeEventListener("dragenter", this._dragEventerEvent);
    input.removeEventListener("dragover", this._dragOverEvent);
    input.removeEventListener("drop", this._dropEvent);
    this._editor.removeEventListener(
      Editor.InvalidationRequestEvent,
      this._editorInvalidationRequest,
      this,
    );
    this._editor
      .getGuides()
      .removeEventListener(
        Guides.InvalidationRequestEvent,
        this._editorHelpersInvalidationRequest,
        this,
      );
    this._editor
      .getDistanceHelper()
      .removeEventListener(
        DistanceHelper.InvalidationRequestEvent,
        this._editorHelpersInvalidationRequest,
        this,
      );
    this._scene.removeEventListener(AfterPropertiesChangeEvent, this._afterPropertiesChanged, this);
    const toolManager = getWorkspaceToolManager(this._scene);
    if (toolManager)
      toolManager.removeEventListener(
        ToolInvalidationRequestEvent,
        this._toolInvalidationRequest,
        this,
      );
    super.release();
  }

  /** Scene size, grid and guide line settings and page margins show in the overlay. */
  _afterPropertiesChanged(event: AfterPropertiesChangeEvent): void {
    if (event.temporary) return;
    const properties = event.properties as string[];
    if (
      (event.node === this._scene &&
        containsOneOf(properties, [
          "w",
          "h",
          "gx",
          "gy",
          "gm",
          "ga1",
          "ga2",
          "vgl",
          "hgl",
          "gaw",
          "gah",
        ])) ||
      (event.node instanceof Page &&
        // The old code passed the decoration's `margin` flag (a boolean)
        // as the property list (see "Page margin changes never repaint
        // the overlay" in QUESTIONS.md).
        containsOneOf(properties, this._viewConfiguration.pageDecoration.margin as never))
    )
      this.invalidate();
  }

  _editorHelpersInvalidationRequest(
    event: GuidesInvalidationRequestEvent | DistanceHelperInvalidationRequestEvent,
  ): void {
    if (event.area) this.invalidate(this.getWorldTransform().mapRect(event.area));
  }

  /**
   * An element editor wants a repaint: it maps its area with the world
   * transform of its page (in the single-page view only editors of the
   * active page or of no page count).
   */
  _editorInvalidationRequest(event: EditorInvalidationRequestEvent): void {
    if (!event.editor) return;
    // The element editor that asked, and the page it is on.
    const editor = event.editor as { invalidate(transform: Transform, args: unknown): Rect | null };
    const editorPage = (): Page | Scene | null => event.getEditorPage() as Page | Scene | null;
    let area: Rect | null | undefined;
    const args = event.args as { pageTransform?: Transform } | null | undefined;
    if (args && args.pageTransform && this.getViewConfiguration().multiPageView) {
      const transform = this.getWorldTransform(this.getScene()).preMultiplied(args.pageTransform);
      area = editor.invalidate(transform, null);
    } else if (this.getViewConfiguration().multiPageView)
      area = editor.invalidate(this.getWorldTransform(editorPage() || this.getScene()), event.args);
    else {
      const scene = this.getScene();
      const page = editorPage();
      const active = scene ? scene.getActivePage() : null;
      if (!page || page === scene || page === active)
        area = editor.invalidate(this.getWorldTransform(page || scene), event.args);
    }
    if (area) this.invalidate(area);
  }

  _toolInvalidationRequest(event: ToolInvalidationRequestEvent): void {
    this.invalidate(event.area);
  }

  /** A press on a ruler (not on the vertical ruler's leftmost 2px) drags out a new guide line. */
  _rulerDownLister(event: MouseEvent & { stopPropagation?: () => void }): void {
    const isVertical = event.sender === this._verticalRuler;
    if (isVertical && event.client.getX() <= 2 * PaintCanvas.getScreenDPI()) return;
    (event.stopPropagation as () => void)();
    this.startMoveGuideLine(isVertical, -1);
    const onMove = function (this: EditorWidget, move: MouseEvent): void {
      this.moveGuideLine(move.client);
    };
    const onRelease = function (this: EditorWidget): void {
      this.removeEventListener(MouseEvent.Move, onMove, this);
      this.removeEventListener(MouseEvent.Release, onRelease, this);
      this.finishMoveGuideLine();
    };
    this.addEventListener(MouseEvent.Move, onMove, this);
    this.addEventListener(MouseEvent.Release, onRelease, this);
  }

  _guideMoveModifierChangeListener(event: ModifiersChangedEvent): void {
    if (event.changed.metaKey) this.moveGuideLine(this._guideLineViewPoint as Point);
  }

  /**
   * Paints the overlay: page backgrounds (with their shadow) under the
   * scene, the scene tiles, the element editors, the active tool, page
   * margins, guides and the distance helper.
   */
  override _paintElement(
    worldToView?: Transform | null,
    viewToWorld?: Transform | null,
    finished?: boolean,
    graphic?: HTMLCanvasElement | null,
  ): void {
    worldToView = worldToView || this.getWorldTransform();
    viewToWorld = viewToWorld || this.getViewTransform();
    const decoration = this._viewConfiguration.pageDecoration;
    if (
      decoration.chessboard ||
      ((decoration.shadow as number) > 0 && this._scene.isFixedSized())
    ) {
      const transform = worldToView;
      if (this._viewConfiguration.multiPageView) {
        this._scene.iteratePages((page) => {
          this._renderPageBackground(page, transform);
        });
      } else this._renderPageBackground(this._scene.getActivePage() as Page, transform);
    }
    super._paintElement(worldToView, viewToWorld, finished, graphic);
    const sceneEditor = ElementEditor.getEditor<{
      paint(transform: Transform, context: unknown): void;
    }>(this._scene);
    if (sceneEditor) sceneEditor.paint(worldToView, this._elementPaintContext);
    const toolManager = getWorkspaceToolManager(this._scene);
    if (toolManager) toolManager.paint(this._elementPaintContext);
    if (decoration.margin && this._scene.isFixedSized()) {
      const transform = worldToView;
      if (this._viewConfiguration.multiPageView) {
        this._scene.iteratePages((page) => {
          this._renderPageMargin(page, transform);
        });
      } else this._renderPageMargin(this._scene.getActivePage() as Page, transform);
    }
    // The guides paint in world space against a dirty matcher in view
    // space: map it there for them and back afterwards.
    let restore: Transform | null = null;
    if (this._elementPaintContext.dirtyMatcher) {
      const transform = viewToWorld;
      this._elementPaintContext.dirtyMatcher.transform(viewToWorld);
      if (transform) restore = transform.inverted();
    }
    this._editor.getGuides().paint(worldToView, this._elementPaintContext);
    const distanceHelper = this._editor.getDistanceHelper();
    if (distanceHelper && distanceHelper.isActivated())
      distanceHelper.paint(worldToView, this._elementPaintContext);
    if (restore)
      (
        this._elementPaintContext.dirtyMatcher as NonNullable<
          typeof this._elementPaintContext.dirtyMatcher
        >
      ).transform(restore);
  }

  /** Also gives the scene the area page shadows need at this zoom, and moves inline editors. */
  override _updateViewTransforms(noEvent?: boolean, noInvalidation?: boolean): void {
    super._updateViewTransforms(noEvent, noInvalidation);
    const decoration = this._viewConfiguration.pageDecoration;
    if ((decoration.shadow as number) > 0) {
      const offsetX = decoration.shadowOffsetX || 0;
      const offsetY = decoration.shadowOffsetY || 0;
      const blur = 1 + 2 * (decoration.shadow as number);
      const scale = this.getViewTransform().getScaleFactor();
      let left = blur + Math.max(0, -offsetX);
      let top = blur + Math.max(0, -offsetY);
      let right = blur + Math.max(0, offsetX);
      let bottom = blur + Math.max(0, offsetY);
      left *= scale;
      top *= scale;
      right *= scale;
      bottom *= scale;
      this._scene.setShadowExpandArea(left, top, right, bottom);
    } else this._scene.setShadowExpandArea(null);
    this._editor.updateInlineEditorForView(this);
  }

  /**
   * Fills the page's area (or the chessboard) with its drop shadow on the
   * element canvas. Skipped where the scene paints an opaque page
   * background over it anyway and no shadow edge is dirty.
   */
  _renderPageBackground(page: Page, worldToView: Transform): void {
    const decoration = this._viewConfiguration.pageDecoration;
    const position = page.getPosition(this._viewConfiguration.multiPageView);
    const transform = worldToView.preMultiplied(
      new Transform(1, 0, 0, 1, position.getX(), position.getY()),
    );
    const box = page.isFixedSized() ? page.getGeometryBBox() : page.getPaintBBox(null, true);
    if (!box) return;
    const mapped = transform.mapRect(box);
    const x = mapped.getX();
    const y = mapped.getY();
    const width = mapped.getWidth();
    const height = mapped.getHeight();
    const dirty = this._elementPaintContext.dirtyMatcher;
    const isFirefoxOnWindows =
      "undefined" != typeof navigator &&
      navigator &&
      0 == navigator.userAgent.indexOf("Mozilla") &&
      0 == navigator.platform.indexOf("Win") &&
      navigator.userAgent.indexOf("Edge") < 0 &&
      navigator.userAgent.indexOf("Chrome") < 0 &&
      navigator.userAgent.indexOf("Safari") < 0;
    if (isFirefoxOnWindows && (decoration.shadow as number) > 0 && !firefoxShadowWarned) {
      firefoxShadowWarned = true;
      console.warn("Due to browser bug (Firefox), shadow under canvas isn't displayed.");
    }
    let withShadow =
      (decoration.shadow as number) > 0 &&
      !isFirefoxOnWindows &&
      !(SceneOptions.pagesCanOverlap && this._viewConfiguration.multiPageView);
    const offsetX = decoration.shadowOffsetX || 0;
    const offsetY = decoration.shadowOffsetY || 0;
    if (dirty) {
      const blur = 1 + 2 * (decoration.shadow as number);
      const shadowArea = mapped.expanded(
        blur + Math.max(0, -offsetX),
        blur + Math.max(0, -offsetY),
        blur + Math.max(0, offsetX),
        blur + Math.max(0, offsetY),
      );
      if (!dirty.isDirty(shadowArea)) return;
      if (withShadow) {
        withShadow = false;
        let edges = shadowArea.subtracted(mapped, true);
        if (edges instanceof Rect) edges = [edges];
        for (let i = 0; i < edges.length; i++) {
          if (dirty.isDirty(edges[i] as Rect)) {
            withShadow = true;
            break;
          }
        }
      }
      if (
        !withShadow &&
        this._viewConfiguration.paintMode !== ScenePaintConfiguration.PaintMode.Outline &&
        !this._sceneCanvas.isMasked() &&
        1 == page.getProperty("bop")
      ) {
        const background = page.getProperty("bck");
        if (background instanceof RGBColor) return;
        if (
          background instanceof Gradient &&
          background.getStops().every((stop) => 1 == stop.opacity)
        )
          return;
      }
    }
    let fill: string | CanvasPattern | null = decoration.background || "white";
    if (decoration.chessboard) {
      if (!chessboard) chessboard = PaintCanvas.createChessboard(8, "white", "rgb(205, 205, 205)");
      fill = this._elementCanvas.createTexture(chessboard);
    }
    const context = this._elementCanvas._canvasContext;
    try {
      if (withShadow) {
        context.shadowColor = decoration.shadowBackground || "rgba(0,0,0,0.5)";
        context.shadowBlur = decoration.shadow as number;
        context.shadowOffsetX = offsetX;
        context.shadowOffsetY = offsetY;
      }
      if (dirty && isFirefoxOnWindows) {
        const pageRect = new Rect(
          Math.ceil(x),
          Math.ceil(y),
          Math.floor(width),
          Math.floor(height),
        );
        const rects = dirty.getNonIntersectingDirtyRectangles() as Rect[];
        for (let i = 0; i < rects.length; ++i) {
          const part = (rects[i] as Rect).intersected(pageRect);
          this._elementCanvas.fillRect(
            part.getX(),
            part.getY(),
            part.getWidth(),
            part.getHeight(),
            fill,
          );
        }
      } else
        this._elementCanvas.fillRect(
          Math.ceil(x),
          Math.ceil(y),
          Math.floor(width),
          Math.floor(height),
          fill,
        );
    } finally {
      if (withShadow) {
        context.shadowBlur = 0;
        context.shadowColor = "transparent";
      }
    }
  }

  /** Outlines the page's margins (magenta) where they differ from its box. */
  _renderPageMargin(page: Page, worldToView: Transform): void {
    const position = page.getPosition(this._viewConfiguration.multiPageView);
    const transform = worldToView.preMultiplied(
      new Transform(1, 0, 0, 1, position.getX(), position.getY()),
    );
    const box = page.getGeometryBBox();
    if (!box) return;
    let half = 0;
    if (EditorOptions.outlineWidth % 2 != 0) half = 0.5;
    const marginBox = box.expanded(
      -(page.getProperty("ml") as number),
      -(page.getProperty("mt") as number),
      -(page.getProperty("mr") as number),
      -(page.getProperty("mb") as number),
    );
    const mapped = transform.mapRect(marginBox).translated(half, half).toAlignedRect();
    const dirty = this._elementPaintContext.dirtyMatcher;
    const grow = Math.ceil(EditorOptions.outlineWidth / 2);
    if (
      (!dirty || dirty.isDirty(mapped.expanded(grow, grow, grow, grow))) &&
      !Rect.equals(box, marginBox)
    ) {
      (this._elementPaintContext.canvas as PaintCanvas).strokeRect(
        mapped.getX(),
        mapped.getY(),
        mapped.getWidth(),
        mapped.getHeight(),
        EditorOptions.outlineWidth,
        new RGBColor([255, 0, 255]),
      );
    }
  }

  /** A DOM drop on the view. */
  handleDropEvent(event: DragEvent): void {
    const point = this._convertClientPositionFromMousePosition(event);
    this._handleDrop(point, event.dataTransfer as DataTransfer);
  }

  /**
   * A dropped symbol: the scene's own copy when it has the same symbol
   * unattached; otherwise it becomes a master unless one with its master
   * reference exists.
   */
  _handleSymbolDrop(symbol: SymbolNode): SymbolNode {
    const symbols = this._scene.getSymbols();
    if (!symbols) return symbol;
    let found = false;
    for (let i = 0; i < symbols.length && !found; i++) {
      const candidate = symbols[i] as SymbolNode;
      if (
        candidate.getMultireferenceId() === symbol.getMultireferenceId() &&
        !candidate.getParent()
      ) {
        symbol = candidate;
        found = true;
      }
    }
    if (!found) {
      const masterReference = symbol.getProperty("masterMultiRef");
      for (let i = 0; i < symbols.length && !found; i++)
        if ((symbols[i] as SymbolNode).getProperty("masterMultiRef") === masterReference)
          found = true;
      if (found) console.log("inserting:found");
      else {
        symbol._master = true;
        if (!(
          symbol.getProperty("masterRef") === symbol.getReferenceId() &&
          symbol.getProperty("masterMultiRef") === symbol.getMultireferenceId()
        ))
          console.log("inserting: making non master a master");
        symbol.setProperties(
          ["masterRef", "masterMultiRef"],
          [symbol.getReferenceId(), symbol.getMultireferenceId()],
        );
      }
    }
    return symbol;
  }

  /**
   * Handles a drop at view point `point`: files go to the editor's
   * FileDropEvent listeners; other data is offered to the editors of the
   * elements under the point, and a dropped node nobody took is inserted
   * there.
   */
  _handleDrop(point: Point, data: DataTransfer): void {
    const scenePoint = this.getViewTransform(this._scene).mapPoint(point);
    const pagePoint = this.getViewTransform(this._scene.getActivePage()).mapPoint(point);
    if (data.files && data.files.length > 0) {
      if (this._editor.hasEventListeners(Editor.FileDropEvent))
        for (let i = 0; i < data.files.length; ++i)
          this._editor.trigger(new Editor.FileDropEvent(data.files[i] as File, pagePoint));
      return;
    }
    if (!(data.types && data.types.length > 0)) return;
    const sources: DropSource[] = [];
    let accepted = false;
    for (let i = 0; i < data.types.length; ++i) {
      const mimeType = data.types[i] as string;
      const value = data.getData(mimeType);
      if (!value) continue;
      let type: number | null = null;
      let source: unknown = null;
      switch (mimeType) {
        case Pattern.MIME_TYPE:
          type = ElementEditor.DropType.Pattern;
          source = Pattern.deserialize(value);
          break;
        case Node.MIME_TYPE:
          type = ElementEditor.DropType.Node;
          source = Node.deserialize(value);
          if (source instanceof SymbolNode) source = this._handleSymbolDrop(source);
          break;
        case ElementEditor.DROP_MIME_TYPE_FONT_FAMILY:
          type = ElementEditor.DropType.FontFamily;
          source = value;
          break;
        case ElementEditor.DROP_MIME_TYPE_CUSTOM:
          if (this._editor.hasEventListeners(Editor.CustomDropEvent))
            this._editor.trigger(new Editor.CustomDropEvent(value, pagePoint));
          break;
        case "text/plain":
          type = ElementEditor.DropType.Text;
          source = value;
          break;
        default:
          continue;
      }
      sources.push({ type, source });
      if (null === type) continue;
      const hits = this._scene.hitTest(
        point,
        this.getWorldTransform(this._scene),
        null,
        true,
        -1,
        EditorOptions.pickDistance,
        true,
        this._dropHitFilter,
        false,
        false,
        this._viewConfiguration.multiPageView,
      );
      if (hits && hits.length > 0)
        for (let j = 0; j < hits.length; ++j) {
          const hit = hits[j] as { element: Element; data: unknown };
          const editor = ElementEditor.createEditor(hit.element);
          if (!editor) continue;
          let pageLocal: Point | null = null;
          for (let node: Node | null = hit.element; node;) {
            if (node instanceof Page) {
              pageLocal = this.getViewTransform(node).mapPoint(point);
              break;
            }
            node = node.getParent();
          }
          if (pageLocal && editor.acceptDrop(pageLocal, type, source, hit.data)) {
            accepted = true;
            break;
          }
        }
    }
    if (accepted) return;
    for (let i = 0; i < sources.length; ++i) {
      const { type, source } = sources[i] as DropSource;
      if (type !== ElementEditor.DropType.Node || !(source instanceof Element)) continue;
      // The old code called transform on any element; dropped elements have it.
      const element = source as TransformElement;
      if (source instanceof SymbolNode) {
        const box = source.getGeometryBBox();
        if (box) {
          const left = box.getX();
          const top = box.getY();
          element.transform(
            new Transform(1, 0, 0, 1, -left + pagePoint.getX(), -top + pagePoint.getY()),
            true,
          );
        }
      } else element.transform(new Transform(1, 0, 0, 1, pagePoint.getX(), pagePoint.getY()), true);
      this._editor.updateByMousePosition(scenePoint, null, false, this._viewConfiguration);
      const masterIds: unknown[] = [];
      const masters: SymbolNode[] = [];
      const hasMasters = source.accept(
        (node: Node) => {
          if (!(node instanceof SymbolNode && node.isMaster())) return false;
          masterIds.push(node.getMultireferenceId());
          masters.push(node);
          return true;
        },
        false,
        true,
      );
      if (hasMasters) this._editor.beginTransaction();
      this._editor.insertElements([source], true, hasMasters, true);
      if (hasMasters) {
        this._scene.acceptChildren((node: Node) => {
          if (node instanceof SymbolNode && !node.isMaster()) {
            const index = masterIds.indexOf(node.getProperty("masterMultiRef"));
            if (index >= 0) {
              const master = masters[index] as SymbolNode;
              this._scene.link(master, node);
              node.setProperty("masterRef", master.getReferenceId());
            }
          }
        });
        this._editor.commitTransaction(
          Locale.get(new LocaleKey("GEditorWidget", "action.insert-master-symbol")),
        );
      }
    }
  }

  _dropHitFilter(element: Element): boolean {
    return !element.hasFlag(ElementFlag.FullLocked);
  }

  override toString(): string {
    return "[Object GEditorWidget]";
  }
}
