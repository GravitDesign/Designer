/**
 * Webpack Module #558
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(25),
      i = n(27),
      a = n(259),
      r = n(46),
      s = n(61),
      l = n(88).f,
      c = n(243),
      d = n(1103),
      u = n(1104),
      p = n(258),
      g = n(786),
      h = !1,
      f = p("meta"),
      m = 0,
      y = function (e) {
        l(e, f, { value: { objectID: "O" + m++, weakData: {} } });
      },
      v = (e.exports = {
        enable: function () {
          (v.enable = function () {}), (h = !0);
          var e = c.f,
            t = i([].splice),
            n = {};
          (n[f] = 1),
            e(n).length &&
              ((c.f = function (n) {
                for (var o = e(n), i = 0, a = o.length; i < a; i++)
                  if (o[i] === f) {
                    t(o, i, 1);
                    break;
                  }
                return o;
              }),
              o(
                { target: "Object", stat: !0, forced: !0 },
                { getOwnPropertyNames: d.f }
              ));
        },
        fastKey: function (e, t) {
          if (!r(e))
            return "symbol" == typeof e
              ? e
              : ("string" == typeof e ? "S" : "P") + e;
          if (!s(e, f)) {
            if (!u(e)) return "F";
            if (!t) return "E";
            y(e);
          }
          return e[f].objectID;
        },
        getWeakData: function (e, t) {
          if (!s(e, f)) {
            if (!u(e)) return !0;
            if (!t) return !1;
            y(e);
          }
          return e[f].weakData;
        },
        onFreeze: function (e) {
          return g && h && u(e) && !s(e, f) && y(e), e;
        },
      });
    a[f] = !0;
  }