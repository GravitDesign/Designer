/**
 * Webpack Module #1469
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    Object.defineProperty(t, "__esModule", { value: !0 }), (t.getOS = void 0);
    var o = n(1);
    t.getOS = () => {
      let e = null;
      switch (o.GSystem.operatingSystem) {
        case o.GSystem.OperatingSystem.Unix:
          e = "Unix";
          break;
        case o.GSystem.OperatingSystem.Windows:
          e = "Windows";
          break;
        case o.GSystem.OperatingSystem.OSX_IOS:
          e = "OSX";
      }
      return e;
    };
  }