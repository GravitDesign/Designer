/**
 * Webpack Module #371
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(29),
      i = n(136),
      a = n(100),
      r = n(232),
      s = n(43),
      l = n(80),
      c = n(145),
      d = n(251).IteratorPrototype,
      u = n(252),
      p = n(102),
      g = s("toStringTag"),
      h = l.set,
      f = function (e) {
        var t = l.getterFor(e ? "WrapForValidIterator" : "IteratorHelper");
        return r(i(d), {
          next: function () {
            var n = t(this);
            if (e) return n.nextHandler();
            if (n.done) return u(void 0, !0);
            try {
              var o = n.nextHandler();
              return n.returnHandlerResult ? o : u(o, n.done);
            } catch (e) {
              throw ((n.done = !0), e);
            }
          },
          return: function () {
            var n = t(this),
              i = n.iterator;
            if (((n.done = !0), e)) {
              var a = c(i, "return");
              return a ? o(a, i) : u(void 0, !0);
            }
            if (n.inner)
              try {
                p(n.inner.iterator, "normal");
              } catch (e) {
                return p(i, "throw", e);
              }
            return i && p(i, "normal"), u(void 0, !0);
          },
        });
      },
      m = f(!0),
      y = f(!1);
    a(y, g, "Iterator Helper"),
      (e.exports = function (e, t, n) {
        var o = function (o, i) {
          i ? ((i.iterator = o.iterator), (i.next = o.next)) : (i = o),
            (i.type = t ? "WrapForValidIterator" : "IteratorHelper"),
            (i.returnHandlerResult = !!n),
            (i.nextHandler = e),
            (i.counter = 0),
            (i.done = !1),
            h(this, i);
        };
        return (o.prototype = t ? m : y), o;
      });
  }