/**
 * Webpack Module #1546
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    Object.defineProperty(t, "__esModule", { value: !0 }),
      Object.defineProperty(t, "GFilesPanelViewBase", {
        enumerable: !0,
        get: function () {
          return a.default;
        },
      }),
      Object.defineProperty(t, "GFilesPanelViewNative", {
        enumerable: !0,
        get: function () {
          return i.default;
        },
      }),
      (t.default = void 0);
    var i = o(n(1547)),
      a = o(n(1300));
    t.default = {
      GFilesPanelViewNative: i.default,
      GFilesPanelViewBase: a.default,
    };
  }