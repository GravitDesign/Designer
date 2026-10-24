// Old: chunk.vendor.js module 644 (GWidget).
/**
 * The base of the canvas views and the rulers: a div with a size and a
 * position, and the engine's input events (GMouseEvent, GKeyEvent) built
 * from the DOM events of that div. A widget listens to a DOM event only
 * while someone listens to the matching engine event. Drag events are
 * made up from Down, Move and Release. A mouse down captures Move,
 * Release and the key events on the document until the button is
 * released, so a drag keeps working outside the div.
 *
 * The old widget could record and replay its input through a
 * GInputRecorder (module 645, a developer hook). The recorder is dropped,
 * so the recorder branches of _updateAndTriggerInputEvent are gone.
 */
import { EventTargetMixin } from "../../engine/core/event-target.ts";
import type { Event, EventClass } from "../../engine/core/event.ts";
import { InputEvent } from "../../engine/core/input-event.ts";
import { KeyEvent } from "../../engine/core/key-event.ts";
import { Key } from "../../engine/core/key.ts";
import {
  MouseClickEvent,
  MouseDownEvent,
  MouseEvent,
  MouseReleaseEvent,
  MouseWheelEvent,
} from "../../engine/core/mouse-event.ts";
import { GObject, getTypeId, registerClass } from "../../engine/core/object.ts";
import { Point } from "../../engine/math/point.ts";
import { PaintCanvas } from "../../engine/paint/paint-canvas.ts";
import { Cursor } from "../cursor.ts";

/** The DOM methods a widget hands to the engine event it triggers. */
interface DomBoundEvent {
  preventDefault?: () => void;
  stopPropagation?: () => void;
  stopImmediatePropagation?: () => void;
}

/** An engine input event as the widget reuses it for every DOM event. */
export type WidgetInputEvent = InputEvent & DomBoundEvent;

interface InputEventCacheEntry {
  counter: number;
  event: WidgetInputEvent;
  domListener?: (event: globalThis.Event) => void;
}

type InputEventClass = EventClass<InputEvent> & (new () => InputEvent);

const ButtonsFlag = {
  Left: 1 << MouseEvent.BUTTON_LEFT,
  Middle: 1 << MouseEvent.BUTTON_MIDDLE,
  Right: 1 << MouseEvent.BUTTON_RIGHT,
};

/** The events a mouse down captures on the document. */
const CAPTURED_EVENTS: InputEventClass[] = [
  MouseEvent.Move,
  MouseEvent.Release,
  KeyEvent.Down,
  KeyEvent.Release,
  KeyEvent.Press,
];

export class Widget extends EventTargetMixin(GObject) {
  static {
    registerClass(this, "GWidget");
  }

  static ButtonsFlag = ButtonsFlag;

  _htmlElement: HTMLDivElement;
  /**
   * The focusable element over the widget that receives the input, made
   * by the scene views; the widget's own div otherwise.
   */
  declare _inputHtmlElement: HTMLDivElement | undefined;
  _inputEventCache: Record<number, InputEventCacheEntry> | null = null;
  _dragEventCounter = 0;
  _buttonsFlag = ButtonsFlag.Left | ButtonsFlag.Middle;
  _id: string | null = null;
  _parent: Widget | null = null;
  _x: number | undefined = 0;
  _y: number | undefined = 0;
  _width: number | undefined = 0;
  _height: number | undefined = 0;
  _cursor: string | null = null;
  declare _dragStartPosition: Point | undefined;
  declare _dragPreviousPosition: Point | undefined;
  declare _dragIsDragging: boolean | undefined;
  declare _savedDocumentListeners: Record<string, (event: globalThis.Event) => void> | undefined;

  constructor(container?: HTMLElement | null) {
    super();
    this._htmlElement = this._createHTMLElement();
    if (null != container) container.appendChild(this._htmlElement);
  }

  getX(): number | undefined {
    return this._x;
  }

  getY(): number | undefined {
    return this._y;
  }

