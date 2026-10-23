// Old: designer.browser.dev.js module 1728 ($.fn.gRichTooltip).
/**
 * Rich tooltips: after 500 ms over an element (at once while another one
 * is up) an overlay with the title, shortcut, description, video or
 * picture of its RichTooltipConfig opens next to it. Leaving the element
 * and the tooltip for 100 ms closes it; a click on the tooltip closes it.
 * Only one is open at a time.
 *
 *     const detach = attachRichTooltip(button, RichTooltipConfig.from({ title }));
 *     // React: <button ref={useRichTooltip(config)} />
 *
 * Without the enhanced tooltips setting (help.tooltip-visibility) only
 * the title and shortcut are shown.
 */
import { createElement, useCallback, useRef } from "react";
import { uuid } from "../../engine/core/util.ts";
import { Overlay } from "../dialogs/dialog-container.ts";
import { containerOrNull } from "../shell/globals.ts";
import { renderInto, type Island } from "../state/islands.tsx";
import { RichTooltipConfig, type RichTooltipConfigValues } from "./rich-tooltip-config.ts";
import { RichTooltipContent } from "./rich-tooltip-view.tsx";

/** GEnhancedTooltipsAction.StoragePropertyName (actions/view/enhanced-tooltips-action.ts). */
export const ENHANCED_TOOLTIPS_PROPERTY = "designer.settings.enhanced-tooltips.enabled";

/** The config after the plugin's defaults ($.extend, undefined skipped). */
export interface RichTooltipSettings extends RichTooltipConfigValues {
  _id: string;
  enhanced?: boolean;
}

const DEFAULTS: Omit<RichTooltipSettings, "_id"> = {
  title: "No title",
  isPro: false,
  shortcut: null,
  video: null,
  pic: null,
  description: null,
  videoTimeout: 2000,
  middle: true,
  marginLeft: 0,
  side: false,
  learnMore: null,
  upgradeToProStatsValue: null,
  forceShow: false,
  flipHorizontal: false,
};

export function tooltipSettings(config: RichTooltipConfig): Omit<RichTooltipSettings, "_id"> {
  const settings = { ...DEFAULTS };
  const values = config.getConfig() as unknown as Record<string, unknown>;
  for (const key of Object.keys(values))
    if (values[key] !== undefined) (settings as Record<string, unknown>)[key] = values[key];
  return settings;
}

/** The overlay offsets the old createTooltip computed. */
export function tooltipOffsets(settings: {
  side: unknown;
  middle: unknown;
  marginLeft: unknown;
  flipHorizontal: unknown;
}): { offsetX: number; offsetY: number } {
  let x = 0;
  let y = 4;
  if (settings.side) {
    x = 0;
    y = -6;
  } else if (settings.middle) x = -13;
  if (settings.marginLeft) x += parseInt(String(settings.marginLeft));
  if (settings.flipHorizontal) x = 0 - x;
  return { offsetX: x, offsetY: y };
}

interface Attached {
  settings: RichTooltipSettings;
  containerHovered: boolean;
  selfHovered: boolean;
}

const attached = new WeakMap<Element, Attached>();
let hideTimer: ReturnType<typeof setTimeout> | null = null;
let showTimer: ReturnType<typeof setTimeout> | null = null;
/** The open tooltip: its content element, overlay and React root. */
let current: { element: HTMLElement; id: string; overlay: Overlay; island: Island } | null = null;

function clearHide(): void {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
}

function clearShow(): void {
  if (showTimer) {
    clearTimeout(showTimer);
    showTimer = null;
  }
}

/** Closes the open tooltip (gRichTooltip("close")). */
export function closeRichTooltip(): void {
  if (current) {
    const open = current;
    current = null;
    open.overlay.close();
    // The close does nothing when another overlay is on top; the old code
    // forgot the tooltip anyway and left it up (see "A rich tooltip under
    // another overlay stays open" in QUESTIONS.md).
    if (!open.overlay.getElement().isConnected) open.island.unmount();
  }
}

