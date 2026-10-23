// Old: chunk.vendor.js module 553 (GToolManager).
/**
 * The app's tools and which one is active. There is one tool manager per
 * workspace (the editor workspace makes it); the app gives it the active
 * document's view (setView), and the active tool works on that view.
 *
 * Besides plain switching (activateTool) the manager does temporary
 * switches:
 *
 * - tool keys held down (tempToolKeyActivate / tempToolKeyRelease, called
 *   by the app's shortcuts): held for the release delay or longer the
 *   previous tool comes back on release, a quick tap keeps the new tool;
 * - Space or the middle button: the hand tool while held, with Meta the
 *   zoom tool (_updateTemporaryTool, from the modifier changes).
 *
 * Some of these switches are "light": the previous tool is deactivated
 * light and keeps its state, so it can carry on where it was (hold D while
 * drawing with the pen, release to continue the path).
 */
import { Event } from "../../engine/core/event.ts";
import { EventTarget } from "../../engine/core/event-target.ts";
import type { Modifiers } from "../../engine/core/modifiers.ts";
import { ModifiersChangedEvent } from "../../engine/core/modifiers-changed-event.ts";
import { MouseEvent } from "../../engine/core/mouse-event.ts";
import { getTypeId, registerClass, type AnyConstructor } from "../../engine/core/object.ts";
import { Platform } from "../../engine/core/platform.ts";
import { Point } from "../../engine/math/point.ts";
import type { Rect } from "../../engine/math/rect.ts";
import type { PaintContext } from "../../engine/paint/paint-context.ts";
import type { Page } from "../../engine/scene/page.ts";
import { registerToolManagerFactory } from "../editor-workspace.ts";
import type { EditorWidget } from "../view/editor-widget.ts";
import { Tool } from "./tool.ts";
import { ArrowAnnotationTool } from "../annotations/arrow-annotation-tool.ts";
import { CommentAnnotationTool } from "../annotations/comment-annotation-tool.ts";
import { EllipseAnnotationTool } from "../annotations/ellipse-annotation-tool.ts";
import { HighlighterAnnotationTool } from "../annotations/highlighter-annotation-tool.ts";
import { PencilAnnotationTool } from "../annotations/pencil-annotation-tool.ts";
import { RectangleAnnotationTool } from "../annotations/rectangle-annotation-tool.ts";
import { PathsGraphTool } from "../paths-graph/paths-graph-tool.ts";
import { BezigonTool } from "./bezigon-tool.ts";
import { ConnectorTool } from "./connector-tool.ts";
import { EllipseTool } from "./ellipse-tool.ts";
import { FillTool } from "./fill-tool.ts";
import { FreehandTool } from "./freehand-tool.ts";
import { HandTool } from "./hand-tool.ts";
import { KnifeTool } from "./knife-tool.ts";
import { LassoTool } from "./lasso-tool.ts";
import { LayerTool } from "./layer-tool.ts";
import { LineTool } from "./line-tool.ts";
import { MagicTool } from "./magic-tool.ts";
import { PenTool } from "./pen-tool.ts";
import { PointerTool } from "./pointer-tool.ts";
import { PolygonTool } from "./polygon-tool.ts";
import { RectangleTool } from "./rectangle-tool.ts";
import { SimpleShapeTool } from "./simple-shape-tool.ts";
import { SliceTool } from "./slice-tool.ts";
import { StarTool } from "./star-tool.ts";
import { SubSelectTool } from "./sub-select-tool.ts";
import { TextTool } from "./text-tool.ts";
import { TriangleTool } from "./triangle-tool.ts";
import { ZoomTool } from "./zoom-tool.ts";

/** A tool class, as activateTool, getTool and indexOf accept it. */
export type ToolClass = AnyConstructor<Tool>;

/** What getTool and indexOf look a tool up by: an index (getTool), an instance or a class. */
export type ToolKey = Tool | ToolClass;

/** A tool that shows an icon it was activated with (the simple shape tool). */
interface IconTool {
  setIcon(icon: unknown): void;
}

/** Fired on every switch of the active tool. */
export class ToolChangedEvent extends Event {
  static {
    registerClass(this, "GToolManager.ToolChangedEvent");
  }

