/**
 * Webpack Module #1107
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(27),
      i = n(232),
      a = n(558).getWeakData,
      r = n(146),
      s = n(37),
      l = n(194),
      c = n(46),
      d = n(121),
      u = n(349),
      p = n(61),
      g = n(80),
      h = g.set,
      f = g.getterFor,
      m = u.find,
      y = u.findIndex,
      v = o([].splice),
      _ = 0,
      b = function (e) {
        return e.frozen || (e.frozen = new w());
      },
      w = function () {
        this.entries = [];
      },
      C = function (e, t) {
        return m(e.entries, function (e) {
          return e[0] === t;
        });
      };
    (w.prototype = {
      get: function (e) {
        var t = C(this, e);
        if (t) return t[1];
      },
      has: function (e) {
        return !!C(this, e);
      },
      set: function (e, t) {
        var n = C(this, e);
        n ? (n[1] = t) : this.entries.push([e, t]);
      },
      delete: function (e) {
        var t = y(this.entries, function (t) {
          return t[0] === e;
        });
        return ~t && v(this.entries, t, 1), !!~t;
      },
    }),
      (e.exports = {
        getConstructor: function (e, t, n, o) {
          var u = e(function (e, i) {
              r(e, g),
                h(e, { type: t, id: _++, frozen: null }),
                l(i) || d(i, e[o], { that: e, AS_ENTRIES: n });
            }),
            g = u.prototype,
            m = f(t),
            y = function (e, t, n) {
              var o = m(e),
                i = a(s(t), !0);
              return !0 === i ? b(o).set(t, n) : (i[o.id] = n), e;
            };
          return (
            i(g, {
              delete: function (e) {
                var t = m(this);
                if (!c(e)) return !1;
                var n = a(e);
                return !0 === n
                  ? b(t).delete(e)
                  : n && p(n, t.id) && delete n[t.id];
              },
              has: function (e) {
                var t = m(this);
                if (!c(e)) return !1;
                var n = a(e);
                return !0 === n ? b(t).has(e) : n && p(n, t.id);
              },
            }),
            i(
              g,
              n
                ? {
                    get: function (e) {
                      var t = m(this);
                      if (c(e)) {
                        var n = a(e);
                        if (!0 === n) return b(t).get(e);
                        if (n) return n[t.id];
                      }
                    },
                    set: function (e, t) {
                      return y(this, e, t);
                    },
                  }
                : {
                    add: function (e) {
                      return y(this, e, !0);
                    },
                  }
            ),
            u
          );
        },
      });
  }