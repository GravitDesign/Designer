/**
 * Webpack Module #1173
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(16),
      i = n(15),
      a = o(n(85));
    class r {
      static isSupported() {
        return (
          r.isRuntimeSupported() &&
          r.isWebBrowserSupported() &&
          r.isPWAEventSupported()
        );
      }
      static isRuntimeSupported() {
        return gContainer.getRuntime() === a.default.Runtime.Browser;
      }
      static isWebBrowserSupported() {
        return (
          i.GPlatform.webBrowser ===
            i.GPlatform.constructor.WebBrowser.Chrome ||
          i.GPlatform.webBrowser === i.GPlatform.constructor.WebBrowser.Edge
        );
      }
      static isPWAEventSupported() {
        return void 0 !== window.BeforeInstallPromptEvent;
      }
    }
    e.exports = r;
  }