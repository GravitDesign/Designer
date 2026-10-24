// Old: designer.browser.dev.js module 1722 ($.fn.gOverlay).
/**
 * Overlays: popups that are placed next to a target element or point
 * (choosers, the unit list, tooltips, dropdown panels). The content
 * element is wrapped in a `.g-overlay` that is appended to the topmost
 * visible dialog container, or to body when no dialog is open, and
 * positioned by relayout().
 *
 * Open overlays form a stack. A mousedown outside an overlay (on a body
 * child that comes before it, or anywhere outside it while it sits in a
 * dialog) closes it, and so does Escape; Enter calls every open overlay's
 * enterCallback. The listeners are added when this module loads, as the
 * old module did, so they come before the ones the designer adds.
 *
 * Usage:
 *
 *     const overlay = new Overlay(content, { clazz: "my-popup", padding: false });
 *     renderInto(content, <MyPopup />);
 *     overlay.on("close", () => ...);
 *     overlay.open(buttonElement);
 *     overlay.close();
 *
 * The wrapper's inline style is written in the old order ("position:
 * absolute; top: ..; left: ..;"), so components must not style it.
 */
import type { Event as GEvent } from "../../engine/core/event.ts";
import { ModifiersChangedEvent } from "../../engine/core/modifiers-changed-event.ts";
import { Platform } from "../../engine/core/platform.ts";
import { css, outerHeight, outerWidth } from "../shell/dom.ts";
import {
  closestOf,
  elementIndex,
  isFormControl,
  Listeners,
  offset,
  windowHeight,
  windowWidth,
} from "../widgets/dom-helpers.ts";

export interface OverlayOptions {
  /** Wraps the overlay in a `.g-overlay-modal` element. */
  modal?: boolean;
  /** False adds `no-padding` to the wrapper. */
  padding?: boolean;
  /** Remove the wrapper on close (true) or only detach it (false, reopenable). */
  releaseOnClose?: boolean;
  /** Extra classes of the `.g-overlay` wrapper. */
  clazz?: string;
  /** Called with the keydown event when Enter is pressed while the overlay is open. */
  enterCallback?: ((event: KeyboardEvent) => void) | null;
  offsetX?: number;
  offsetY?: number;
  bottomOffsetY?: number | string;
  /** Place by `right` instead of `left`, this far from the target's right edge. */
  customRight?: number | null;
  /** Added to the content element when the overlay is flipped above its target. */
  bottomClazz?: string | null;
  /** Added to the content element when the overlay is flipped to the left. */
  rightClazz?: string | null;
  closeCallback?: (() => void) | null;
  /** Don't darken the inspector and the touch toolbar while open. */
  disableDarkShadow?: boolean;
  /** Align to the target's horizontal centre. */
  middle?: boolean;
  /** Place beside the target instead of below it. */
  side?: boolean;
  sideClazz?: string;
  flipHorizontal?: boolean;
}

type ResolvedOptions = Required<Omit<OverlayOptions, "enterCallback" | "closeCallback">> & {
  enterCallback: ((event: KeyboardEvent) => void) | null;
  closeCallback: (() => void) | null;
};

/** What an overlay is opened at: an element, or a point in page coordinates. */
export type OverlayTarget = Element | { x: number; y: number };

/**
 * A close listener; calling `prevent` keeps the overlay open. `event` is
 * what caused the close (the mousedown or keydown), if anything.
 */
export type OverlayCloseListener = (prevent: () => void, event: unknown) => void;

const DEFAULTS: ResolvedOptions = {
  modal: false,
  padding: true,
  releaseOnClose: false,
  clazz: "",
  enterCallback: null,
  offsetX: 0,
  offsetY: 0,
  bottomOffsetY: 0,
  customRight: null,
  bottomClazz: null,
  rightClazz: null,
  closeCallback: null,
  disableDarkShadow: false,
  middle: false,
  side: false,
  sideClazz: "g-overlay-side",
  flipHorizontal: false,
};

/** The open overlays' content elements, oldest first. */
const stack: Element[] = [];
const overlays = new WeakMap<Element, Overlay>();

/** Keeps Escape from reaching other modifier listeners while an overlay is open. */
function stopEscape(event: GEvent): void {
  if ((event as ModifiersChangedEvent).changed.escapeKey)
    event.isImmediatePropagationStopped = true;
}