  previousTool: Tool | null;
  newTool: Tool | null;
  /** A temporary switch that keeps the previous tool's state. */
  light: boolean;

  constructor(previousTool: Tool | null, newTool: Tool | null, light?: boolean) {
    super();
    this.previousTool = previousTool;
    this.newTool = newTool;
    this.light = !!light;
  }

  override toString(): string {
    return "[Event GToolManager.ToolChangedEvent]";
  }
}

/** The active tool needs `area` (view coordinates, null for everything) repainted. */
export class InvalidationRequestEvent extends Event {
  static {
    registerClass(this, "GToolManager.InvalidationRequestEvent");
  }

  manager: ToolManager;
  area: Rect | null;

  constructor(manager: ToolManager, area: Rect | null) {
    super();
    this.manager = manager;
    this.area = area;
  }

  override toString(): string {
    return "[Event GToolManager.InvalidationRequestEvent]";
  }
}

export class ToolManager extends EventTarget {
  static {
    registerClass(this, "GToolManager");
  }

  static ToolChangedEvent = ToolChangedEvent;
  static InvalidationRequestEvent = InvalidationRequestEvent;

  _tools: Tool[] = [];
  /** Type id of a tool's class to its index; a class registered twice maps to its last index. */
  _typeIdToIndexMap: Record<string, number> = {};
  _defaultTool: ToolClass = PointerTool;
  _activeTool: Tool | null = null;
  _oldTool: Tool | null = null;
  _view: EditorWidget | null = null;
  _temporaryActiveTool: Tool | null = null;
  _tempActivationTime: number | null = null;
  _lightDeactivation = false;

  /**
   * Registers one instance of every tool, in the old order. The fill tool
   * is registered twice, as in the old app (see "The fill tool is
   * registered twice" in QUESTIONS.md).
   */
  constructor() {
    super();
    this.addTool(new PointerTool());
    this.addTool(new SubSelectTool());
    this.addTool(new LassoTool());
    this.addTool(new LayerTool());
    this.addTool(new LineTool());
    this.addTool(new PenTool());
    this.addTool(new BezigonTool());
    this.addTool(new PathsGraphTool());
    this.addTool(new FreehandTool());
    this.addTool(new MagicTool());
    this.addTool(new RectangleTool());
    this.addTool(new EllipseTool());
    this.addTool(new TriangleTool());
    this.addTool(new PolygonTool());
    this.addTool(new StarTool());
    this.addTool(new SimpleShapeTool());
    this.addTool(new TextTool());
    this.addTool(new KnifeTool());
    this.addTool(new FillTool());
    this.addTool(new SliceTool());
    this.addTool(new FillTool());
    this.addTool(new HandTool());
    this.addTool(new ZoomTool());
    this.addTool(new ConnectorTool());
    this.addTool(new EllipseAnnotationTool());
    this.addTool(new PencilAnnotationTool());
    this.addTool(new RectangleAnnotationTool());
    this.addTool(new ArrowAnnotationTool());
    this.addTool(new CommentAnnotationTool());
    this.addTool(new HighlighterAnnotationTool());
  }

  addTool(tool: Tool): void {
    if (tool._manager) throw new Error("Tool is already registered");
    this._tools.push(tool);
    tool._manager = this;
    this._typeIdToIndexMap = {};
    for (let i = 0; i < this._tools.length; ++i) {
      this._typeIdToIndexMap[String(getTypeId(this._tools[i]))] = i;
    }
  }

  hasTool(key: ToolKey): boolean {
    return Object.prototype.hasOwnProperty.call(this._typeIdToIndexMap, String(getTypeId(key)));
  }

  getToolCount(): number {
    return this._tools.length;
  }

  indexOf(key: ToolKey): number {
    const id = String(getTypeId(key));
    return Object.prototype.hasOwnProperty.call(this._typeIdToIndexMap, id)
      ? (this._typeIdToIndexMap[id] as number)
      : -1;
  }

  getTool(key: number | ToolKey): Tool | null {
    const index = "number" == typeof key ? key : this.indexOf(key);
    return index >= 0 && index < this._tools.length ? (this._tools[index] as Tool) : null;
  }

  getActiveTool(): Tool | null {
    return this._activeTool;
  }

  getTemporaryActiveTool(): Tool | null {
    return this._temporaryActiveTool;
  }

