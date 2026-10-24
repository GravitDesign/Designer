// Old: designer.browser.dev.js module 1488 (DragDropTouch, DataTransfer).
/**
 * The DragDropTouch polyfill: turns touches on elements with a true
 * `draggable` into the HTML5 drag events (dragstart, dragenter, drag,
 * dragover, dragleave, drop, dragend) the panels listen to. It follows a
 * finger with a half transparent copy of the dragged element.
 *
 * Two modes, picked per touch by the dragged element's data-drag-mode
 * (PressMode): DEFAULT starts the drag when the finger has moved more than
 * MIN_TOUCH_MOVE_DISTANCE and at most DRAG_MOVE_LIMIT pixels, at least
 * DRAG_MOVE_DELAY ms after it went down. PRESS_AND_HOLD waits
 * LONG_PRESS_TIME_OUT ms (moving more than 25 pixels earlier cancels),
 * then fires "draginit", marks the element with `g-draggable` (its parent
 * with `g-draggable-parent`) and starts the drag after a further move.
 *
 * The old module created the one instance when the bootstrap loaded it;
 * here the boot calls startDragDropTouch() at that point.
 */
import { config } from "../config.ts";
import { isPassiveSupported } from "../util/designer-util.ts";
import { designer } from "./globals.ts";
import { PressMode } from "./press-mode.ts";

interface Point {
  x: number;
  y: number;
}

/** The plain "Event" the polyfill dispatches, with the mouse and drag fields set by hand. */
interface SyntheticDragEvent extends Event {
  button: number;
  which: number;
  buttons: number;
  dataTransfer: DataTransfer;
  clientX: number;
  clientY: number;
  layerX: number;
  layerY: number;
}

/** The dataTransfer of the dispatched drag events (the browser's can't be constructed for them). */
export class DataTransfer {
  private _dropEffect = "move";
  private _effectAllowed = "all";
  // clearData() without a format sets it to null, as before.
  private _data: Record<string, string> | null = {};

  get dropEffect(): string {
    return this._dropEffect;
  }

  set dropEffect(value: string) {
    this._dropEffect = value;
  }

  get effectAllowed(): string {
    return this._effectAllowed;
  }

  set effectAllowed(value: string) {
    this._effectAllowed = value;
  }

  get types(): string[] {
    return Object.keys(this._data as Record<string, string>);
  }

  clearData(format?: string | null): void {
    if (null != format) Reflect.deleteProperty(this._data as Record<string, string>, format);
    else this._data = null;
  }

  getData(format: string): string {
    return (this._data as Record<string, string>)[format] || "";
  }

  setData(format: string, data: string): void {
    (this._data as Record<string, string>)[format] = data;
  }

  /** Sets the image of the running drag on the polyfill, not on this object. */
  setDragImage(image: HTMLElement, x: number, y: number): void {
    const instance = DragDropTouch._instance as DragDropTouch;
    instance._imgCustom = image;
    instance._imgOffset = { x, y };
  }
}

export class DragDropTouch {
  /** The one instance; set by startDragDropTouch(). */
  static _instance: DragDropTouch | null = null;
  static _OPACITY = 0.5;
  /** Whether the current touch drags in PressMode.PRESS_AND_HOLD (set on every touchstart). */
  static _ISPRESSHOLDMODE = false;
  static _PRESSHOLDAWAIT = config.LONG_PRESS_TIME_OUT;
  static _PRESSHOLDMARGIN = 25;
  static _PRESSHOLDTHRESHOLD = config.MIN_TOUCH_MOVE_DISTANCE;
  static DRAG_MOVE_THRESHOLD = config.MIN_TOUCH_MOVE_DISTANCE || 0;
  static DRAG_MOVE_LIMIT = 25;
  static DRAG_MOVE_DELAY = 100;
  static _rmvAtts = "draggable".split(",");
  static _CUSTOM_DRAGGING_ELEMENT_CLASS = "g-dragging-shadow-element";
  static _kbdProps = "altKey,ctrlKey,metaKey,shiftKey".split(",");
  static _ptProps = "pageX,pageY,clientX,clientY,screenX,screenY".split(",");

  static getInstance(): DragDropTouch | null {
    return DragDropTouch._instance;
  }

  /** A real finger is on the screen (trusted touchstart seen, no touchend yet). */
  private _touching = false;
  private _dragSource: HTMLElement | null = null;
  private _startTouchTime = 0;
  private _ptDown: Point | null = null;
  private _lastTouch: TouchEvent | null = null;
  private _lastTarget: Element | null = null;
  private _isDragEnabled = false;
  private _isDropZone = false;
  private _dataTransfer = new DataTransfer();
  private _pressHoldInterval: ReturnType<typeof setTimeout> | null = null;
  private _dragInitEvent: TouchEvent | null = null;
  private _img: HTMLElement | null = null;
  /** Set by DataTransfer.setDragImage. */
  _imgCustom: HTMLElement | null = null;
  /** Set by DataTransfer.setDragImage. */
  _imgOffset: Point = { x: 0, y: 0 };