  /** The laid-out width, or the width set with resize while not laid out. */
  getWidth(): number {
    return this._htmlElement.offsetWidth ? this._htmlElement.offsetWidth : (this._width as number);
  }

  getHeight(): number {
    return this._htmlElement.offsetHeight
      ? this._htmlElement.offsetHeight
      : (this._height as number);
  }

  /** Lets the right button start drags too. */
  setRightDrag(rightDrag: boolean): void {
    if (rightDrag) this.setButtonFlag(ButtonsFlag.Right);
    else this.removeButtonFlag(ButtonsFlag.Right);
  }

  setButtonFlag(flag: number): void {
    this._buttonsFlag = this._buttonsFlag | flag;
  }

  removeButtonFlag(flag: number): void {
    this._buttonsFlag = this._buttonsFlag & ~flag;
  }

  hasButtonFlag(flag: number): boolean {
    return 0 != (this._buttonsFlag & flag);
  }

  /** Positions the div absolutely; a non-number clears that side. */
  move(x?: number, y?: number): void {
    this._htmlElement.style.left = "number" == typeof x ? x.toString() + "px" : "";
    this._htmlElement.style.top = "number" == typeof y ? y.toString() + "px" : "";
    this._htmlElement.style.position =
      "number" == typeof x || "number" == typeof y ? "absolute" : "";
    this._x = x;
    this._y = y;
  }

  /** Sets the CSS size; 0 or a missing value clears it. */
  resize(width?: number, height?: number): void {
    this._htmlElement.style.width = width ? width.toString() + "px" : "";
    this._htmlElement.style.height = height ? height.toString() + "px" : "";
    this._htmlElement.style.overflowX = width ? "hidden" : "";
    this._htmlElement.style.overflowY = height ? "hidden" : "";
    this._width = width;
    this._height = height;
  }

  getCursor(): string | null {
    return this._cursor;
  }

  /** Shows the cursor through its `g-cursor-<name>` class. */
  setCursor(cursor: string | null): void {
    if (this._cursor != cursor) {
      if (this._cursor) this._removeCSSClass("g-cursor-" + this._cursor);
      this._cursor = cursor;
      if (this._cursor) {
        Cursor.initStyle();
        this._addCSSClass("g-cursor-" + this._cursor);
      }
    }
  }

  hasFocus(): boolean {
    let focused = false;
    try {
      if (
        (this._inputHtmlElement && document.activeElement === this._inputHtmlElement) ||
        document.activeElement === this._htmlElement
      )
        focused = true;
    } catch {
      // The old code ignored errors from document.activeElement.
    }
    return focused;
  }

  isEnabled(): boolean {
    return (
      null == this._htmlElement.className || this._htmlElement.className.indexOf("g-disabled") < 0
    );
  }

  setEnabled(enabled: boolean): void {
    if (enabled != this.isEnabled()) {
      if (enabled) this._removeCSSClass("g-disabled");
      else this._addCSSClass("g-disabled");
    }
  }

  isDisplayed(): boolean {
    return "none" != this._htmlElement.style.display;
  }

  setDisplayed(displayed: boolean): void {
    this._htmlElement.style.display = displayed ? "" : "none";
  }

  /** Triggers `event`, feeding Down, Move and Release into the drag tracking. */
  override trigger(event: Event): void {
    if (event.isImmediatePropagationStopped) delete event.isImmediatePropagationStopped;
    if (this._dragEventCounter > 0 && event instanceof MouseEvent.Release)
      this._dragMouseRelease(event);
    super.trigger(event);
    if (this._dragEventCounter > 0) {
      if (event instanceof MouseEvent.Down) this._dragMouseDown(event);
      else if (event instanceof MouseEvent.Move && this._dragStartPosition)
        this._dragMouseMove(event);
    }
  }

