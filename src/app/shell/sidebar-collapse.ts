// Old: designer.browser.dev.js module 1539 (GPanels, the #panels part).
/**
 * The bottom panels part: a tab per panel and a frame with one container
 * per panel, collapsible to half or full (class "collapse-<mode>"). The
 * app registers no panels (gravit.panels is empty), so the part stays
 * hidden; it is kept because its elements and classes are in the DOM.
 */
import type { EventClass } from "../../engine/core/event.ts";
import { Locale } from "../../engine/core/locale/locale.ts";
import { css } from "./dom.ts";
import { appRegistry } from "./globals.ts";
import { lateExport } from "./late.ts";
import type { HostedView } from "./part.ts";

const CollapseMode = { None: "none", Half: "half", Full: "full" } as const;

export type CollapseModeValue = (typeof CollapseMode)[keyof typeof CollapseMode];

interface PanelInfo {
  tab: HTMLElement;
  container: HTMLElement;
  panel: HostedView;
}

export class Panels {
  static readonly CollapseMode = CollapseMode;

  private readonly _htmlElement: HTMLElement;
  private _panels: PanelInfo[] = [];
  private _activePanel: string | null = null;
  private _collapseMode: CollapseModeValue | null = null;

  constructor(htmlElement: HTMLElement) {
    this._htmlElement = htmlElement;
  }

  /** The icon at the start of every tab. */
  private _collapseIcon(): HTMLElement {
    const icon = document.createElement("span");
    icon.className = "collapse-icon";
    icon.append(document.createElement("span"), document.createElement("span"));
    return icon;
  }

  getCollapseMode(): CollapseModeValue | null {
    return this._collapseMode;
  }

  setCollapseMode(mode: CollapseModeValue): void {
    if (mode === this._collapseMode) return;
    if (this._collapseMode) this._htmlElement.classList.remove("collapse-" + this._collapseMode);
    this._collapseMode = mode;
    if (this._collapseMode) this._htmlElement.classList.add("collapse-" + this._collapseMode);
  }

  toggleCollapseMode(): void {
    switch (this._collapseMode) {
      case CollapseMode.Full:
        this.setCollapseMode(CollapseMode.None);
        break;
      case CollapseMode.Half:
        this.setCollapseMode(CollapseMode.Full);
        break;
      case CollapseMode.None:
        this.setCollapseMode(CollapseMode.Half);
        break;
    }
  }

  getActivePanel(): string | null {
    return this._activePanel;
  }

  /** Activating the active panel again cycles its collapse mode. */
  setActivePanel(id: string): void {
    if (id === this._activePanel) {
      this.toggleCollapseMode();
      return;
    }
    for (const info of this._panels) {
      const panelId = info.panel.getId();
      if (panelId === id) {
        css(info.container, "display", "");
        info.tab.classList.add("g-active");
        info.panel.activate();
      } else {
        css(info.container, "display", "none");
        info.tab.classList.remove("g-active");
        if (panelId === this._activePanel) info.panel.deactivate();
      }
    }
    this._activePanel = id;
  }

  setPanelEnabled(id: string, enabled: boolean): void {
    const info = this._panels.find((candidate) => candidate.panel.getId() === id);
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
    this._panels = [];
    const tabs = document.createElement("div");
    tabs.className = "panels-tabs";
    this._htmlElement.appendChild(tabs);
    const frame = document.createElement("div");
    frame.className = "panels-frame";
    this._htmlElement.appendChild(frame);
    const updateEvent = lateExport<{ UpdateEvent?: EventClass }>(
      "shell/view.ts",
      "View",
    )?.UpdateEvent;
    for (const panel of appRegistry().panels) {
      const tab = document.createElement("button");
      tab.className = "panel-tab";
      tab.setAttribute("data-panel-id", panel.getId());
      tab.textContent = panel.getTitle ? (Locale.get(panel.getTitle()) as string) : "";
      tab.addEventListener("click", (event) => {
        const button = (event.target as HTMLElement).closest("button");
        const id = button ? button.getAttribute("data-panel-id") : null;
        if (id) this.setActivePanel(id);
      });
      tab.addEventListener("mousedown", (event) => event.preventDefault());
      tab.prepend(this._collapseIcon());
      tabs.appendChild(tab);
      const container = document.createElement("div");
      container.className = "panel-container panel-" + panel.getId();
      css(container, "display", "none");
      frame.appendChild(container);
      panel.init(container);
      for (const button of container.querySelectorAll("button"))
        button.addEventListener("mousedown", (event) => event.preventDefault());
      this.setPanelEnabled(panel.getId(), panel.isEnabled());
      this._panels.push({ tab, container, panel });
      if (updateEvent)
        panel.addEventListener(updateEvent, () =>
          this.setPanelEnabled(panel.getId(), panel.isEnabled()),
        );
      if (!this._activePanel) this.setActivePanel(panel.getId());
    }
    this.setCollapseMode(CollapseMode.None);
  }

  relayout(): void {}

  toString(): string {
    return "[Object GPanels]";
  }
}
