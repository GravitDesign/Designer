/**
 * Webpack Module #136
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o,
      i = n(37),
      a = n(617),
      r = n(301),
      s = n(259),
      l = n(406),
      c = n(242),
      d = n(300),
      u = d("IE_PROTO"),
      p = function () {},
      g = function (e) {
        return "<script>" + e + "</script>";
      },
      h = function (e) {
        e.write(g("")), e.close();
        var t = e.parentWindow.Object;
        return (e = null), t;
      },
      f = function () {
        try {
          o = new ActiveXObject("htmlfile");
        } catch (e) {}
        var e, t;
        f =
          "undefined" != typeof document
            ? document.domain && o
              ? h(o)
              : (((t = c("iframe")).style.display = "none"),
                l.appendChild(t),
                (t.src = String("javascript:")),
                (e = t.contentWindow.document).open(),
                e.write(g("document.F=Object")),
                e.close(),
                e.F)
            : h(o);
        for (var n = r.length; n--; ) delete f.prototype[r[n]];
        return f();
      };
    (s[u] = !0),
      (e.exports =
        Object.create ||
        function (e, t) {
          var n;
          return (
            null !== e
              ? ((p.prototype = i(e)),
                (n = new p()),
                (p.prototype = null),
                (n[u] = e))
              : (n = f()),
            void 0 === t ? n : a.f(n, t)
          );
        });
  }