  override addEventListener(
    eventClass: EventClass | number,
    listener: (...params: never[]) => void,
    target?: object | null,
    args?: readonly unknown[] | null,
    prepend?: boolean,
  ): void {
    super.addEventListener(eventClass, listener, target, args, prepend);
    if (isInputEventClass(eventClass)) {
      this._registerInputEventListener(eventClass);
      if (MouseEvent.isDragEvent(eventClass)) {
        if (0 == this._dragEventCounter) {
          this._registerInputEventListener(MouseEvent.Down);
          this._registerInputEventListener(MouseEvent.Move);
          this._registerInputEventListener(MouseEvent.Release);
        }
        this._dragEventCounter++;
      }
    }
  }

  override removeEventListener(
    eventClass: EventClass | number,
    listener: unknown,
    target?: object | null,
  ): boolean {
    const removed = super.removeEventListener(eventClass, listener, target);
    if (removed && isInputEventClass(eventClass)) {
      this._unregisterInputEventListener(eventClass);
      if (MouseEvent.isDragEvent(eventClass) && 0 == --this._dragEventCounter) {
        this._unregisterInputEventListener(MouseEvent.Down);
        this._unregisterInputEventListener(MouseEvent.Move);
        this._unregisterInputEventListener(MouseEvent.Release);
      }
    }
    return removed;
  }

  /**
   * Focuses the first child with tabindex 0, else the input element when
   * it has one. Returns whether something got the focus.
   */
  focus(): boolean {
    if (this.isDisplayed()) {
      try {
        const children = this._htmlElement.children;
        for (let i = 0; i < children.length; i++) {
          const child = children[i] as HTMLElement;
          if ("0" === child.getAttribute("tabindex")) {
            child.focus();
            return true;
          }
        }
        if (this._inputHtmlElement && "0" === this._inputHtmlElement.getAttribute("tabindex")) {
          this._inputHtmlElement.focus();
          return true;
        }
      } catch {
        return false;
      }
    }
    return false;
  }

  /** The DOM event's position relative to the widget, in device pixels. */
  _convertClientPositionFromMousePosition(event: globalThis.MouseEvent): Point {
    let x: number | null = null;
    let y: number | null = null;
    let box: DOMRect;
    if (event.target == this._htmlElement) {
      if ("absolute" === this._htmlElement.style.position) {
        // offsetX is a getter on the prototype of native events, so this
        // only holds for objects that carry their own offsetX.
        if (Object.prototype.hasOwnProperty.call(event, "offsetX")) {
          x = event.offsetX;
          y = event.offsetY;
          if (this._inputHtmlElement) {
            box = this._htmlElement.getBoundingClientRect();
            x -= box.left;
            y -= box.top;
          }
        }
      } else {
        x = event.clientX;
        y = event.clientY;
        if (this._inputHtmlElement) {
          box = this._htmlElement.getBoundingClientRect();
          x -= box.left;
          y -= box.top;
        }
      }
    }
    if (null == x || null == y) {
      box = this._htmlElement.getBoundingClientRect();
      x = event.pageX - (box.left + window.pageXOffset - document.documentElement.clientLeft);
      y = event.pageY - (box.top + window.pageYOffset - document.documentElement.clientTop);
    }
    const dpi = PaintCanvas.getScreenDPI();
    return new Point(x * dpi, y * dpi);
  }

  _registerInputEventListener(eventClass: InputEventClass): void {
    const isDrag = MouseEvent.isDragEvent(eventClass);
    const typeId = getTypeId(eventClass) as number;
    if (this._inputEventCache && typeId in this._inputEventCache) {
      (this._inputEventCache[typeId] as InputEventCacheEntry).counter++;
    } else {
      if (!this._inputEventCache) this._inputEventCache = {};
      this._inputEventCache[typeId] = { counter: 1, event: new eventClass() };
      // Drag events have no DOM event of their own.
      if (!isDrag) this._startListeningInputEvent(eventClass);
    }
  }

  _unregisterInputEventListener(eventClass: InputEventClass): void {
    const isDrag = MouseEvent.isDragEvent(eventClass);
    const typeId = getTypeId(eventClass) as number;
    if (
      this._inputEventCache &&
      typeId in this._inputEventCache &&
      0 == --(this._inputEventCache[typeId] as InputEventCacheEntry).counter
    ) {
      if (!isDrag) this._stopListeningInputEvent(eventClass);
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- the cache is keyed by type id
      delete this._inputEventCache[typeId];
      if (0 == Object.keys(this._inputEventCache).length) this._inputEventCache = null;
    }
  }