/**
 * Closes, from the top, every overlay the event happened outside of.
 * Returns whether any was asked to close.
 */
function closeOutside(event: Event): boolean {
  let closed = false;
  if (stack.length > 0) {
    for (let n = stack.length - 1; n >= 0; --n) {
      const content = stack[n] as Element;
      const overlay = overlays.get(content);
      const wrapper = content.closest(".g-overlay");
      const top = closestOf(event.target, "body > *");
      let insideDialog = false;
      const parent = wrapper ? wrapper.parentElement : null;
      if (
        parent &&
        parent.classList.contains("g-dialog-container") &&
        closestOf(event.target, ".g-overlay") === null
      ) {
        insideDialog = true;
      }
      if (elementIndex(top) < elementIndex(wrapper) || insideDialog) {
        closed = true;
        if (overlay) overlay.close(event, n);
      }
    }
  }
  return closed;
}

function installListeners(): void {
  if (typeof document === "undefined") return;
  document.addEventListener(
    "mousedown",
    (event) => {
      closeOutside(event);
    },
    true,
  );
  document.addEventListener(
    "keydown",
    (event) => {
      const code = event.which || event.keyCode;
      if (27 === code) {
        if (closeOutside(event)) event.stopPropagation();
      } else if (13 === code && stack.length > 0) {
        for (let n = stack.length - 1; n >= 0; --n) {
          const overlay = overlays.get(stack[n] as Element);
          const options = overlay ? overlay.options : null;
          // The old code read options.enterCallback without a check; an
          // overlay always has options, so this never threw.
          if (options && options.enterCallback) options.enterCallback(event);
        }
      }
    },
    true,
  );
  window.addEventListener("resize", () => {
    for (let n = 0; n < stack.length; ++n) {
      const overlay = overlays.get(stack[n] as Element);
      if (overlay) overlay.relayout();
    }
  });
}

installListeners();

export class Overlay {
  /** The overlay of a content element, if it has one ($(el).data("goverlay")). */
  static of(content: Element): Overlay | null {
    return overlays.get(content) || null;
  }

  /** The content elements of the open overlays, oldest first. */
  static openContents(): readonly Element[] {
    return stack;
  }

  readonly options: ResolvedOptions;
  private readonly _content: HTMLElement;
  private readonly _wrapper: HTMLElement;
  private _target: OverlayTarget | null = null;
  private _isPoint = false;
  private _xLeft: number | undefined;
  private _yTop: number | undefined;
  private readonly _open = new Listeners<[]>();
  private readonly _close = new Listeners<[() => void, unknown]>();

  /** `$(content).gOverlay(options)`: wraps the content in `.g-overlay`. */
  constructor(content: HTMLElement, options: OverlayOptions = {}) {
    const resolved = { ...DEFAULTS } as ResolvedOptions;
    // $.extend: undefined values don't override the defaults.
    for (const key of Object.keys(options) as (keyof OverlayOptions)[]) {
      const value = options[key];
      if (value !== undefined) (resolved as Record<string, unknown>)[key] = value;
    }
    this.options = resolved;
    this._content = content;
    overlays.set(content, this);
    const wrapper = document.createElement("div");
    wrapper.classList.add("g-overlay");
    addClasses(wrapper, resolved.clazz);
    wrapper.classList.toggle("no-padding", !resolved.padding);
    css(wrapper, "position", "absolute");
    // .wrap(): the wrapper takes the content's place, then holds it.
    if (content.parentNode) content.parentNode.insertBefore(wrapper, content);
    wrapper.appendChild(content);
    this._wrapper = wrapper;
  }

  /** The content element (the one the overlay was made from). */
  getContent(): HTMLElement {
    return this._content;
  }

  /** The `.g-overlay` wrapper. */
  getElement(): HTMLElement {
    return this._wrapper;
  }

  /** `.on("open", ...)`: after the overlay was placed and pushed on the stack. */
  on(type: "open", listener: () => void): void;
  /** `.on("close", ...)`: before it closes; calling `prevent` keeps it open. */
  on(type: "close", listener: OverlayCloseListener): void;
  on(type: "open" | "close", listener: (() => void) | OverlayCloseListener): void {
    if (type === "open") this._open.add(listener as () => void);
    else this._close.add(listener as OverlayCloseListener);
  }

