/**
 * Webpack Module #1102
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o,
      i = n(786),
      a = n(23),
      r = n(27),
      s = n(232),
      l = n(558),
      c = n(1106),
      d = n(1107),
      u = n(46),
      p = n(80).enforce,
      g = n(21),
      h = n(452),
      f = Object,
      m = Array.isArray,
      y = f.isExtensible,
      v = f.isFrozen,
      _ = f.isSealed,
      b = f.freeze,
      w = f.seal,
      C = !a.ActiveXObject && "ActiveXObject" in a,
      x = function (e) {
        return function () {
          return e(this, arguments.length ? arguments[0] : void 0);
        };
      },
      S = c("WeakMap", x, d),
      E = S.prototype,
      A = r(E.set);
    if (h)
      if (C) {
        (o = d.getConstructor(x, "WeakMap", !0)), l.enable();
        var T = r(E.delete),
          G = r(E.has),
          P = r(E.get);
        s(E, {
          delete: function (e) {
            if (u(e) && !y(e)) {
              var t = p(this);
              return (
                t.frozen || (t.frozen = new o()),
                T(this, e) || t.frozen.delete(e)
              );
            }
            return T(this, e);
          },
          has: function (e) {
            if (u(e) && !y(e)) {
              var t = p(this);
              return (
                t.frozen || (t.frozen = new o()), G(this, e) || t.frozen.has(e)
              );
            }
            return G(this, e);
          },
          get: function (e) {
            if (u(e) && !y(e)) {
              var t = p(this);
              return (
                t.frozen || (t.frozen = new o()),
                G(this, e) ? P(this, e) : t.frozen.get(e)
              );
            }
            return P(this, e);
          },
          set: function (e, t) {
            if (u(e) && !y(e)) {
              var n = p(this);
              n.frozen || (n.frozen = new o()),
                G(this, e) ? A(this, e, t) : n.frozen.set(e, t);
            } else A(this, e, t);
            return this;
          },
        });
      } else
        i &&
          g(function () {
            var e = b([]);
            return A(new S(), e, 1), !v(e);
          }) &&
          s(E, {
            set: function (e, t) {
              var n;
              return (
                m(e) && (v(e) ? (n = b) : _(e) && (n = w)),
                A(this, e, t),
                n && n(e),
                this
              );
            },
          });
  }