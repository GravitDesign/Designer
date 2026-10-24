// Old: designer.browser.dev.js module 1517 (tab rearranging), with the parts of module 1518 (jQuery UI 1.12.1 sortable) and module 1519 (ui.mouse) it used.
/**
 * The document tabs in the header can be dragged sideways to change their
 * order, and the "more" button next to them lists every tab (a click on
 * an entry activates its window).
 *
 * The old module made `.tabs` a jQuery UI sortable with
 * `{ axis: "x", containment: $("#header"), revert: 150 }`. The sortable is
 * reimplemented here for exactly those options (helper "original",
 * items "> *", tolerance "intersect", distance 1, delay 0, zIndex 1000,
 * scroll true), with the same DOM writes in the same order: the dragged
 * tab gets `ui-sortable-helper` and inline width, height, position,
 * z-index and left; a `ui-sortable-placeholder` copy of its classes takes
 * its place in the row; on release the tab glides to the placeholder for
 * 150 ms (jQuery's animate with "swing") and is put where the placeholder
 * was. Only the DOM order changes: like the old app, the windows keep
 * their order in Windows (nothing listened to the sortable's update).
 *
 * The header (menus/header.ts) calls allowRearrangeTabs from init,
 * toggleRearrangeTabsVisibility from _updateViewBasedOnPermissions and
 * updateTabsInterface on every DocumentEvent.
 */
import { offset, scrollParent } from "../widgets/dom-helpers.ts";
import { windowOfTab } from "../menus/header.ts";
import { computed, css, height, outerHeight, outerWidth, setHeight, width } from "./dom.ts";
import { designer } from "./globals.ts";

export const REARRANGE_TAB_CLASS = "more-button";
export const REARRANGE_TAB_SELECTOR = ".".concat(REARRANGE_TAB_CLASS);

/** $(selector): every match in the document. */
function all(selector: string): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>(selector)];
}

/** $(selector).children(): the element children of every match, in order. */
function childrenOf(elements: readonly Element[]): HTMLElement[] {
  const out: HTMLElement[] = [];
  for (const element of elements)
    for (const child of element.children) out.push(child as HTMLElement);
  return out;
}

/** jQuery's .eq(index): negative indexes count from the end. */
function eq<T>(list: readonly T[], index: number): T | undefined {
  return list[index < 0 ? index + list.length : index];
}

/** parseInt($(el).css(name), 10) || 0. */
function cssInt(element: Element, name: string): number {
  return parseInt(computed(element, name), 10) || 0;
}

/** $(el).width(value), as dom.ts setHeight does it for the height. */
function setWidth(element: HTMLElement, value: number): void {
  const extra =
    computed(element, "box-sizing") === "border-box"
      ? (parseFloat(computed(element, "padding-left")) || 0) +
        (parseFloat(computed(element, "padding-right")) || 0) +
        (parseFloat(computed(element, "border-left-width")) || 0) +
        (parseFloat(computed(element, "border-right-width")) || 0)
      : 0;
  css(element, "width", value + extra);
}

/** $(el).innerWidth() / innerHeight(): content and padding. */
function innerSize(element: HTMLElement, horizontal: boolean): number {
  return horizontal
    ? width(element) +
        (parseFloat(computed(element, "padding-left")) || 0) +
        (parseFloat(computed(element, "padding-right")) || 0)
    : height(element) +
        (parseFloat(computed(element, "padding-top")) || 0) +
        (parseFloat(computed(element, "padding-bottom")) || 0);
}

/** $(el).offsetParent(): the nearest positioned ancestor, else the root element. */
function offsetParentOf(element: HTMLElement): HTMLElement {
  let parent = element.offsetParent as HTMLElement | null;
  while (parent && computed(parent, "position") === "static")
    parent = parent.offsetParent as HTMLElement | null;
  return parent || element.ownerDocument.documentElement;
}

type Scroller = HTMLElement | Document;

function isDocument(scroller: Scroller): scroller is Document {
  return scroller.nodeType === 9;
}

/** $(el).scrollTop() / scrollLeft(); the document's are the window's. */
function scrollOf(scroller: Scroller, top: boolean): number {
  if (isDocument(scroller)) {
    const view = scroller.defaultView;
    return view ? (top ? view.pageYOffset : view.pageXOffset) : 0;
  }
  return top ? scroller.scrollTop : scroller.scrollLeft;
}