  off(type: "open" | "close", listener: (() => void) | OverlayCloseListener): void {
    if (type === "open") this._open.remove(listener as () => void);
    else this._close.remove(listener as OverlayCloseListener);
  }

  /** Places the wrapper next to the target, flipped where it doesn't fit. */
  relayout(params: { preserveTop?: boolean } = {}): void {
    const preserveTop = !!params.preserveTop;
    if (!this._target && !this._isPoint) return;
    const options = this.options;
    const wrapper = this._wrapper;
    const viewWidth = windowWidth();
    const viewHeight = windowHeight();
    const width = outerWidth(wrapper);
    const height = outerHeight(wrapper);
    let targetElement: HTMLElement | null = null;
    let position: { top: number; left: number };
    if (this._yTop && this._xLeft) {
      position = { top: this._yTop, left: this._xLeft };
    } else {
      targetElement = this._target as HTMLElement;
      position = offset(targetElement);
    }
    const targetWidth = this._isPoint ? 0 : outerWidth(targetElement as HTMLElement);
    const targetHeight = this._isPoint ? 0 : outerHeight(targetElement as HTMLElement);
    const placed = placeOverlay(
      {
        viewWidth,
        viewHeight,
        width,
        height,
        top: position.top,
        left: position.left,
        targetWidth,
        targetHeight,
        isPoint: this._isPoint,
      },
      options,
    );
    for (const name of placed.classes) addClasses(this._content, name);
    const x = placed.x;
    const y = placed.y;
    let keepTop = false;
    if (preserveTop) {
      const current = wrapper.isConnected ? offset(wrapper) : null;
      const currentTop = current && current.top;
      keepTop = "number" == typeof currentTop && currentTop + height < viewHeight;
    }
    if (!keepTop) css(wrapper, "top", y + "px");
    if (null === options.customRight) css(wrapper, "left", x + "px");
    else css(wrapper, "right", x + "px");
  }

  /**
   * Shows the overlay at `target` (an element or a page point). `parent`
   * picks the dialog to open in (the visible dialog container around it);
   * otherwise the topmost visible dialog container or body.
   */
  open(target?: OverlayTarget | null, parent?: Element | null, callback?: () => void): this {
    const isPoint =
      !!target &&
      "number" == typeof (target as { x?: unknown }).x &&
      "number" == typeof (target as { y?: unknown }).y;
    const options = this.options;
    if (target && !options.disableDarkShadow) {
      const element = target instanceof Element ? target : null;
      const inspector = element ? element.closest(".sidebar-inspector") : null;
      if (inspector) inspector.classList.add("sidebar-overlay");
      for (const toolbar of document.querySelectorAll(".g-touch-toolbar"))
        toolbar.classList.add("sidebar-overlay");
      if (element && isFormControl(element)) {
        const contentBox = element.closest(".content");
        if (contentBox) contentBox.classList.add("overlay");
      }
    }
    this._target = target || null;
    this._isPoint = isPoint;
    this._xLeft = target ? (target as { x?: number }).x : undefined;
    this._yTop = target ? (target as { y?: number }).y : undefined;
    let host: Element | null = null;
    if (parent) host = parent.closest(".g-dialog-container.visible");
    if (!host) {
      const visible = document.querySelectorAll(".g-dialog-container.visible");
      host = visible.length > 0 ? (visible[visible.length - 1] as Element) : document.body;
    }
    if (options.modal) {
      const modal = document.createElement("div");
      modal.className = "g-overlay-modal";
      modal.appendChild(this._wrapper);
      host.appendChild(modal);
    } else {
      host.appendChild(this._wrapper);
    }
    Platform.addEventListener(ModifiersChangedEvent, stopEscape, this._content, null, true);
    this.relayout();
    stack.push(this._content);
    this._open.fire();
    if (callback) callback();
    return this;
  }

