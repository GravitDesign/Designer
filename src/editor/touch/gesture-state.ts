// Old: designer.browser.dev.js module 1189.
/**
 * What the gesture helper knows about the fingers between events: the
 * touches of the last event and whether the touch counts as a swipe.
 */
export class GestureState {
  _swiping = false;
  _touches: Touch[] | undefined;

  update(event: TouchEvent): void {
    this._touches = event.touches ? Array.from(event.touches) : [];
  }

  setSwiping(swiping: boolean): void {
    this._swiping = swiping;
  }

  isSwiping(): boolean {
    return this._swiping;
  }

  /** Whether `touch` (by identifier) was still down in the last event. */
  hasActiveIdentifier(touch: Touch): boolean {
    return !!this._touches && this._touches.some((t) => t.identifier === touch.identifier);
  }

  hasActiveIdentifiers(): boolean {
    return !!this._touches && this._touches.length > 0;
  }
}