  _startListeningInputEvent(eventClass: InputEventClass): void {
    const typeId = getTypeId(eventClass) as number;
    const listener = (event: globalThis.Event): void => {
      this._updateAndTriggerInputEvent(event, eventClass);
    };
    if (this._inputEventCache) {
      (this._inputEventCache[typeId] as InputEventCacheEntry).domListener = listener;
      const name = this._getDomEventNameForEventClass(eventClass);
      this._htmlElement.addEventListener(name, listener);
    }
  }

  _stopListeningInputEvent(eventClass: InputEventClass): void {
    const typeId = getTypeId(eventClass) as number;
    const name = this._getDomEventNameForEventClass(eventClass);
    if (this._inputEventCache) {
      const entry = this._inputEventCache[typeId] as InputEventCacheEntry;
      this._htmlElement.removeEventListener(
        name,
        entry.domListener as (event: globalThis.Event) => void,
      );
      delete entry.domListener;
    }
  }

  _dragMouseDown(event: MouseEvent): void {
    if (this.hasButtonFlag(1 << event.button)) {
      this._dragStartPosition = event.client;
      this._dragIsDragging = false;
    }
  }

  _dragMouseMove(event: MouseEvent): void {
    const cache = this._inputEventCache as Record<number, InputEventCacheEntry>;
    if (this._dragStartPosition && !this._dragIsDragging) {
      const start = this._dragStartPosition;
      if (
        (Math.abs(start.getX() - event.client.getX()) >= 1 ||
          Math.abs(start.getY() - event.client.getY()) >= 1) &&
        ((this._dragIsDragging = true),
        (this._dragPreviousPosition = this._dragStartPosition),
        this.hasEventListeners(MouseEvent.DragStart))
      ) {
        const dragStart = (cache[getTypeId(MouseEvent.DragStart) as number] as InputEventCacheEntry)
          .event as MouseEvent;
        this._dragAssignMouseEvent(event, dragStart);
        dragStart.client = this._dragStartPosition;
        this.trigger(dragStart);
      }
    }
    if (this._dragIsDragging && this.hasEventListeners(MouseEvent.Drag)) {
      const drag = (cache[getTypeId(MouseEvent.Drag) as number] as InputEventCacheEntry)
        .event as MouseEvent;
      this._dragAssignMouseEvent(event, drag);
      this._dragAssignDragEvent(drag, event);
      this.trigger(drag);
      this._dragPreviousPosition = event.client;
    }
  }

  _dragMouseRelease(event: MouseEvent): void {
    if (this.hasButtonFlag(1 << event.button)) {
      if (this._dragIsDragging && this.hasEventListeners(MouseEvent.DragEnd)) {
        const cache = this._inputEventCache as Record<number, InputEventCacheEntry>;
        const dragEnd = (cache[getTypeId(MouseEvent.DragEnd) as number] as InputEventCacheEntry)
          .event as MouseEvent;
        this._dragAssignMouseEvent(event, dragEnd);
        this._dragAssignDragEvent(dragEnd, event);
        this.trigger(dragEnd);
      }
      delete this._dragStartPosition;
      delete this._dragPreviousPosition;
      delete this._dragIsDragging;
    }
  }

  _dragAssignMouseEvent(source: MouseEvent, target: MouseEvent): void {
    target.client = source.client;
    target.button = source.button;
    if (target.isImmediatePropagationStopped) delete target.isImmediatePropagationStopped;
  }

  _dragAssignDragEvent(target: MouseEvent, source: MouseEvent): void {
    target.clientStart = this._dragStartPosition as Point;
    target.clientDelta = source.client.subtract(this._dragPreviousPosition as Point);
    if (target.isImmediatePropagationStopped) delete target.isImmediatePropagationStopped;
  }

