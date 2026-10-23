// Old: designer.browser.dev.js module 1693 (GLongPressEvent).
/**
 * A page-wide "long-press" DOM event: holding a finger (on a touch device;
 * else the mouse button) on an element for LONG_PRESS_TIME_OUT ms, or the
 * element's data-long-press-delay, dispatches a bubbling, cancelable
 * CustomEvent "long-press" on it with the position in `detail`. A release,
 * a wheel or scroll, or a move beyond MIN_TOUCH_MOVE_DISTANCE (any mouse
 * move) cancels it; a press whose mousedown or touchstart was already
 * cancelled doesn't start one.
 *
 * When nobody cancels the long-press event and the element's parent isn't
 * a scene widget, the next trusted touchend or mouseup is swallowed, so
 * the release doesn't also act as a tap.
 *
 * The old module created one and started it when it loaded; the app calls
 * startup() once here (startLongPressEvents).
 */
import { Event } from "../../engine/core/event.ts";
import { Platform, PlatformType, WebBrowser } from "../../engine/core/platform.ts";
import { TouchConfig } from "./touch-config.ts";

interface TimeoutHandle {
  value?: number;
}

type PressEvent = globalThis.MouseEvent | TouchEvent;

export class LongPressEvent extends Event {
  _startX = 0;
  _startY = 0;
  _timerHandle: TimeoutHandle | null = null;
  _mouseMove: string | null = null;
  _mouseUp: string | null = null;
  _mouseDown: string | null = null;
  _isTouchDevice = false;
  _event: PressEvent | null = null;
  _touching = false;

  _clearRequestTimeout(handle: TimeoutHandle | null): void {
    if (!handle) return;
    if (typeof window.cancelAnimationFrame === "function")
      window.cancelAnimationFrame(handle.value as number);
    else clearTimeout(handle.value);
  }

  /** A timeout counted in animation frames (it doesn't fire in a hidden tab). */
  _requestTimeout(callback: () => void, delay: number): TimeoutHandle {
    if (typeof window.requestAnimationFrame !== "function")
      return { value: window.setTimeout(callback, delay) };
    const start = new Date().getTime();
    const handle: TimeoutHandle = {};
    const loop = (): void => {
      if (new Date().getTime() - start >= delay) callback.call(undefined);
      else handle.value = window.requestAnimationFrame(loop);
    };
    handle.value = window.requestAnimationFrame(loop);
    return handle;
  }

  _clearLongPressTimer(): void {
    this._clearRequestTimeout(this._timerHandle);
    this._timerHandle = null;
  }

  _cancelEvent(event: globalThis.Event): void {
    event.stopImmediatePropagation();
    event.preventDefault();
    event.stopPropagation();
  }

  _mouseDownHandler(event: PressEvent): void {
    if (event.defaultPrevented) {
      this._clearLongPressTimer();
      return;
    }
    let { clientX, clientY } = event as Partial<globalThis.MouseEvent>;
    const touches = (event as Partial<TouchEvent>).changedTouches;
    if ("touchstart" === event.type && touches && touches[0]) ({ clientX, clientY } = touches[0]);
    this._startX = clientX as number;
    this._startY = clientY as number;
    this._startLongPressTimer(event);
  }

  _startLongPressTimer(event: PressEvent): void {
    this._clearLongPressTimer();
    this._event = event;
    const target = event.target as Element;
    const delay = parseInt(
      target.getAttribute("data-long-press-delay") || String(TouchConfig.LONG_PRESS_TIME_OUT),
      10,
    );
    this._timerHandle = this._requestTimeout(this._fireLongPressEvent.bind(this), delay);
  }

