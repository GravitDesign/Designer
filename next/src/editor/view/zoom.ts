/**
 * The zoom table. The old code wrote these numbers three times: the view's
 * limits (GSceneWidget.options minZoomFactor and maxZoomFactor, module
 * 363), the stops a wheel zoom lands on (GSceneWidget._zoomSteps) and the
 * levels the zoom tool and the View > Zoom In/Out actions step through
 * (GZoomTool.options.zoomLevels, module 755: the limits around the stops).
 * The view and the zoom tool take their copies from here.
 */

/** Smallest and largest zoom: 6% and 25600%. */
export const ZOOM_LIMITS = { min: 0.06, max: 256 } as const;

/** Zoom factors a wheel zoom stops at when it passes them. */
export const ZOOM_STOPS: number[] = [0.12, 0.25, 0.5, 0.66, 1, 1.5, 2, 3, 4, 8, 16, 32, 64, 128];

/** The zoom tool's levels: the limits around the stops (a new array per call). */
export function zoomLevels(): number[] {
  return [ZOOM_LIMITS.min, ...ZOOM_STOPS, ZOOM_LIMITS.max];
}
