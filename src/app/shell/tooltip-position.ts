// Old: designer.browser.dev.js module 1673 (the data-title tooltips and $.fn.gTooltip).
/**
 * The simple tooltips: hovering an element with a `data-title` attribute
 * (or anything inside one) shows its text in the body-level `.g-tooltip`
 * after 500 ms, centred below the element. Within 500 ms after a tooltip
 * was shown the next one comes at once. Elements with a rich tooltip
 * (widgets/rich-tooltip.ts), or whose parent or first child has one, get
 * none.
 *
 * Attributes on the `[data-title]` element:
 * - `data-title`: the text;
 * - `data-custom-left-offset`: extra room (px) kept at the right edge;
 * - `data-wrap="1"`: the `wrap` class (the text may wrap).
 *
 * The old module exported the class itself; boot (bootstrap.ts, old
 * a1483) called its init() once, after the container started. Rich
 * tooltips are placed by their Overlay (dialogs/dialog-container.ts),
 * not here.
 */
import { offset } from "../widgets/dom-helpers.ts";
import { css, height, outerWidth, width } from "./dom.ts";

/** The pending 500 ms show timer. */
let showTimer: ReturnType<typeof setTimeout> | undefined;
/** The timer that ends the "show the next one at once" window. */
let idleTimer: ReturnType<typeof setTimeout> | undefined;
/** The element the mouse is over (the last mouseover target). */
let hovered: Element | null = null;
/** The body-level .g-tooltip element. */
let tooltipElement: HTMLElement | null = null;
/** Whether a tooltip was shown less than 500 ms ago. */
let recentlyShown = false;

/** Elements that have a rich tooltip ($(el).data("gRichTooltip")). */
const richTooltips = new WeakSet<Element>();

/**
 * Marks an element as having a rich tooltip, so the data-title tooltip
 * leaves it alone. widgets/rich-tooltip.ts calls it where the old plugin
 * stored its "g-rich-tooltip" data.
 */
export function markRichTooltip(element: Element): void {
  richTooltips.add(element);
}

/** Undoes markRichTooltip (when the rich tooltip is detached). */
export function unmarkRichTooltip(element: Element): void {
  richTooltips.delete(element);
}

function hasRichTooltip(element: Element | null | undefined): boolean {
  return !!element && richTooltips.has(element);
}

/** $(el).closest("[data-title]")[0] for any event target. */
function titled(target: unknown): Element | null {
  return target instanceof Element ? target.closest("[data-title]") : null;
}

/** parseInt(value || 0), as the old code read the attributes. */
function intOf(value: string | null): number {
  return parseInt(String(value || 0));
}

/** The old module's class (unnamed there): static members only. */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- the old module exported this class and its callers used the statics
export class Tooltip {
  static _getTooltipElement(): HTMLElement | null {
    return tooltipElement;
  }

  static _getBodyWidth(): number {
    return width(document.body);
  }

  static _getBodyHeight(): number {
    return height(document.body);
  }

  /**
   * Shows the tooltip of the hovered element, or of `element` when
   * nothing is hovered ($(el).gTooltip("show")).
   */
  static showTooltip(element?: Element | null): void {
    showTimer = undefined;
    const tooltip = Tooltip._getTooltipElement() as HTMLElement;
    const source = hovered || element;
    if (!source) return;
    const owner = titled(source);
    if (!owner) return;
    const rect = owner.getBoundingClientRect();
    const title = owner.getAttribute("data-title");
    const customLeftOffset = intOf(owner.getAttribute("data-custom-left-offset"));
    const wrap = !!intOf(owner.getAttribute("data-wrap"));
    if (!(rect && title)) return;
    tooltip.classList.add("visible");
    tooltip.classList.toggle("wrap", wrap);
    tooltip.textContent = title;
    const left = rect.left + rect.width / 2 - outerWidth(tooltip) / 2 + "px";
    const top = rect.top + rect.height + "px";
    css(tooltip, "left", left);
    css(tooltip, "top", top);
    // Below the bottom of the page: above the element instead (by one
    // element height above its top, as the old code did).
    if (offset(tooltip).top + rect.height > Tooltip._getBodyHeight())
      css(tooltip, "top", rect.top - rect.height + "px");
    const bodyWidth = Tooltip._getBodyWidth();
    if (customLeftOffset + offset(tooltip).left + outerWidth(tooltip) > bodyWidth) {
      const shifted =
        offset(tooltip).left -
        (offset(tooltip).left + outerWidth(tooltip) - bodyWidth) +
        customLeftOffset;
      css(tooltip, "left", shifted + "px");
    }
    Tooltip.resetIdle();
    recentlyShown = true;
    idleTimer = setTimeout(Tooltip.resetIdle, 500);
  }

  static resetIdle(): void {
    if (undefined !== idleTimer) clearTimeout(idleTimer);
    recentlyShown = false;
  }

  /** Hides the tooltip and cancels a pending one. */
  static resetTooltip(): void {
    if (undefined !== showTimer) {
      clearTimeout(showTimer);
      showTimer = undefined;
    }
    const tooltip = tooltipElement as HTMLElement;
    tooltip.classList.remove("visible");
    tooltip.textContent = "";
    css(tooltip, "left", "");
    css(tooltip, "top", "");
  }

  static documentOverListener(event: Event): void {
    Tooltip.resetTooltip();
    const owner = titled(event.target);
    const rich =
      hasRichTooltip(owner) ||
      hasRichTooltip(owner ? owner.parentElement : null) ||
      hasRichTooltip(owner ? owner.firstElementChild : null);
    if (owner && !rich) {
      hovered = event.target as Element;
      if (recentlyShown) Tooltip.showTooltip();
      else showTimer = setTimeout(Tooltip.showTooltip, 500);
    }
  }

  static documentOutListener(): void {
    Tooltip.resetTooltip();
    hovered = null;
  }

  /** Creates the tooltip element and listens for the mouse (once per page in the old app). */
  static init(): void {
    tooltipElement = document.createElement("div");
    tooltipElement.classList.add("g-tooltip");
    document.body.append(tooltipElement);
    document.addEventListener("mouseover", Tooltip.documentOverListener);
    document.addEventListener("mouseout", Tooltip.documentOutListener);
  }
}

/**
 * Installs the data-title tooltips: what the old boot did with
 * `Fn.init()` (bootstrap a1483, right after `gContainer.start()` and
 * `updateRecentDocumentsAction()`, before the body's `loading` class is
 * removed). Calling it again does nothing.
 */
export function installTooltips(): void {
  if (tooltipElement && tooltipElement.isConnected) return;
  Tooltip.init();
}

/**
 * `$(element).gTooltip("show")`: shows the tooltip of `element` now and
 * hides it on the next click anywhere.
 */
export function showTooltipFor(element: Element): void {
  Tooltip.showTooltip(element);
  document.addEventListener("click", Tooltip.resetTooltip, { once: true, capture: true });
}
