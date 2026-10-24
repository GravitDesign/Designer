// Old: chunk.vendor.js module 207 (GSceneOptions).
/**
 * Global page layout switches of the multi-page canvas, set by the app.
 * A plain mutable object, as in the old code, so the editor and the
 * scene read the current values.
 */
export interface SceneOptionValues {
  /** Pages per row in the multi-page view; null: the scene's own setting. */
  pagesPerRow: number | null;
  /** Gap between pages; null: the scene's own setting. */
  pageGap: number | null;
  /** Labels scale with the zoom. */
  scaleLabel: boolean;
  /** Label scale when they don't scale with the zoom. */
  scaleLabelFactor: number;
  pagesCanOverlap: boolean;
  defaultBorderPositionForLines: boolean;
}

export const SceneOptions: SceneOptionValues = {
  pagesPerRow: null,
  pageGap: null,
  scaleLabel: true,
  scaleLabelFactor: 1,
  pagesCanOverlap: true,
  defaultBorderPositionForLines: false,
};