/** $(document).scrollTop(value) / scrollLeft(value). */
function scrollDocument(scroller: Document, top: boolean, value: number): void {
  const view = scroller.defaultView;
  if (!view) return;
  if (top) view.scrollTo(view.pageXOffset, value);
  else view.scrollTo(value, view.pageYOffset);
}

function tagNameOf(scroller: Scroller): string {
  return isDocument(scroller) ? "undefined" : scroller.tagName;
}

/** $(event.target).closest(selector).length for any event target. */
function closestMatches(target: EventTarget | null, selector: string): boolean {
  return target instanceof Element && target.closest(selector) !== null;
}

/** jQuery's "swing" easing. */
function swing(p: number): number {
  return 0.5 - Math.cos(p * Math.PI) / 2;
}

/**
 * $(el).animate({ left }, duration, complete) as jQuery 3.6 ran it: the
 * start is the computed left, the first step runs at once (at 0 %), the
 * next ones on animation frames (13 ms timeouts while the page is
 * hidden), the last one at 100 % calls `complete`.
 */
function animateLeft(
  element: HTMLElement,
  end: number,
  duration: number,
  complete: () => void,
): void {
  const startTime = Date.now();
  const start = parseFloat(computed(element, "left")) || 0;
  const tick = (now: number): boolean => {
    const remaining = Math.max(0, startTime + duration - now);
    const percent = 1 - (remaining / duration || 0);
    const eased = swing(percent);
    css(element, "left", (end - start) * eased + start + "px");
    if (percent < 1) return true;
    complete();
    return false;
  };
  const next = (): void => {
    if (document.hidden === false && typeof requestAnimationFrame === "function")
      requestAnimationFrame(schedule);
    else setTimeout(schedule, 13);
  };
  const schedule = (): void => {
    if (tick(Date.now())) next();
  };
  // The first step used the start time (jQuery's cached fxNow).
  if (tick(startTime)) next();
}

/** The mouse button of an event as jQuery reported it (`event.which`). */
function whichOf(event: MouseEvent): number {
  // jQuery 3.6 used the native `which` when the browser had one.
  return event.which || (event.button & 1 ? 1 : event.button & 2 ? 3 : event.button & 4 ? 2 : 0);
}

/**
 * jQuery's return false from a handler: preventDefault and
 * stopPropagation.
 */
function returnFalse(event: Event): void {
  event.preventDefault();
  event.stopPropagation();
}

/** ui.mouse's module-wide "a mouse widget handles this press" flag. */
let mouseHandled = false;
let mouseHandledReset = false;

/** The ui.mouse document listener that cleared the flag on every mouseup. */
function installMouseHandledReset(): void {
  if (mouseHandledReset) return;
  mouseHandledReset = true;
  document.addEventListener("mouseup", () => {
    mouseHandled = false;
  });
}

interface SortableItem {
  item: HTMLElement;
  width: number;
  height: number;
  left: number;
  top: number;
}

interface Point {
  top: number;
  left: number;
}

interface SortableUi {
  item: HTMLElement;
  placeholder: HTMLElement | null;
}

interface SortableOptions {
  containment: HTMLElement | null;
  revert: number;
  activate(event: MouseEvent, ui: SortableUi): void;
  beforeStop(event: MouseEvent, ui: SortableUi): void;
}

/** The sortable a tab element belongs to ($.data(item, "sortable-item")). */
const itemOwners = new WeakMap<Element, TabsSortable>();
/** The sortables made so far ($.data(element, "ui-sortable")). */
const sortables = new WeakMap<Element, TabsSortable>();
/** Targets whose next click the sortable swallows ("sortable.preventClickEvent"). */
const preventClick = new WeakSet<EventTarget>();

const CANCEL = "input, textarea, button, select, option";
const DISTANCE = 1;
const SCROLL_SENSITIVITY = 20;
const SCROLL_SPEED = 20;
const Z_INDEX = 1000;

/**
 * jQuery UI 1.12.1's sortable (with ui.mouse) for the options the tabs
 * used. The fields keep the widget's names; like the widget, some of
 * them outlive a drag (originalPosition, containment, lastPositionAbs,
 * cssPosition) and the next drag starts with them.
 */
