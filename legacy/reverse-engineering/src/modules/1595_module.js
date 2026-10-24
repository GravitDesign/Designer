/**
 * Webpack Module #1595
 * Type: unknown
 */

function (e, t, n) {
    var o;
    !(function (i, a, r) {
      if (i) {
        for (
          var s,
            l = {
              8: "backspace",
              9: "tab",
              13: "enter",
              16: "shift",
              17: "ctrl",
              18: "alt",
              20: "capslock",
              27: "esc",
              32: "space",
              33: "pageup",
              34: "pagedown",
              35: "end",
              36: "home",
              37: "left",
              38: "up",
              39: "right",
              40: "down",
              45: "ins",
              46: "del",
              91: "meta",
              93: "meta",
              224: "meta",
            },
            c = {
              106: "*",
              107: "+",
              109: "-",
              110: ".",
              111: "/",
              186: ";",
              187: "=",
              188: ",",
              189: "-",
              190: ".",
              191: "/",
              192: "`",
              219: "[",
              220: "\\",
              221: "]",
              222: "'",
            },
            d = {
              "~": "`",
              "!": "1",
              "@": "2",
              "#": "3",
              $: "4",
              "%": "5",
              "^": "6",
              "&": "7",
              "*": "8",
              "(": "9",
              ")": "0",
              _: "-",
              "+": "=",
              ":": ";",
              '"': "'",
              "<": ",",
              ">": ".",
              "?": "/",
              "|": "\\",
            },
            u = {
              option: "alt",
              command: "meta",
              return: "enter",
              escape: "esc",
              plus: "+",
              mod: /Mac|iPod|iPhone|iPad/.test(navigator.platform)
                ? "meta"
                : "ctrl",
            },
            p = 1;
          p < 20;
          ++p
        )
          l[111 + p] = "f" + p;
        for (p = 0; p <= 9; ++p) l[p + 96] = p.toString();
        (v.prototype.bind = function (e, t, n) {
          return (
            (e = e instanceof Array ? e : [e]),
            this._bindMultiple.call(this, e, t, n),
            this
          );
        }),
          (v.prototype.unbind = function (e, t) {
            return this.bind.call(this, e, function () {}, t);
          }),
          (v.prototype.trigger = function (e, t) {
            return (
              this._directMap[e + ":" + t] &&
                this._directMap[e + ":" + t]({}, e),
              this
            );
          }),
          (v.prototype.reset = function () {
            return (this._callbacks = {}), (this._directMap = {}), this;
          }),
          (v.prototype.stopCallback = function (e, t) {
            if ((" " + t.className + " ").indexOf(" mousetrap ") > -1)
              return !1;
            if (
              (function e(t, n) {
                return null !== t && t !== a && (t === n || e(t.parentNode, n));
              })(t, this.target)
            )
              return !1;
            if ("composedPath" in e && "function" == typeof e.composedPath) {
              var n = e.composedPath()[0];
              n !== e.target && (t = n);
            }
            return (
              "INPUT" == t.tagName ||
              "SELECT" == t.tagName ||
              "TEXTAREA" == t.tagName ||
              t.isContentEditable
            );
          }),
          (v.prototype.handleKey = function () {
            var e = this;
            return e._handleKey.apply(e, arguments);
          }),
          (v.addKeycodes = function (e) {
            for (var t in e) e.hasOwnProperty(t) && (l[t] = e[t]);
            s = null;
          }),
          (v.init = function () {
            var e = v(a);
            for (var t in e)
              "_" !== t.charAt(0) &&
                (v[t] = (function (t) {
                  return function () {
                    return e[t].apply(e, arguments);
                  };
                })(t));
          }),
          v.init(),
          (i.Mousetrap = v),
          e.exports && (e.exports = v),
          void 0 ===
            (o = function () {
              return v;
            }.call(t, n, t, e)) || (e.exports = o);
      }
      function g(e, t, n) {
        e.addEventListener
          ? e.addEventListener(t, n, !1)
          : e.attachEvent("on" + t, n);
      }
      function h(e) {
        if ("keypress" == e.type) {
          var t = String.fromCharCode(e.which);
          return e.shiftKey || (t = t.toLowerCase()), t;
        }
        return l[e.which]
          ? l[e.which]
          : c[e.which]
          ? c[e.which]
          : String.fromCharCode(e.which).toLowerCase();
      }
      function f(e) {
        return "shift" == e || "ctrl" == e || "alt" == e || "meta" == e;
      }
      function m(e, t, n) {
        return (
          n ||
            (n = (function () {
              if (!s)
                for (var e in ((s = {}), l))
                  (e > 95 && e < 112) || (l.hasOwnProperty(e) && (s[l[e]] = e));
              return s;
            })()[e]
              ? "keydown"
              : "keypress"),
          "keypress" == n && t.length && (n = "keydown"),
          n
        );
      }
      function y(e, t) {
        var n,
          o,
          i,
          a = [];
        for (
          n = (function (e) {
            return "+" === e
              ? ["+"]
              : (e = e.replace(/\+{2}/g, "+plus")).split("+");
          })(e),
            i = 0;
          i < n.length;
          ++i
        )
          (o = n[i]),
            u[o] && (o = u[o]),
            t && "keypress" != t && d[o] && ((o = d[o]), a.push("shift")),
            f(o) && a.push(o);
        return { key: o, modifiers: a, action: (t = m(o, a, t)) };
      }
      function v(e) {
        var t = this;
        if (((e = e || a), !(t instanceof v))) return new v(e);
        (t.target = e), (t._callbacks = {}), (t._directMap = {});
        var n,
          o = {},
          i = !1,
          r = !1,
          s = !1;
        function l(e) {
          e = e || {};
          var t,
            n = !1;
          for (t in o) e[t] ? (n = !0) : (o[t] = 0);
          n || (s = !1);
        }
        function c(e, n, i, a, r, s) {
          var l,
            c,
            d,
            u,
            p = [],
            g = i.type;
          if (!t._callbacks[e]) return [];
          for (
            "keyup" == g && f(e) && (n = [e]), l = 0;
            l < t._callbacks[e].length;
            ++l
          )
            if (
              ((c = t._callbacks[e][l]),
              (a || !c.seq || o[c.seq] == c.level) &&
                g == c.action &&
                (("keypress" == g && !i.metaKey && !i.ctrlKey) ||
                  ((d = n),
                  (u = c.modifiers),
                  d.sort().join(",") === u.sort().join(","))))
            ) {
              var h = !a && c.combo == r,
                m = a && c.seq == a && c.level == s;
              (h || m) && t._callbacks[e].splice(l, 1), p.push(c);
            }
          return p;
        }
        function d(e, n, o, i) {
          t.stopCallback(n, n.target || n.srcElement, o, i) ||
            (!1 === e(n, o) &&
              ((function (e) {
                e.preventDefault ? e.preventDefault() : (e.returnValue = !1);
              })(n),
              (function (e) {
                e.stopPropagation ? e.stopPropagation() : (e.cancelBubble = !0);
              })(n)));
        }
        function u(e) {
          "number" != typeof e.which && (e.which = e.keyCode);
          var n = h(e);
          n &&
            ("keyup" != e.type || i !== n
              ? t.handleKey(
                  n,
                  (function (e) {
                    var t = [];
                    return (
                      e.shiftKey && t.push("shift"),
                      e.altKey && t.push("alt"),
                      e.ctrlKey && t.push("ctrl"),
                      e.metaKey && t.push("meta"),
                      t
                    );
                  })(e),
                  e
                )
              : (i = !1));
        }
        function p(e, t, a, r) {
          function c(t) {
            return function () {
              (s = t), ++o[e], clearTimeout(n), (n = setTimeout(l, 1e3));
            };
          }
          function u(t) {
            d(a, t, e), "keyup" !== r && (i = h(t)), setTimeout(l, 10);
          }
          o[e] = 0;
          for (var p = 0; p < t.length; ++p) {
            var g = p + 1 === t.length ? u : c(r || y(t[p + 1]).action);
            m(t[p], g, r, e, p);
          }
        }
        function m(e, n, o, i, a) {
          t._directMap[e + ":" + o] = n;
          var r,
            s = (e = e.replace(/\s+/g, " ")).split(" ");
          s.length > 1
            ? p(e, s, n, o)
            : ((r = y(e, o)),
              (t._callbacks[r.key] = t._callbacks[r.key] || []),
              c(r.key, r.modifiers, { type: r.action }, i, e, a),
              t._callbacks[r.key][i ? "unshift" : "push"]({
                callback: n,
                modifiers: r.modifiers,
                action: r.action,
                seq: i,
                level: a,
                combo: e,
              }));
        }
        (t._handleKey = function (e, t, n) {
          var o,
            i = c(e, t, n),
            a = {},
            u = 0,
            p = !1;
          for (o = 0; o < i.length; ++o)
            i[o].seq && (u = Math.max(u, i[o].level));
          for (o = 0; o < i.length; ++o)
            if (i[o].seq) {
              if (i[o].level != u) continue;
              (p = !0),
                (a[i[o].seq] = 1),
                d(i[o].callback, n, i[o].combo, i[o].seq);
            } else p || d(i[o].callback, n, i[o].combo);
          var g = "keypress" == n.type && r;
          n.type != s || f(e) || g || l(a), (r = p && "keydown" == n.type);
        }),
          (t._bindMultiple = function (e, t, n) {
            for (var o = 0; o < e.length; ++o) m(e[o], t, n);
          }),
          g(e, "keypress", u),
          g(e, "keydown", u),
          g(e, "keyup", u);
      }
    })(
      "undefined" != typeof window ? window : null,
      "undefined" != typeof window ? document : null
    );
  }