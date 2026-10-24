// Old: designer.browser.dev.js module 395 (GSidebars).
/**
 * The sidebars on one side of the shell (#left-sidebars or
 * #right-sidebars): one container per registered sidebar, a selector
 * row when there is more than one, the active sidebar's width, and the
 * resize zone along the left sidebars' edge.
 *
 * The containers are plain DOM made here, as before; each sidebar renders
 * its content into the container it gets in init() (docs/rewrite/UI.md,
 * section 5, "islands").
 */
import type { Event, EventClass } from "../../engine/core/event.ts";
import { EventTarget } from "../../engine/core/event-target.ts";
import { Locale } from "../../engine/core/locale/locale.ts";
import type { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { MouseEvent as GMouseEvent } from "../../engine/core/mouse-event.ts";
import { GMath } from "../../engine/math/math.ts";
import { PaintCanvas } from "../../engine/paint/paint-canvas.ts";
import type { TouchToolTarget } from "../../editor/touch/touch-tool.ts";
import { css, isDisplayed, outerHeight } from "./dom.ts";
import { appRegistry, designer } from "./globals.ts";
import { lateExport } from "./late.ts";
import { Layout, type LayoutPart } from "./layout-ids.ts";
import { SettingChangedEvent } from "./setting-changed-event.ts";
import { SidebarEvent } from "./sidebar-event.ts";
import { SidebarsIds } from "./sidebar-ids.ts";

const Orientation = { Left: "left", Right: "right" } as const;

export type SidebarOrientation = (typeof Orientation)[keyof typeof Orientation];

/** A touch tool a sidebar offers (the touch toolbar, app-touch-ui). */
export interface SidebarTouchTool {
  id: string;
  sidebar: string | null;
  def?: boolean;
  icon?: string | null;
  /** The panel(s) the tool shows. */
  panel?: TouchToolTarget | null;
  /** The label(s) of the tool in the sidebar. */
  toolbar?: TouchToolTarget | null;
  /** The side's width while the tool is active (the sidebar's default width otherwise). */
  panelWidth?: string | number;
  activate(): void;
  deactivate(): void;
}

/** A sidebar as the sidebars use it (GSidebar, module 806, on GView). */
export interface SidebarLike {
  getId(): string;
  getTitle(): LocaleKey | string;
  getOrientation(): string | null;
  getMinimumWidth(): number;
  getDefaultWidth(): number;
  getSettingWidth(): number;
  isResizeable(): boolean;
  isDeactivatable(): boolean;
  isVisible(): boolean;
  isEnabled(): boolean;
  relayout(): void;
  resize(): void;
  init(container: HTMLElement): void;
  activate(): void;
  deactivate(): void;
  getTouchTools(options?: { disableContextSensitive?: boolean }): SidebarTouchTool[] | null;
  /** Shows the count in the badge element; true when there is one. */
  updateBadge(badge: HTMLElement): boolean;
  addEventListener<E extends Event>(
    eventClass: EventClass<E>,
    listener: (event: E) => void,
    target?: object | null,
  ): void;
  trigger(event: Event): void;
}

interface SidebarInfo {
  container: HTMLElement;
  sidebar: SidebarLike;
}

/** A mouse event of the view (GMouseEvent) or of the document. */
type AnyMouseEvent = globalThis.MouseEvent | GMouseEvent | DragEvent;

/** jQuery's show()/hide() for the selector options: display none, or back to the stylesheet's. */
function setShown(element: HTMLElement | null, shown: boolean): void {
  if (element) css(element, "display", shown ? "" : "none");
}

/** jQuery's `:hidden`: no layout box. */
function isHidden(element: HTMLElement): boolean {
  return !(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
}

export class Sidebars extends EventTarget {
  static readonly Orientation = Orientation;
  static readonly SidebarEvent = SidebarEvent;

  private readonly _htmlElement: HTMLElement;
  private readonly _orientation: SidebarOrientation;
  private readonly _frame: HTMLElement;
  _sidebars: SidebarInfo[] = [];
  private _activeSidebar: string | null = null;
  _activeTouchTool: SidebarTouchTool | null = null;
  private readonly _sidebarWidths: Record<string, number> = {};
  private _sidebarsSelector: HTMLElement | null = null;
  private _canResize = false;
  private _isResizing = false;
  private _minimumWidth = 0;
  private _newWidth = 0;
  private _view: EventTarget | null = null;
  private readonly _mouseDownHandler = (event: AnyMouseEvent): void =>
    this._documentMouseDown(event);
  private readonly _mouseMoveHandler = (event: AnyMouseEvent): void =>
    this._documentMouseMove(event);
  private readonly _mouseReleaseHandler = (event: AnyMouseEvent): void =>
    this._resizeMouseUp(event);

  /**
   * Updates the touch toolbar of this side; app-touch-ui (module 1540)
   * sets it. Without it the touch toolbar doesn't exist.
   */
  static touchToolbarUpdater:
    ((sidebars: Sidebars, options?: { disableContextSensitive?: boolean }) => void) | null = null;

  constructor(htmlElement: HTMLElement, orientation: SidebarOrientation, frame: HTMLElement) {
    super();
    this._htmlElement = htmlElement;
    this._orientation = orientation;
    this._frame = frame;
  }

  getOrientation(): SidebarOrientation {
    return this._orientation;
  }

  getActiveSidebar(): string | null {
    return this._activeSidebar;
  }

  setActiveSidebar(id: string | null): void {
    if (!id) this.setActiveTouchTool(null);
    if (id === this._activeSidebar) return;
    if (id) {
      const sidebar = this.getSidebar(id);
      if (!sidebar || !sidebar.isVisible()) {
        id = null;
        if (this._activeSidebar) {
          const active = this.getSidebar(this._activeSidebar);
          if (active && active.isVisible()) return;
        }
      }
    }
    const previous = this._activeSidebar;
    for (const info of this._sidebars) {
      const sidebarId = info.sidebar.getId();
      if (sidebarId === id) {
        this._activeSidebar = sidebarId;
        css(info.container, "display", "");
        info.sidebar.activate();
        css(
          this._htmlElement,
          "width",
          (this._sidebarWidths[sidebarId]
            ? this._sidebarWidths[sidebarId]
            : info.sidebar.getDefaultWidth()) + "px",
        );
        this.relayout();
        if (this.hasEventListeners(SidebarEvent))
          this.trigger(new SidebarEvent(SidebarEvent.Type.Activated, info.sidebar));
        const tools = info.sidebar.getTouchTools();
        if (tools) {
          const tool = tools.find((candidate) => !!candidate.def) || tools[0];
          if (tool) this.setActiveTouchTool(tool);
        }
      } else {
        css(info.container, "display", "none");
        if (sidebarId === previous) {
          info.sidebar.deactivate();
          this._activeSidebar = id;
          if (this.hasEventListeners(SidebarEvent))
            this.trigger(new SidebarEvent(SidebarEvent.Type.Deactivated, info.sidebar));
        }
      }
      this._updateBadge(info.sidebar);
    }
    for (const option of this._htmlElement.querySelectorAll(".sidebar-option"))
      option.classList.remove("active");
    for (const option of this._htmlElement.querySelectorAll(".sidebar-option.sidebar-" + id))
      option.classList.add("active");
    if (this._activeSidebar && !this._getSidebarInfo(this._activeSidebar))
      this.setActiveSidebar((this._sidebars[0] as SidebarInfo).sidebar.getId());
  }

  setActiveTouchTool(tool: SidebarTouchTool | null): void {
    if (this._activeTouchTool && tool && this._activeTouchTool.id === tool.id) return;
    for (const element of this._htmlElement.querySelectorAll("[g-touch-tool]"))
      element.classList.remove("g-active");
    for (const element of this._htmlElement.querySelectorAll(".sidebar-container"))
      element.classList.remove("g-active");
    if (this._activeTouchTool) this._activeTouchTool.deactivate();
    if (tool) {
      for (const element of this._htmlElement.querySelectorAll(".sidebar-" + tool.sidebar))
        element.classList.add("g-active");
      for (const element of this._htmlElement.querySelectorAll(`[g-touch-tool="${tool.id}"]`))
        element.classList.add("g-active");
      this._activeTouchTool = tool;
    } else this._activeTouchTool = null;
    if (this._activeTouchTool) this._activeTouchTool.activate();
  }

  showSidebar(id: string): void {
    if (!this.getSidebar(id) || this._activeSidebar === id) return;
    if (null === this._activeSidebar) this.setActiveSidebar(id);
    const option = this._option(id);
    if (option && isHidden(option)) setShown(option, true);
  }

  hideSidebar(id: string): void {
    if (this.getActiveSidebar() === id) {
      let next: string | null = null;
      for (let i = 0; i < this._sidebars.length && !next; ++i) {
        const other = (this._sidebars[i] as SidebarInfo).sidebar.getId();
        if (other !== id) {
          const option = this._option(other);
          if (option && !isHidden(option)) next = other;
        }
      }
      this.setActiveSidebar(next);
    }
    const option = this._option(id);
    if (option && !isHidden(option)) setShown(option, false);
  }

  setSidebarEnabled(id: string, enabled: boolean): void {
    const info = this._getSidebarInfo(id);
    if (!info) return;
    if (enabled) {
      for (const overlay of info.container.querySelectorAll(".g-disabled-overlay"))
        overlay.remove();
      info.container.classList.remove("g-disabled");
    } else {
      if (!info.container.querySelector(".g-disabled-overlay")) {
        const overlay = document.createElement("div");
        overlay.className = "g-disabled-overlay";
        info.container.appendChild(overlay);
      }
      info.container.classList.add("g-disabled");
    }
  }

  init(): void {
    this._sidebars = [];
    const add = (sidebar: SidebarLike, count: number): void => {
      if (count > 1 && !this._sidebarsSelector) {
        const selector = document.createElement("div");
        selector.className = "sidebar-selector";
        css(selector, "display", "none");
        this._htmlElement.appendChild(selector);
        this._sidebarsSelector = selector;
        css(this._htmlElement, "width", sidebar.getDefaultWidth() + "px");
      }
      if (this._sidebarsSelector) {
        const option = document.createElement("div");
        option.className = "sidebar-option sidebar-" + sidebar.getId();
        const title = document.createElement("span");
        title.className = "sidebar-title";
        title.textContent = Locale.get(sidebar.getTitle()) as string;
        const badge = document.createElement("span");
        badge.className = "g-badge";
        css(badge, "display", "none");
        option.append(title, badge);
        option.addEventListener("click", () => this._tryActivateSidebar(sidebar));
        this._sidebarsSelector.appendChild(option);
      }
      const container = document.createElement("div");
      container.className =
        "sidebar-container sidebar-" +
        sidebar.getId() +
        (this._sidebarsSelector ? " multiple" : "");
      css(container, "display", "none");
      this._htmlElement.appendChild(container);
      sidebar.init(container);
      this._sidebars.push({ container, sidebar });
      for (const button of container.querySelectorAll("button"))
        button.addEventListener("mousedown", (event) => event.preventDefault());
      const updateEvent = viewUpdateEvent();
      if (updateEvent)
        sidebar.addEventListener(updateEvent, () => {
          // The licence check (canAccessFreemium) is always true here.
          this.setSidebarEnabled(sidebar.getId(), sidebar.isEnabled());
          this._updateTouchToolbar();
          this._updateBadge(sidebar);
        });
      if (sidebar.getId() === SidebarsIds.GInspectorSidebar)
        sidebar.addEventListener(SidebarEvent, (event: SidebarEvent) => {
          if (
            event.type === SidebarEvent.Type.ChildAdded ||
            event.type === SidebarEvent.Type.ChildRemoved
          )
            this._updateTouchToolbar();
        });
      this.setSidebarEnabled(sidebar.getId(), sidebar.isEnabled());
    };
    const mine = appRegistry().sidebars.filter(
      (sidebar) => sidebar.getOrientation() === this._orientation,
    );
    for (const sidebar of mine) add(sidebar, mine.length);
    designer().addEventListener(SettingChangedEvent, this._settingChanged, this);
    document.addEventListener("mousemove", this._mouseMoveHandler);
    document.addEventListener("mousedown", this._mouseDownHandler);
    document.addEventListener("mouseup", this._mouseReleaseHandler, true);
    document.addEventListener("dragstart", this._mouseMoveHandler);
    document.addEventListener("drag", this._mouseMoveHandler);
    document.addEventListener("dragend", this._mouseMoveHandler, true);
    this._updateTouchToolbar();
  }

  /** Follows the active view's mouse events too (the canvas stops the DOM ones). */
  setView(view: EventTarget | null): void {
    if (view === this._view) return;
    const events = [
      [GMouseEvent.Down, this._mouseDownHandler],
      [GMouseEvent.Move, this._mouseMoveHandler],
      [GMouseEvent.DragStart, this._mouseMoveHandler],
      [GMouseEvent.Drag, this._mouseMoveHandler],
      [GMouseEvent.DragEnd, this._mouseMoveHandler],
      [GMouseEvent.Release, this._mouseReleaseHandler],
    ] as const;
    if (this._view)
      for (const [eventClass, handler] of events)
        this._view.removeEventListener(eventClass, handler, this);
    this._view = view;
    if (this._view)
      for (const [eventClass, handler] of events)
        this._view.addEventListener(eventClass, handler as (event: never) => void, this, null);
  }

  _isActiveSidebarDeactivatable(): boolean {
    const active = this.getSidebar(this._activeSidebar);
    return !(active && !active.isDeactivatable());
  }

  _tryActivateSidebar(sidebar: SidebarLike): boolean {
    if (!this._isActiveSidebarDeactivatable()) return false;
    this.setActiveSidebar(sidebar.getId());
    this.setSidebarEnabled(sidebar.getId(), sidebar.isEnabled());
    return true;
  }

  disableContextSensitive(): void {
    this._updateTouchToolbar({ disableContextSensitive: true });
  }

  enableContextSensitive(): void {
    this._updateTouchToolbar();
  }

  private _documentMouseMove(event: AnyMouseEvent): void {
    if (!this._htmlElement) return;
    if (this._isResizing) {
      let x: number;
      if (event instanceof globalThis.MouseEvent) x = event.pageX;
      else {
        const engineEvent = event as GMouseEvent;
        engineEvent.isImmediatePropagationStopped = true;
        x = engineEvent.client.getX() / PaintCanvas.getScreenDPI();
      }
      const stop = (event as { stopPropagation?: unknown }).stopPropagation;
      if (stop instanceof Function) (event as globalThis.Event).stopPropagation();
      this._newWidth = this._orientation === Orientation.Left ? x : window.innerWidth - x;
      if (this._newWidth < this._minimumWidth) this._newWidth = this._minimumWidth;
      css(this._htmlElement, "width", this._newWidth + "px");
      const active = this.getSidebar(this._activeSidebar);
      if (active) active.resize();
    } else {
      const edge =
        this._orientation === Orientation.Left
          ? this._htmlElement.offsetWidth
          : window.innerWidth - this._htmlElement.offsetWidth;
      const pageX = (event as { pageX?: number }).pageX as number;
      const near =
        GMath.isEqualEps(pageX, edge, 3 * PaintCanvas.getScreenDPI()) &&
        this._orientation !== Orientation.Right;
      if (near || this._canResize) {
        if (near && !this._canResize) {
          this._frame.classList.add("resize");
          this._canResize = near;
        } else if (this._canResize && !near) {
          this._frame.classList.remove("resize");
          this._canResize = near;
        }
      }
    }
  }

  private _documentMouseDown(event: AnyMouseEvent): void {
    const active = this.getSidebar(this._activeSidebar);
    if (this._canResize && active && active.isResizeable()) {
      this._isResizing = true;
      this._minimumWidth = active.getMinimumWidth();
      if (event instanceof GMouseEvent) event.isImmediatePropagationStopped = true;
      if ((event as { stopPropagation?: unknown }).stopPropagation instanceof Function)
        (event as globalThis.Event).stopPropagation();
    }
  }

  private _resizeMouseUp(event: AnyMouseEvent): void {
    if (!this._isResizing) return;
    if (event instanceof GMouseEvent) event.isImmediatePropagationStopped = true;
    if ((event as { stopPropagation?: unknown }).stopPropagation instanceof Function)
      (event as globalThis.Event).stopPropagation();
    this._isResizing = false;
    const active = this.getSidebar(this._activeSidebar);
    if (active) designer().setSetting(`sidebars_width_${active.getId()}`, this._newWidth);
  }

  relayout(): void {
    if (this._activeSidebar) {
      const active = this.getSidebar(this._activeSidebar);
      if (active) {
        css(this._htmlElement, "width", active.getSettingWidth() + "px");
        active.relayout();
      }
    }
    let visible = 0;
    let enabled = 0;
    for (const info of this._sidebars) {
      const id = info.sidebar.getId();
      if (info.sidebar.isVisible()) {
        visible++;
        setShown(this._option(id), true);
      } else setShown(this._option(id), false);
      if (info.sidebar.isEnabled()) enabled++;
      this._updateBadge(info.sidebar);
    }
    const containers = [...this._htmlElement.querySelectorAll<HTMLElement>(".sidebar-container")];
    if (visible > 0) {
      if (this._sidebarsSelector && enabled > 0) {
        css(this._sidebarsSelector, "display", "");
        this._sidebarsSelector.classList.toggle("singleton", 1 === visible);
        if (!containers.some((c) => c.classList.contains("multiple")))
          for (const c of containers) c.classList.add("multiple");
      }
      if (this._orientation === Orientation.Right) {
        // The licence info under the inspector is gone with the licence;
        // the selector still asks for it.
        const info = [...document.querySelectorAll<HTMLElement>(".license-info")].find(isDisplayed);
        for (const c of containers)
          css(c, "bottom", info ? parseInt(String(outerHeight(info)), 10) : 0);
      }
    } else {
      if (this._sidebarsSelector) css(this._sidebarsSelector, "display", "none");
      for (const c of containers) c.classList.remove("multiple");
    }
    this._updateTouchToolbar();
  }

  private _getSidebarInfo(id: string | null): SidebarInfo | null {
    if (id && this._sidebars)
      for (const info of this._sidebars) if (info.sidebar.getId() === id) return info;
    return null;
  }

  private _settingChanged(event: SettingChangedEvent): void {
    if (event.key === "sidebars_" + this._orientation + "_active") {
      if (designer().isTouchEnabled() && event.restoring) return;
      this.setActiveSidebar(event.newValue ? (event.newValue as string) : null);
      designer().setPartVisible(this.getSidebarsPart(), !!event.newValue);
    } else if (
      0 === event.key.indexOf("sidebars_width_") &&
      this._orientation !== Orientation.Right
    ) {
      const id = event.key.substr("sidebars_width_".length);
      this._sidebarWidths[id] = event.newValue as number;
      if (id === this._activeSidebar) {
        css(this._htmlElement, "width", event.newValue + "px");
        designer().relayout();
      }
    } else if ("touch" === event.key) {
      this._updateTouchToolbar();
      for (const panel of this._htmlElement.querySelectorAll(".appearance-properties-panel"))
        panel.classList.remove("display-none");
    }
  }

  private _updateBadge(sidebar: SidebarLike): void {
    if (!this._sidebarsSelector) return;
    const option = this._sidebarsSelector.querySelector<HTMLElement>(
      ".sidebar-option.sidebar-" + sidebar.getId(),
    );
    const badge = option ? option.querySelector<HTMLElement>(".g-badge") : null;
    if (!option || !badge) return;
    if (sidebar.updateBadge(badge)) {
      option.classList.add("content-width");
      setShown(badge, true);
    } else {
      option.classList.remove("content-width");
      setShown(badge, false);
    }
  }

  private _updateTouchToolbar(options?: { disableContextSensitive?: boolean }): void {
    if (Sidebars.touchToolbarUpdater) Sidebars.touchToolbarUpdater(this, options);
  }

  private _option(id: string): HTMLElement | null {
    return this._htmlElement.querySelector<HTMLElement>(".sidebar-option.sidebar-" + id);
  }

  getSidebar(id: string | null): SidebarLike | null {
    if (!id) return null;
    const info = this._getSidebarInfo(id);
    return info ? info.sidebar : null;
  }

  /** The registered sidebars of this side, in order. */
  getSidebars(): SidebarLike[] {
    return this._sidebars.map((info) => info.sidebar);
  }

  getSidebarsPart(): LayoutPart {
    return this._orientation === Orientation.Left ? Layout.LeftSidebars : Layout.RightSidebars;
  }

  addClassName(name: string): void {
    for (const c of this._htmlElement.querySelectorAll(".sidebar-container")) c.classList.add(name);
  }

  removeClassName(name: string): void {
    for (const c of this._htmlElement.querySelectorAll(".sidebar-container"))
      c.classList.remove(name);
  }

  static setOrientationStateInSetting(orientation: SidebarOrientation, state: unknown): void {
    designer().setSetting(Sidebars.getSettingNameForSidebar(orientation), state);
  }

  static isOrientationActiveInSetting(orientation: SidebarOrientation): unknown {
    return designer().getSetting(Sidebars.getSettingNameForSidebar(orientation));
  }

  static getSettingNameForSidebar(
    orientation: SidebarOrientation,
  ): `sidebars_${SidebarOrientation}_active` {
    return `sidebars_${orientation}_active`;
  }

  getHtmlElement(): HTMLElement {
    return this._htmlElement;
  }

  /** Enables or disables every sidebar of `sidebars` and every selector option on the page. */
  setEnabled(sidebars: Sidebars, enabled: boolean): void {
    for (const option of document.querySelectorAll(".sidebar-selector > div"))
      option.classList[enabled ? "remove" : "add"]("g-disabled");
    for (const info of sidebars._sidebars)
      info.container.classList[enabled ? "remove" : "add"]("g-disabled");
  }

  override toString(): string {
    return "[Object GSidebars]";
  }
}

/** GView.UpdateEvent from the widgets cluster's view.ts, once it exists. */
function viewUpdateEvent(): EventClass | null {
  const View = lateExport<{ UpdateEvent?: EventClass }>("shell/view.ts", "View");
  return View && View.UpdateEvent ? View.UpdateEvent : null;
}
