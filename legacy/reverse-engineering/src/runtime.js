/*! For license information please see designer.browser.js.LICENSE.txt */
var GravitDesigner = (function (e) {
  function t(t) {
    for (
      var o, r, s = t[0], l = t[1], c = t[2], u = 0, p = [];
      u < s.length;
      u++
    )
      (r = s[u]),
        Object.prototype.hasOwnProperty.call(i, r) && i[r] && p.push(i[r][0]),
        (i[r] = 0);
    for (o in l) Object.prototype.hasOwnProperty.call(l, o) && (e[o] = l[o]);
    for (d && d(t); p.length; ) p.shift()();
    return a.push.apply(a, c || []), n();
  }
  function n() {
    for (var e, t = 0; t < a.length; t++) {
      for (var n = a[t], o = !0, s = 1; s < n.length; s++) {
        var l = n[s];
        0 !== i[l] && (o = !1);
      }
      o && (a.splice(t--, 1), (e = r((r.s = n[0]))));
    }
    return e;
  }
  var o = {},
    i = { 2: 0 },
    a = [];
  function r(t) {
    if (o[t]) return o[t].exports;
    var n = (o[t] = { i: t, l: !1, exports: {} });
    return e[t].call(n.exports, n, n.exports, r), (n.l = !0), n.exports;
  }
  (r.e = function (e) {
    var t = [],
      n = i[e];
    if (0 !== n)
      if (n) t.push(n[2]);
      else {
        var o = new Promise(function (t, o) {
          n = i[e] = [t, o];
        });
        t.push((n[2] = o));
        var a,
          s = document.createElement("script");
        (s.charset = "utf-8"),
          (s.timeout = 120),
          r.nc && s.setAttribute("nonce", r.nc),
          (s.src = (function (e) {
            return (
              r.p +
              "chunk." +
              ({ 12: "vendors~heic2any", 13: "vendors~pdfjsWorker" }[e] || e) +
              ".js"
            );
          })(e));
        var l = new Error();
        a = function (t) {
          (s.onerror = s.onload = null), clearTimeout(c);
          var n = i[e];
          if (0 !== n) {
            if (n) {
              var o = t && ("load" === t.type ? "missing" : t.type),
                a = t && t.target && t.target.src;
              (l.message =
                "Loading chunk " + e + " failed.\n(" + o + ": " + a + ")"),
                (l.name = "ChunkLoadError"),
                (l.type = o),
                (l.request = a),
                n[1](l);
            }
            i[e] = void 0;
          }
        };
        var c = setTimeout(function () {
          a({ type: "timeout", target: s });
        }, 12e4);
        (s.onerror = s.onload = a), document.head.appendChild(s);
      }
    return Promise.all(t);
  }),
    (r.m = e),
    (r.c = o),
    (r.d = function (e, t, n) {
      r.o(e, t) || Object.defineProperty(e, t, { enumerable: !0, get: n });
    }),
    (r.r = function (e) {
      "undefined" != typeof Symbol &&
        Symbol.toStringTag &&
        Object.defineProperty(e, Symbol.toStringTag, { value: "Module" }),
        Object.defineProperty(e, "__esModule", { value: !0 });
    }),
    (r.t = function (e, t) {
      if ((1 & t && (e = r(e)), 8 & t)) return e;
      if (4 & t && "object" == typeof e && e && e.__esModule) return e;
      var n = Object.create(null);
      if (
        (r.r(n),
        Object.defineProperty(n, "default", { enumerable: !0, value: e }),
        2 & t && "string" != typeof e)
      )
        for (var o in e)
          r.d(
            n,
            o,
            function (t) {
              return e[t];
            }.bind(null, o)
          );
      return n;
    }),
    (r.n = function (e) {
      var t =
        e && e.__esModule
          ? function () {
              return e.default;
            }
          : function () {
              return e;
            };
      return r.d(t, "a", t), t;
    }),
    (r.o = function (e, t) {
      return Object.prototype.hasOwnProperty.call(e, t);
    }),
    (r.p = "/"),
    (r.oe = function (e) {
      throw (console.error(e), e);
    });
  var s = (this.webpackJsonpGravitDesigner =
      this.webpackJsonpGravitDesigner || []),
    l = s.push.bind(s);
  (s.push = t), (s = s.slice());
  for (var c = 0; c < s.length; c++) t(s[c]);
  var d = l;
  return a.push([1373, 0]), n();
})(