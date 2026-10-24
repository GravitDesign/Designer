/**
 * Webpack Module #1210
 * Type: unknown
 */

function (e, t, n) {
    (function (t) {
      !(function (n) {
        e.exports = (function (e) {
          "use strict";
          function n(e, t) {
            return (
              "object" == typeof e &&
              null !== e &&
              (e.constructor === t ||
                Object.prototype.toString.call(e) === "[object " + t.name + "]")
            );
          }
          function o(e, t) {
            return !t && n(e, Array) ? e : Array.prototype.slice.call(e);
          }
          function i(e, t) {
            return void 0 !== e ? e : t;
          }
          function a(e, o, r, s) {
            if (a.is(e)) {
              var l = e.slice(o, o + r);
              return (l._littleEndian = i(s, l._littleEndian)), l;
            }
            if (!a.is(this)) return new a(e, o, r, s);
            if (
              ((this.buffer = e = a.wrapBuffer(e)),
              (this._isArrayBuffer = d.ArrayBuffer && n(e, ArrayBuffer)),
              (this._isPixelData = !1),
              (this._isDataView = d.DataView && this._isArrayBuffer),
              (this._isNodeBuffer = d.NodeBuffer && n(e, t)),
              !this._isNodeBuffer && !this._isArrayBuffer && !n(e, Array))
            )
              throw new TypeError("jDataView buffer has an incompatible type");
            this._littleEndian = !!s;
            var c = "byteLength" in e ? e.byteLength : e.length;
            (this.byteOffset = o = i(o, 0)),
              (this.byteLength = r = i(r, c - o)),
              (this._offset = this._bitOffset = 0),
              this._isDataView
                ? (this._view = new DataView(e, o, r))
                : this._checkBounds(o, r, c),
              (this._engineAction = this._isDataView
                ? this._dataViewAction
                : this._isNodeBuffer
                ? this._nodeBufferAction
                : this._isArrayBuffer
                ? this._arrayBufferAction
                : this._arrayAction);
          }
          function r(e) {
            if (d.NodeBuffer) return new t(e, "binary");
            for (
              var n = new (d.ArrayBuffer ? Uint8Array : Array)(e.length),
                o = 0,
                i = e.length;
              i > o;
              o++
            )
              n[o] = 255 & e.charCodeAt(o);
            return n;
          }
          function s(e) {
            return e >= 0 && 31 > e ? 1 << e : s[e] || (s[e] = Math.pow(2, e));
          }
          function l(e, t) {
            (this.lo = e), (this.hi = t);
          }
          function c() {
            l.apply(this, arguments);
          }
          var d = {
              NodeBuffer: "Buffer" in e,
              DataView: "DataView" in e,
              ArrayBuffer: "ArrayBuffer" in e,
              PixelData: !1,
            },
            u = e.TextEncoder,
            p = e.TextDecoder;
          d.NodeBuffer &&
            (function (e) {
              try {
                e.writeFloatLE(1 / 0, 0);
              } catch (e) {
                d.NodeBuffer = !1;
              }
            })(new t(4));
          var g = {
            Int8: 1,
            Int16: 2,
            Int32: 4,
            Uint8: 1,
            Uint16: 2,
            Uint32: 4,
            Float32: 4,
            Float64: 8,
          };
          (a.wrapBuffer = function (e) {
            switch (typeof e) {
              case "number":
                if (d.NodeBuffer) (e = new t(e)).fill(0);
                else if (d.ArrayBuffer) e = new Uint8Array(e).buffer;
                else {
                  e = new Array(e);
                  for (var i = 0; i < e.length; i++) e[i] = 0;
                }
                return e;
              case "string":
                e = r(e);
              default:
                return (
                  "length" in e &&
                    !(
                      (d.NodeBuffer && n(e, t)) ||
                      (d.ArrayBuffer && n(e, ArrayBuffer))
                    ) &&
                    (d.NodeBuffer
                      ? (e = new t(e))
                      : d.ArrayBuffer
                      ? n(e, ArrayBuffer) ||
                        n((e = new Uint8Array(e).buffer), ArrayBuffer) ||
                        (e = new Uint8Array(o(e, !0)).buffer)
                      : (e = o(e))),
                  e
                );
            }
          }),
            (a.is = function (e) {
              return e && e.jDataView;
            }),
            (a.from = function () {
              return new a(arguments);
            }),
            (a.Uint64 = l),
            (l.prototype = {
              valueOf: function () {
                return this.lo + s(32) * this.hi;
              },
              toString: function () {
                return Number.prototype.toString.apply(
                  this.valueOf(),
                  arguments
                );
              },
            }),
            (l.fromNumber = function (e) {
              var t = Math.floor(e / s(32));
              return new l(e - t * s(32), t);
            }),
            (a.Int64 = c),
            (c.prototype =
              "create" in Object ? Object.create(l.prototype) : new l()),
            (c.prototype.valueOf = function () {
              return this.hi < s(31)
                ? l.prototype.valueOf.apply(this, arguments)
                : -(s(32) - this.lo + s(32) * (s(32) - 1 - this.hi));
            }),
            (c.fromNumber = function (e) {
              var t, n;
              if (e >= 0) {
                var o = l.fromNumber(e);
                (t = o.lo), (n = o.hi);
              } else
                (t = e - (n = Math.floor(e / s(32))) * s(32)), (n += s(32));
              return new c(t, n);
            });
          var h = (a.prototype = {
              compatibility: d,
              jDataView: !0,
              _checkBounds: function (e, t, n) {
                if ("number" != typeof e)
                  throw new TypeError("Offset is not a number.");
                if ("number" != typeof t)
                  throw new TypeError("Size is not a number.");
                if (0 > t) throw new RangeError("Length is negative.");
                if (0 > e || e + t > i(n, this.byteLength))
                  throw new RangeError("Offsets are out of bounds.");
              },
              _action: function (e, t, n, o, a) {
                return this._engineAction(
                  e,
                  t,
                  i(n, this._offset),
                  i(o, this._littleEndian),
                  a
                );
              },
              _dataViewAction: function (e, t, n, o, i) {
                return (
                  (this._offset = n + g[e]),
                  t
                    ? this._view["get" + e](n, o)
                    : this._view["set" + e](n, i, o)
                );
              },
              _arrayBufferAction: function (t, n, o, a, r) {
                var s,
                  l = g[t],
                  c = e[t + "Array"];
                if (
                  ((a = i(a, this._littleEndian)),
                  1 === l || ((this.byteOffset + o) % l == 0 && a))
                )
                  return (
                    (s = new c(this.buffer, this.byteOffset + o, 1)),
                    (this._offset = o + l),
                    n ? s[0] : (s[0] = r)
                  );
                var d = new Uint8Array(n ? this.getBytes(l, o, a, !0) : l);
                return (
                  (s = new c(d.buffer, 0, 1)),
                  n ? s[0] : ((s[0] = r), void this._setBytes(o, d, a))
                );
              },
              _arrayAction: function (e, t, n, o, i) {
                return t ? this["_get" + e](n, o) : this["_set" + e](n, i, o);
              },
              _getBytes: function (e, t, n) {
                (n = i(n, this._littleEndian)),
                  (t = i(t, this._offset)),
                  (e = i(e, this.byteLength - t)),
                  this._checkBounds(t, e),
                  (t += this.byteOffset),
                  (this._offset = t - this.byteOffset + e);
                var a = this._isArrayBuffer
                  ? new Uint8Array(this.buffer, t, e)
                  : (this.buffer.slice || Array.prototype.slice).call(
                      this.buffer,
                      t,
                      t + e
                    );
                return n || 1 >= e ? a : o(a).reverse();
              },
              getBytes: function (e, t, n, a) {
                var r = this._getBytes(e, t, i(n, !0));
                return a ? o(r) : r;
              },
              _setBytes: function (e, n, a) {
                var r = n.length;
                if (0 !== r) {
                  if (
                    ((a = i(a, this._littleEndian)),
                    (e = i(e, this._offset)),
                    this._checkBounds(e, r),
                    !a && r > 1 && (n = o(n, !0).reverse()),
                    (e += this.byteOffset),
                    this._isArrayBuffer)
                  )
                    new Uint8Array(this.buffer, e, r).set(n);
                  else if (this._isNodeBuffer) new t(n).copy(this.buffer, e);
                  else for (var s = 0; r > s; s++) this.buffer[e + s] = n[s];
                  this._offset = e - this.byteOffset + r;
                }
              },
              setBytes: function (e, t, n) {
                this._setBytes(e, t, i(n, !0));
              },
              getString: function (e, t, n) {
                if (this._isNodeBuffer)
                  return (
                    (t = i(t, this._offset)),
                    (e = i(e, this.byteLength - t)),
                    this._checkBounds(t, e),
                    (this._offset = t + e),
                    this.buffer.toString(
                      n || "binary",
                      this.byteOffset + t,
                      this.byteOffset + this._offset
                    )
                  );
                var o = this._getBytes(e, t, !0);
                if (
                  ((n = "utf8" === n ? "utf-8" : n || "binary"),
                  p && "binary" !== n)
                )
                  return new p(n).decode(
                    this._isArrayBuffer ? o : new Uint8Array(o)
                  );
                var a = "";
                e = o.length;
                for (var r = 0; e > r; r++) a += String.fromCharCode(o[r]);
                return "utf-8" === n && (a = decodeURIComponent(escape(a))), a;
              },
              setString: function (e, t, n) {
                if (this._isNodeBuffer)
                  return (
                    (e = i(e, this._offset)),
                    this._checkBounds(e, t.length),
                    void (this._offset =
                      e +
                      this.buffer.write(t, this.byteOffset + e, n || "binary"))
                  );
                var o;
                (n = "utf8" === n ? "utf-8" : n || "binary"),
                  u && "binary" !== n
                    ? (o = new u(n).encode(t))
                    : ("utf-8" === n && (t = unescape(encodeURIComponent(t))),
                      (o = r(t))),
                  this._setBytes(e, o, !0);
              },
              getChar: function (e) {
                return this.getString(1, e);
              },
              setChar: function (e, t) {
                this.setString(e, t);
              },
              tell: function () {
                return this._offset;
              },
              seek: function (e) {
                return this._checkBounds(e, 0), (this._offset = e);
              },
              skip: function (e) {
                return this.seek(this._offset + e);
              },
              slice: function (e, t, n) {
                function o(e, t) {
                  return 0 > e ? e + t : e;
                }
                return (
                  (e = o(e, this.byteLength)),
                  (t = o(i(t, this.byteLength), this.byteLength)),
                  n
                    ? new a(
                        this.getBytes(t - e, e, !0, !0),
                        void 0,
                        void 0,
                        this._littleEndian
                      )
                    : new a(
                        this.buffer,
                        this.byteOffset + e,
                        t - e,
                        this._littleEndian
                      )
                );
              },
              alignBy: function (e) {
                return (
                  (this._bitOffset = 0),
                  1 !== i(e, 1)
                    ? this.skip(e - (this._offset % e || e))
                    : this._offset
                );
              },
              _getFloat64: function (e, t) {
                var n = this._getBytes(8, e, t),
                  o = 1 - 2 * (n[7] >> 7),
                  i = ((((n[7] << 1) & 255) << 3) | (n[6] >> 4)) - 1023,
                  a =
                    (15 & n[6]) * s(48) +
                    n[5] * s(40) +
                    n[4] * s(32) +
                    n[3] * s(24) +
                    n[2] * s(16) +
                    n[1] * s(8) +
                    n[0];
                return 1024 === i
                  ? 0 !== a
                    ? NaN
                    : (1 / 0) * o
                  : -1023 === i
                  ? o * a * s(-1074)
                  : o * (1 + a * s(-52)) * s(i);
              },
              _getFloat32: function (e, t) {
                var n = this._getBytes(4, e, t),
                  o = 1 - 2 * (n[3] >> 7),
                  i = (((n[3] << 1) & 255) | (n[2] >> 7)) - 127,
                  a = ((127 & n[2]) << 16) | (n[1] << 8) | n[0];
                return 128 === i
                  ? 0 !== a
                    ? NaN
                    : (1 / 0) * o
                  : -127 === i
                  ? o * a * s(-149)
                  : o * (1 + a * s(-23)) * s(i);
              },
              _get64: function (e, t, n) {
                (n = i(n, this._littleEndian)), (t = i(t, this._offset));
                for (var o = n ? [0, 4] : [4, 0], a = 0; 2 > a; a++)
                  o[a] = this.getUint32(t + o[a], n);
                return (this._offset = t + 8), new e(o[0], o[1]);
              },
              getInt64: function (e, t) {
                return this._get64(c, e, t);
              },
              getUint64: function (e, t) {
                return this._get64(l, e, t);
              },
              _getInt32: function (e, t) {
                var n = this._getBytes(4, e, t);
                return (n[3] << 24) | (n[2] << 16) | (n[1] << 8) | n[0];
              },
              _getUint32: function (e, t) {
                return this._getInt32(e, t) >>> 0;
              },
              _getInt16: function (e, t) {
                return (this._getUint16(e, t) << 16) >> 16;
              },
              _getUint16: function (e, t) {
                var n = this._getBytes(2, e, t);
                return (n[1] << 8) | n[0];
              },
              _getInt8: function (e) {
                return (this._getUint8(e) << 24) >> 24;
              },
              _getUint8: function (e) {
                return this._getBytes(1, e)[0];
              },
              _getBitRangeData: function (e, t) {
                var n = (i(t, this._offset) << 3) + this._bitOffset,
                  o = n + e,
                  a = n >>> 3,
                  r = (o + 7) >>> 3,
                  s = this._getBytes(r - a, a, !0),
                  l = 0;
                (this._bitOffset = 7 & o) && (this._bitOffset -= 8);
                for (var c = 0, d = s.length; d > c; c++) l = (l << 8) | s[c];
                return { start: a, bytes: s, wideValue: l };
              },
              getSigned: function (e, t) {
                var n = 32 - e;
                return (this.getUnsigned(e, t) << n) >> n;
              },
              getUnsigned: function (e, t) {
                var n =
                  this._getBitRangeData(e, t).wideValue >>> -this._bitOffset;
                return 32 > e ? n & ~(-1 << e) : n;
              },
              _setBinaryFloat: function (e, t, n, o, i) {
                var a,
                  r,
                  l = 0 > t ? 1 : 0,
                  c = ~(-1 << (o - 1)),
                  d = 1 - c;
                0 > t && (t = -t),
                  0 === t
                    ? ((a = 0), (r = 0))
                    : isNaN(t)
                    ? ((a = 2 * c + 1), (r = 1))
                    : 1 / 0 === t
                    ? ((a = 2 * c + 1), (r = 0))
                    : (a = Math.floor(Math.log(t) / Math.LN2)) >= d && c >= a
                    ? ((r = Math.floor((t * s(-a) - 1) * s(n))), (a += c))
                    : ((r = Math.floor(t / s(d - n))), (a = 0));
                for (var u = []; n >= 8; )
                  u.push(r % 256), (r = Math.floor(r / 256)), (n -= 8);
                for (a = (a << n) | r, o += n; o >= 8; )
                  u.push(255 & a), (a >>>= 8), (o -= 8);
                u.push((l << o) | a), this._setBytes(e, u, i);
              },
              _setFloat32: function (e, t, n) {
                this._setBinaryFloat(e, t, 23, 8, n);
              },
              _setFloat64: function (e, t, n) {
                this._setBinaryFloat(e, t, 52, 11, n);
              },
              _set64: function (e, t, n, o) {
                "object" != typeof n && (n = e.fromNumber(n)),
                  (o = i(o, this._littleEndian)),
                  (t = i(t, this._offset));
                var a = o ? { lo: 0, hi: 4 } : { lo: 4, hi: 0 };
                for (var r in a) this.setUint32(t + a[r], n[r], o);
                this._offset = t + 8;
              },
              setInt64: function (e, t, n) {
                this._set64(c, e, t, n);
              },
              setUint64: function (e, t, n) {
                this._set64(l, e, t, n);
              },
              _setUint32: function (e, t, n) {
                this._setBytes(
                  e,
                  [255 & t, (t >>> 8) & 255, (t >>> 16) & 255, t >>> 24],
                  n
                );
              },
              _setUint16: function (e, t, n) {
                this._setBytes(e, [255 & t, (t >>> 8) & 255], n);
              },
              _setUint8: function (e, t) {
                this._setBytes(e, [255 & t]);
              },
              setUnsigned: function (e, t, n) {
                var o = this._getBitRangeData(n, e),
                  i = o.wideValue,
                  a = o.bytes;
                (i &= ~(~(-1 << n) << -this._bitOffset)),
                  (i |= (32 > n ? t & ~(-1 << n) : t) << -this._bitOffset);
                for (var r = a.length - 1; r >= 0; r--)
                  (a[r] = 255 & i), (i >>>= 8);
                this._setBytes(o.start, a, !0);
              },
            }),
            f = {
              Int8: "Int8",
              Int16: "Int16",
              Int32: "Int32",
              Uint8: "UInt8",
              Uint16: "UInt16",
              Uint32: "UInt32",
              Float32: "Float",
              Float64: "Double",
            };
          for (var m in ((h._nodeBufferAction = function (e, t, n, o, i) {
            this._offset = n + g[e];
            var a =
              f[e] + ("Int8" === e || "Uint8" === e ? "" : o ? "LE" : "BE");
            return (
              (n += this.byteOffset),
              t ? this.buffer["read" + a](n) : this.buffer["write" + a](i, n)
            );
          }),
          g))
            !(function (e) {
              (h["get" + e] = function (t, n) {
                return this._action(e, !0, t, n);
              }),
                (h["set" + e] = function (t, n, o) {
                  this._action(e, !1, t, o, n);
                });
            })(m);
          for (var y in ((h._setInt32 = h._setUint32),
          (h._setInt16 = h._setUint16),
          (h._setInt8 = h._setUint8),
          (h.setSigned = h.setUnsigned),
          h))
            "set" === y.slice(0, 3) &&
              (function (e) {
                h["write" + e] = function () {
                  Array.prototype.unshift.call(arguments, void 0),
                    this["set" + e].apply(this, arguments);
                };
              })(y.slice(3));
          return a;
        })(this);
      })();
    }).call(this, n(221).Buffer);
  }