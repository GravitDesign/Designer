/**
 * Webpack Module #1116
 * Type: unknown
 */

function (e, t, n) {
    (function (e, t) {
      !(function (e, n) {
        "use strict";
        if (!e.setImmediate) {
          var o,
            i,
            a,
            r,
            s,
            l = 1,
            c = {},
            d = !1,
            u = e.document,
            p = Object.getPrototypeOf && Object.getPrototypeOf(e);
          (p = p && p.setTimeout ? p : e),
            "[object process]" === {}.toString.call(e.process)
              ? (o = function (e) {
                  t.nextTick(function () {
                    h(e);
                  });
                })
              : !(function () {
                  if (e.postMessage && !e.importScripts) {
                    var t = !0,
                      n = e.onmessage;
                    return (
                      (e.onmessage = function () {
                        t = !1;
                      }),
                      e.postMessage("", "*"),
                      (e.onmessage = n),
                      t
                    );
                  }
                })()
              ? e.MessageChannel
                ? (((a = new MessageChannel()).port1.onmessage = function (e) {
                    h(e.data);
                  }),
                  (o = function (e) {
                    a.port2.postMessage(e);
                  }))
                : u && "onreadystatechange" in u.createElement("script")
                ? ((i = u.documentElement),
                  (o = function (e) {
                    var t = u.createElement("script");
                    (t.onreadystatechange = function () {
                      h(e),
                        (t.onreadystatechange = null),
                        i.removeChild(t),
                        (t = null);
                    }),
                      i.appendChild(t);
                  }))
                : (o = function (e) {
                    setTimeout(h, 0, e);
                  })
              : ((r = "setImmediate$" + Math.random() + "$"),
                (s = function (t) {
                  t.source === e &&
                    "string" == typeof t.data &&
                    0 === t.data.indexOf(r) &&
                    h(+t.data.slice(r.length));
                }),
                e.addEventListener
                  ? e.addEventListener("message", s, !1)
                  : e.attachEvent("onmessage", s),
                (o = function (t) {
                  e.postMessage(r + t, "*");
                })),
            (p.setImmediate = function (e) {
              "function" != typeof e && (e = new Function("" + e));
              for (
                var t = new Array(arguments.length - 1), n = 0;
                n < t.length;
                n++
              )
                t[n] = arguments[n + 1];
              var i = { callback: e, args: t };
              return (c[l] = i), o(l), l++;
            }),
            (p.clearImmediate = g);
        }
        function g(e) {
          delete c[e];
        }
        function h(e) {
          if (d) setTimeout(h, 0, e);
          else {
            var t = c[e];
            if (t) {
              d = !0;
              try {
                !(function (e) {
                  var t = e.callback,
                    n = e.args;
                  switch (n.length) {
                    case 0:
                      t();
                      break;
                    case 1:
                      t(n[0]);
                      break;
                    case 2:
                      t(n[0], n[1]);
                      break;
                    case 3:
                      t(n[0], n[1], n[2]);
                      break;
                    default:
                      t.apply(void 0, n);
                  }
                })(t);
              } finally {
                g(e), (d = !1);
              }
            }
          }
        }
      })("undefined" == typeof self ? (void 0 === e ? this : e) : self);
    }).call(this, n(109), n(183));
  }