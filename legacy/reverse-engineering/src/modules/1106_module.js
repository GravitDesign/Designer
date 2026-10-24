/**
 * Webpack Module #1106
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(25),
      i = n(23),
      a = n(27),
      r = n(277),
      s = n(79),
      l = n(558),
      c = n(121),
      d = n(146),
      u = n(35),
      p = n(194),
      g = n(46),
      h = n(21),
      f = n(343),
      m = n(137),
      y = n(288);
    e.exports = function (e, t, n) {
      var v = -1 !== e.indexOf("Map"),
        _ = -1 !== e.indexOf("Weak"),
        b = v ? "set" : "add",
        w = i[e],
        C = w && w.prototype,
        x = w,
        S = {},
        E = function (e) {
          var t = a(C[e]);
          s(
            C,
            e,
            "add" === e
              ? function (e) {
                  return t(this, 0 === e ? 0 : e), this;
                }
              : "delete" === e
              ? function (e) {
                  return !(_ && !g(e)) && t(this, 0 === e ? 0 : e);
                }
              : "get" === e
              ? function (e) {
                  return _ && !g(e) ? void 0 : t(this, 0 === e ? 0 : e);
                }
              : "has" === e
              ? function (e) {
                  return !(_ && !g(e)) && t(this, 0 === e ? 0 : e);
                }
              : function (e, n) {
                  return t(this, 0 === e ? 0 : e, n), this;
                }
          );
        };
      if (
        r(
          e,
          !u(w) ||
            !(
              _ ||
              (C.forEach &&
                !h(function () {
                  new w().entries().next();
                }))
            )
        )
      )
        (x = n.getConstructor(t, e, v, b)), l.enable();
      else if (r(e, !0)) {
        var A = new x(),
          T = A[b](_ ? {} : -0, 1) !== A,
          G = h(function () {
            A.has(1);
          }),
          P = f(function (e) {
            new w(e);
          }),
          D =
            !_ &&
            h(function () {
              for (var e = new w(), t = 5; t--; ) e[b](t, t);
              return !e.has(-0);
            });
        P ||
          (((x = t(function (e, t) {
            d(e, C);
            var n = y(new w(), e, x);
            return p(t) || c(t, n[b], { that: n, AS_ENTRIES: v }), n;
          })).prototype = C),
          (C.constructor = x)),
          (G || D) && (E("delete"), E("has"), v && E("get")),
          (D || T) && E(b),
          _ && C.clear && delete C.clear;
      }
      return (
        (S[e] = x),
        o({ global: !0, constructor: !0, forced: x !== w }, S),
        m(x, e),
        _ || n.setStrong(x, e, v),
        x
      );
    };
  }