  _fireLongPressEvent(): void {
    this._clearLongPressTimer();
    const event = this._event as PressEvent;
    const target = event.target as Element;
    const clientX = this._isTouchDevice
      ? ((event as TouchEvent).touches[0] as Touch).clientX
      : (event as globalThis.MouseEvent).clientX;
    const clientY = this._isTouchDevice
      ? ((event as TouchEvent).touches[0] as Touch).clientY
      : (event as globalThis.MouseEvent).clientY;
    const notCancelled = target.dispatchEvent(
      new CustomEvent("long-press", {
        bubbles: true,
        cancelable: true,
        detail: { clientX, clientY },
      }),
    );
    // Only a string class name counts: the old code called indexOf on it,
    // which threw for an SVG parent (className is an SVGAnimatedString)
    // after the dispatch, so no release was swallowed there. See "Long
    // press inside an SVG doesn't swallow the release" in QUESTIONS.md.
    const parent = target.parentElement;
    const className: unknown = parent ? parent.className : undefined;
    const outsideScene =
      typeof className === "string" && !!className && -1 === className.indexOf("g-scene-widget");
    if (notCancelled && outsideScene) {
      const swallow = (release: globalThis.Event): void => {
        if (!release.isTrusted) return;
        document.removeEventListener("touchend", swallow, true);
        document.removeEventListener("mouseup", swallow, true);
        this._cancelEvent(release);
      };
      document.addEventListener("touchend", swallow, true);
      document.addEventListener("mouseup", swallow, true);
    }
  }

  startup(): void {
    this._isTouchDevice = PlatformType.isTouchDevice;
    this._mouseDown = this._isTouchDevice ? "touchstart" : "mousedown";
    this._mouseUp = this._isTouchDevice ? "touchend" : "mouseup";
    this._mouseMove = this._isTouchDevice ? "touchmove" : "mousemove";
    document.addEventListener(this._mouseUp, this._clearLongPressTimer.bind(this), true);
    document.addEventListener(
      this._mouseMove,
      this._mouseMoveHandler.bind(this) as (event: globalThis.Event) => void,
      true,
    );
    document.addEventListener("wheel", this._clearLongPressTimer.bind(this), true);
    document.addEventListener("scroll", this._clearLongPressTimer.bind(this), true);
    document.addEventListener(
      this._mouseDown,
      this._mouseDownHandler.bind(this) as (event: globalThis.Event) => void,
    );
    // Safari sends the compatibility mousedown of a tap after the touch;
    // it's stopped while a trusted touch is down.
    if (this._isTouchDevice && Platform.webBrowser === WebBrowser.Safari) {
      const options = { passive: true, capture: true };
      document.addEventListener("touchstart", this._documentTouchStart.bind(this), options);
      document.addEventListener("touchend", this.documentTouchEnd.bind(this), options);
      document.addEventListener("touchcancel", this.documentTouchEnd.bind(this), options);
      document.addEventListener("mousedown", this._documentMouseDown.bind(this), true);
    }
  }

  _documentTouchStart(event: globalThis.Event): void {
    if (event.isTrusted) this._touching = true;
  }

  documentTouchEnd(event: globalThis.Event): void {
    if (event.isTrusted) this._touching = false;
  }

  _documentMouseDown(event: globalThis.Event): void {
    if (event.isTrusted && this._touching && event.cancelable) event.stopImmediatePropagation();
  }

  _mouseMoveHandler(event: PressEvent): void {
    if ("touchmove" === event.type) {
      const { clientX, clientY } = (event as TouchEvent).changedTouches[0] as Touch;
      if (
        Math.abs(clientX - this._startX) < TouchConfig.MIN_TOUCH_MOVE_DISTANCE &&
        Math.abs(clientY - this._startY) < TouchConfig.MIN_TOUCH_MOVE_DISTANCE
      )
        return;
    }
    this._clearLongPressTimer();
  }

  override toString(): string {
    return "[Object GLongPressEvent]";
  }
}

let started: LongPressEvent | null = null;

/** The old module's `new GLongPressEvent().startup()`, once per page. */
export function startLongPressEvents(): LongPressEvent {
  if (!started) {
    started = new LongPressEvent();
    started.startup();
  }
  return started;
}
