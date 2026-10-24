/**
 * Webpack Module #356
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(49),
      i = n(23),
      a = n(27),
      r = n(277),
      s = n(288),
      l = n(100),
      c = n(136),
      d = n(243).f,
      u = n(144),
      p = n(454),
      g = n(62),
      h = n(460),
      f = n(344),
      m = n(1040),
      y = n(79),
      v = n(21),
      _ = n(61),
      b = n(80).enforce,
      w = n(260),
      C = n(43),
      x = n(458),
      S = n(459),
      E = C("match"),
      A = i.RegExp,
      T = A.prototype,
      G = i.SyntaxError,
      P = a(T.exec),
      D = a("".charAt),
      L = a("".replace),
      I = a("".indexOf),
      k = a("".slice),
      O = /^\?<[^\s\d!#%&*+<=>@^][^\s!#%&*+<=>@^]*>/,
      F = /a/g,
      R = /a/g,
      M = new A(F) !== F,
      N = f.MISSED_STICKY,
      B = f.UNSUPPORTED_Y,
      U =
        o &&
        (!M ||
          N ||
          x ||
          S ||
          v(function () {
            return (
              (R[E] = !1),
              A(F) !== F || A(R) === R || "/a/i" !== String(A(F, "i"))
            );
          }));
    if (r("RegExp", U)) {
      for (
        var $ = function (e, t) {
            var n,
              o,
              i,
              a,
              r,
              d,
              f = u(T, this),
              m = p(e),
              y = void 0 === t,
              v = [],
              w = e;
            if (!f && m && y && e.constructor === $) return e;
            if (
              ((m || u(T, e)) && ((e = e.source), y && (t = h(w))),
              (e = void 0 === e ? "" : g(e)),
              (t = void 0 === t ? "" : g(t)),
              (w = e),
              x &&
                ("dotAll" in F) &&
                (o = !!t && I(t, "s") > -1) &&
                (t = L(t, /s/g, "")),
              (n = t),
              N &&
                ("sticky" in F) &&
                (i = !!t && I(t, "y") > -1) &&
                B &&
                (t = L(t, /y/g, "")),
              S &&
                ((e = (a = (function (e) {
                  for (
                    var t,
                      n = e.length,
                      o = 0,
                      i = "",
                      a = [],
                      r = c(null),
                      s = !1,
                      l = !1,
                      d = 0,
                      u = "";
                    o <= n;
                    o++
                  ) {
                    if ("\\" === (t = D(e, o))) t += D(e, ++o);
                    else if ("]" === t) s = !1;
                    else if (!s)
                      switch (!0) {
                        case "[" === t:
                          s = !0;
                          break;
                        case "(" === t:
                          if (((i += t), "?:" === k(e, o + 1, o + 3))) continue;
                          P(O, k(e, o + 1)) && ((o += 2), (l = !0)), d++;
                          continue;
                        case ">" === t && l:
                          if ("" === u || _(r, u))
                            throw new G("Invalid capture group name");
                          (r[u] = !0),
                            (a[a.length] = [u, d]),
                            (l = !1),
                            (u = "");
                          continue;
                      }
                    l ? (u += t) : (i += t);
                  }
                  return [i, a];
                })(e))[0]),
                (v = a[1])),
              (r = s(A(e, t), f ? this : T, $)),
              (o || i || v.length) &&
                ((d = b(r)),
                o &&
                  ((d.dotAll = !0),
                  (d.raw = $(
                    (function (e) {
                      for (
                        var t, n = e.length, o = 0, i = "", a = !1;
                        o <= n;
                        o++
                      )
                        "\\" !== (t = D(e, o))
                          ? a || "." !== t
                            ? ("[" === t ? (a = !0) : "]" === t && (a = !1),
                              (i += t))
                            : (i += "[\\s\\S]")
                          : (i += t + D(e, ++o));
                      return i;
                    })(e),
                    n
                  ))),
                i && (d.sticky = !0),
                v.length && (d.groups = v)),
              e !== w)
            )
              try {
                l(r, "source", "" === w ? "(?:)" : w);
              } catch (e) {}
            return r;
          },
          j = d(A),
          K = 0;
        j.length > K;

      )
        m($, A, j[K++]);
      (T.constructor = $),
        ($.prototype = T),
        y(i, "RegExp", $, { constructor: !0 });
    }
    w("RegExp");
  }