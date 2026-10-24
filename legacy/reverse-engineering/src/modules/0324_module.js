/**
 * Webpack Module #324
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(23),
      i = n(27),
      a = n(49),
      r = n(425),
      s = n(199),
      l = n(100),
      c = n(120),
      d = n(232),
      u = n(21),
      p = n(146),
      g = n(130),
      h = n(117),
      f = n(426),
      m = n(687),
      y = n(691),
      v = n(208),
      _ = n(175),
      b = n(427),
      w = n(157),
      C = n(288),
      x = n(341),
      S = n(137),
      E = n(80),
      A = s.PROPER,
      T = s.CONFIGURABLE,
      G = E.getterFor("ArrayBuffer"),
      P = E.getterFor("DataView"),
      D = E.set,
      L = o.ArrayBuffer,
      I = L,
      k = I && I.prototype,
      O = o.DataView,
      F = O && O.prototype,
      R = Object.prototype,
      M = o.Array,
      N = o.RangeError,
      B = i(b),
      U = i([].reverse),
      $ = y.pack,
      j = y.unpack,
      K = function (e) {
        return [255 & e];
      },
      V = function (e) {
        return [255 & e, (e >> 8) & 255];
      },
      H = function (e) {
        return [255 & e, (e >> 8) & 255, (e >> 16) & 255, (e >> 24) & 255];
      },
      W = function (e) {
        return (e[3] << 24) | (e[2] << 16) | (e[1] << 8) | e[0];
      },
      z = function (e) {
        return $(m(e), 23, 4);
      },
      q = function (e) {
        return $(e, 52, 8);
      },
      Y = function (e, t, n) {
        c(e.prototype, t, {
          configurable: !0,
          get: function () {
            return n(this)[t];
          },
        });
      },
      X = function (e, t, n, o) {
        var i = P(e),
          a = f(n),
          r = !!o;
        if (a + t > i.byteLength) throw new N("Wrong index");
        var s = i.bytes,
          l = a + i.byteOffset,
          c = w(s, l, l + t);
        return r ? c : U(c);
      },
      Q = function (e, t, n, o, i, a) {
        var r = P(e),
          s = f(n),
          l = o(+i),
          c = !!a;
        if (s + t > r.byteLength) throw new N("Wrong index");
        for (var d = r.bytes, u = s + r.byteOffset, p = 0; p < t; p++)
          d[u + p] = l[c ? p : t - p - 1];
      };
    if (r) {
      var J = A && "ArrayBuffer" !== L.name;
      u(function () {
        L(1);
      }) &&
      u(function () {
        new L(-1);
      }) &&
      !u(function () {
        return new L(), new L(1.5), new L(NaN), 1 !== L.length || (J && !T);
      })
        ? J && T && l(L, "name", "ArrayBuffer")
        : (((I = function (e) {
            return p(this, k), C(new L(f(e)), this, I);
          }).prototype = k),
          (k.constructor = I),
          x(I, L)),
        _ && v(F) !== R && _(F, R);
      var Z = new O(new I(2)),
        ee = i(F.setInt8);
      Z.setInt8(0, 2147483648),
        Z.setInt8(1, 2147483649),
        (!Z.getInt8(0) && Z.getInt8(1)) ||
          d(
            F,
            {
              setInt8: function (e, t) {
                ee(this, e, (t << 24) >> 24);
              },
              setUint8: function (e, t) {
                ee(this, e, (t << 24) >> 24);
              },
            },
            { unsafe: !0 }
          );
    } else
      (k = (I = function (e) {
        p(this, k);
        var t = f(e);
        D(this, { type: "ArrayBuffer", bytes: B(M(t), 0), byteLength: t }),
          a || ((this.byteLength = t), (this.detached = !1));
      }).prototype),
        (F = (O = function (e, t, n) {
          p(this, F), p(e, k);
          var o = G(e),
            i = o.byteLength,
            r = g(t);
          if (r < 0 || r > i) throw new N("Wrong offset");
          if (r + (n = void 0 === n ? i - r : h(n)) > i)
            throw new N("Wrong length");
          D(this, {
            type: "DataView",
            buffer: e,
            byteLength: n,
            byteOffset: r,
            bytes: o.bytes,
          }),
            a ||
              ((this.buffer = e), (this.byteLength = n), (this.byteOffset = r));
        }).prototype),
        a &&
          (Y(I, "byteLength", G),
          Y(O, "buffer", P),
          Y(O, "byteLength", P),
          Y(O, "byteOffset", P)),
        d(F, {
          getInt8: function (e) {
            return (X(this, 1, e)[0] << 24) >> 24;
          },
          getUint8: function (e) {
            return X(this, 1, e)[0];
          },
          getInt16: function (e) {
            var t = X(this, 2, e, arguments.length > 1 && arguments[1]);
            return (((t[1] << 8) | t[0]) << 16) >> 16;
          },
          getUint16: function (e) {
            var t = X(this, 2, e, arguments.length > 1 && arguments[1]);
            return (t[1] << 8) | t[0];
          },
          getInt32: function (e) {
            return W(X(this, 4, e, arguments.length > 1 && arguments[1]));
          },
          getUint32: function (e) {
            return W(X(this, 4, e, arguments.length > 1 && arguments[1])) >>> 0;
          },
          getFloat32: function (e) {
            return j(X(this, 4, e, arguments.length > 1 && arguments[1]), 23);
          },
          getFloat64: function (e) {
            return j(X(this, 8, e, arguments.length > 1 && arguments[1]), 52);
          },
          setInt8: function (e, t) {
            Q(this, 1, e, K, t);
          },
          setUint8: function (e, t) {
            Q(this, 1, e, K, t);
          },
          setInt16: function (e, t) {
            Q(this, 2, e, V, t, arguments.length > 2 && arguments[2]);
          },
          setUint16: function (e, t) {
            Q(this, 2, e, V, t, arguments.length > 2 && arguments[2]);
          },
          setInt32: function (e, t) {
            Q(this, 4, e, H, t, arguments.length > 2 && arguments[2]);
          },
          setUint32: function (e, t) {
            Q(this, 4, e, H, t, arguments.length > 2 && arguments[2]);
          },
          setFloat32: function (e, t) {
            Q(this, 4, e, z, t, arguments.length > 2 && arguments[2]);
          },
          setFloat64: function (e, t) {
            Q(this, 8, e, q, t, arguments.length > 2 && arguments[2]);
          },
        });
    S(I, "ArrayBuffer"),
      S(O, "DataView"),
      (e.exports = { ArrayBuffer: I, DataView: O });
  }