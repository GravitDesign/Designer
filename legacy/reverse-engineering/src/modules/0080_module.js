/**
 * Webpack Module #80
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o,
      i,
      a,
      r = n(452),
      s = n(23),
      l = n(46),
      c = n(100),
      d = n(61),
      u = n(297),
      p = n(300),
      g = n(259),
      h = s.TypeError,
      f = s.WeakMap;
    if (r || u.state) {
      var m = u.state || (u.state = new f());
      (m.get = m.get),
        (m.has = m.has),
        (m.set = m.set),
        (o = function (e, t) {
          if (m.has(e)) throw new h("Object already initialized");
          return (t.facade = e), m.set(e, t), t;
        }),
        (i = function (e) {
          return m.get(e) || {};
        }),
        (a = function (e) {
          return m.has(e);
        });
    } else {
      var y = p("state");
      (g[y] = !0),
        (o = function (e, t) {
          if (d(e, y)) throw new h("Object already initialized");
          return (t.facade = e), c(e, y, t), t;
        }),
        (i = function (e) {
          return d(e, y) ? e[y] : {};
        }),
        (a = function (e) {
          return d(e, y);
        });
    }
    e.exports = {
      set: o,
      get: i,
      has: a,
      enforce: function (e) {
        return a(e) ? i(e) : o(e, {});
      },
      getterFor: function (e) {
        return function (t) {
          var n;
          if (!l(t) || (n = i(t)).type !== e)
            throw new h("Incompatible receiver, " + e + " required");
          return n;
        };
      },
    };
  }