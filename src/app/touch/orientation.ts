// Old: designer.browser.dev.js module 1337 ($.fn.gCollapsible and its Orientation).
/**
 * A panel that folds away behind an arrow button, used by the assistant
 * bar (virtual key bar): the whole bar folds down (vertical, the button
 * is its first child) and its arrow keys fold to the side (horizontal,
 * the button sits just before the panel).
 *
 *     const side = new Collapsible(element, { orientation: Orientation.Horizontal });
 *     side.collapse();
 *     side.onVisibilityChanged((expanded) => ...);
 *
 * The panel carries `g-collapsible`, its orientation and `expanded` or
 * `collapsed`; `g-transitions-off` stays until the button is used the
 * first time, so the state restored at start doesn't animate. Plain DOM,
 * as the bar it belongs to (see virtual-key-bar.ts).
 */

export const Orientation = { Vertical: "vertical", Horizontal: "horizontal" } as const;

export type CollapsibleOrientation = (typeof Orientation)[keyof typeof Orientation];

export interface CollapsibleOptions {
  orientation?: CollapsibleOrientation;
}

type VisibilityListener = (expanded: boolean) => void;

const collapsibles = new WeakMap<Element, Collapsible>();

export class Collapsible {
  static readonly Orientation = Orientation;

  /** The collapsible made on an element ($(el).gCollapsible), if any. */
  static of(element: Element): Collapsible | null {
    return collapsibles.get(element) || null;
  }

  readonly element: HTMLElement;
  readonly button: HTMLElement;
  private readonly _listeners: VisibilityListener[] = [];

  constructor(element: HTMLElement, options: CollapsibleOptions = {}) {
    const orientation = options.orientation || Orientation.Vertical;
    this.element = element;
    element.classList.add("g-collapsible", "g-transitions-off", "expanded");
    element.classList.add(orientation);
    const button = document.createElement("div");
    button.className = "g-collapsible-button";
    const arrow = document.createElement("span");
    arrow.className =
      "vertical" === orientation ? "gravit-icon-touch-arrow-down" : "gravit-icon-touch-arrow-left";
    button.appendChild(arrow);
    button.addEventListener("click", () => {
      const expanded = element.classList.contains("expanded");
      this._toggleTransitions(true);
      this._toggleVisibility(!expanded);
      // Old: o.trigger("visibilitychanged", [!expanded]).
      for (const listener of this._listeners.slice()) listener(!expanded);
    });
    if ("vertical" === orientation) element.prepend(button);
    else element.before(button);
    this.button = button;
    collapsibles.set(element, this);
  }

  /** The panel's "visibilitychanged" event: the button folded or unfolded it. */
  onVisibilityChanged(listener: VisibilityListener): void {
    this._listeners.push(listener);
  }

  collapse(): this {
    this._toggleVisibility(false);
    return this;
  }

  expand(): this {
    this._toggleVisibility(true);
    return this;
  }

  isExpanded(): boolean {
    return this.element.classList.contains("expanded");
  }

  private _toggleTransitions(on: boolean): void {
    this.element.classList.toggle("g-transitions-off", !on);
  }

  private _toggleVisibility(expanded: boolean): void {
    const element = this.element;
    if (element.classList.contains("expanded") === expanded) return;
    element.classList.toggle("collapsed", !expanded);
    element.classList.toggle("expanded", expanded);
    if (element.classList.contains(Orientation.Vertical)) {
      // Old: children(".g-collapsible-button:first").find("span").
      const button = [...element.children].find((child) =>
        child.classList.contains("g-collapsible-button"),
      );
      for (const span of button ? button.querySelectorAll("span") : []) {
        span.classList.toggle("gravit-icon-touch-arrow-up", !expanded);
        span.classList.toggle("gravit-icon-touch-arrow-down", expanded);
      }
    } else {
      // Old: siblings(".g-collapsible-button:first").find("span").
      const parent = element.parentElement;
      const button = parent
        ? [...parent.children].find(
            (child) => child !== element && child.classList.contains("g-collapsible-button"),
          )
        : undefined;
      for (const span of button ? button.querySelectorAll("span") : []) {
        span.classList.toggle("gravit-icon-touch-arrow-right", !expanded);
        span.classList.toggle("gravit-icon-touch-arrow-left", expanded);
      }
    }
  }
}
