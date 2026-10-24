/**
 * Webpack Module #1664
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(4), n(41);
    var o = n(10);
    class i {
      static getElements() {
        return i.isUnsplashIntegrationEnabled()
          ? o.ELEMENTS
          : o.ELEMENTS.filter((e) => "element.image" !== e.path);
      }
      static isUnsplashIntegrationEnabled() {
        return o.ENABLE_UNSPLASH_INTEGRATION;
      }
    }
    e.exports = i;
  }