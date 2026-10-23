// Old: designer.browser.dev.js module 1590.
/**
 * Touch handling for a single widget: only taps, delivered at once (no
 * delayed touch start), with every cancelable event cancelled.
 */
import { TapGesture } from "./tap-gesture.ts";
import { TouchTarget } from "./touch-target.ts";

export class SimpleTouchTarget extends TouchTarget {
  constructor(target?: EventTarget | null) {
    super(target);
    this.addGesture(new TapGesture());
    this.setDelayedTouchEventsEnabled(false);
  }

  override _handleEvent(event: TouchEvent): void {
    if (event.cancelable) event.preventDefault();
    super._handleEvent(event);
  }
}