class TabsSortable {
  private readonly element: HTMLElement;
  private readonly options: SortableOptions;
  private items: SortableItem[] = [];
  private readonly containerCache = { left: 0, top: 0, width: 0, height: 0 };
  private currentItem: HTMLElement | null = null;
  private helper: HTMLElement | null = null;
  private placeholder: HTMLElement | null = null;
  private reverting = false;
  private dragging = false;
  private floating = false;
  private counter = 0;
  private direction: "down" | "up" | null = null;
  private margins = { left: 0, top: 0 };
  private helperProportions = { width: 0, height: 0 };
  private offsetValue: Point & { click: Point; parent: Point; relative: Point } = {
    top: 0,
    left: 0,
    click: { top: 0, left: 0 },
    parent: { top: 0, left: 0 },
    relative: { top: 0, left: 0 },
  };
  private offsetParent: HTMLElement | null = null;
  private scrollParentValue: Scroller | null = null;
  private overflowOffset: Point = { top: 0, left: 0 };
  private cssPosition: string | undefined;
  private originalPosition: Point | null = null;
  private position: Point = { top: 0, left: 0 };
  private positionAbs: Point = { top: 0, left: 0 };
  private lastPositionAbs: Point | null = null;
  private containment: [number, number, number, number] | null = null;
  private domPosition: { prev: Element | null; parent: Element | null } = {
    prev: null,
    parent: null,
  };
  private storedCSS: Record<"width" | "height" | "position" | "top" | "left", string> | null = null;
  private storedZIndex: string | null = null;
  private mouseStarted = false;
  private mouseMoved = false;
  private mouseDownEvent: MouseEvent | null = null;
  private ignoreMissingWhich = false;
  private mouseDelayMet = false;
  private readonly mouseMoveDelegate = (event: MouseEvent): void => {
    if (this._mouseMove(event) === false) returnFalse(event);
  };
  private readonly mouseUpDelegate = (event: MouseEvent): void => {
    this._mouseUp(event);
  };

  constructor(element: HTMLElement, options: SortableOptions) {
    this.element = element;
    this.options = options;
    // _create
    element.classList.add("ui-sortable");
    this.refresh();
    this._mouseInit();
    this._setHandleClassName();
  }

  private _mouseInit(): void {
    this.element.addEventListener("mousedown", (event) => {
      if (this._mouseDown(event) === false) returnFalse(event);
    });
    this.element.addEventListener("click", (event) => {
      if (event.target && preventClick.has(event.target)) {
        preventClick.delete(event.target);
        event.stopImmediatePropagation();
        returnFalse(event);
      }
    });
  }

  private _setHandleClassName(): void {
    for (const handle of this.element.querySelectorAll(".ui-sortable-handle"))
      handle.classList.remove("ui-sortable-handle");
    for (const item of this.items) item.item.classList.add("ui-sortable-handle");
  }

  private refresh(): void {
    this._refreshItems();
    this._setHandleClassName();
    this.refreshPositions();
  }

  private _refreshItems(): void {
    this.items = [];
    for (const child of this.element.children) {
      itemOwners.set(child, this);
      this.items.push({ item: child as HTMLElement, width: 0, height: 0, left: 0, top: 0 });
    }
  }

  private refreshPositions(fast?: boolean): void {
    this.floating = !!this.items.length;
    if (this.offsetParent && this.helper) this.offsetValue.parent = this._getParentOffset();
    for (let n = this.items.length - 1; n >= 0; n--) {
      const entry = this.items[n] as SortableItem;
      if (!fast) {
        entry.width = outerWidth(entry.item);
        entry.height = outerHeight(entry.item);
      }
      const position = offset(entry.item);
      entry.left = position.left;
      entry.top = position.top;
    }
    const position = offset(this.element);
    this.containerCache.left = position.left;
    this.containerCache.top = position.top;
    this.containerCache.width = outerWidth(this.element);
    this.containerCache.height = outerHeight(this.element);
  }

  // ui.mouse

  private _mouseDown(event: MouseEvent): boolean | undefined {
    if (mouseHandled) return undefined;
    this.mouseMoved = false;
    if (this.mouseStarted) this._mouseUp(event);
    this.mouseDownEvent = event;
    const left = whichOf(event) === 1;
    const cancelled = closestMatches(event.target, CANCEL);
    if (!left || cancelled || !this._mouseCapture(event)) return true;
    this.mouseDelayMet = true;
    if (this._mouseDistanceMet(event) && this.mouseDelayMet) {
      // Never reached: the press is 0 px from itself.
      this.mouseStarted = this._mouseStart(event) !== false;
      if (!this.mouseStarted) {
        event.preventDefault();
        return true;
      }
    }
    if (preventClick.has(event.target as EventTarget))
      preventClick.delete(event.target as EventTarget);
    document.addEventListener("mousemove", this.mouseMoveDelegate);
    document.addEventListener("mouseup", this.mouseUpDelegate);
    event.preventDefault();
    mouseHandled = true;
    return true;
  }