  /**
   * Closes the overlay if it is the top one (or the one at `index`). Close
   * listeners can keep it open.
   */
  close(event?: unknown, index?: number): this {
    if (
      stack.length &&
      stack[index !== undefined && index >= 0 ? index : stack.length - 1] === this._content
    ) {
      let prevented = false;
      const prevent = () => {
        prevented = true;
      };
      this._close.fire(prevent, event);
      if (prevented) return this;
      Platform.removeEventListener(ModifiersChangedEvent, stopEscape, this._content);
      if (this._target) {
        for (const element of document.querySelectorAll(".sidebar-inspector"))
          element.classList.remove("sidebar-overlay");
        for (const element of document.querySelectorAll(".g-touch-toolbar"))
          element.classList.remove("sidebar-overlay");
        for (const element of document.querySelectorAll(".content.overlay"))
          element.classList.remove("overlay");
      }
      this._target = null;
      const options = this.options;
      const modal = this._wrapper.closest(".g-overlay-modal");
      // remove() and detach() are the same for the DOM; release only
      // matters for the jQuery data the old code dropped with it.
      this._wrapper.remove();
      if (modal) modal.remove();
      // The old code popped the top entry even when it closed a lower one
      // (see "Closing a lower overlay pops the top one" in QUESTIONS.md).
      stack.pop();
      if (options.closeCallback) options.closeCallback();
    }
    return this;
  }

  /** Whether it is open (at `target`, when given). */
  isOpenned(target?: OverlayTarget | null): boolean {
    if (target) return !!this._target && this._target === target;
    return !!this._target;
  }
}

/** What relayout() measured. */
export interface OverlayGeometry {
  viewWidth: number;
  viewHeight: number;
  /** The overlay's outer size. */
  width: number;
  height: number;
  /** The target's page position and outer size (a point has no size). */
  top: number;
  left: number;
  targetWidth: number;
  targetHeight: number;
  isPoint: boolean;
}

type PlacementOptions = Pick<
  ResolvedOptions,
  | "side"
  | "sideClazz"
  | "middle"
  | "offsetX"
  | "offsetY"
  | "bottomOffsetY"
  | "customRight"
  | "rightClazz"
  | "bottomClazz"
  | "flipHorizontal"
>;

/**
 * Where relayout() puts an overlay: below the target (beside it with
 * `side`), flipped left or up where it doesn't fit, then kept on screen.
 * `classes` are added to the content element for the flips.
 */
export function placeOverlay(
  geometry: OverlayGeometry,
  options: PlacementOptions,
): { x: number; y: number; classes: string[] } {
  const { viewWidth, viewHeight, width, height, isPoint } = geometry;
  const classes: string[] = [];
  const top = geometry.top;
  const halfWidth = isPoint ? 0 : geometry.targetWidth / 2;
  const centre = geometry.left + halfWidth;
  const left = options.middle ? centre : geometry.left;
  const right = options.middle ? centre : geometry.left + (isPoint ? 0 : geometry.targetWidth);
  const bottom = geometry.top + (isPoint ? 0 : geometry.targetHeight);
  let x: number;
  let y: number;
  const bottomOffsetY = parseInt(String(options.bottomOffsetY));
  if (options.side) {
    classes.push(options.sideClazz);
    x = right + options.offsetX;
    if (x + width > viewWidth) {
      x = left - width - options.offsetX;
      classes.push("g-overlay-left-side");
    }
    y = top + options.offsetY;
    if (y + height > viewHeight) {
      y = bottom - height - options.offsetY;
      classes.push("g-overlay-valign-bottom");
    }
  } else {
    x =
      null !== options.customRight
        ? viewWidth - right + options.customRight
        : left + options.offsetX;
    if (x + width > viewWidth) {
      x = right - width - options.offsetX;
      if (options.rightClazz) classes.push(options.rightClazz);
    } else if (options.flipHorizontal) {
      x = left - width - options.offsetX;
    }
    if (x + width > viewWidth) x = viewWidth - width;
    y = bottom + options.offsetY;
    if (y + height > viewHeight) {
      y = top - height - bottomOffsetY;
      if (options.bottomClazz) classes.push(options.bottomClazz);
    }
    if (y + height > viewHeight) y = viewHeight - height - bottomOffsetY;
  }
  if (x < 0) x = 0;
  if (y < 0) y = 0;
  return { x, y, classes };
}

function addClasses(element: Element, names: string | null | undefined): void {
  if (!names) return;
  for (const name of names.split(/\s+/)) if (name) element.classList.add(name);
}
