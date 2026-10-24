/**
 * Webpack Module #278
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(20);
    var o = n(29),
      i = n(79),
      a = n(306),
      r = n(21),
      s = n(43),
      l = n(100),
      c = s("species"),
      d = RegExp.prototype;
    e.exports = function (e, t, n, u) {
      var p = s(e),
        g = !r(function () {
          var t = {};
          return (
            (t[p] = function () {
              return 7;
            }),
            7 !== ""[e](t)
          );
        }),
        h =
          g &&
          !r(function () {
            var t = !1,
              n = /a/;
            return (
              "split" === e &&
                (((n = {}).constructor = {}),
                (n.constructor[c] = function () {
                  return n;
                }),
                (n.flags = ""),
                (n[p] = /./[p])),
              (n.exec = function () {
                return (t = !0), null;
              }),
              n[p](""),
              !t
            );
          });
      if (!g || !h || n) {
        var f = /./[p],
          m = t(p, ""[e], function (e, t, n, i, r) {
            var s = t.exec;
            return s === a || s === d.exec
              ? g && !r
                ? { done: !0, value: o(f, t, n, i) }
                : { done: !0, value: o(e, n, t, i) }
              : { done: !1 };
          });
        i(String.prototype, e, m[0]), i(d, p, m[1]);
      }
      u && l(d[p], "sham", !0);
    };
  }