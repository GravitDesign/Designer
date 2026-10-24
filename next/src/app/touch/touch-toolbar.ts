// Old: designer.browser.dev.js module 1540 (GSidebars._updateTouchToolbar).
/**
 * The touch layout's toolbar of a sidebar side (`.g-touch-toolbar`, the
 * first child of #left-sidebars or #right-sidebars): one button per touch
 * tool the visible sidebars offer (pages, layers, ..., fill, border,
 * effect). A button activates its sidebar and tool and resizes the side;
 * tapping the active tool again closes it. The fill, border and effect
 * buttons show how many blocks of their kind the inspector has.
 *
 * The old module added these methods to GSidebars' prototype. Here the
 * sidebars call the updater they find in Sidebars.touchToolbarUpdater,
 * which this module sets when it loads.
 *
 * Plain DOM inside the sidebars' element, which the Sidebars controller
 * owns: setActiveTouchTool toggles `g-active` on these buttons and on the
 * panels and labels marked with `g-touch-tool`.
 */
import { css } from "../shell/dom.ts";
import { designer } from "../shell/globals.ts";
import type { TouchToolTarget } from "../../editor/touch/touch-tool.ts";
import { Sidebars, type SidebarTouchTool } from "../shell/layout.ts";

/** A touch tool as the sidebars describe it (getTouchTools). */
export type TouchToolbarTool = SidebarTouchTool;

/** The tools whose button shows a count of inspector blocks. */
const COUNTED = ["fill", "border", "effect"];

/**
 * The width of a side with no active touch tool (old
 * _rightSidebarDefaultWidthForTouch), on either side (see "Both touch
 * sidebars fall back to the right sidebar's width" in QUESTIONS.md).
 */
export const DEFAULT_WIDTH_FOR_TOUCH = 300;

const toolbars = new WeakMap<Sidebars, HTMLElement>();

/** `a.find(selector)` or `$(element)` for each entry; a missing entry matches nothing. */
function targets(container: HTMLElement, target: TouchToolTarget | null | undefined): Element[] {
  const list = Array.isArray(target) ? target : [target];
  const out: Element[] = [];
  for (const item of list) {
    if ("string" == typeof item) {
      if (item) out.push(...container.querySelectorAll(item));
    } else if (item) out.push(item);
  }
  return out;
}

function setWidth(sidebars: Sidebars, width: string | number): void {
  css(sidebars.getHtmlElement(), "width", width);
}

/** Rebuilds the touch toolbar of `sidebars` (touch layout only). */
export function updateTouchToolbar(
  sidebars: Sidebars,
  options?: { disableContextSensitive?: boolean },
): void {
  if (!designer().isTouchEnabled()) return;
  const element = sidebars.getHtmlElement();
  const internals = sidebars;
  let toolbar = toolbars.get(sidebars);
  if (!toolbar) {
    toolbar = document.createElement("div");
    toolbar.className = "g-touch-toolbar";
    element.prepend(toolbar);
    toolbars.set(sidebars, toolbar);
  }
  let activeTool: TouchToolbarTool | null = null;
  toolbar.replaceChildren();
  sidebars.removeClassName("align-active");
  for (const { sidebar, container } of internals._sidebars) {
    const tools = sidebar.getTouchTools(options) as TouchToolbarTool[] | null;
    if (!sidebar || !sidebar.isVisible() || !tools) continue;
    for (const tool of tools) {
      tool.sidebar = sidebar.getId();
      const active = !!internals._activeTouchTool && tool.id == internals._activeTouchTool.id;
      if (active) activeTool = tool;
      if ("dimension.align" === tool.id && active) sidebars.addClassName("align-active");
      for (const panel of targets(container, tool.panel)) {
        panel.setAttribute("g-touch-tool", tool.id);
        panel.classList.toggle("g-active", active);
        panel.classList.add("g-touch-toolbar-panel");
      }
      if (tool.toolbar)
        for (const label of targets(container, tool.toolbar)) {
          label.setAttribute("g-touch-tool", tool.id);
          label.classList.toggle("g-active", active);
          label.classList.add("g-touch-toolbar-label");
        }
      const button = document.createElement("button");
      button.className = "g-touch-toolbar-button";
      button.setAttribute("g-touch-tool", tool.id);
      button.setAttribute("id", tool.id);
      button.classList.toggle("g-active", active);
      const icon = document.createElement("span");
      if (tool.icon) icon.className = tool.icon;
      button.appendChild(icon);
      button.addEventListener("click", () => {
        sidebars.removeClassName("align-active");
        if ("dimension.align" == tool.id) {
          for (const panels of document.querySelectorAll(".scrolling-panels"))
            panels.classList.add("hide");
          sidebars.addClassName("align-active");
        } else
          for (const panels of document.querySelectorAll(".scrolling-panels"))
            panels.classList.remove("hide");
        for (const inspector of document.querySelectorAll(".sidebar-inspector"))
          inspector.classList.toggle("expand", -1 != COUNTED.indexOf(tool.id));
        if (internals._activeTouchTool && internals._activeTouchTool.id == tool.id) {
          if (internals._isActiveSidebarDeactivatable()) {
            sidebars.setActiveTouchTool(null);
            setWidth(sidebars, sidebar.getDefaultWidth() + "px");
          }
        } else if (internals._tryActivateSidebar(sidebar)) {
          sidebars.setActiveTouchTool(tool);
          if (tool.panelWidth) setWidth(sidebars, tool.panelWidth);
          else setWidth(sidebars, sidebar.getDefaultWidth() + "px");
          for (const panel of element.querySelectorAll(".appearance-properties-panel")) {
            if (".appearance-toolbar" !== tool.toolbar) panel.classList.add("display-none");
            else panel.classList.remove("display-none");
          }
        }
      });
      toolbar.appendChild(button);
      if (-1 != COUNTED.indexOf(tool.id)) {
        const blocks = document.querySelectorAll("." + tool.id + "-block").length;
        const count = document.createElement("div");
        count.className = "count";
        const scale = document.createElement("div");
        scale.className = "scale";
        scale.textContent = String(blocks);
        count.appendChild(scale);
        button.appendChild(count);
      }
    }
  }
  sidebars.setActiveTouchTool(activeTool);
  if (!activeTool) setWidth(sidebars, DEFAULT_WIDTH_FOR_TOUCH + "px");
}

Sidebars.touchToolbarUpdater = updateTouchToolbar;