  private _mouseMove(event: MouseEvent): boolean | undefined {
    if (this.mouseMoved && !whichOf(event)) {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
        this.ignoreMissingWhich = true;
      else if (!this.ignoreMissingWhich) {
        this._mouseUp(event);
        return undefined;
      }
    }
    if (whichOf(event) || event.button) this.mouseMoved = true;
    if (this.mouseStarted) {
      this._mouseDrag(event);
      event.preventDefault();
      return undefined;
    }
    if (this._mouseDistanceMet(event) && this.mouseDelayMet) {
      this.mouseStarted = this._mouseStart(this.mouseDownEvent as MouseEvent) !== false;
      if (this.mouseStarted) this._mouseDrag(event);
      else this._mouseUp(event);
    }
    return !this.mouseStarted;
  }

  private _mouseUp(event: MouseEvent): void {
    document.removeEventListener("mousemove", this.mouseMoveDelegate);
    document.removeEventListener("mouseup", this.mouseUpDelegate);
    if (this.mouseStarted) {
      this.mouseStarted = false;
      if (event.target && event.target === (this.mouseDownEvent as MouseEvent).target)
        preventClick.add(event.target);
      this._mouseStop(event);
    }
    this.ignoreMissingWhich = false;
    mouseHandled = false;
    event.preventDefault();
  }

  private _mouseDistanceMet(event: MouseEvent): boolean {
    const down = this.mouseDownEvent as MouseEvent;
    return (
      Math.max(Math.abs(down.pageX - event.pageX), Math.abs(down.pageY - event.pageY)) >= DISTANCE
    );
  }

  // sortable

  private _mouseCapture(event: MouseEvent): boolean {
    if (this.reverting) return false;
    this._refreshItems();
    let found: HTMLElement | null = null;
    const target = event.target instanceof Element ? event.target : null;
    for (let parent = target ? target.parentElement : null; parent; parent = parent.parentElement)
      if (itemOwners.get(parent) === this) {
        found = parent;
        break;
      }
    if (target && itemOwners.get(target) === this) found = target as HTMLElement;
    if (!found) return false;
    this.currentItem = found;
    return true;
  }

  private _mouseStart(event: MouseEvent): boolean {
    const item = this.currentItem as HTMLElement;
    this.refreshPositions();
    const helper = this._createHelper();
    this.helper = helper;
    this._cacheHelperProportions();
    this.margins = {
      left: cssInt(item, "margin-left"),
      top: cssInt(item, "margin-top"),
    };
    this.scrollParentValue = scrollParent(helper);
    const itemOffset = offset(item);
    this.offsetValue.top = itemOffset.top - this.margins.top;
    this.offsetValue.left = itemOffset.left - this.margins.left;
    this.offsetValue.click = {
      left: event.pageX - this.offsetValue.left,
      top: event.pageY - this.offsetValue.top,
    };
    this.offsetValue.parent = this._getParentOffset();
    // _getRelativeOffset: only for a "relative" helper, and the helper is
    // always absolute by the time cssPosition is read.
    this.offsetValue.relative = { top: 0, left: 0 };
    css(helper, "position", "absolute");
    this.cssPosition = computed(helper, "position");
    this.originalPosition = this._generatePosition(event);
    this.domPosition = { prev: item.previousElementSibling, parent: item.parentElement };
    this._createPlaceholder();
    if (this.options.containment) this._setContainment();
    const zIndex = computed(helper, "z-index");
    if (zIndex) this.storedZIndex = zIndex;
    css(helper, "zIndex", Z_INDEX);
    const scroller = this.scrollParentValue;
    if (!isDocument(scroller) && "HTML" !== scroller.tagName)
      this.overflowOffset = offset(scroller);
    this._cacheHelperProportions();
    this.options.activate(event, this._uiHash());
    this.dragging = true;
    helper.classList.add("ui-sortable-helper");
    this._mouseDrag(event);
    return true;
  }