  constructor() {
    if (DragDropTouch._instance) throw "DragDropTouch instance already created.";
    const passive = isPassiveSupported();
    if ("ontouchstart" in document || "undefined" != typeof TouchEvent) {
      this._documentTouchStart = this._documentTouchStart.bind(this);
      this._documentTouchEnd = this._documentTouchEnd.bind(this);
      this._documentDragStart = this._documentDragStart.bind(this);
      document.addEventListener(
        "touchstart",
        this._documentTouchStart as EventListener,
        !passive || { passive: true, capture: true },
      );
      document.addEventListener(
        "touchend",
        this._documentTouchEnd as EventListener,
        !passive || { passive: true, capture: true },
      );
      document.addEventListener(
        "touchcancel",
        this._documentTouchEnd as EventListener,
        !passive || { passive: true, capture: true },
      );
      document.addEventListener("dragstart", this._documentDragStart, true);
      const root = document;
      this._touchstart = this._touchstart.bind(this);
      this._touchmove = this._touchmove.bind(this);
      this._touchend = this._touchend.bind(this);
      const options = !!passive && { passive: false, capture: false };
      root.addEventListener("touchstart", this._touchstart as EventListener, options);
    }
  }

  private _documentTouchStart(event: TouchEvent): void {
    if (event.isTrusted) this._touching = true;
  }

  private _documentTouchEnd(event: TouchEvent): void {
    if (event.isTrusted) {
      this._touching = false;
      this._touchend(event);
    }
  }

