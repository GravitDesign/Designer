/**
 * Webpack Module #247
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(29),
      i = n(27),
      a = n(278),
      r = n(37),
      s = n(46),
      l = n(92),
      c = n(342),
      d = n(308),
      u = n(117),
      p = n(62),
      g = n(145),
      h = n(279),
      f = n(344),
      m = n(21),
      y = f.UNSUPPORTED_Y,
      v = Math.min,
      _ = i([].push),
      b = i("".slice),
      w = !m(function () {
        var e = /(?:)/,
          t = e.exec;
        e.exec = function () {
          return t.apply(this, arguments);
        };
        var n = "ab".split(e);
        return 2 !== n.length || "a" !== n[0] || "b" !== n[1];
      }),
      C =
        "c" === "abbc".split(/(b)*/)[1] ||
        4 !== "test".split(/(?:)/, -1).length ||
        2 !== "ab".split(/(?:ab)*/).length ||
        4 !== ".".split(/(.?)(.?)/).length ||
        ".".split(/()()/).length > 1 ||
        "".split(/.?/).length;
    a(
      "split",
      function (e, t, n) {
        var i = "0".split(void 0, 0).length
          ? function (e, n) {
              return void 0 === e && 0 === n ? [] : o(t, this, e, n);
            }
          : t;
        return [
          function (t, n) {
            var a = l(this),
              r = s(t) ? g(t, e) : void 0;
            return r ? o(r, t, a, n) : o(i, p(a), t, n);
          },
          function (e, o) {
            var a = r(this),
              s = p(e);
            if (!C) {
              var l = n(i, a, s, o, i !== t);
              if (l.done) return l.value;
            }
            var g = c(a, RegExp),
              f = a.unicode,
              m =
                (a.ignoreCase ? "i" : "") +
                (a.multiline ? "m" : "") +
                (a.unicode ? "u" : "") +
                (y ? "g" : "y"),
              w = new g(y ? "^(?:" + a.source + ")" : a, m),
              x = void 0 === o ? 4294967295 : o >>> 0;
            if (0 === x) return [];
            if (0 === s.length) return null === h(w, s) ? [s] : [];
            for (var S = 0, E = 0, A = []; E < s.length; ) {
              w.lastIndex = y ? 0 : E;
              var T,
                G = h(w, y ? b(s, E) : s);
              if (
                null === G ||
                (T = v(u(w.lastIndex + (y ? E : 0)), s.length)) === S
              )
                E = d(s, E, f);
              else {
                if ((_(A, b(s, S, E)), A.length === x)) return A;
                for (var P = 1; P <= G.length - 1; P++)
                  if ((_(A, G[P]), A.length === x)) return A;
                E = S = T;
              }
            }
            return _(A, b(s, S)), A;
          },
        ];
      },
      C || !w,
      y
    );
  }