  private _createHelper(): HTMLElement {
    const item = this.currentItem as HTMLElement;
    this.storedCSS = {
      width: item.style.getPropertyValue("width"),
      height: item.style.getPropertyValue("height"),
      position: computed(item, "position"),
      top: computed(item, "top"),
      left: computed(item, "left"),
    };
    if (!item.style.getPropertyValue("width")) setWidth(item, width(item));
    if (!item.style.getPropertyValue("height")) setHeight(item, height(item));
    return item;
  }

  private _cacheHelperProportions(): void {
    const helper = this.helper as HTMLElement;
    this.helperProportions = { width: outerWidth(helper), height: outerHeight(helper) };
  }

  private _getParentOffset(): Point {
    const helper = this.helper as HTMLElement;
    const parent = offsetParentOf(helper);
    this.offsetParent = parent;
    let position = offset(parent);
    const scroller = this.scrollParentValue as Scroller;
    if (
      "absolute" === this.cssPosition &&
      !isDocument(scroller) &&
      scroller.contains(parent) &&
      scroller !== parent
    ) {
      position = {
        left: position.left + scrollOf(scroller, false),
        top: position.top + scrollOf(scroller, true),
      };
    }
    if (parent === parent.ownerDocument.body) position = { top: 0, left: 0 };
    return {
      top: position.top + cssInt(parent, "border-top-width"),
      left: position.left + cssInt(parent, "border-left-width"),
    };
  }

  private _createPlaceholder(): void {
    const item = this.currentItem as HTMLElement;
    const element = document.createElement(item.nodeName.toLowerCase());
    // _addClass(element, "ui-sortable-placeholder", item.className): the
    // placeholder's class first, then the item's.
    const classes = ["ui-sortable-placeholder", ...(item.className.match(/\S+/g) || [])];
    element.classList.add(...classes);
    element.classList.remove("ui-sortable-helper");
    css(element, "visibility", "hidden");
    this.placeholder = element;
    item.after(element);
    // placeholder.update
    if (!height(element))
      setHeight(
        element,
        innerSize(item, false) -
          parseInt(computed(item, "padding-top") || "0", 10) -
          parseInt(computed(item, "padding-bottom") || "0", 10),
      );
    if (!width(element))
      setWidth(
        element,
        innerSize(item, true) -
          parseInt(computed(item, "padding-left") || "0", 10) -
          parseInt(computed(item, "padding-right") || "0", 10),
      );
  }

  private _setContainment(): void {
    const box = this.options.containment as HTMLElement;
    const position = offset(box);
    const scrolls = "hidden" !== computed(box, "overflow");
    this.containment = [
      position.left +
        cssInt(box, "border-left-width") +
        cssInt(box, "padding-left") -
        this.margins.left,
      position.top +
        cssInt(box, "border-top-width") +
        cssInt(box, "padding-top") -
        this.margins.top,
      position.left +
        (scrolls ? Math.max(box.scrollWidth, box.offsetWidth) : box.offsetWidth) -
        cssInt(box, "border-left-width") -
        cssInt(box, "padding-right") -
        this.helperProportions.width -
        this.margins.left,
      position.top +
        (scrolls ? Math.max(box.scrollHeight, box.offsetHeight) : box.offsetHeight) -
        cssInt(box, "border-top-width") -
        cssInt(box, "padding-bottom") -
        this.helperProportions.height -
        this.margins.top,
    ];
  }

  /** The element positions are relative to (scrollParent or offsetParent). */
  private _positionBase(): Scroller {
    const scroller = this.scrollParentValue as Scroller;
    return "absolute" !== this.cssPosition ||
      (!isDocument(scroller) &&
        scroller !== this.offsetParent &&
        scroller.contains(this.offsetParent))
      ? scroller
      : (this.offsetParent as HTMLElement);
  }

  private _convertPositionTo(position: Point): Point {
    const base = this._positionBase();
    const root = /(html|body)/i.test(tagNameOf(base));
    const offsets = this.offsetValue;
    return {
      top:
        position.top +
        offsets.relative.top * 1 +
        offsets.parent.top * 1 -
        (root ? 0 : scrollOf(base, true)) * 1,
      left:
        position.left +
        offsets.relative.left * 1 +
        offsets.parent.left * 1 -
        (root ? 0 : scrollOf(base, false)) * 1,
    };
  }

