/**
 * Webpack Module #527
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(23),
      i = n(49),
      a = n(120),
      r = n(307),
      s = n(21),
      l = o.RegExp,
      c = l.prototype;
    i &&
      s(function () {
        var e = !0;
        try {
          l(".", "d");
        } catch (t) {
          e = !1;
        }
        var t = {},
          n = "",
          o = e ? "dgimsy" : "gimsy",
          i = function (e, o) {
            Object.defineProperty(t, e, {
              get: function () {
                return (n += o), !0;
              },
            });
          },
          a = {
            dotAll: "s",
            global: "g",
            ignoreCase: "i",
            multiline: "m",
            sticky: "y",
          };
        for (var r in (e && (a.hasIndices = "d"), a)) i(r, a[r]);
        return (
          Object.getOwnPropertyDescriptor(c, "flags").get.call(t) !== o ||
          n !== o
        );
      }) &&
      a(c, "flags", { configurable: !0, get: r });
  }