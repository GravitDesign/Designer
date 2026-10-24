// Old: designer.browser.dev.js module 1585.
/**
 * Two fingers on the view: moving them apart or together zooms around
 * their middle, moving them together at the same distance scrolls. While
 * the fingers are down the view renders in touch mode (quick render).
 *
 * The finger positions live in module variables, as in the old module, so
 * every instance shares them (there is one, in the editor touch target).
 */
import { GMath } from "../../engine/math/math.ts";
import { PaintCanvas } from "../../engine/paint/paint-canvas.ts";
import { SceneWidget } from "../view/scene-widget.ts";
import { Gesture } from "./gesture.ts";
import { GestureState } from "./gesture-state.ts";
import { TouchConfig } from "./touch-config.ts";
import { getTouchHost } from "./touch-host.ts";
import type { TouchEventInfo } from "./touch-event-info.ts";

/** Whether both fingers stayed within the move distance of where they came down. */
let fingersStill = false;
// Where the first and second finger came down (0 after an end).
let firstStartX = 0;
let firstStartY = 0;
let secondStartX = 0;
let secondStartY = 0;
// Where the first and second finger were at the last move (0 after an end).
let firstLastX = 0;
let firstLastY = 0;
let secondLastX = 0;
let secondLastY = 0;

/** Client pixels of finger distance change per zoom step of 1. */
const zoomDivisor = PaintCanvas.getScreenDPI() * SceneWidget.options.pinchToZoomFactor;
/** The scroll of a two-finger move is the sum of both fingers' moves divided by this. */
const scrollDivisor = 2 / PaintCanvas.getScreenDPI();

export class PinchGesture extends Gesture {
  _twoFingersState: GestureState | null = null;
  _moved = false;

  override canActivate(event: TouchEventInfo): boolean {
    return event.areThereTwoTouchPointsOnTheTarget();
  }

  override start(event: TouchEventInfo): void {
    const original = event.getOriginalEvent();
    const first = original.targetTouches[0] as Touch;
    firstStartX = firstLastX = first.clientX;
    firstStartY = firstLastY = first.clientY;
    fingersStill = event.areThereTwoTouchPointsOnTheTarget();
    const host = getTouchHost();
    const view = host ? host.getActiveView() : null;
    if (!view) return;
    const contextMenu = host ? host.getContextMenu() : null;
    if (contextMenu) contextMenu.close();
    this._twoFingersState = new GestureState();
    this._twoFingersState.update(original);
    const second = original.targetTouches[1] as Touch;
    secondStartX = secondLastX = second.clientX;
    secondStartY = secondLastY = second.clientY;
    view.startTouchMode();
    this._moved = false;
  }

  override move(event: TouchEventInfo): boolean {
    if (!this._twoFingersState) return false;
    const original = event.getOriginalEvent();
    this._twoFingersState.update(original);
    this._moved = true;
    if (original.cancelable) {
      original.preventDefault();
      original.stopPropagation();
    }
    const host = getTouchHost();
    const view = host ? host.getActiveView() : null;
    if (!view) return true;
    const first = original.targetTouches[0] as Touch;
    const second = original.targetTouches[1];
    if (!second) return true;
    const { clientX: firstX, clientY: firstY } = first;
    const { clientX: secondX, clientY: secondY } = second;
    const eps = TouchConfig.MIN_TWO_FINGERS_TOUCH_MOVE_DISTANCE;
    if (firstStartX) {
      fingersStill =
        GMath.isEqualEps(firstStartX, firstX, eps) &&
        GMath.isEqualEps(firstStartY, firstY, eps) &&
        GMath.isEqualEps(secondStartX, secondX, eps) &&
        GMath.isEqualEps(secondStartY, secondY, eps);
      if (!fingersStill) {
        const lastDistance = GMath.ptDist(firstLastX, firstLastY, secondLastX, secondLastY);
        const distance = GMath.ptDist(firstX, firstY, secondX, secondY);
        if (GMath.isEqualEps(lastDistance, distance, eps)) {
          const dx =
            ((0 == firstLastX ? 0 : firstX - firstLastX) +
              (0 == secondLastX ? 0 : secondX - secondLastX)) /
            scrollDivisor;
          const dy =
            ((0 == firstLastY ? 0 : firstY - firstLastY) +
              (0 == secondLastY ? 0 : secondY - secondLastY)) /
            scrollDivisor;
          view.scrollBy(-dx, -dy);
        } else {
          const change = distance - lastDistance;
          let zoom = view.getZoom() + change / zoomDivisor;
          // Only the page position counts: the touch's client position is
          // left at 0, as in the old code (its id was a uuid string, which
          // a Touch turns into 0). See "Pinch zoom centre from a touch without a
          // client position" in QUESTIONS.md.
          const middle = new Touch({
            identifier: 0,
            pageX: (first.pageX + second.pageX) / 2,
            pageY: (first.pageY + second.pageY) / 2,
            target: first.target,
          });
          zoom =
            zoom < SceneWidget.options.minZoomFactor ? SceneWidget.options.minZoomFactor : zoom;
          const point = view
            .getViewTransform()
            .mapPoint(
              view._convertClientPositionFromMousePosition(
                middle as unknown as globalThis.MouseEvent,
              ),
            );
          view.zoomAt(point, zoom);
        }
      }
    }
    firstLastX = firstX;
    firstLastY = firstY;
    secondLastX = secondX;
    secondLastY = secondY;
    return true;
  }

  override end(event: TouchEventInfo): boolean {
    if (this._twoFingersState) this._twoFingersState.update(event.getOriginalEvent());
    if (!this._twoFingersState || !this._twoFingersState.hasActiveIdentifiers()) {
      this._twoFingersState = null;
      const host = getTouchHost();
      const view = host ? host.getActiveView() : null;
      if (view) view.endTouchMode();
    }
    firstStartX = firstStartY = secondStartX = secondStartY = 0;
    firstLastX = firstLastY = secondLastX = secondLastY = 0;
    const moved = !!this._moved;
    this._moved = false;
    return moved;
  }
}
