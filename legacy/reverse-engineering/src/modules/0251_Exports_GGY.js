/**
 * Webpack Module #251
 * Type: exports
 * Name: Exports_GGY
 */

function (e, t, n) {
    "use strict";
    var o,
      i,
      a,
      r = n(21),
      s = n(35),
      l = n(46),
      c = n(136),
      d = n(208),
      u = n(79),
      p = n(43),
      g = n(74),
      h = p("iterator"),
      f = !1;
    [].keys &&
      ("next" in (a = [].keys())
        ? (i = d(d(a))) !== Object.prototype && (o = i)
        : (f = !0)),
      !l(o) ||
      r(function () {
        var e = {};
        return o[h].call(e) !== e;
      })
        ? (o = {})
        : g && (o = c(o)),
      s(o[h]) ||
        u(o, h, function () {
          return this;
        }),
      (e.exports = { IteratorPrototype: o, BUGGY_SAFARI_ITERATORS: f });
  }