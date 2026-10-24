/**
 * Webpack Module #1487
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    e.exports = class {
      static getSetting() {
        return "show_welcome_screen";
      }
      static isEnabled() {
        const e = gDesigner.getSetting("show_welcome_screen");
        return "boolean" != typeof e || e;
      }
    };
  }