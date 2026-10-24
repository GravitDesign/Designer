/**
 * Webpack Module #623
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o,
      i,
      a,
      r,
      s,
      l = n(23),
      c = n(411),
      d = n(124),
      u = n(409).set,
      p = n(412),
      g = n(410),
      h = n(624),
      f = n(625),
      m = n(245),
      y = l.MutationObserver || l.WebKitMutationObserver,
      v = l.document,
      _ = l.process,
      b = l.Promise,
      w = c("queueMicrotask");
    if (!w) {
      var C = new p(),
        x = function () {
          var e, t;
          for (m && (e = _.domain) && e.exit(); (t = C.get()); )
            try {
              t();
            } catch (e) {
              throw (C.head && o(), e);
            }
          e && e.enter();
        };
      g || m || f || !y || !v
        ? !h && b && b.resolve
          ? (((r = b.resolve(void 0)).constructor = b),
            (s = d(r.then, r)),
            (o = function () {
              s(x);
            }))
          : m
          ? (o = function () {
              _.nextTick(x);
            })
          : ((u = d(u, l)),
            (o = function () {
              u(x);
            }))
        : ((i = !0),
          (a = v.createTextNode("")),
          new y(x).observe(a, { characterData: !0 }),
          (o = function () {
            a.data = i = !i;
          })),
        (w = function (e) {
          C.head || o(), C.add(e);
        });
    }
    e.exports = w;
  }