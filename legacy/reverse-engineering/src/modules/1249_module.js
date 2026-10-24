/**
 * Webpack Module #1249
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    Object.defineProperty(t, "__esModule", { value: !0 }), (t.default = void 0);
    var i = o(n(1493));
    class a extends i.default {
      constructor() {
        let e =
          arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};
        super(), (this._options = e);
      }
      getOptions() {
        return this._options;
      }
    }
    t.default = a;
  }