/**
 * Webpack Module #668
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(25),
      i = n(23),
      a = n(146),
      r = n(37),
      s = n(35),
      l = n(208),
      c = n(120),
      d = n(420),
      u = n(21),
      p = n(61),
      g = n(43),
      h = n(251).IteratorPrototype,
      f = n(49),
      m = n(74),
      y = g("toStringTag"),
      v = TypeError,
      _ = i.Iterator,
      b =
        m ||
        !s(_) ||
        _.prototype !== h ||
        !u(function () {
          _({});
        }),
      w = function () {
        if ((a(this, h), l(this) === h))
          throw new v("Abstract class Iterator not directly constructable");
      },
      C = function (e, t) {
        f
          ? c(h, e, {
              configurable: !0,
              get: function () {
                return t;
              },
              set: function (t) {
                if ((r(this), this === h))
                  throw new v("You can't redefine this property");
                p(this, e) ? (this[e] = t) : d(this, e, t);
              },
            })
          : (h[e] = t);
      };
    p(h, y) || C(y, "Iterator"),
      (!b && p(h, "constructor") && h.constructor !== Object) ||
        C("constructor", w),
      (w.prototype = h),
      o({ global: !0, constructor: !0, forced: b }, { Iterator: w });
  }