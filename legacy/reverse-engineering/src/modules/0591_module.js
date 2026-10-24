/**
 * Webpack Module #591
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    function o() {}
    n(30),
      Object.assign(o, {
        SETUP: { ENDPOINT: "SETUP_URL_ENDPOINT" },
        COMMAND_SAVE: {
          REQUEST: "SAVE_REQUEST",
          SUCCESS: "SAVE_SUCCESS",
          FAILED: "SAVE_FAILED",
        },
        COMMAND_SYNC_IMAGES: {
          REQUEST: "sync-images",
          SUCCESS: "dictionary-updated",
        },
        CODES: {
          AUTOSAVE_CLOUD_SYNCHRONIZM_NOT_AVAILABLE:
            "AUTOSAVE_CLOUD_SYNCHRONIZM_NOT_AVAILABLE",
          AUTOSAVE_LOCAL_FILES_WITHOUT_CID_NOT_AVAILABLE:
            "AUTOSAVE_LOCAL_FILES_WITHOUT_CID_NOT_AVAILABLE",
          AUTOSAVE_OFFLINE_NOT_AVAILABLE: "AUTOSAVE_OFFLINE_NOT_AVAILABLE",
          AUTOSAVE_ALREADY_SAVING: "AUTOSAVE_ALREADY_SAVING",
          AUTOSAVE_NOT_MODIFIED: "AUTOSAVE_NOT_MODIFIED",
          AUTOSAVE_FILE_CONFLICT: "AUTOSAVE_FILE_CONFLICT",
        },
      }),
      (e.exports = o);
  }