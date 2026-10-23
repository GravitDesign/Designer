// Old: designer.browser.dev.js module 1492 (the cursor manager).
/** Remembers where the mouse last was on the page (paste at cursor, drops). */
import { Point } from "../../engine/math/point.ts";

export class MouseTracker {
  private _lastMousePoint: Point | null = null;

  init(): void {
    document.addEventListener(
      "mousemove",
      (event) => {
        this._lastMousePoint = new Point(event.pageX, event.pageY);
      },
      true,
    );
  }

  getLastCursorPoint(): Point | null {
    return this._lastMousePoint;
  }
}
