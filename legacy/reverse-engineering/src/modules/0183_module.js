/**
 * Webpack Module #183
 * Type: unknown
 */

function (e, t) {
    var n,
      o,
      i = (e.exports = {});
    function a() {
      throw new Error("setTimeout has not been defined");
    }
    function r() {
      throw new Error("clearTimeout has not been defined");
    }
    function s(e) {
      if (n === setTimeout) return setTimeout(e, 0);
      if ((n === a || !n) && setTimeout)
        return (n = setTimeout), setTimeout(e, 0);
      try {
        return n(e, 0);
      } catch (t) {
        try {
          return n.call(null, e, 0);
        } catch (t) {
          return n.call(this, e, 0);
        }
      }
    }
    !(function () {
      try {
        n = "function" == typeof setTimeout ? setTimeout : a;
      } catch (e) {
        n = a;
      }
      try {
        o = "function" == typeof clearTimeout ? clearTimeout : r;
      } catch (e) {
        o = r;
      }
    })();
    var l,
      c = [],
      d = !1,
      u = -1;
    function p() {
      d &&
        l &&
        ((d = !1), l.length ? (c = l.concat(c)) : (u = -1), c.length && g());
    }
    function g() {
      if (!d) {
        var e = s(p);
        d = !0;
        for (var t = c.length; t; ) {
          for (l = c, c = []; ++u < t; ) l && l[u].run();
          (u = -1), (t = c.length);
        }
        (l = null),
          (d = !1),
          (function (e) {
            if (o === clearTimeout) return clearTimeout(e);
            if ((o === r || !o) && clearTimeout)
              return (o = clearTimeout), clearTimeout(e);
            try {
              o(e);
            } catch (t) {
              try {
                return o.call(null, e);
              } catch (t) {
                return o.call(this, e);
              }
            }
          })(e);
      }
    }
    function h(e, t) {
      (this.fun = e), (this.array = t);
    }
    function f() {}
    (i.nextTick = function (e) {
      var t = new Array(arguments.length - 1);
      if (arguments.length > 1)
        for (var n = 1; n < arguments.length; n++) t[n - 1] = arguments[n];
      c.push(new h(e, t)), 1 !== c.length || d || s(g);
    }),
      (h.prototype.run = function () {
        this.fun.apply(null, this.array);
      }),
      (i.title = "browser"),
      (i.browser = !0),
      (i.env = {}),
      (i.argv = []),
      (i.version = ""),
      (i.versions = {}),
      (i.on = f),
      (i.addListener = f),
      (i.once = f),
      (i.off = f),
      (i.removeListener = f),
      (i.removeAllListeners = f),
      (i.emit = f),
      (i.prependListener = f),
      (i.prependOnceListener = f),
      (i.listeners = function (e) {
        return [];
      }),
      (i.binding = function (e) {
        throw new Error("process.binding is not supported");
      }),
      (i.cwd = function () {
        return "/";
      }),
      (i.chdir = function (e) {
        throw new Error("process.chdir is not supported");
      }),
      (i.umask = function () {
        return 0;
      });
  }