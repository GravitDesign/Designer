// Old: designer.browser.dev.js module 442 (page clip and export constants).
/**
 * The page setting "cce" (clip content): 2 clips, 1 doesn't, unset
 * follows PAGE_CLIP_DEFAULT (FMT-EXPORT-042). "__export" holds an
 * element's export rows, "mve" the multi-page view flag.
 */
export const PageClip = {
  PAGE_CLIP_CONTENT_ENABLED: 2,
  PAGE_CLIP_CONTENT_DISABLED: 1,
  PAGE_CLIP_PROPERTY_NAME: "cce",
  EXPORT_PROPERTY_NAME: "__export",
  MULTIPAGE_VIEW_ENABLED: "mve",
  /** Property names copy and paste leave out; none in the old app. */
  PropertiesToExcludeFromCopying: null as string[] | null,
  /**
   * The CDR origin property (Corel integration, dropped). The old module
   * never defined it, so GDocument.hasCDR was always false.
   */
  CDR_ORIGIN_PROPERTY_NAME: undefined as string | undefined,
};