  _setParent(parent: Widget | null): void {
    this._parent = parent;
  }

  /**
   * Hands the DOM event's preventDefault and stopPropagation to `event`
   * and triggers it. Down starts the capture, Release ends it, and a Move
   * reports the pressed button from `buttons`.
   */
  _triggerWidgetEventFromDom(domEvent: globalThis.Event, event: WidgetInputEvent): void {
    if (event instanceof MouseEvent.Down) this._setCapture();
    else if (event instanceof MouseEvent.Release) this._releaseCapture();
    else if (event instanceof MouseEvent.Move) {
      const mouse = domEvent as globalThis.MouseEvent;
      if (!(
        mouse.button === MouseEvent.BUTTON_LEFT &&
        (mouse.buttons === MouseEvent.BUTTONS_UNDEF || mouse.buttons & MouseEvent.BUTTONS_LEFT)
      )) {
        event.button =
          mouse.buttons & MouseEvent.BUTTONS_RIGHT
            ? MouseEvent.BUTTON_RIGHT
            : mouse.buttons & MouseEvent.BUTTONS_MIDDLE
              ? MouseEvent.BUTTON_MIDDLE
              : MouseEvent.BUTTON_LEFT;
      }
    }
    delete event.isImmediatePropagationStopped;
    event.preventDefault = domEvent.preventDefault.bind(domEvent);
    event.stopPropagation = domEvent.stopPropagation.bind(domEvent);
    event.stopImmediatePropagation = function (this: WidgetInputEvent): void {
      (this.stopPropagation as () => void)();
      this.isImmediatePropagationStopped = true;
    };
    this.trigger(event);
  }

  _updateAndTriggerInputEvent(domEvent: globalThis.Event, eventClass: InputEventClass): void {
    if (!this.isEnabled()) return;
    if ("keydown" === domEvent.type) {
      const key = domEvent as KeyboardEvent;
      switch (Key.translateCode(key.code) || Key.translateKey(key.which || key.keyCode)) {
        case Key.Constant.TAB:
          // Tab stays in the view instead of moving the focus.
          key.preventDefault();
      }
    } else if ("mousedown" === domEvent.type || "wheel" === domEvent.type) {
      domEvent.preventDefault();
    }
    if (Object.prototype.isPrototypeOf.call(MouseEvent.prototype, eventClass.prototype))
      this._updateAndTriggerMouseEvent(
        domEvent as globalThis.MouseEvent,
        getTypeId(eventClass) as number,
      );
    else if (Object.prototype.isPrototypeOf.call(KeyEvent.prototype, eventClass.prototype))
      this._updateAndTriggerKeyEvent(domEvent as KeyboardEvent, getTypeId(eventClass) as number);
  }

  _updateAndTriggerMouseEvent(domEvent: globalThis.MouseEvent, typeId: number): void {
    if (!this._inputEventCache) return;
    const entry = this._inputEventCache[typeId];
    if (!entry) return;
    const event = entry.event as MouseEvent & DomBoundEvent;
    event.client = this._convertClientPositionFromMousePosition(domEvent);
    event.button = domEvent.button;
    if (event instanceof MouseWheelEvent) {
      const wheel = domEvent as WheelEvent;
      event.deltaX = wheel.deltaX;
      event.deltaY = wheel.deltaY;
      event.zoom = wheel.ctrlKey;
    }
    if (
      event instanceof MouseClickEvent ||
      event instanceof MouseDownEvent ||
      event instanceof MouseReleaseEvent
    )
      event.clickCount = domEvent.detail;
    this._triggerWidgetEventFromDom(domEvent, event);
  }

  _updateAndTriggerKeyEvent(domEvent: KeyboardEvent, typeId: number): void {
    if (!this._inputEventCache) return;
    const entry = this._inputEventCache[typeId];
    if (!entry) return;
    const event = entry.event as KeyEvent;
    event.key =
      Key.translateCode(domEvent.code) ||
      Key.translateKey(domEvent.which || domEvent.keyCode, domEvent.location);
    event.timestamp = domEvent.timeStamp || -new Date().getTime();
    event.keyUTF = String.fromCodePoint(domEvent.charCode);
    this._triggerWidgetEventFromDom(domEvent, event as WidgetInputEvent);
  }

