/**
 * Webpack Module #221
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    (function (e) {
      var o = n(250),
        i = n(515),
        a = n(516);
      function r() {
        return l.TYPED_ARRAY_SUPPORT ? 2147483647 : 1073741823;
      }
      function s(e, t) {
        if (r() < t) throw new RangeError("Invalid typed array length");
        return (
          l.TYPED_ARRAY_SUPPORT
            ? ((e = new Uint8Array(t)).__proto__ = l.prototype)
            : (null === e && (e = new l(t)), (e.length = t)),
          e
        );
      }
      function l(e, t, n) {
        if (!(l.TYPED_ARRAY_SUPPORT || this instanceof l))
          return new l(e, t, n);
        if ("number" == typeof e) {
          if ("string" == typeof t)
            throw new Error(
              "If encoding is specified then the first argument must be a string"
            );
          return u(this, e);
        }
        return c(this, e, t, n);
      }
      function c(e, t, n, o) {
        if ("number" == typeof t)
          throw new TypeError('"value" argument must not be a number');
        return "undefined" != typeof ArrayBuffer && t instanceof ArrayBuffer
          ? (function (e, t, n, o) {
              if ((t.byteLength, n < 0 || t.byteLength < n))
                throw new RangeError("'offset' is out of bounds");
              if (t.byteLength < n + (o || 0))
                throw new RangeError("'length' is out of bounds");
              t =
                void 0 === n && void 0 === o
                  ? new Uint8Array(t)
                  : void 0 === o
                  ? new Uint8Array(t, n)
                  : new Uint8Array(t, n, o);
              l.TYPED_ARRAY_SUPPORT
                ? ((e = t).__proto__ = l.prototype)
                : (e = p(e, t));
              return e;
            })(e, t, n, o)
          : "string" == typeof t
          ? (function (e, t, n) {
              ("string" == typeof n && "" !== n) || (n = "utf8");
              if (!l.isEncoding(n))
                throw new TypeError(
                  '"encoding" must be a valid string encoding'
                );
              var o = 0 | h(t, n),
                i = (e = s(e, o)).write(t, n);
              i !== o && (e = e.slice(0, i));
              return e;
            })(e, t, n)
          : (function (e, t) {
              if (l.isBuffer(t)) {
                var n = 0 | g(t.length);
                return 0 === (e = s(e, n)).length || t.copy(e, 0, 0, n), e;
              }
              if (t) {
                if (
                  ("undefined" != typeof ArrayBuffer &&
                    t.buffer instanceof ArrayBuffer) ||
                  "length" in t
                )
                  return "number" != typeof t.length || (o = t.length) != o
                    ? s(e, 0)
                    : p(e, t);
                if ("Buffer" === t.type && a(t.data)) return p(e, t.data);
              }
              var o;
              throw new TypeError(
                "First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object."
              );
            })(e, t);
      }
      function d(e) {
        if ("number" != typeof e)
          throw new TypeError('"size" argument must be a number');
        if (e < 0) throw new RangeError('"size" argument must not be negative');
      }
      function u(e, t) {
        if ((d(t), (e = s(e, t < 0 ? 0 : 0 | g(t))), !l.TYPED_ARRAY_SUPPORT))
          for (var n = 0; n < t; ++n) e[n] = 0;
        return e;
      }
      function p(e, t) {
        var n = t.length < 0 ? 0 : 0 | g(t.length);
        e = s(e, n);
        for (var o = 0; o < n; o += 1) e[o] = 255 & t[o];
        return e;
      }
      function g(e) {
        if (e >= r())
          throw new RangeError(
            "Attempt to allocate Buffer larger than maximum size: 0x" +
              r().toString(16) +
              " bytes"
          );
        return 0 | e;
      }
      function h(e, t) {
        if (l.isBuffer(e)) return e.length;
        if (
          "undefined" != typeof ArrayBuffer &&
          "function" == typeof ArrayBuffer.isView &&
          (ArrayBuffer.isView(e) || e instanceof ArrayBuffer)
        )
          return e.byteLength;
        "string" != typeof e && (e = "" + e);
        var n = e.length;
        if (0 === n) return 0;
        for (var o = !1; ; )
          switch (t) {
            case "ascii":
            case "latin1":
            case "binary":
              return n;
            case "utf8":
            case "utf-8":
            case void 0:
              return U(e).length;
            case "ucs2":
            case "ucs-2":
            case "utf16le":
            case "utf-16le":
              return 2 * n;
            case "hex":
              return n >>> 1;
            case "base64":
              return $(e).length;
            default:
              if (o) return U(e).length;
              (t = ("" + t).toLowerCase()), (o = !0);
          }
      }
      function f(e, t, n) {
        var o = !1;
        if (((void 0 === t || t < 0) && (t = 0), t > this.length)) return "";
        if (((void 0 === n || n > this.length) && (n = this.length), n <= 0))
          return "";
        if ((n >>>= 0) <= (t >>>= 0)) return "";
        for (e || (e = "utf8"); ; )
          switch (e) {
            case "hex":
              return P(this, t, n);
            case "utf8":
            case "utf-8":
              return A(this, t, n);
            case "ascii":
              return T(this, t, n);
            case "latin1":
            case "binary":
              return G(this, t, n);
            case "base64":
              return E(this, t, n);
            case "ucs2":
            case "ucs-2":
            case "utf16le":
            case "utf-16le":
              return D(this, t, n);
            default:
              if (o) throw new TypeError("Unknown encoding: " + e);
              (e = (e + "").toLowerCase()), (o = !0);
          }
      }
      function m(e, t, n) {
        var o = e[t];
        (e[t] = e[n]), (e[n] = o);
      }
      function y(e, t, n, o, i) {
        if (0 === e.length) return -1;
        if (
          ("string" == typeof n
            ? ((o = n), (n = 0))
            : n > 2147483647
            ? (n = 2147483647)
            : n < -2147483648 && (n = -2147483648),
          (n = +n),
          isNaN(n) && (n = i ? 0 : e.length - 1),
          n < 0 && (n = e.length + n),
          n >= e.length)
        ) {
          if (i) return -1;
          n = e.length - 1;
        } else if (n < 0) {
          if (!i) return -1;
          n = 0;
        }
        if (("string" == typeof t && (t = l.from(t, o)), l.isBuffer(t)))
          return 0 === t.length ? -1 : v(e, t, n, o, i);
        if ("number" == typeof t)
          return (
            (t &= 255),
            l.TYPED_ARRAY_SUPPORT &&
            "function" == typeof Uint8Array.prototype.indexOf
              ? i
                ? Uint8Array.prototype.indexOf.call(e, t, n)
                : Uint8Array.prototype.lastIndexOf.call(e, t, n)
              : v(e, [t], n, o, i)
          );
        throw new TypeError("val must be string, number or Buffer");
      }
      function v(e, t, n, o, i) {
        var a,
          r = 1,
          s = e.length,
          l = t.length;
        if (
          void 0 !== o &&
          ("ucs2" === (o = String(o).toLowerCase()) ||
            "ucs-2" === o ||
            "utf16le" === o ||
            "utf-16le" === o)
        ) {
          if (e.length < 2 || t.length < 2) return -1;
          (r = 2), (s /= 2), (l /= 2), (n /= 2);
        }
        function c(e, t) {
          return 1 === r ? e[t] : e.readUInt16BE(t * r);
        }
        if (i) {
          var d = -1;
          for (a = n; a < s; a++)
            if (c(e, a) === c(t, -1 === d ? 0 : a - d)) {
              if ((-1 === d && (d = a), a - d + 1 === l)) return d * r;
            } else -1 !== d && (a -= a - d), (d = -1);
        } else
          for (n + l > s && (n = s - l), a = n; a >= 0; a--) {
            for (var u = !0, p = 0; p < l; p++)
              if (c(e, a + p) !== c(t, p)) {
                u = !1;
                break;
              }
            if (u) return a;
          }
        return -1;
      }
      function _(e, t, n, o) {
        n = Number(n) || 0;
        var i = e.length - n;
        o ? (o = Number(o)) > i && (o = i) : (o = i);
        var a = t.length;
        if (a % 2 != 0) throw new TypeError("Invalid hex string");
        o > a / 2 && (o = a / 2);
        for (var r = 0; r < o; ++r) {
          var s = parseInt(t.substr(2 * r, 2), 16);
          if (isNaN(s)) return r;
          e[n + r] = s;
        }
        return r;
      }
      function b(e, t, n, o) {
        return j(U(t, e.length - n), e, n, o);
      }
      function w(e, t, n, o) {
        return j(
          (function (e) {
            for (var t = [], n = 0; n < e.length; ++n)
              t.push(255 & e.charCodeAt(n));
            return t;
          })(t),
          e,
          n,
          o
        );
      }
      function C(e, t, n, o) {
        return w(e, t, n, o);
      }
      function x(e, t, n, o) {
        return j($(t), e, n, o);
      }
      function S(e, t, n, o) {
        return j(
          (function (e, t) {
            for (
              var n, o, i, a = [], r = 0;
              r < e.length && !((t -= 2) < 0);
              ++r
            )
              (n = e.charCodeAt(r)),
                (o = n >> 8),
                (i = n % 256),
                a.push(i),
                a.push(o);
            return a;
          })(t, e.length - n),
          e,
          n,
          o
        );
      }
      function E(e, t, n) {
        return 0 === t && n === e.length
          ? o.fromByteArray(e)
          : o.fromByteArray(e.slice(t, n));
      }
      function A(e, t, n) {
        n = Math.min(e.length, n);
        for (var o = [], i = t; i < n; ) {
          var a,
            r,
            s,
            l,
            c = e[i],
            d = null,
            u = c > 239 ? 4 : c > 223 ? 3 : c > 191 ? 2 : 1;
          if (i + u <= n)
            switch (u) {
              case 1:
                c < 128 && (d = c);
                break;
              case 2:
                128 == (192 & (a = e[i + 1])) &&
                  (l = ((31 & c) << 6) | (63 & a)) > 127 &&
                  (d = l);
                break;
              case 3:
                (a = e[i + 1]),
                  (r = e[i + 2]),
                  128 == (192 & a) &&
                    128 == (192 & r) &&
                    (l = ((15 & c) << 12) | ((63 & a) << 6) | (63 & r)) >
                      2047 &&
                    (l < 55296 || l > 57343) &&
                    (d = l);
                break;
              case 4:
                (a = e[i + 1]),
                  (r = e[i + 2]),
                  (s = e[i + 3]),
                  128 == (192 & a) &&
                    128 == (192 & r) &&
                    128 == (192 & s) &&
                    (l =
                      ((15 & c) << 18) |
                      ((63 & a) << 12) |
                      ((63 & r) << 6) |
                      (63 & s)) > 65535 &&
                    l < 1114112 &&
                    (d = l);
            }
          null === d
            ? ((d = 65533), (u = 1))
            : d > 65535 &&
              ((d -= 65536),
              o.push(((d >>> 10) & 1023) | 55296),
              (d = 56320 | (1023 & d))),
            o.push(d),
            (i += u);
        }
        return (function (e) {
          var t = e.length;
          if (t <= 4096) return String.fromCharCode.apply(String, e);
          var n = "",
            o = 0;
          for (; o < t; )
            n += String.fromCharCode.apply(String, e.slice(o, (o += 4096)));
          return n;
        })(o);
      }
      (t.Buffer = l),
        (t.SlowBuffer = function (e) {
          +e != e && (e = 0);
          return l.alloc(+e);
        }),
        (t.INSPECT_MAX_BYTES = 50),
        (l.TYPED_ARRAY_SUPPORT =
          void 0 !== e.TYPED_ARRAY_SUPPORT
            ? e.TYPED_ARRAY_SUPPORT
            : (function () {
                try {
                  var e = new Uint8Array(1);
                  return (
                    (e.__proto__ = {
                      __proto__: Uint8Array.prototype,
                      foo: function () {
                        return 42;
                      },
                    }),
                    42 === e.foo() &&
                      "function" == typeof e.subarray &&
                      0 === e.subarray(1, 1).byteLength
                  );
                } catch (e) {
                  return !1;
                }
              })()),
        (t.kMaxLength = r()),
        (l.poolSize = 8192),
        (l._augment = function (e) {
          return (e.__proto__ = l.prototype), e;
        }),
        (l.from = function (e, t, n) {
          return c(null, e, t, n);
        }),
        l.TYPED_ARRAY_SUPPORT &&
          ((l.prototype.__proto__ = Uint8Array.prototype),
          (l.__proto__ = Uint8Array),
          "undefined" != typeof Symbol &&
            Symbol.species &&
            l[Symbol.species] === l &&
            Object.defineProperty(l, Symbol.species, {
              value: null,
              configurable: !0,
            })),
        (l.alloc = function (e, t, n) {
          return (function (e, t, n, o) {
            return (
              d(t),
              t <= 0
                ? s(e, t)
                : void 0 !== n
                ? "string" == typeof o
                  ? s(e, t).fill(n, o)
                  : s(e, t).fill(n)
                : s(e, t)
            );
          })(null, e, t, n);
        }),
        (l.allocUnsafe = function (e) {
          return u(null, e);
        }),
        (l.allocUnsafeSlow = function (e) {
          return u(null, e);
        }),
        (l.isBuffer = function (e) {
          return !(null == e || !e._isBuffer);
        }),
        (l.compare = function (e, t) {
          if (!l.isBuffer(e) || !l.isBuffer(t))
            throw new TypeError("Arguments must be Buffers");
          if (e === t) return 0;
          for (
            var n = e.length, o = t.length, i = 0, a = Math.min(n, o);
            i < a;
            ++i
          )
            if (e[i] !== t[i]) {
              (n = e[i]), (o = t[i]);
              break;
            }
          return n < o ? -1 : o < n ? 1 : 0;
        }),
        (l.isEncoding = function (e) {
          switch (String(e).toLowerCase()) {
            case "hex":
            case "utf8":
            case "utf-8":
            case "ascii":
            case "latin1":
            case "binary":
            case "base64":
            case "ucs2":
            case "ucs-2":
            case "utf16le":
            case "utf-16le":
              return !0;
            default:
              return !1;
          }
        }),
        (l.concat = function (e, t) {
          if (!a(e))
            throw new TypeError('"list" argument must be an Array of Buffers');
          if (0 === e.length) return l.alloc(0);
          var n;
          if (void 0 === t)
            for (t = 0, n = 0; n < e.length; ++n) t += e[n].length;
          var o = l.allocUnsafe(t),
            i = 0;
          for (n = 0; n < e.length; ++n) {
            var r = e[n];
            if (!l.isBuffer(r))
              throw new TypeError(
                '"list" argument must be an Array of Buffers'
              );
            r.copy(o, i), (i += r.length);
          }
          return o;
        }),
        (l.byteLength = h),
        (l.prototype._isBuffer = !0),
        (l.prototype.swap16 = function () {
          var e = this.length;
          if (e % 2 != 0)
            throw new RangeError("Buffer size must be a multiple of 16-bits");
          for (var t = 0; t < e; t += 2) m(this, t, t + 1);
          return this;
        }),
        (l.prototype.swap32 = function () {
          var e = this.length;
          if (e % 4 != 0)
            throw new RangeError("Buffer size must be a multiple of 32-bits");
          for (var t = 0; t < e; t += 4)
            m(this, t, t + 3), m(this, t + 1, t + 2);
          return this;
        }),
        (l.prototype.swap64 = function () {
          var e = this.length;
          if (e % 8 != 0)
            throw new RangeError("Buffer size must be a multiple of 64-bits");
          for (var t = 0; t < e; t += 8)
            m(this, t, t + 7),
              m(this, t + 1, t + 6),
              m(this, t + 2, t + 5),
              m(this, t + 3, t + 4);
          return this;
        }),
        (l.prototype.toString = function () {
          var e = 0 | this.length;
          return 0 === e
            ? ""
            : 0 === arguments.length
            ? A(this, 0, e)
            : f.apply(this, arguments);
        }),
        (l.prototype.equals = function (e) {
          if (!l.isBuffer(e)) throw new TypeError("Argument must be a Buffer");
          return this === e || 0 === l.compare(this, e);
        }),
        (l.prototype.inspect = function () {
          var e = "",
            n = t.INSPECT_MAX_BYTES;
          return (
            this.length > 0 &&
              ((e = this.toString("hex", 0, n).match(/.{2}/g).join(" ")),
              this.length > n && (e += " ... ")),
            "<Buffer " + e + ">"
          );
        }),
        (l.prototype.compare = function (e, t, n, o, i) {
          if (!l.isBuffer(e)) throw new TypeError("Argument must be a Buffer");
          if (
            (void 0 === t && (t = 0),
            void 0 === n && (n = e ? e.length : 0),
            void 0 === o && (o = 0),
            void 0 === i && (i = this.length),
            t < 0 || n > e.length || o < 0 || i > this.length)
          )
            throw new RangeError("out of range index");
          if (o >= i && t >= n) return 0;
          if (o >= i) return -1;
          if (t >= n) return 1;
          if (this === e) return 0;
          for (
            var a = (i >>>= 0) - (o >>>= 0),
              r = (n >>>= 0) - (t >>>= 0),
              s = Math.min(a, r),
              c = this.slice(o, i),
              d = e.slice(t, n),
              u = 0;
            u < s;
            ++u
          )
            if (c[u] !== d[u]) {
              (a = c[u]), (r = d[u]);
              break;
            }
          return a < r ? -1 : r < a ? 1 : 0;
        }),
        (l.prototype.includes = function (e, t, n) {
          return -1 !== this.indexOf(e, t, n);
        }),
        (l.prototype.indexOf = function (e, t, n) {
          return y(this, e, t, n, !0);
        }),
        (l.prototype.lastIndexOf = function (e, t, n) {
          return y(this, e, t, n, !1);
        }),
        (l.prototype.write = function (e, t, n, o) {
          if (void 0 === t) (o = "utf8"), (n = this.length), (t = 0);
          else if (void 0 === n && "string" == typeof t)
            (o = t), (n = this.length), (t = 0);
          else {
            if (!isFinite(t))
              throw new Error(
                "Buffer.write(string, encoding, offset[, length]) is no longer supported"
              );
            (t |= 0),
              isFinite(n)
                ? ((n |= 0), void 0 === o && (o = "utf8"))
                : ((o = n), (n = void 0));
          }
          var i = this.length - t;
          if (
            ((void 0 === n || n > i) && (n = i),
            (e.length > 0 && (n < 0 || t < 0)) || t > this.length)
          )
            throw new RangeError("Attempt to write outside buffer bounds");
          o || (o = "utf8");
          for (var a = !1; ; )
            switch (o) {
              case "hex":
                return _(this, e, t, n);
              case "utf8":
              case "utf-8":
                return b(this, e, t, n);
              case "ascii":
                return w(this, e, t, n);
              case "latin1":
              case "binary":
                return C(this, e, t, n);
              case "base64":
                return x(this, e, t, n);
              case "ucs2":
              case "ucs-2":
              case "utf16le":
              case "utf-16le":
                return S(this, e, t, n);
              default:
                if (a) throw new TypeError("Unknown encoding: " + o);
                (o = ("" + o).toLowerCase()), (a = !0);
            }
        }),
        (l.prototype.toJSON = function () {
          return {
            type: "Buffer",
            data: Array.prototype.slice.call(this._arr || this, 0),
          };
        });
      function T(e, t, n) {
        var o = "";
        n = Math.min(e.length, n);
        for (var i = t; i < n; ++i) o += String.fromCharCode(127 & e[i]);
        return o;
      }
      function G(e, t, n) {
        var o = "";
        n = Math.min(e.length, n);
        for (var i = t; i < n; ++i) o += String.fromCharCode(e[i]);
        return o;
      }
      function P(e, t, n) {
        var o = e.length;
        (!t || t < 0) && (t = 0), (!n || n < 0 || n > o) && (n = o);
        for (var i = "", a = t; a < n; ++a) i += B(e[a]);
        return i;
      }
      function D(e, t, n) {
        for (var o = e.slice(t, n), i = "", a = 0; a < o.length; a += 2)
          i += String.fromCharCode(o[a] + 256 * o[a + 1]);
        return i;
      }
      function L(e, t, n) {
        if (e % 1 != 0 || e < 0) throw new RangeError("offset is not uint");
        if (e + t > n)
          throw new RangeError("Trying to access beyond buffer length");
      }
      function I(e, t, n, o, i, a) {
        if (!l.isBuffer(e))
          throw new TypeError('"buffer" argument must be a Buffer instance');
        if (t > i || t < a)
          throw new RangeError('"value" argument is out of bounds');
        if (n + o > e.length) throw new RangeError("Index out of range");
      }
      function k(e, t, n, o) {
        t < 0 && (t = 65535 + t + 1);
        for (var i = 0, a = Math.min(e.length - n, 2); i < a; ++i)
          e[n + i] =
            (t & (255 << (8 * (o ? i : 1 - i)))) >>> (8 * (o ? i : 1 - i));
      }
      function O(e, t, n, o) {
        t < 0 && (t = 4294967295 + t + 1);
        for (var i = 0, a = Math.min(e.length - n, 4); i < a; ++i)
          e[n + i] = (t >>> (8 * (o ? i : 3 - i))) & 255;
      }
      function F(e, t, n, o, i, a) {
        if (n + o > e.length) throw new RangeError("Index out of range");
        if (n < 0) throw new RangeError("Index out of range");
      }
      function R(e, t, n, o, a) {
        return a || F(e, 0, n, 4), i.write(e, t, n, o, 23, 4), n + 4;
      }
      function M(e, t, n, o, a) {
        return a || F(e, 0, n, 8), i.write(e, t, n, o, 52, 8), n + 8;
      }
      (l.prototype.slice = function (e, t) {
        var n,
          o = this.length;
        if (
          ((e = ~~e) < 0 ? (e += o) < 0 && (e = 0) : e > o && (e = o),
          (t = void 0 === t ? o : ~~t) < 0
            ? (t += o) < 0 && (t = 0)
            : t > o && (t = o),
          t < e && (t = e),
          l.TYPED_ARRAY_SUPPORT)
        )
          (n = this.subarray(e, t)).__proto__ = l.prototype;
        else {
          var i = t - e;
          n = new l(i, void 0);
          for (var a = 0; a < i; ++a) n[a] = this[a + e];
        }
        return n;
      }),
        (l.prototype.readUIntLE = function (e, t, n) {
          (e |= 0), (t |= 0), n || L(e, t, this.length);
          for (var o = this[e], i = 1, a = 0; ++a < t && (i *= 256); )
            o += this[e + a] * i;
          return o;
        }),
        (l.prototype.readUIntBE = function (e, t, n) {
          (e |= 0), (t |= 0), n || L(e, t, this.length);
          for (var o = this[e + --t], i = 1; t > 0 && (i *= 256); )
            o += this[e + --t] * i;
          return o;
        }),
        (l.prototype.readUInt8 = function (e, t) {
          return t || L(e, 1, this.length), this[e];
        }),
        (l.prototype.readUInt16LE = function (e, t) {
          return t || L(e, 2, this.length), this[e] | (this[e + 1] << 8);
        }),
        (l.prototype.readUInt16BE = function (e, t) {
          return t || L(e, 2, this.length), (this[e] << 8) | this[e + 1];
        }),
        (l.prototype.readUInt32LE = function (e, t) {
          return (
            t || L(e, 4, this.length),
            (this[e] | (this[e + 1] << 8) | (this[e + 2] << 16)) +
              16777216 * this[e + 3]
          );
        }),
        (l.prototype.readUInt32BE = function (e, t) {
          return (
            t || L(e, 4, this.length),
            16777216 * this[e] +
              ((this[e + 1] << 16) | (this[e + 2] << 8) | this[e + 3])
          );
        }),
        (l.prototype.readIntLE = function (e, t, n) {
          (e |= 0), (t |= 0), n || L(e, t, this.length);
          for (var o = this[e], i = 1, a = 0; ++a < t && (i *= 256); )
            o += this[e + a] * i;
          return o >= (i *= 128) && (o -= Math.pow(2, 8 * t)), o;
        }),
        (l.prototype.readIntBE = function (e, t, n) {
          (e |= 0), (t |= 0), n || L(e, t, this.length);
          for (var o = t, i = 1, a = this[e + --o]; o > 0 && (i *= 256); )
            a += this[e + --o] * i;
          return a >= (i *= 128) && (a -= Math.pow(2, 8 * t)), a;
        }),
        (l.prototype.readInt8 = function (e, t) {
          return (
            t || L(e, 1, this.length),
            128 & this[e] ? -1 * (255 - this[e] + 1) : this[e]
          );
        }),
        (l.prototype.readInt16LE = function (e, t) {
          t || L(e, 2, this.length);
          var n = this[e] | (this[e + 1] << 8);
          return 32768 & n ? 4294901760 | n : n;
        }),
        (l.prototype.readInt16BE = function (e, t) {
          t || L(e, 2, this.length);
          var n = this[e + 1] | (this[e] << 8);
          return 32768 & n ? 4294901760 | n : n;
        }),
        (l.prototype.readInt32LE = function (e, t) {
          return (
            t || L(e, 4, this.length),
            this[e] |
              (this[e + 1] << 8) |
              (this[e + 2] << 16) |
              (this[e + 3] << 24)
          );
        }),
        (l.prototype.readInt32BE = function (e, t) {
          return (
            t || L(e, 4, this.length),
            (this[e] << 24) |
              (this[e + 1] << 16) |
              (this[e + 2] << 8) |
              this[e + 3]
          );
        }),
        (l.prototype.readFloatLE = function (e, t) {
          return t || L(e, 4, this.length), i.read(this, e, !0, 23, 4);
        }),
        (l.prototype.readFloatBE = function (e, t) {
          return t || L(e, 4, this.length), i.read(this, e, !1, 23, 4);
        }),
        (l.prototype.readDoubleLE = function (e, t) {
          return t || L(e, 8, this.length), i.read(this, e, !0, 52, 8);
        }),
        (l.prototype.readDoubleBE = function (e, t) {
          return t || L(e, 8, this.length), i.read(this, e, !1, 52, 8);
        }),
        (l.prototype.writeUIntLE = function (e, t, n, o) {
          ((e = +e), (t |= 0), (n |= 0), o) ||
            I(this, e, t, n, Math.pow(2, 8 * n) - 1, 0);
          var i = 1,
            a = 0;
          for (this[t] = 255 & e; ++a < n && (i *= 256); )
            this[t + a] = (e / i) & 255;
          return t + n;
        }),
        (l.prototype.writeUIntBE = function (e, t, n, o) {
          ((e = +e), (t |= 0), (n |= 0), o) ||
            I(this, e, t, n, Math.pow(2, 8 * n) - 1, 0);
          var i = n - 1,
            a = 1;
          for (this[t + i] = 255 & e; --i >= 0 && (a *= 256); )
            this[t + i] = (e / a) & 255;
          return t + n;
        }),
        (l.prototype.writeUInt8 = function (e, t, n) {
          return (
            (e = +e),
            (t |= 0),
            n || I(this, e, t, 1, 255, 0),
            l.TYPED_ARRAY_SUPPORT || (e = Math.floor(e)),
            (this[t] = 255 & e),
            t + 1
          );
        }),
        (l.prototype.writeUInt16LE = function (e, t, n) {
          return (
            (e = +e),
            (t |= 0),
            n || I(this, e, t, 2, 65535, 0),
            l.TYPED_ARRAY_SUPPORT
              ? ((this[t] = 255 & e), (this[t + 1] = e >>> 8))
              : k(this, e, t, !0),
            t + 2
          );
        }),
        (l.prototype.writeUInt16BE = function (e, t, n) {
          return (
            (e = +e),
            (t |= 0),
            n || I(this, e, t, 2, 65535, 0),
            l.TYPED_ARRAY_SUPPORT
              ? ((this[t] = e >>> 8), (this[t + 1] = 255 & e))
              : k(this, e, t, !1),
            t + 2
          );
        }),
        (l.prototype.writeUInt32LE = function (e, t, n) {
          return (
            (e = +e),
            (t |= 0),
            n || I(this, e, t, 4, 4294967295, 0),
            l.TYPED_ARRAY_SUPPORT
              ? ((this[t + 3] = e >>> 24),
                (this[t + 2] = e >>> 16),
                (this[t + 1] = e >>> 8),
                (this[t] = 255 & e))
              : O(this, e, t, !0),
            t + 4
          );
        }),
        (l.prototype.writeUInt32BE = function (e, t, n) {
          return (
            (e = +e),
            (t |= 0),
            n || I(this, e, t, 4, 4294967295, 0),
            l.TYPED_ARRAY_SUPPORT
              ? ((this[t] = e >>> 24),
                (this[t + 1] = e >>> 16),
                (this[t + 2] = e >>> 8),
                (this[t + 3] = 255 & e))
              : O(this, e, t, !1),
            t + 4
          );
        }),
        (l.prototype.writeIntLE = function (e, t, n, o) {
          if (((e = +e), (t |= 0), !o)) {
            var i = Math.pow(2, 8 * n - 1);
            I(this, e, t, n, i - 1, -i);
          }
          var a = 0,
            r = 1,
            s = 0;
          for (this[t] = 255 & e; ++a < n && (r *= 256); )
            e < 0 && 0 === s && 0 !== this[t + a - 1] && (s = 1),
              (this[t + a] = (((e / r) >> 0) - s) & 255);
          return t + n;
        }),
        (l.prototype.writeIntBE = function (e, t, n, o) {
          if (((e = +e), (t |= 0), !o)) {
            var i = Math.pow(2, 8 * n - 1);
            I(this, e, t, n, i - 1, -i);
          }
          var a = n - 1,
            r = 1,
            s = 0;
          for (this[t + a] = 255 & e; --a >= 0 && (r *= 256); )
            e < 0 && 0 === s && 0 !== this[t + a + 1] && (s = 1),
              (this[t + a] = (((e / r) >> 0) - s) & 255);
          return t + n;
        }),
        (l.prototype.writeInt8 = function (e, t, n) {
          return (
            (e = +e),
            (t |= 0),
            n || I(this, e, t, 1, 127, -128),
            l.TYPED_ARRAY_SUPPORT || (e = Math.floor(e)),
            e < 0 && (e = 255 + e + 1),
            (this[t] = 255 & e),
            t + 1
          );
        }),
        (l.prototype.writeInt16LE = function (e, t, n) {
          return (
            (e = +e),
            (t |= 0),
            n || I(this, e, t, 2, 32767, -32768),
            l.TYPED_ARRAY_SUPPORT
              ? ((this[t] = 255 & e), (this[t + 1] = e >>> 8))
              : k(this, e, t, !0),
            t + 2
          );
        }),
        (l.prototype.writeInt16BE = function (e, t, n) {
          return (
            (e = +e),
            (t |= 0),
            n || I(this, e, t, 2, 32767, -32768),
            l.TYPED_ARRAY_SUPPORT
              ? ((this[t] = e >>> 8), (this[t + 1] = 255 & e))
              : k(this, e, t, !1),
            t + 2
          );
        }),
        (l.prototype.writeInt32LE = function (e, t, n) {
          return (
            (e = +e),
            (t |= 0),
            n || I(this, e, t, 4, 2147483647, -2147483648),
            l.TYPED_ARRAY_SUPPORT
              ? ((this[t] = 255 & e),
                (this[t + 1] = e >>> 8),
                (this[t + 2] = e >>> 16),
                (this[t + 3] = e >>> 24))
              : O(this, e, t, !0),
            t + 4
          );
        }),
        (l.prototype.writeInt32BE = function (e, t, n) {
          return (
            (e = +e),
            (t |= 0),
            n || I(this, e, t, 4, 2147483647, -2147483648),
            e < 0 && (e = 4294967295 + e + 1),
            l.TYPED_ARRAY_SUPPORT
              ? ((this[t] = e >>> 24),
                (this[t + 1] = e >>> 16),
                (this[t + 2] = e >>> 8),
                (this[t + 3] = 255 & e))
              : O(this, e, t, !1),
            t + 4
          );
        }),
        (l.prototype.writeFloatLE = function (e, t, n) {
          return R(this, e, t, !0, n);
        }),
        (l.prototype.writeFloatBE = function (e, t, n) {
          return R(this, e, t, !1, n);
        }),
        (l.prototype.writeDoubleLE = function (e, t, n) {
          return M(this, e, t, !0, n);
        }),
        (l.prototype.writeDoubleBE = function (e, t, n) {
          return M(this, e, t, !1, n);
        }),
        (l.prototype.copy = function (e, t, n, o) {
          if (
            (n || (n = 0),
            o || 0 === o || (o = this.length),
            t >= e.length && (t = e.length),
            t || (t = 0),
            o > 0 && o < n && (o = n),
            o === n)
          )
            return 0;
          if (0 === e.length || 0 === this.length) return 0;
          if (t < 0) throw new RangeError("targetStart out of bounds");
          if (n < 0 || n >= this.length)
            throw new RangeError("sourceStart out of bounds");
          if (o < 0) throw new RangeError("sourceEnd out of bounds");
          o > this.length && (o = this.length),
            e.length - t < o - n && (o = e.length - t + n);
          var i,
            a = o - n;
          if (this === e && n < t && t < o)
            for (i = a - 1; i >= 0; --i) e[i + t] = this[i + n];
          else if (a < 1e3 || !l.TYPED_ARRAY_SUPPORT)
            for (i = 0; i < a; ++i) e[i + t] = this[i + n];
          else Uint8Array.prototype.set.call(e, this.subarray(n, n + a), t);
          return a;
        }),
        (l.prototype.fill = function (e, t, n, o) {
          if ("string" == typeof e) {
            if (
              ("string" == typeof t
                ? ((o = t), (t = 0), (n = this.length))
                : "string" == typeof n && ((o = n), (n = this.length)),
              1 === e.length)
            ) {
              var i = e.charCodeAt(0);
              i < 256 && (e = i);
            }
            if (void 0 !== o && "string" != typeof o)
              throw new TypeError("encoding must be a string");
            if ("string" == typeof o && !l.isEncoding(o))
              throw new TypeError("Unknown encoding: " + o);
          } else "number" == typeof e && (e &= 255);
          if (t < 0 || this.length < t || this.length < n)
            throw new RangeError("Out of range index");
          if (n <= t) return this;
          var a;
          if (
            ((t >>>= 0),
            (n = void 0 === n ? this.length : n >>> 0),
            e || (e = 0),
            "number" == typeof e)
          )
            for (a = t; a < n; ++a) this[a] = e;
          else {
            var r = l.isBuffer(e) ? e : U(new l(e, o).toString()),
              s = r.length;
            for (a = 0; a < n - t; ++a) this[a + t] = r[a % s];
          }
          return this;
        });
      var N = /[^+\/0-9A-Za-z-_]/g;
      function B(e) {
        return e < 16 ? "0" + e.toString(16) : e.toString(16);
      }
      function U(e, t) {
        var n;
        t = t || 1 / 0;
        for (var o = e.length, i = null, a = [], r = 0; r < o; ++r) {
          if ((n = e.charCodeAt(r)) > 55295 && n < 57344) {
            if (!i) {
              if (n > 56319) {
                (t -= 3) > -1 && a.push(239, 191, 189);
                continue;
              }
              if (r + 1 === o) {
                (t -= 3) > -1 && a.push(239, 191, 189);
                continue;
              }
              i = n;
              continue;
            }
            if (n < 56320) {
              (t -= 3) > -1 && a.push(239, 191, 189), (i = n);
              continue;
            }
            n = 65536 + (((i - 55296) << 10) | (n - 56320));
          } else i && (t -= 3) > -1 && a.push(239, 191, 189);
          if (((i = null), n < 128)) {
            if ((t -= 1) < 0) break;
            a.push(n);
          } else if (n < 2048) {
            if ((t -= 2) < 0) break;
            a.push((n >> 6) | 192, (63 & n) | 128);
          } else if (n < 65536) {
            if ((t -= 3) < 0) break;
            a.push((n >> 12) | 224, ((n >> 6) & 63) | 128, (63 & n) | 128);
          } else {
            if (!(n < 1114112)) throw new Error("Invalid code point");
            if ((t -= 4) < 0) break;
            a.push(
              (n >> 18) | 240,
              ((n >> 12) & 63) | 128,
              ((n >> 6) & 63) | 128,
              (63 & n) | 128
            );
          }
        }
        return a;
      }
      function $(e) {
        return o.toByteArray(
          (function (e) {
            if (
              (e = (function (e) {
                return e.trim ? e.trim() : e.replace(/^\s+|\s+$/g, "");
              })(e).replace(N, "")).length < 2
            )
              return "";
            for (; e.length % 4 != 0; ) e += "=";
            return e;
          })(e)
        );
      }
      function j(e, t, n, o) {
        for (var i = 0; i < o && !(i + n >= t.length || i >= e.length); ++i)
          t[i + n] = e[i];
        return i;
      }
    }).call(this, n(109));
  }