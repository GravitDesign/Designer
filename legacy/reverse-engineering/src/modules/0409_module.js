/**
 * Webpack Module #409
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o,
      i,
      a,
      r,
      s = n(23),
      l = n(200),
      c = n(124),
      d = n(35),
      u = n(61),
      p = n(21),
      g = n(406),
      h = n(157),
      f = n(242),
      m = n(303),
      y = n(410),
      v = n(245),
      _ = s.setImmediate,
      b = s.clearImmediate,
      w = s.process,
      C = s.Dispatch,
      x = s.Function,
      S = s.MessageChannel,
      E = s.String,
      A = 0,
      T = {};
    p(function () {
      o = s.location;
    });
    var G = function (e) {
        if (u(T, e)) {
          var t = T[e];
          delete T[e], t();
        }
      },
      P = function (e) {
        return function () {
          G(e);
        };
      },
      D = function (e) {
        G(e.data);
      },
      L = function (e) {
        s.postMessage(E(e), o.protocol + "//" + o.host);
      };
    (_ && b) ||
      ((_ = function (e) {
        m(arguments.length, 1);
        var t = d(e) ? e : x(e),
          n = h(arguments, 1);
        return (
          (T[++A] = function () {
            l(t, void 0, n);
          }),
          i(A),
          A
        );
      }),
      (b = function (e) {
        delete T[e];
      }),
      v
        ? (i = function (e) {
            w.nextTick(P(e));
          })
        : C && C.now
        ? (i = function (e) {
            C.now(P(e));
          })
        : S && !y
        ? ((r = (a = new S()).port2),
          (a.port1.onmessage = D),
          (i = c(r.postMessage, r)))
        : s.addEventListener &&
          d(s.postMessage) &&
          !s.importScripts &&
          o &&
          "file:" !== o.protocol &&
          !p(L)
        ? ((i = L), s.addEventListener("message", D, !1))
        : (i =
            "onreadystatechange" in f("script")
              ? function (e) {
                  g.appendChild(f("script")).onreadystatechange = function () {
                    g.removeChild(this), G(e);
                  };
                }
              : function (e) {
                  setTimeout(P(e), 0);
                })),
      (e.exports = { set: _, clear: b });
  }