function createTooltip(settings: RichTooltipSettings): {
  element: HTMLElement;
  overlay: Overlay;
  island: Island;
} {
  const { offsetX, offsetY } = tooltipOffsets(settings);
  const element = document.createElement("div");
  element.className = "g-rich-tooltip-container";
  const island = renderInto(
    element,
    createElement(RichTooltipContent, {
      title: settings.title,
      isPro: settings.isPro,
      shortcut: settings.shortcut,
      video: settings.video,
      pic: settings.pic,
      description: settings.description,
      videoTimeout: settings.videoTimeout,
      enhanced: !!settings.enhanced,
      learnMore: settings.learnMore,
    }),
  );
  const overlay = new Overlay(element, {
    padding: true,
    releaseOnClose: true,
    bottomClazz: "from-bottom",
    rightClazz: "from-right",
    offsetY,
    offsetX,
    bottomOffsetY: 6,
    clazz: "g-tooltip-content-overlay " + (settings.flipHorizontal ? "flip-horizontal" : ""),
    disableDarkShadow: true,
    middle: !!settings.middle,
    side: !!settings.side,
    flipHorizontal: !!settings.flipHorizontal,
  });
  return { element, overlay, island };
}

function showTooltip(target: HTMLElement): void {
  const data = attached.get(target);
  if (!data) return;
  const settings = data.settings;
  if (current) {
    if (current.id === settings._id) return;
    closeRichTooltip();
  }
  const stored = containerOrNull();
  const property = stored
    ? stored.getProperty(ENHANCED_TOOLTIPS_PROPERTY)
    : Promise.resolve(undefined);
  void property.then((value) => {
    settings.enhanced = "boolean" != typeof value || value;
    const tooltip = createTooltip(settings);
    current = { ...tooltip, id: settings._id };
    tooltip.element.addEventListener("mouseover", () => {
      clearHide();
      data.selfHovered = true;
    });
    tooltip.element.addEventListener("mouseout", () => {
      data.selfHovered = false;
      hideTooltip(target);
    });
    tooltip.element.addEventListener("click", () => closeRichTooltip());
    tooltip.overlay.open(target);
  });
}

function hideTooltip(target: HTMLElement): void {
  const data = attached.get(target);
  hideTimer = setTimeout(() => {
    if (!data || !(data.containerHovered || data.selfHovered)) closeRichTooltip();
  }, 100);
}

/**
 * `$(element).gRichTooltip(config)`: shows the tooltip on hover. Returns a
 * function that removes the listeners (the old plugin never removed them).
 */
export function attachRichTooltip(
  target: HTMLElement,
  config: RichTooltipConfig | null | undefined,
): () => void {
  if (!config) return () => undefined;
  if (!(config instanceof RichTooltipConfig)) throw new Error("Not a Tooltip Config");
  const settings: RichTooltipSettings = { ...tooltipSettings(config), _id: uuid(7) };
  const data: Attached = { settings, containerHovered: false, selfHovered: false };
  attached.set(target, data);
  const over = () => {
    clearHide();
    clearShow();
    const show = () => {
      data.containerHovered = true;
      showTooltip(target);
    };
    if (current) show();
    else showTimer = setTimeout(show, 500);
  };
  const out = () => {
    clearShow();
    data.containerHovered = false;
    hideTooltip(target);
  };
  const down = () => clearShow();
  target.addEventListener("mouseover", over);
  target.addEventListener("mouseout", out);
  target.addEventListener("mousedown", down);
  return () => {
    target.removeEventListener("mouseover", over);
    target.removeEventListener("mouseout", out);
    target.removeEventListener("mousedown", down);
    if (attached.get(target) === data) attached.delete(target);
  };
}

/**
 * A ref callback that attaches the tooltip to the element React renders
 * (and detaches it when the element goes or the config changes).
 */
export function useRichTooltip<T extends HTMLElement>(
  config: RichTooltipConfig | null | undefined,
): (element: T | null) => void {
  const detach = useRef<(() => void) | null>(null);
  return useCallback(
    (element: T | null) => {
      if (detach.current) {
        detach.current();
        detach.current = null;
      }
      if (element) detach.current = attachRichTooltip(element, config);
    },
    [config],
  );
}
