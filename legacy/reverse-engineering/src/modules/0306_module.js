/**
 * Webpack Module #306
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o,
      i,
      a = n(29),
      r = n(27),
      s = n(62),
      l = n(307),
      c = n(344),
      d = n(296),
      u = n(136),
      p = n(80).get,
      g = n(458),
      h = n(459),
      f = d("native-string-replace", String.prototype.replace),
      m = RegExp.prototype.exec,
      y = m,
      v = r("".charAt),
      _ = r("".indexOf),
      b = r("".replace),
      w = r("".slice),
      C =
        ((i = /b*/g),
        a(m, (o = /a/), "a"),
        a(m, i, "a"),
        0 !== o.lastIndex || 0 !== i.lastIndex),
      x = c.BROKEN_CARET,
      S = void 0 !== /()??/.exec("")[1];
    (C || S || x || g || h) &&
      (y = function (e) {
        var t,
          n,
          o,
          i,
          r,
          c,
          d,
          g = this,
          h = p(g),
          E = s(e),
          A = h.raw;
        if (A)
          return (
            (A.lastIndex = g.lastIndex),
            (t = a(y, A, E)),
            (g.lastIndex = A.lastIndex),
            t
          );
        var T = h.groups,
          G = x && g.sticky,
          P = a(l, g),
          D = g.source,
          L = 0,
          I = E;
        if (
          (G &&
            ((P = b(P, "y", "")),
            -1 === _(P, "g") && (P += "g"),
            (I = w(E, g.lastIndex)),
            g.lastIndex > 0 &&
              (!g.multiline ||
                (g.multiline && "\n" !== v(E, g.lastIndex - 1))) &&
              ((D = "(?: " + D + ")"), (I = " " + I), L++),
            (n = new RegExp("^(?:" + D + ")", P))),
          S && (n = new RegExp("^" + D + "$(?!\\s)", P)),
          C && (o = g.lastIndex),
          (i = a(m, G ? n : g, I)),
          G
            ? i
              ? ((i.input = w(i.input, L)),
                (i[0] = w(i[0], L)),
                (i.index = g.lastIndex),
                (g.lastIndex += i[0].length))
              : (g.lastIndex = 0)
            : C && i && (g.lastIndex = g.global ? i.index + i[0].length : o),
          S &&
            i &&
            i.length > 1 &&
            a(f, i[0], n, function () {
              for (r = 1; r < arguments.length - 2; r++)
                void 0 === arguments[r] && (i[r] = void 0);
            }),
          i && T)
        )
          for (i.groups = c = u(null), r = 0; r < T.length; r++)
            c[(d = T[r])[0]] = i[d[1]];
        return i;
      }),
      (e.exports = y);
  }