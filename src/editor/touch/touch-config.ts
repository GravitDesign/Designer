// Old: designer.browser.dev.js module 10 (the app config), the touch part.
/**
 * The touch timings and distances of the app config. The app config itself
 * (src/app/config.ts, app-config-document) isn't ported yet, and the
 * editor must not import the app anyway, so the touch layer keeps the
 * values it reads here; the app config can re-export them.
 */
export const TouchConfig = {
  /** Milliseconds a finger has to rest before a long press fires. */
  LONG_PRESS_TIME_OUT: 500,
  /** Client pixels a single finger must move before it counts as moved. */
  MIN_TOUCH_MOVE_DISTANCE: 20,
  /** Client pixels within which two fingers count as standing still. */
  MIN_TWO_FINGERS_TOUCH_MOVE_DISTANCE: 10,
};
