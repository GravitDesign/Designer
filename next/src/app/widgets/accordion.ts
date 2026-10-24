// Old: designer.browser.dev.js module 1729 ($.fn.gAccordion).
/**
 * Fold buttons of the panel headers. A header gets a `button.g-accordion`
 * with a right or down arrow and a `.g-accordion-ghost`; the button shows
 * and hides the element after the header, and the header switches between
 * `collapsed` and `expanded`. The panels build their headers in code, so
 * this is plain DOM.
 */
import { designerOrNull } from "../shell/globals.ts";

export interface AccordionOptions {
  /** Selector the element after the header must match (any when absent). */
  next?: string;
  /** The header part (first match) the button goes after, or before. */
  title?: string;
  before?: boolean;
  /** Statistics name: "<stats>_toggle_page" with Collapse or Expand. */
  stats?: string;
}

/** Sets the header's collapsed/expanded class and its first arrow's icon. */
export function setAccordionState(header: Element, collapsed: boolean): void {
  header.classList.add(collapsed ? "collapsed" : "expanded");
  header.classList.remove(collapsed ? "expanded" : "collapsed");
  const icon = header.querySelector(".gravit-icon-down,.gravit-icon-right");
  if (icon) {
    icon.classList.remove(collapsed ? "gravit-icon-down" : "gravit-icon-right");
    icon.classList.add(collapsed ? "gravit-icon-right" : "gravit-icon-down");
  }
}

/** `$(el).next(selector)[0]`. */
function nextMatching(header: Element, selector?: string): HTMLElement | null {
  const next = header.nextElementSibling;
  if (!next || (selector && !next.matches(selector))) return null;
  return next as HTMLElement;
}

/** jQuery's .toggle() for one element: hide when shown, show again when hidden. */
const hiddenDisplay = new WeakMap<HTMLElement, string>();
function toggleShown(element: HTMLElement): void {
  if (getComputedStyle(element).display === "none") {
    element.style.display = hiddenDisplay.get(element) || "";
  } else {
    const current = element.style.display;
    if (current && current !== "none") hiddenDisplay.set(element, current);
    element.style.display = "none";
  }
}

/** `$(header).gAccordion(next, title, before, stats)`. */
export function initAccordion(header: HTMLElement, options: AccordionOptions = {}): void {
  const body = nextMatching(header, options.next);
  if (!header.classList.contains("accordion")) {
    const icon = document.createElement("span");
    icon.classList.add(
      header.classList.contains("collapsed") ? "gravit-icon-right" : "gravit-icon-down",
    );
    const button = document.createElement("button");
    button.classList.add("g-accordion");
    button.addEventListener("click", () => {
      if (body) toggleShown(body);
      const collapsed = !!body && "none" === getComputedStyle(body).display;
      setAccordionState(header, collapsed);
      const designer = designerOrNull();
      if (options.stats && designer)
        designer.stats(options.stats + "_toggle_page", collapsed ? "Collapse" : "Expand");
      header.dispatchEvent(new Event("change", { bubbles: true }));
    });
    button.appendChild(icon);
    const ghost = document.createElement("div");
    ghost.classList.add("g-accordion-ghost");
    const title = options.title ? header.querySelector(options.title) : null;
    if (options.title) {
      if (title) {
        if (options.before) title.parentNode?.insertBefore(button, title);
        else {
          title.after(button);
          button.after(ghost);
        }
        title.addEventListener("click", () => button.click());
        title.addEventListener("mouseover", () => button.classList.toggle("hovered"));
        title.addEventListener("mouseout", () => button.classList.toggle("hovered"));
      }
    } else {
      header.appendChild(button);
      header.appendChild(ghost);
    }
    header.classList.add("accordion");
  }
  if (body) body.style.display = header.classList.contains("collapsed") ? "none" : "";
}

/** `gAccordion("toggleOpen", open)`. */
export function toggleAccordionOpen(element: Element, open: boolean): void {
  setAccordionState(element, !open);
}