  _getDomEventNameForEventClass(eventClass: unknown): string {
    switch (eventClass) {
      case MouseEvent.Move:
        return "mousemove";
      case MouseEvent.Enter:
        return "mouseover";
      case MouseEvent.Leave:
        return "mouseout";
      case MouseEvent.Down:
        return "mousedown";
      case MouseEvent.Release:
        return "mouseup";
      case MouseEvent.Click:
        return "click";
      case MouseEvent.DblClick:
        return "dblclick";
      case KeyEvent.Down:
        return "keydown";
      case KeyEvent.Release:
        return "keyup";
      case KeyEvent.Press:
        return "keypress";
      case MouseEvent.Wheel:
        return "wheel";
    }
    throw new Error("Unknown DOMEvent name");
  }

  /**
   * Listens on the document (capture phase) for the captured events the
   * widget has listeners for, so they arrive while the mouse is outside.
   */
  _setCapture(): void {
    const capture = (eventClass: InputEventClass): void => {
      const name = this._getDomEventNameForEventClass(eventClass);
      if (!this._savedDocumentListeners) this._savedDocumentListeners = {};
      if (!this._savedDocumentListeners[name]) {
        const listener = (event: globalThis.Event): void => {
          if (event.target != this._htmlElement) {
            this._updateAndTriggerInputEvent(event, eventClass);
            event.stopImmediatePropagation();
          }
        };
        this._savedDocumentListeners[name] = listener;
        document.addEventListener(name, listener, true);
      }
    };
    for (let i = 0; i < CAPTURED_EVENTS.length; ++i) {
      const eventClass = CAPTURED_EVENTS[i] as InputEventClass;
      if (
        (this._inputEventCache as Record<number, InputEventCacheEntry>)[
          getTypeId(eventClass) as number
        ]
      )
        capture(eventClass);
    }
  }

  _releaseCapture(): void {
    if (this._savedDocumentListeners) {
      for (const name in this._savedDocumentListeners)
        document.removeEventListener(
          name,
          this._savedDocumentListeners[name] as (event: globalThis.Event) => void,
          true,
        );
      delete this._savedDocumentListeners;
    }
  }

  _addCSSClass(name: string): void {
    let className = this._htmlElement.className;
    if (className && 0 != className.trim().length) {
      let missing = true;
      const parts = className.trim().split(" ");
      for (let i = 0; i < parts.length; ++i) {
        if ((parts[i] as string).trim() == name) {
          missing = false;
          break;
        }
      }
      if (missing) className += " " + name;
    } else className = name;
    this._htmlElement.className = className;
  }

  _removeCSSClass(name: string): void {
    const className = this._htmlElement.className;
    if (className && className.indexOf(name) >= 0) {
      let kept = "";
      const parts = className.trim().split(" ");
      for (let i = 0; i < parts.length; ++i) {
        const part = (parts[i] as string).trim();
        if (part != name) {
          if (kept.length > 0) kept += " ";
          kept += part;
        }
      }
      this._htmlElement.className = kept;
    }
  }

  /** A div; `focusable` makes it the absolutely positioned input element. */
  _createHTMLElement(focusable?: boolean): HTMLDivElement {
    const element = document.createElement("div");
    if (focusable) {
      element.setAttribute("tabindex", "0");
      element.style.padding = "0px 0px";
      element.style.margin = "0px 0px";
      element.style.cursor = "inherit";
      element.style.position = "absolute";
    }
    return element;
  }

  override toString(): string {
    return "[Object GWidget]";
  }
}

function isInputEventClass(eventClass: unknown): eventClass is InputEventClass {
  return (
    "function" == typeof eventClass &&
    Object.prototype.isPrototypeOf.call(
      InputEvent.prototype,
      (eventClass as { prototype: object }).prototype,
    )
  );
}
