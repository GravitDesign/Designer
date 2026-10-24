/**
 * Webpack Module #424
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(19), n(677);
    var o = n(25),
      i = n(23),
      a = n(411),
      r = n(110),
      s = n(29),
      l = n(27),
      c = n(49),
      d = n(423),
      u = n(79),
      p = n(120),
      g = n(232),
      h = n(137),
      f = n(419),
      m = n(80),
      y = n(146),
      v = n(35),
      _ = n(61),
      b = n(124),
      w = n(131),
      C = n(37),
      x = n(46),
      S = n(62),
      E = n(136),
      A = n(174),
      T = n(246),
      G = n(204),
      P = n(252),
      D = n(303),
      L = n(43),
      I = n(351),
      k = L("iterator"),
      O = m.set,
      F = m.getterFor("URLSearchParams"),
      R = m.getterFor("URLSearchParamsIterator"),
      M = a("fetch"),
      N = a("Request"),
      B = a("Headers"),
      U = N && N.prototype,
      $ = B && B.prototype,
      j = i.TypeError,
      K = i.encodeURIComponent,
      V = String.fromCharCode,
      H = r("String", "fromCodePoint"),
      W = parseInt,
      z = l("".charAt),
      q = l([].join),
      Y = l([].push),
      X = l("".replace),
      Q = l([].shift),
      J = l([].splice),
      Z = l("".split),
      ee = l("".slice),
      te = l(/./.exec),
      ne = /\+/g,
      oe = /^[0-9a-f]+$/i,
      ie = function (e, t) {
        var n = ee(e, t, t + 2);
        return te(oe, n) ? W(n, 16) : NaN;
      },
      ae = function (e) {
        for (var t = 0, n = 128; n > 0 && 0 != (e & n); n >>= 1) t++;
        return t;
      },
      re = function (e) {
        var t = null;
        switch (e.length) {
          case 1:
            t = e[0];
            break;
          case 2:
            t = ((31 & e[0]) << 6) | (63 & e[1]);
            break;
          case 3:
            t = ((15 & e[0]) << 12) | ((63 & e[1]) << 6) | (63 & e[2]);
            break;
          case 4:
            t =
              ((7 & e[0]) << 18) |
              ((63 & e[1]) << 12) |
              ((63 & e[2]) << 6) |
              (63 & e[3]);
        }
        return t > 1114111 ? null : t;
      },
      se = function (e) {
        for (var t = (e = X(e, ne, " ")).length, n = "", o = 0; o < t; ) {
          var i = z(e, o);
          if ("%" === i) {
            if ("%" === z(e, o + 1) || o + 3 > t) {
              (n += "%"), o++;
              continue;
            }
            var a = ie(e, o + 1);
            if (a != a) {
              (n += i), o++;
              continue;
            }
            o += 2;
            var r = ae(a);
            if (0 === r) i = V(a);
            else {
              if (1 === r || r > 4) {
                (n += "�"), o++;
                continue;
              }
              for (
                var s = [a], l = 1;
                l < r && !(++o + 3 > t || "%" !== z(e, o));

              ) {
                var c = ie(e, o + 1);
                if (c != c) {
                  o += 3;
                  break;
                }
                if (c > 191 || c < 128) break;
                Y(s, c), (o += 2), l++;
              }
              if (s.length !== r) {
                n += "�";
                continue;
              }
              var d = re(s);
              null === d ? (n += "�") : (i = H(d));
            }
          }
          (n += i), o++;
        }
        return n;
      },
      le = /[!'()~]|%20/g,
      ce = {
        "!": "%21",
        "'": "%27",
        "(": "%28",
        ")": "%29",
        "~": "%7E",
        "%20": "+",
      },
      de = function (e) {
        return ce[e];
      },
      ue = function (e) {
        return X(K(e), le, de);
      },
      pe = f(
        function (e, t) {
          O(this, {
            type: "URLSearchParamsIterator",
            target: F(e).entries,
            index: 0,
            kind: t,
          });
        },
        "URLSearchParams",
        function () {
          var e = R(this),
            t = e.target,
            n = e.index++;
          if (!t || n >= t.length) return (e.target = null), P(void 0, !0);
          var o = t[n];
          switch (e.kind) {
            case "keys":
              return P(o.key, !1);
            case "values":
              return P(o.value, !1);
          }
          return P([o.key, o.value], !1);
        },
        !0
      ),
      ge = function (e) {
        (this.entries = []),
          (this.url = null),
          void 0 !== e &&
            (x(e)
              ? this.parseObject(e)
              : this.parseQuery(
                  "string" == typeof e ? ("?" === z(e, 0) ? ee(e, 1) : e) : S(e)
                ));
      };
    ge.prototype = {
      type: "URLSearchParams",
      bindURL: function (e) {
        (this.url = e), this.update();
      },
      parseObject: function (e) {
        var t,
          n,
          o,
          i,
          a,
          r,
          l,
          c = this.entries,
          d = G(e);
        if (d)
          for (n = (t = T(e, d)).next; !(o = s(n, t)).done; ) {
            if (
              ((a = (i = T(C(o.value))).next),
              (r = s(a, i)).done || (l = s(a, i)).done || !s(a, i).done)
            )
              throw new j("Expected sequence with length 2");
            Y(c, { key: S(r.value), value: S(l.value) });
          }
        else for (var u in e) _(e, u) && Y(c, { key: u, value: S(e[u]) });
      },
      parseQuery: function (e) {
        if (e)
          for (var t, n, o = this.entries, i = Z(e, "&"), a = 0; a < i.length; )
            (t = i[a++]).length &&
              ((n = Z(t, "=")), Y(o, { key: se(Q(n)), value: se(q(n, "=")) }));
      },
      serialize: function () {
        for (var e, t = this.entries, n = [], o = 0; o < t.length; )
          (e = t[o++]), Y(n, ue(e.key) + "=" + ue(e.value));
        return q(n, "&");
      },
      update: function () {
        (this.entries.length = 0), this.parseQuery(this.url.query);
      },
      updateURL: function () {
        this.url && this.url.update();
      },
    };
    var he = function () {
        y(this, fe);
        var e = arguments.length > 0 ? arguments[0] : void 0,
          t = O(this, new ge(e));
        c || (this.size = t.entries.length);
      },
      fe = he.prototype;
    if (
      (g(
        fe,
        {
          append: function (e, t) {
            var n = F(this);
            D(arguments.length, 2),
              Y(n.entries, { key: S(e), value: S(t) }),
              c || this.length++,
              n.updateURL();
          },
          delete: function (e) {
            for (
              var t = F(this),
                n = D(arguments.length, 1),
                o = t.entries,
                i = S(e),
                a = n < 2 ? void 0 : arguments[1],
                r = void 0 === a ? a : S(a),
                s = 0;
              s < o.length;

            ) {
              var l = o[s];
              if (l.key !== i || (void 0 !== r && l.value !== r)) s++;
              else if ((J(o, s, 1), void 0 !== r)) break;
            }
            c || (this.size = o.length), t.updateURL();
          },
          get: function (e) {
            var t = F(this).entries;
            D(arguments.length, 1);
            for (var n = S(e), o = 0; o < t.length; o++)
              if (t[o].key === n) return t[o].value;
            return null;
          },
          getAll: function (e) {
            var t = F(this).entries;
            D(arguments.length, 1);
            for (var n = S(e), o = [], i = 0; i < t.length; i++)
              t[i].key === n && Y(o, t[i].value);
            return o;
          },
          has: function (e) {
            for (
              var t = F(this).entries,
                n = D(arguments.length, 1),
                o = S(e),
                i = n < 2 ? void 0 : arguments[1],
                a = void 0 === i ? i : S(i),
                r = 0;
              r < t.length;

            ) {
              var s = t[r++];
              if (s.key === o && (void 0 === a || s.value === a)) return !0;
            }
            return !1;
          },
          set: function (e, t) {
            var n = F(this);
            D(arguments.length, 1);
            for (
              var o, i = n.entries, a = !1, r = S(e), s = S(t), l = 0;
              l < i.length;
              l++
            )
              (o = i[l]).key === r &&
                (a ? J(i, l--, 1) : ((a = !0), (o.value = s)));
            a || Y(i, { key: r, value: s }),
              c || (this.size = i.length),
              n.updateURL();
          },
          sort: function () {
            var e = F(this);
            I(e.entries, function (e, t) {
              return e.key > t.key ? 1 : -1;
            }),
              e.updateURL();
          },
          forEach: function (e) {
            for (
              var t,
                n = F(this).entries,
                o = b(e, arguments.length > 1 ? arguments[1] : void 0),
                i = 0;
              i < n.length;

            )
              o((t = n[i++]).value, t.key, this);
          },
          keys: function () {
            return new pe(this, "keys");
          },
          values: function () {
            return new pe(this, "values");
          },
          entries: function () {
            return new pe(this, "entries");
          },
        },
        { enumerable: !0 }
      ),
      u(fe, k, fe.entries, { name: "entries" }),
      u(
        fe,
        "toString",
        function () {
          return F(this).serialize();
        },
        { enumerable: !0 }
      ),
      c &&
        p(fe, "size", {
          get: function () {
            return F(this).entries.length;
          },
          configurable: !0,
          enumerable: !0,
        }),
      h(he, "URLSearchParams"),
      o({ global: !0, constructor: !0, forced: !d }, { URLSearchParams: he }),
      !d && v(B))
    ) {
      var me = l($.has),
        ye = l($.set),
        ve = function (e) {
          if (x(e)) {
            var t,
              n = e.body;
            if ("URLSearchParams" === w(n))
              return (
                (t = e.headers ? new B(e.headers) : new B()),
                me(t, "content-type") ||
                  ye(
                    t,
                    "content-type",
                    "application/x-www-form-urlencoded;charset=UTF-8"
                  ),
                E(e, { body: A(0, S(n)), headers: A(0, t) })
              );
          }
          return e;
        };
      if (
        (v(M) &&
          o(
            { global: !0, enumerable: !0, dontCallGetSet: !0, forced: !0 },
            {
              fetch: function (e) {
                return M(e, arguments.length > 1 ? ve(arguments[1]) : {});
              },
            }
          ),
        v(N))
      ) {
        var _e = function (e) {
          return (
            y(this, U), new N(e, arguments.length > 1 ? ve(arguments[1]) : {})
          );
        };
        (U.constructor = _e),
          (_e.prototype = U),
          o(
            { global: !0, constructor: !0, dontCallGetSet: !0, forced: !0 },
            { Request: _e }
          );
      }
    }
    e.exports = { URLSearchParams: he, getState: F };
  }