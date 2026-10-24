/**
 * Webpack Module #1338
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    class o {
      static get Events() {
        return {
          SETTING_CHANGED_EVENT: "SETTING_CHANGED_EVENT",
          USER_COMPLETED_PURCHASE_EVENT: "USER_COMPLETED_PURCHASE_EVENT",
        };
      }
      static isInitialized() {
        return "undefined" != typeof dataLayer;
      }
      static updateProperty(e, t) {
        o.isInitialized() && dataLayer.push({ [e]: t });
      }
      static fireEvent(e) {
        o.isInitialized() && dataLayer.push({ event: e });
      }
    }
    e.exports = o;
  }