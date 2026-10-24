/**
 * Webpack Module #865
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(25),
      i = n(27),
      a = n(130),
      r = n(1524),
      s = n(1525),
      l = n(21),
      c = RangeError,
      d = String,
      u = Math.floor,
      p = i(s),
      g = i("".slice),
      h = i((1).toFixed),
      f = function (e, t, n) {
        return 0 === t
          ? n
          : t % 2 == 1
          ? f(e, t - 1, n * e)
          : f(e * e, t / 2, n);
      },
      m = function (e, t, n) {
        for (var o = -1, i = n; ++o < 6; )
          (i += t * e[o]), (e[o] = i % 1e7), (i = u(i / 1e7));
      },
      y = function (e, t) {
        for (var n = 6, o = 0; --n >= 0; )
          (o += e[n]), (e[n] = u(o / t)), (o = (o % t) * 1e7);
      },
      v = function (e) {
        for (var t = 6, n = ""; --t >= 0; )
          if ("" !== n || 0 === t || 0 !== e[t]) {
            var o = d(e[t]);
            n = "" === n ? o : n + p("0", 7 - o.length) + o;
          }
        return n;
      };
    o(
      {
        target: "Number",
        proto: !0,
        forced:
          l(function () {
            return (
              "0.000" !== h(8e-5, 3) ||
              "1" !== h(0.9, 0) ||
              "1.25" !== h(1.255, 2) ||
              "1000000000000000128" !== h(0xde0b6b3a7640080, 0)
            );
          }) ||
          !l(function () {
            h({});
          }),
      },
      {
        toFixed: function (e) {
          var t,
            n,
            o,
            i,
            s = r(this),
            l = a(e),
            u = [0, 0, 0, 0, 0, 0],
            h = "",
            _ = "0";
          if (l < 0 || l > 20) throw new c("Incorrect fraction digits");
          if (s != s) return "NaN";
          if (s <= -1e21 || s >= 1e21) return d(s);
          if ((s < 0 && ((h = "-"), (s = -s)), s > 1e-21))
            if (
              ((n =
                (t =
                  (function (e) {
                    for (var t = 0, n = e; n >= 4096; ) (t += 12), (n /= 4096);
                    for (; n >= 2; ) (t += 1), (n /= 2);
                    return t;
                  })(s * f(2, 69, 1)) - 69) < 0
                  ? s * f(2, -t, 1)
                  : s / f(2, t, 1)),
              (n *= 4503599627370496),
              (t = 52 - t) > 0)
            ) {
              for (m(u, 0, n), o = l; o >= 7; ) m(u, 1e7, 0), (o -= 7);
              for (m(u, f(10, o, 1), 0), o = t - 1; o >= 23; )
                y(u, 1 << 23), (o -= 23);
              y(u, 1 << o), m(u, 1, 1), y(u, 2), (_ = v(u));
            } else m(u, 0, n), m(u, 1 << -t, 0), (_ = v(u) + p("0", l));
          return (_ =
            l > 0
              ? h +
                ((i = _.length) <= l
                  ? "0." + p("0", l - i) + _
                  : g(_, 0, i - l) + "." + g(_, i - l))
              : h + _);
        },
      }
    );
  }