  private _generatePosition(event: MouseEvent): Point {
    let pageX = event.pageX;
    let pageY = event.pageY;
    const base = this._positionBase();
    const root = /(html|body)/i.test(tagNameOf(base));
    const click = this.offsetValue.click;
    if (this.originalPosition && this.containment) {
      const containment = this.containment;
      if (event.pageX - click.left < containment[0]) pageX = containment[0] + click.left;
      if (event.pageY - click.top < containment[1]) pageY = containment[1] + click.top;
      if (event.pageX - click.left > containment[2]) pageX = containment[2] + click.left;
      if (event.pageY - click.top > containment[3]) pageY = containment[3] + click.top;
    }
    return {
      top:
        pageY -
        click.top -
        this.offsetValue.relative.top -
        this.offsetValue.parent.top +
        (root ? 0 : scrollOf(base, true)),
      left:
        pageX -
        click.left -
        this.offsetValue.relative.left -
        this.offsetValue.parent.left +
        (root ? 0 : scrollOf(base, false)),
    };
  }

  private _scroll(event: MouseEvent): void {
    const scroller = this.scrollParentValue as Scroller;
    if (!isDocument(scroller) && "HTML" !== scroller.tagName) {
      if (this.overflowOffset.top + scroller.offsetHeight - event.pageY < SCROLL_SENSITIVITY)
        scroller.scrollTop = scroller.scrollTop + SCROLL_SPEED;
      else if (event.pageY - this.overflowOffset.top < SCROLL_SENSITIVITY)
        scroller.scrollTop = scroller.scrollTop - SCROLL_SPEED;
      if (this.overflowOffset.left + scroller.offsetWidth - event.pageX < SCROLL_SENSITIVITY)
        scroller.scrollLeft = scroller.scrollLeft + SCROLL_SPEED;
      else if (event.pageX - this.overflowOffset.left < SCROLL_SENSITIVITY)
        scroller.scrollLeft = scroller.scrollLeft - SCROLL_SPEED;
      return;
    }
    // $(window).height() / width(): the root element's client size.
    const doc = this.element.ownerDocument;
    const root = doc.documentElement;
    const top = scrollOf(doc, true);
    const left = scrollOf(doc, false);
    if (event.pageY - top < SCROLL_SENSITIVITY) scrollDocument(doc, true, top - SCROLL_SPEED);
    else if (root.clientHeight - (event.pageY - top) < SCROLL_SENSITIVITY)
      scrollDocument(doc, true, top + SCROLL_SPEED);
    if (event.pageX - left < SCROLL_SENSITIVITY) scrollDocument(doc, false, left - SCROLL_SPEED);
    else if (root.clientWidth - (event.pageX - left) < SCROLL_SENSITIVITY)
      scrollDocument(doc, false, left + SCROLL_SPEED);
  }

  private _mouseDrag(event: MouseEvent): void {
    const helper = this.helper as HTMLElement;
    const item = this.currentItem as HTMLElement;
    const placeholder = this.placeholder as HTMLElement;
    this.position = this._generatePosition(event);
    this.positionAbs = this._convertPositionTo(this.position);
    if (!this.lastPositionAbs) this.lastPositionAbs = this.positionAbs;
    this._scroll(event);
    this.positionAbs = this._convertPositionTo(this.position);
    // axis "x": only left moves.
    helper.style.setProperty("left", this.position.left + "px");
    for (let n = this.items.length - 1; n >= 0; n--) {
      const entry = this.items[n] as SortableItem;
      const element = entry.item;
      const intersection = this._intersectsWithPointer(entry);
      if (!intersection) continue;
      if (
        element === item ||
        (intersection === 1
          ? placeholder.nextElementSibling
          : placeholder.previousElementSibling) === element ||
        (placeholder !== element && placeholder.contains(element))
      )
        continue;
      this.direction = intersection === 1 ? "down" : "up";
      if (!this._intersectsWithSides(entry)) break;
      this._rearrange(entry);
      break;
    }
    // _contactContainers only triggered over/out, which nothing listened to.
    this.lastPositionAbs = this.positionAbs;
  }

  private _isOverAxis(x: number, reference: number, size: number): boolean {
    return x >= reference && x < reference + size;
  }

  private _getDragVerticalDirection(): "down" | "up" | false {
    const delta = this.positionAbs.top - (this.lastPositionAbs as Point).top;
    return 0 !== delta && (delta > 0 ? "down" : "up");
  }

  private _getDragHorizontalDirection(): "right" | "left" | false {
    const delta = this.positionAbs.left - (this.lastPositionAbs as Point).left;
    return 0 !== delta && (delta > 0 ? "right" : "left");
  }

