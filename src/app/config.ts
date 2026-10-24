// Old: designer.browser.dev.js module 10 (the browser build's app config).
/**
 * The app config: the base defaults (./file-formats.ts, module 519) with
 * the browser build's overrides. Only the local keys are ported; the
 * cloud, licence, purchase, sharing, review, Teams, Google and analytics
 * keys of the old module are dropped with those features.
 *
 * The touch timings are the editor's own constants (editor/touch/
 * touch-config.ts), since the editor must not import the app; the values
 * here are the same and a test keeps them in step.
 */
import { Platform, WebBrowser } from "../engine/core/platform.ts";
import { baseConfig } from "./file-formats.ts";

export const config = {
  ...baseConfig,
  /** Safari has no auto save. */
  AUTO_SAVE_ENABLED: Platform.webBrowser !== WebBrowser.Safari,
  DOMAIN: typeof window !== "undefined" ? window.location.host : null,
  HAS_ANNOTATIONS: true,
  ANNOTATION_PERMANENT_LINK: true,
  USE_EXTENSION_IN_FILENAME: false,
  /** Pages clip their content unless their "cce" setting says otherwise. */
  PAGE_CLIP_DEFAULT: true,
  LINKS: { ...baseConfig.LINKS, BLENDING_MODES_DOCUMENTATION_URL: "" },
};

export type AppConfig = typeof config;
