// Old: designer.browser.dev.js module 1581.
/**
 * The touch handling of the whole page (GDesigner listens with it on the
 * document from the start): taps become mouse events, two fingers close
 * together are a two-finger tap (Nearby, 200 screen pixels), moves become
 * mousemoves, and a moved touch sends no click. Lifting a finger focuses
 * what it touched (blurring the focused element first), except an input
 * box the finger moved on. Touches on a select are left to the browser;
 * every other event is cancelled when it can be.
 *
 * Touches the editor touch target already cancelled on the view don't get
 * here (TouchTarget skips defaultPrevented events).
 */
import { PanGesture } from "./pan-gesture.ts";
import { TapGesture } from "./tap-gesture.ts";
import { TouchTarget } from "./touch-target.ts";

/**
 * jQuery's ":focus": the active element of a focused document that is
 * focusable (a type, a link or a tab index).
 */
function isFocused(target: EventTarget): boolean {
  const element = target as Partial<HTMLInputElement & HTMLAnchorElement>;
  return (
    target === document.activeElement &&
    (!document.hasFocus || document.hasFocus()) &&
    !!(element.type || element.href || ~(element.tabIndex as number))
  );
}

export class DocumentTouchTarget extends TouchTarget {
  /**
   * Whether `element` is an input box (the old code asked jQuery for its
   * "ginputbox" data). The app's input box sets this; until it exists
   * nothing is one.
   */
  static isInputBox: (element: EventTarget) => boolean = () => false;

  constructor(target?: EventTarget | null) {
    super(target);
    this.addGesture(
      new TapGesture({
        doubleTapDetection: TapGesture.DetectionMode.Nearby,
        doubleTapThreshold: 200,
      }),
    );
    this.addGesture(new PanGesture());
    this.setClickSuppressionEnabled(true);
  }

  override _touchEnd(event: TouchEvent): void {
    const touch = event.changedTouches[0];
    if (
      touch &&
      !(DocumentTouchTarget.isInputBox(touch.target) && this._touchmoved) &&
      !isFocused(touch.target)
    ) {
      const active = document.activeElement as HTMLElement | null;
      if (active && active !== touch.target && typeof active.blur === "function") active.blur();
      const target = touch.target as Partial<HTMLElement>;
      if (typeof target.focus === "function") target.focus();
    }
    super._touchEnd(event);
  }

  override _handleEvent(event: TouchEvent): void {
    const touch = event.changedTouches && event.changedTouches[0];
    if (touch && (touch.target as Element).tagName === "SELECT") return;
    try {
      super._handleEvent(event);
    } finally {
      if (event.cancelable) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
  }
}
