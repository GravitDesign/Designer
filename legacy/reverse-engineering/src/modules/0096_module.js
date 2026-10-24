/**
 * Webpack Module #96
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(25),
      i = n(110),
      a = n(200),
      r = n(29),
      s = n(27),
      l = n(21),
      c = n(35),
      d = n(241),
      u = n(157),
      p = n(666),
      g = n(295),
      h = String,
      f = i("JSON", "stringify"),
      m = s(/./.exec),
      y = s("".charAt),
      v = s("".charCodeAt),
      _ = s("".replace),
      b = s((1).toString),
      w = /[\uD800-\uDFFF]/g,
      C = /^[\uD800-\uDBFF]$/,
      x = /^[\uDC00-\uDFFF]$/,
      S =
        !g ||
        l(function () {
          var e = i("Symbol")("stringify detection");
          return (
            "[null]" !== f([e]) || "{}" !== f({ a: e }) || "{}" !== f(Object(e))
          );
        }),
      E = l(function () {
        return (
          '"\\udf06\\ud834"' !== f("\udf06\ud834") ||
          '"\\udead"' !== f("\udead")
        );
      }),
      A = function (e, t) {
        var n = u(arguments),
          o = p(t);
        if (c(o) || (void 0 !== e && !d(e)))
          return (
            (n[1] = function (e, t) {
              if ((c(o) && (t = r(o, this, h(e), t)), !d(t))) return t;
            }),
            a(f, null, n)
          );
      },
      T = function (e, t, n) {
        var o = y(n, t - 1),
          i = y(n, t + 1);
        return (m(C, e) && !m(x, i)) || (m(x, e) && !m(C, o))
          ? "\\u" + b(v(e, 0), 16)
          : e;
      };
    f &&
      o(
        { target: "JSON", stat: !0, arity: 3, forced: S || E },
        {
          stringify: function (e, t, n) {
            var o = u(arguments),
              i = a(S ? A : f, null, o);
            return E && "string" == typeof i ? _(i, w, T) : i;
          },
        }
      );
  }