  /** Cancels the browser's own drag while a finger is down; the polyfill does the drag. */
  private _documentDragStart(event: Event): void {
    if (event.isTrusted && this._touching && event.cancelable) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  private _touchstart(event: TouchEvent): void {
    if (this._shouldHandle(event)) {
      this._reset();
      const source = this._closestDraggable(event.target as HTMLElement | null);
      if (source) {
        DragDropTouch._ISPRESSHOLDMODE =
          parseInt(String(source.dataset.dragMode)) === PressMode.PRESS_AND_HOLD;
        this._dragSource = source;
        this._updateImageOffset(event);
        this._startTouchTime = new Date().getTime();
        this._ptDown = this._getPoint(event);
        this._lastTouch = event;
        this._dragSource.addEventListener("touchmove", this._touchmove as EventListener, true);
        this._dragSource.addEventListener("touchend", this._touchend as EventListener, true);
        this._dragSource.addEventListener("touchcancel", this._touchend as EventListener, true);
        if (DragDropTouch._ISPRESSHOLDMODE) {
          this._pressHoldInterval = setTimeout(() => {
            this._isDragEnabled = true;
            this._dragInitEvent = event;
            this._touchmove(event);
          }, DragDropTouch._PRESSHOLDAWAIT);
        }
      }
    }
  }

  private _touchmove(event: TouchEvent): void {
    if (this._shouldCancelPressHoldMove(event)) this._reset();
    else if (this._shouldHandleMove(event) || this._shouldHandlePressHoldMove(event)) {
      const target = this._getTarget(event);
      if (!this._img && this._dragSource) {
        if (event.cancelable) event.preventDefault();
        if (DragDropTouch._ISPRESSHOLDMODE) {
          this._dispatchEvent(this._dragInitEvent || event, "draginit", this._dragSource);
          this._dragSource.classList.add("g-draggable");
          if (this._dragSource.parentElement)
            this._dragSource.parentElement.classList.add("g-draggable-parent");
        }
      }
      if (!this._img && this._dragSource && this._shouldStartDragging(event)) {
        if (event.cancelable) event.preventDefault();
        this._dragSource.classList.remove("g-draggable");
        if (this._dragSource.parentElement)
          this._dragSource.parentElement.classList.remove("g-draggable-parent");
        if (!this._dispatchEvent(event, "dragstart", this._dragSource)) {
          this._createImage(event);
          this._dispatchEvent(event, "dragenter", target);
        }
      }
      if (this._img) {
        const contextMenu = designer().getContextMenu();
        if (contextMenu) contextMenu.close();
        this._lastTouch = event;
        if (event.cancelable) event.preventDefault();
        this._dispatchEvent(event, "drag", this._dragSource);
        if (target != this._lastTarget) {
          // dragenter on the new target before dragleave on the old one, as before.
          this._dispatchEvent(event, "dragenter", target);
          this._dispatchEvent(this._lastTouch, "dragleave", this._lastTarget);
          this._lastTarget = target;
        }
        this._moveImage(event);
        this._isDropZone = this._dispatchEvent(event, "dragover", target);
      }
    } else if (this._img) this._destroyImage();
  }

  private _touchend(event: TouchEvent): void {
    try {
      if (this._shouldHandle(event) && this._dragSource) {
        if ("touchcancel" !== event.type && this._isDropZone)
          this._dispatchEvent(this._lastTouch, "drop", this._lastTarget);
        this._dispatchEvent(this._lastTouch, "dragend", this._dragSource);
      }
    } finally {
      this._reset();
    }
  }

  private _shouldHandle(event: TouchEvent): boolean {
    if (event.touches && 1 === event.touches.length) {
      const target = (event.touches[0] && event.touches[0].target) as HTMLElement | null;
      if (target && target.hasAttribute("draggable") && !target.draggable) return false;
    }
    return !!(event && !event.defaultPrevented && event.touches && event.touches.length < 2);
  }

  private _shouldHandleMove(event: TouchEvent): boolean {
    return !DragDropTouch._ISPRESSHOLDMODE && event.cancelable && this._shouldHandle(event);
  }

  private _shouldHandlePressHoldMove(event: TouchEvent): boolean {
    return !!(
      DragDropTouch._ISPRESSHOLDMODE &&
      this._isDragEnabled &&
      event &&
      event.touches &&
      event.touches.length
    );
  }

  private _shouldCancelPressHoldMove(event: TouchEvent): boolean {
    return (
      DragDropTouch._ISPRESSHOLDMODE &&
      !this._isDragEnabled &&
      this._getDelta(event) > DragDropTouch._PRESSHOLDMARGIN
    );
  }

  private _shouldStartDragging(event: TouchEvent): boolean {
    const delta = this._getDelta(event);
    return (
      (delta > DragDropTouch.DRAG_MOVE_THRESHOLD &&
        delta <= DragDropTouch.DRAG_MOVE_LIMIT &&
        new Date().getTime() - this._startTouchTime >= DragDropTouch.DRAG_MOVE_DELAY) ||
      (DragDropTouch._ISPRESSHOLDMODE && delta >= DragDropTouch._PRESSHOLDTHRESHOLD)
    );
  }

  private _reset(): void {
    this._destroyImage();
    if (this._dragSource) {
      this._dragSource.classList.remove("g-draggable");
      if (this._dragSource.parentElement)
        this._dragSource.parentElement.classList.remove("g-draggable-parent");
      // Added with capture true and removed without it, so these never
      // actually come off (kept from the old code).
      this._dragSource.removeEventListener("touchmove", this._touchmove as EventListener);
      this._dragSource.removeEventListener("touchend", this._touchend as EventListener);
      this._dragSource.removeEventListener("touchcancel", this._touchend as EventListener);
    }
    this._dragSource = null;
    this._startTouchTime = 0;
    this._lastTouch = null;
    this._lastTarget = null;
    this._ptDown = null;
    this._isDragEnabled = false;
    this._isDropZone = false;
    this._dataTransfer = new DataTransfer();
    if (this._pressHoldInterval) clearTimeout(this._pressHoldInterval);
  }

  private _getPoint(event: TouchEvent | Touch, page?: boolean): Point {
    let point = event as TouchEvent | Touch | undefined;
    if (point && (point as TouchEvent).touches) point = (point as TouchEvent).touches[0];
    const touch = point as Touch;
    return { x: page ? touch.pageX : touch.clientX, y: page ? touch.pageY : touch.clientY };
  }

  /** Manhattan distance from where the finger went down. */
  private _getDelta(event: TouchEvent): number {
    if (DragDropTouch._ISPRESSHOLDMODE && !this._ptDown) return 0;
    const point = this._getPoint(event);
    const down = this._ptDown as Point;
    return Math.abs(point.x - down.x) + Math.abs(point.y - down.y);
  }

  private _getTarget(event: TouchEvent): Element | null {
    const point = this._getPoint(event);
    let target = document.elementFromPoint(point.x, point.y);
    while (target && "none" == getComputedStyle(target).pointerEvents)
      target = target.parentElement;
    return target;
  }

  private _translate(element: HTMLElement, x: number, y: number): void {
    element.style.transform = "translate3d("
      .concat(String(x), "px, ")
      .concat(String(y), "px, 0px)");
  }

  private _createImage(event: TouchEvent): void {
    if (this._img) this._destroyImage();
    const source = (this._imgCustom || this._dragSource) as HTMLElement;
    this._img = source.cloneNode(true) as HTMLElement;
    this._copyStyle(source, this._img);
    if (DragDropTouch._ISPRESSHOLDMODE) this._img.classList.add("g-draggable-drag-image");
    this._img.style.left = this._img.style.top = "0px";
    this._translate(this._img, -9999, -9999);
    const style = this._img.style;
    style.position = "absolute";
    style.pointerEvents = "none";
    // The dashed name, as the old code set it.
    (style as unknown as Record<string, string>)["touch-action"] = "none";
    style.zIndex = "999999";
    if (!this._imgCustom) this._img.style.opacity = DragDropTouch._OPACITY.toString();
    this._moveImage(event);
    document.body.appendChild(this._img);
  }

  private _updateImageOffset(event: TouchEvent): void {
    const rect = (this._imgCustom || (this._dragSource as HTMLElement)).getBoundingClientRect();
    const point = this._getPoint(event);
    this._imgOffset = { x: point.x - rect.left, y: point.y - rect.top };
  }

  private _destroyImage(): void {
    if (this._img && this._img.parentElement) this._img.parentElement.removeChild(this._img);
    this._img = null;
    this._imgCustom = null;
  }

  private _moveImage(event: TouchEvent): void {
    if (this._img) {
      const point = this._getPoint(event);
      this._translate(this._img, point.x - this._imgOffset.x, point.y - this._imgOffset.y);
    }
  }

  private _copyProps(target: object, source: object, names: readonly string[]): void {
    for (let i = 0; i < names.length; i++) {
      const name = names[i] as string;
      (target as Record<string, unknown>)[name] = (source as Record<string, unknown>)[name];
    }
  }

  private _copyStyle(source: HTMLElement, copy: HTMLElement): void {
    DragDropTouch._rmvAtts.forEach((name) => {
      copy.removeAttribute(name);
    });
    copy.classList.add(DragDropTouch._CUSTOM_DRAGGING_ELEMENT_CLASS);
    if (source instanceof HTMLCanvasElement) {
      const canvas = source;
      const canvasCopy = copy as HTMLCanvasElement;
      canvasCopy.width = canvas.width;
      canvasCopy.height = canvas.height;
      (canvasCopy.getContext("2d") as CanvasRenderingContext2D).drawImage(canvas, 0, 0);
    }
    const computed = getComputedStyle(source);
    for (let i = 0; i < computed.length; i++) {
      const name = computed[i] as string;
      if (name.indexOf("transition") < 0)
        (copy.style as unknown as Record<string, string>)[name] = (
          computed as unknown as Record<string, string>
        )[name] as string;
    }
    copy.style.pointerEvents = "none";
    for (let i = 0; i < source.children.length; i++)
      this._copyStyle(source.children[i] as HTMLElement, copy.children[i] as HTMLElement);
  }

  /**
   * Dispatches a bubbling, cancelable plain Event of the given type with the
   * mouse fields of the touch. Returns whether a listener prevented it.
   */
  private _dispatchEvent(
    event: TouchEvent | null,
    type: string,
    target: EventTarget | null,
  ): boolean {
    try {
      if (event && target) {
        const dragEvent = document.createEvent("Event") as SyntheticDragEvent;
        const touch = event.touches ? event.touches[0] : event;
        dragEvent.initEvent(type, true, true);
        dragEvent.button = 0;
        dragEvent.which = dragEvent.buttons = 1;
        this._copyProps(dragEvent, event, DragDropTouch._kbdProps);
        this._copyProps(dragEvent, touch as object, DragDropTouch._ptProps);
        dragEvent.dataTransfer = this._dataTransfer;
        if (!dragEvent.layerX && !dragEvent.layerY) {
          const rect = (target as Element).getBoundingClientRect();
          const layerX = dragEvent.clientX - rect.left;
          const layerY = dragEvent.clientY - rect.top;
          dragEvent.layerX = layerX;
          dragEvent.layerY = layerY;
        }
        const notCancelled = target.dispatchEvent(dragEvent);
        return dragEvent.defaultPrevented || false === notCancelled;
      }
    } catch (error) {
      console.warn("DragDropTouch dispatch event error", error);
    }
    return false;
  }

  private _closestDraggable(element: HTMLElement | null): HTMLElement | null {
    for (; element; element = element.parentElement)
      if (element.hasAttribute("draggable") && element.draggable) return element;
    return null;
  }
}

/**
 * Creates the one DragDropTouch (old: at load of module 1488, which the
 * bootstrap required right after module 803). Later calls return it.
 */
export function startDragDropTouch(): DragDropTouch {
  if (!DragDropTouch._instance) DragDropTouch._instance = new DragDropTouch();
  return DragDropTouch._instance;
}