  private _intersectsWithPointer(entry: SortableItem): false | 1 | 2 {
    // axis "x": the vertical test always passes.
    const horizontal = this._isOverAxis(
      this.positionAbs.left + this.offsetValue.click.left,
      entry.left,
      entry.width,
    );
    if (!horizontal) return false;
    const vertical = this._getDragVerticalDirection();
    const sideways = this._getDragHorizontalDirection();
    if (this.floating) return "right" === sideways || "down" === vertical ? 2 : 1;
    return vertical && ("down" === vertical ? 2 : 1);
  }

  private _intersectsWithSides(entry: SortableItem): boolean {
    const vertical = this._isOverAxis(
      this.positionAbs.top + this.offsetValue.click.top,
      entry.top + entry.height / 2,
      entry.height,
    );
    const horizontal = this._isOverAxis(
      this.positionAbs.left + this.offsetValue.click.left,
      entry.left + entry.width / 2,
      entry.width,
    );
    const verticalDirection = this._getDragVerticalDirection();
    const horizontalDirection = this._getDragHorizontalDirection();
    if (this.floating && horizontalDirection)
      return (
        ("right" === horizontalDirection && horizontal) ||
        ("left" === horizontalDirection && !horizontal)
      );
    return (
      !!verticalDirection &&
      (("down" === verticalDirection && vertical) || ("up" === verticalDirection && !vertical))
    );
  }

  private _rearrange(entry: SortableItem): void {
    const placeholder = this.placeholder as HTMLElement;
    (entry.item.parentNode as Node).insertBefore(
      placeholder,
      "down" === this.direction ? entry.item : entry.item.nextSibling,
    );
    this.counter = this.counter ? ++this.counter : 1;
    const counter = this.counter;
    // this._delay: a 0 ms timeout.
    setTimeout(() => {
      if (counter === this.counter) this.refreshPositions(true);
    }, 0);
  }

  private _mouseStop(event: MouseEvent): void {
    const placeholder = this.placeholder as HTMLElement;
    const position = offset(placeholder);
    const offsetParent = this.offsetParent as HTMLElement;
    const left =
      position.left -
      this.offsetValue.parent.left -
      this.margins.left +
      (offsetParent === offsetParent.ownerDocument.body ? 0 : offsetParent.scrollLeft);
    this.reverting = true;
    animateLeft(this.helper as HTMLElement, left, this.options.revert, () => this._clear(event));
  }

  private _clear(event: MouseEvent): void {
    this.reverting = false;
    const item = this.currentItem as HTMLElement;
    const placeholder = this.placeholder as HTMLElement;
    if (item.parentElement) placeholder.before(item);
    const stored = this.storedCSS as Record<string, string>;
    for (const name of Object.keys(stored))
      if ("auto" === stored[name] || "static" === stored[name]) stored[name] = "";
    for (const name of Object.keys(stored)) css(item, name, stored[name] as string);
    item.classList.remove("ui-sortable-helper");
    if (this.storedZIndex)
      css(
        this.helper as HTMLElement,
        "zIndex",
        "auto" === this.storedZIndex ? "" : this.storedZIndex,
      );
    this.dragging = false;
    this.options.beforeStop(event, this._uiHash());
    (placeholder.parentNode as Node).removeChild(placeholder);
    this.helper = null;
  }

  private _uiHash(): SortableUi {
    return { item: this.currentItem as HTMLElement, placeholder: this.placeholder };
  }
}

/** The tab list entries' behaviour that jQuery's clone(true) copied from the tabs. */
function cloneTab(tab: HTMLElement): HTMLElement {
  const copy = tab.cloneNode(true) as HTMLElement;
  const window = windowOfTab(tab);
  // The placeholder had no data and no handlers; the tabs had the
  // header's click (activate) and close handlers. Their contextmenu
  // handler was removed from the copies (.off("contextmenu")).
  if (!window) return copy;
  copy.addEventListener("click", () => {
    designer().getWindows().activateWindow(window, true);
  });
  for (const close of copy.querySelectorAll(":scope > .close"))
    close.addEventListener("click", (event) => {
      event.stopPropagation();
      designer().getWindows().removeWindow(window, undefined, undefined, true);
    });
  return copy;
}

/**
 * Makes the header's tabs sortable and adds the "more" button (the list
 * of every tab) to the header. The header calls it from init, right after
 * the tabs section.
 */
