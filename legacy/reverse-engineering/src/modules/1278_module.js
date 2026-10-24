/**
 * Webpack Module #1278
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    class o {
      static getSetting() {
        return "scrubbing_flag";
      }
      static isEnabled() {
        return !!gDesigner.getSetting(o.getSetting(), !0);
      }
    }
    e.exports = o;
  }