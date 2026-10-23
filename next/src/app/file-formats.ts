// Old: designer.browser.dev.js module 519 (the base app config).
/**
 * The defaults of the app config, before the browser build's overrides in
 * ./config.ts. Only the local keys are kept. Dropped with the cloud,
 * licence, analytics and Corel integration: the purchase, licence,
 * subscription, login, sharing, collaboration, notification, cloud
 * dialog, cloud URL and websocket keys, the Google API and picker, the
 * CDR web engines, FOLDER_FORMAT and the cloud file thumbnail. The
 * analytics helper stays as a no-op, because other modules call it.
 */

/** One native file format: the extension, its MIME type, the default flag. */
export interface FileFormat {
  ext: string;
  type: string;
  default?: boolean;
  /** Secondary formats (Corel cdrapp and des); none in this build. */
  secondary?: boolean;
}

/** The native file formats (FMT-GVD-001). */
const FILE_FORMATS: readonly FileFormat[] = [
  { ext: "gvdesign", type: "application/gravit+design", default: true },
];

/** The analytics helper the old base config stubbed out; it stays a no-op. */
const AmplitudeHelper = {
  logEvent(): void {},
  updateUserProperty(): void {},
  updateUserLicenseProperties(): void {},
};

export const baseConfig = {
  AmplitudeHelper,
  LOCAL_FONTS_API_ENABLED: true,
  TOUCH_LAYOUT: true,
  LISTS_FEATURE: true,
  DESIGNER: { TITLE: "Gravit Designer" },
  TRANSLATION_MANAGER: { CONSIDER_EXTENSION: undefined as boolean | undefined },
  AUTO_SAVE_ENABLED: true,
  AUTOSAVE_INTERVALS: [5, 10, 20] as readonly number[],
  AUTOSAVE_INTERVAL_DEFAULT: 5,
  FILE_FORMATS,
  FILE_EXTENSIONS: FILE_FORMATS.map(({ ext }) => ext.toLowerCase()) as readonly string[],
  LINKS: { BLENDING_MODES_DOCUMENTATION_URL: null as string | null },
  HAS_SNAPZONES: true,
  HAS_ANNOTATIONS: false,
  USE_EXTENSION_IN_FILENAME: true,
  ALLOW_REARRANGE_TABS: true,
  SHOW_SIDEBAR_BADGE: true,
  IS_COREL: false,
  LONG_PRESS_TIME_OUT: 500,
  JPEG_EXPORT_QUALITY_DEFAULT: 92,
  VTREE_FREE_HEIGHT: 7,
  VTREE_FREE_HEIGHT_TOUCH: 15,
  UN_BELIVEVABLE_FEW_BYTES_TO_SAVE: 200,
  FILE_SIZE_TO_RAM_COEFFCIENT: 1.5,
  FILE_SIZE_TO_SAVING_RAM_COEFFCIENT: 5,
  MIN_JS_HEAP_SIZE: 104857600,
  JS_HEAP_SIZE_LIMIT_POYFILL: 4294705152,
  ELECTRON_NOJS_MAX_MEMORY: 1503238553.6,
  MIN_TOUCH_MOVE_DISTANCE: 20,
  MIN_TWO_FINGERS_TOUCH_MOVE_DISTANCE: 10,
  MIN_SUPPORTED_SCREEN_SIZE: 1024,
  ACTIVE_USAGE_IDLE_TIME: 3e4,
};

/** AmplitudeHelper.logEvent, the analytics call other modules make. Does nothing. */
export function logEvent(): void {
  AmplitudeHelper.logEvent();
}
