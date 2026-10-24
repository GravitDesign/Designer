/**
 * Webpack Module #201
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(23),
      i = n(186),
      a = n(35),
      r = n(277),
      s = n(299),
      l = n(43),
      c = n(407),
      d = n(74),
      u = n(213),
      p = i && i.prototype,
      g = l("species"),
      h = !1,
      f = a(o.PromiseRejectionEvent),
      m = r("Promise", function () {
        var e = s(i),
          t = e !== String(i);
        if (!t && 66 === u) return !0;
        if (d && (!p.catch || !p.finally)) return !0;
        if (!u || u < 51 || !/native code/.test(e)) {
          var n = new i(function (e) {
              e(1);
            }),
            o = function (e) {
              e(
                function () {},
                function () {}
              );
            };
          if (
            (((n.constructor = {})[g] = o),
            !(h = n.then(function () {}) instanceof o))
          )
            return !0;
        }
        return !(t || ("BROWSER" !== c && "DENO" !== c) || f);
      });
    e.exports = { CONSTRUCTOR: m, REJECTION_EVENT: f, SUBCLASSING: h };
  }