  /**
   * Makes `tool` the active tool. While a temporary tool is active only a
   * forced call switches; it ends the temporary switch (when the active
   * tool can be left). `icon` goes to tools that show one.
   */
  activateTool(tool: ToolKey, icon?: unknown, force?: boolean): boolean {
    if (!this._temporaryActiveTool || force) {
      if (this._temporaryActiveTool) {
        const target = tool instanceof Tool ? tool : this.getTool(this.indexOf(tool));
        if (target == this._activeTool) {
          this._temporaryActiveTool = null;
          this._tempActivationTime = null;
          return true;
        }
        if ((this._activeTool as Tool).isDeactivatable()) {
          this._temporaryActiveTool = null;
          this._tempActivationTime = null;
        }
        tool = target as Tool;
      }
      if (!this._temporaryActiveTool) return this._activateTool(tool, icon);
    }
    return false;
  }

  /**
   * A tool key went down: switches to `tool` and remembers the previous
   * tool and when the switch happened, for tempToolKeyRelease.
   */
  tempToolKeyActivate(tool: ToolClass | null | undefined): boolean {
    if (tool && this.getTool(tool) !== this._activeTool) {
      const previous = this._activeTool;
      const light =
        tool == HandTool ||
        tool == ZoomTool ||
        ((previous instanceof PenTool || previous instanceof BezigonTool) &&
          (tool == PenTool ||
            tool == BezigonTool ||
            tool == PointerTool ||
            tool == SubSelectTool ||
            tool == LassoTool));
      if (this._activateTool(tool, null, light)) {
        this._lightDeactivation = light;
        if (!this._temporaryActiveTool) this._temporaryActiveTool = previous;
        if (!this._tempActivationTime) this._tempActivationTime = new Date().getTime();
        return true;
      }
    }
    return false;
  }

  /**
   * The tool key went up. Held for `delay` ms or longer, the previous
   * tool comes back; after a quick tap the new tool stays, and a light
   * switch is turned into a real one (the kept tool is deactivated).
   */
  tempToolKeyRelease(tool: ToolClass | null | undefined, delay: number): boolean {
    if (!(
      tool &&
      this.getTool(tool) == this._activeTool &&
      this._temporaryActiveTool &&
      this._tempActivationTime
    ))
      return false;
    if (this._tempActivationTime + delay <= new Date().getTime()) {
      this._activateTool(this._temporaryActiveTool);
    } else if (this._lightDeactivation) {
      const view = this._view as EditorWidget;
      this._temporaryActiveTool.deactivate(view);
      (this._activeTool as Tool).activate(view, true);
      if (this.hasEventListeners(ToolChangedEvent))
        this.trigger(new ToolChangedEvent(this._temporaryActiveTool, this._activeTool, false));
      this._lightDeactivation = false;
    }
    this._temporaryActiveTool = null;
    this._tempActivationTime = null;
    return true;
  }

  isContextActivatable(tool: Tool): boolean {
    return tool.isActivatable(this._view);
  }

  /** The view the tools work on (the active window's), or null. */
  setView(view: EditorWidget | null): void {
    if (view != this._view) {
      if (this._view) {
        this._removeActiveToolFromView();
        Platform.removeEventListener(ModifiersChangedEvent, this._modifiersChanged);
      }
      this._view = view;
      if (this._view) {
        this._addActiveToolToView();
        Platform.addEventListener(ModifiersChangedEvent, this._modifiersChanged, this);
      }
    }
  }

  setDefaultTool(tool: ToolClass): void {
    this._defaultTool = tool;
  }

  /** A tool finished its job: the default tool comes back on the next tick. */
  notifyJobDone(tool: Tool): void {
    if (!(tool instanceof this._defaultTool))
      setTimeout(() => {
        this.activateTool(this._defaultTool);
      }, 0);
  }

  activateSubSelect(): void {
    this.activateTool(SubSelectTool);
  }

  getOldTool(): Tool | null {
    return this._oldTool;
  }

  /** Back to the last pen or bezigon tool, else the pen. */
  activateOldPathTool(): void {
    const old = this.getOldTool();
    if (old && (old instanceof PenTool || old instanceof BezigonTool)) this.activateTool(old);
    else this.activateTool(PenTool);
  }