export function allowRearrangeTabs(header: HTMLElement): void {
  installMouseHandledReset();
  const containment = document.getElementById("header");
  for (const tabs of all(".tabs")) {
    if (sortables.has(tabs)) continue;
    sortables.set(
      tabs,
      new TabsSortable(tabs, {
        containment,
        revert: 150,
        activate(_event, ui) {
          ui.item.click();
          if (ui.placeholder) css(ui.placeholder, "height", "1px");
          const top = offset(ui.item).top;
          for (const child of childrenOf(all(".tabs")))
            if (!child.classList.contains("ui-sortable-placeholder") && offset(child).top > top)
              child.classList.add("hide");
        },
        beforeStop() {
          for (const child of childrenOf(all(".tabs"))) child.classList.remove("hide");
        },
      }),
    );
  }
  const mainframe = document.getElementById("mainframe");
  if (mainframe)
    mainframe.addEventListener("click", () => {
      const buttons = all(".more-button");
      if (buttons.some((button) => button.classList.contains("active")))
        for (const button of buttons) button.classList.remove("active");
    });
  const button = document.createElement("div");
  button.classList.add("more-button");
  const symbol = document.createElement("div");
  symbol.classList.add("more-symbol");
  button.append(symbol);
  const list = document.createElement("div");
  list.classList.add("moreTab");
  button.append(list);
  button.addEventListener("click", () => {
    const buttons = all(".more-button");
    const active = buttons.some((other) => other.classList.contains("active"));
    designer().stats("header_click_more-button", active ? "Close" : "Open");
    if (active) for (const other of buttons) other.classList.remove("active");
    else
      setTimeout(() => {
        for (const other of all(".more-button")) other.classList.add("active");
      }, 10);
    updateTabsInterface();
  });
  header.append(button);
}

/** Shows or hides the "more" button (with the tabs). */
export function toggleRearrangeTabsVisibility(header: HTMLElement, visible: boolean): void {
  for (const button of header.querySelectorAll<HTMLElement>(REARRANGE_TAB_SELECTOR))
    css(button, "display", visible ? "" : "none");
}

/**
 * Rebuilds the "more" list from the tabs, and when the tabs don't fit
 * into the windows section, moves the active tab in front of the first
 * one that doesn't fit (100 ms later) and marks it in the list.
 */
export function updateTabsInterface(): void {
  let total = 0;
  let overflow = 0;
  const lists = all(".moreTab");
  for (const list of lists) list.replaceChildren();
  // $(".moreTab").append($(".tabs").children().clone(true)).
  const tabs = childrenOf(all(".tabs"));
  for (const list of lists) for (const tab of tabs) list.append(cloneTab(tab));
  for (const entry of childrenOf(lists))
    for (const part of [...entry.children]) {
      const select = document.createElement("span");
      select.classList.add("select");
      part.prepend(select);
    }
  if (lists.length > 0) {
    // .css({ left, maxHeight }): one property at a time over the set.
    const values: [string, number][] = [
      ["left", -width(lists[0] as HTMLElement)],
      ["maxHeight", height(document.body) - 50],
    ];
    for (const [name, value] of values) for (const list of lists) css(list, name, value);
  }
  // Without the section, jQuery's outerWidth() was undefined and no
  // comparison held.
  const windows = document.querySelector<HTMLElement>(".section.windows");
  const available = windows ? outerWidth(windows) : NaN;
  childrenOf(all(".tabs")).forEach((tab, index) => {
    // The old loop skipped the rest once a tab index was found, except
    // when that index was 0 (falsy), and never stopped early.
    if (overflow) return;
    if ((total += outerWidth(tab) + 7.5) > available) overflow = index;
  });
  setTimeout(() => {
    // $(".tabs>div").index($(".tab.g-active")): -1 without an active tab,
    // and .eq(-1) is the last entry of the list.
    const activeIndex = (): number => {
      const active = document.querySelector<HTMLElement>(".tab.g-active");
      return active ? all(".tabs > div").indexOf(active) : -1;
    };
    if (overflow && activeIndex() >= overflow) {
      const containers = all(".tabs");
      let moved: Element | null = null;
      for (const tabs of containers) if (!moved) moved = tabs.querySelector(".tab.g-active");
      const before = childrenOf(containers)[overflow - 1];
      if (moved && before) before.before(moved);
    }
    const entry = eq(childrenOf(all(".moreTab")), activeIndex());
    if (entry)
      for (const part of entry.children)
        for (const select of part.children)
          if (select.classList.contains("select")) select.classList.add("more-tab-icon");
  }, 100);
}