  _activateTool(key: ToolKey, icon?: unknown, light?: boolean): boolean {
    const tool = key instanceof Tool ? key : (this.getTool(this.indexOf(key)) as Tool);
    if (
      tool == this._activeTool ||
      (this._activeTool && !this._activeTool.isDeactivatable()) ||
      !tool.isActivatable(this._view)
    )
      return false;
    this._removeActiveToolFromView(light);
    this._oldTool = this._activeTool;
    this._activeTool = tool;
    const withIcon = this._activeTool as Tool & Partial<IconTool>;
    if (icon && withIcon.setIcon instanceof Function) withIcon.setIcon(icon);
    this._addActiveToolToView();
    if (this.hasEventListeners(ToolChangedEvent))
      this.trigger(new ToolChangedEvent(this._oldTool, tool, light));
    return true;
  }

  _addActiveToolToView(): void {
    if (this._activeTool && this._view) {
      this._activeTool.activate(this._view);
      this._updateActiveToolCursor();
    }
  }

  _removeActiveToolFromView(light?: boolean): void {
    if (this._activeTool && this._view) {
      this._activeTool.deactivate(this._view, light);
      this._view.setCursor(null);
      this._view.getEditor().closeInlineEditor();
    }
  }

  _updateActiveToolCursor(): void {
    if (this._activeTool && this._view) this._view.setCursor(this._activeTool.getCursor());
  }

  /** Shows `text` at `position` (active page coordinates) in the view, or hides the hint. */
  _updateInlineHint(text: string | null, position?: Point | null, side?: string): void {
    if (this._activeTool && this._view) {
      if (text && position) {
        const view = this._view;
        const mapped = view
          .getWorldTransform(view.getScene().getActivePage() as Page)
          .mapPoint(position);
        view.updateInlineHint(text, new Point(mapped.getX(), mapped.getY()), side);
      } else this._view.updateInlineHint(null);
    }
  }

  _invalidateActiveToolArea(area: Rect | null): void {
    if (this.hasEventListeners(InvalidationRequestEvent) && this._activeTool && this._view)
      this.trigger(new InvalidationRequestEvent(this, area));
  }

  paint(context: PaintContext): void {
    if (this._activeTool) this._activeTool.paint(context);
  }

  /**
   * Space or the middle button held: the hand tool, with Meta the zoom
   * tool; released, the tool from before. `changed` holds the modifiers
   * that just changed. Nothing happens while text is edited inline.
   */
  _updateTemporaryTool(changed: Modifiers): void {
    const view = this._view as EditorWidget;
    if (view.getEditor().isInlineEditing()) return;
    const modifiers = Platform.modifiers;
    const hand = this.getTool(this.indexOf(HandTool));
    const zoom = this.getTool(this.indexOf(ZoomTool));
    let next: Tool | null = null;
    if ((modifiers.spaceKey || modifiers.middleButton) && this._temporaryActiveTool !== hand)
      next = hand;
    else if (
      this._temporaryActiveTool &&
      this._tempActivationTime &&
      !(
        ((changed.spaceKey || changed.middleButton) && this._activeTool == hand) ||
        (!modifiers.metaKey && changed.metaKey && this._activeTool == zoom)
      )
    )
      next = this._activeTool;
    if (!next && hand && !hand.isDeactivatable()) view.trigger(new MouseEvent.DragEnd());
    if (
      modifiers.metaKey &&
      (next === hand || this._activeTool instanceof HandTool) &&
      !this._tempActivationTime
    )
      next = zoom;
    if (!next && this._temporaryActiveTool) {
      if (this._activateTool(this._temporaryActiveTool)) {
        this._temporaryActiveTool = null;
        this._tempActivationTime = null;
      }
    } else if (next && next !== this._activeTool) {
      const previous = this._activeTool;
      if (this._activateTool(next, null, true) && !this._temporaryActiveTool)
        this._temporaryActiveTool = previous;
    }
  }

  _modifiersChanged(event: ModifiersChangedEvent): void {
    this._updateTemporaryTool(event.changed);
  }

  override toString(): string {
    return "[Object GToolManager]";
  }
}

// The old GEditorWorkspace made its tool manager in its constructor.
registerToolManagerFactory(() => new ToolManager());
