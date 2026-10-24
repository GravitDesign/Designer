/**
 * Webpack Module #1516
 * Type: unknown
 */

function (e, t) {
    (function () {
      !(function (e) {
        "use strict";
        function t(e, t) {
          var n = { raw: !0, chunkSize: 1048576 };
          t && "number" == typeof t.level && (n.level = t.level),
            (this._backEnd = e ? new pako.Deflate(n) : new pako.Inflate(n)),
            (this._chunks = []),
            (this._dataLength = 0),
            (this._backEnd.onData = this._onData.bind(this));
        }
        function n(e) {
          t.call(this, !0, e);
        }
        function o() {
          t.call(this, !1);
        }
        (t.prototype._onData = function (e) {
          this._chunks.push(e), (this._dataLength += e.length);
        }),
          (t.prototype._fetchData = function () {
            var e = this._backEnd;
            if (0 !== e.err) throw new Error(e.msg);
            var t,
              n = this._chunks;
            if (1 === n.length) t = n[0];
            else if (n.length > 1) {
              t = new Uint8Array(this._dataLength);
              for (var o = 0, i = n.length, a = 0; o < i; o++) {
                var r = n[o];
                t.set(r, a), (a += r.length);
              }
            }
            return (n.length = 0), (this._dataLength = 0), t;
          }),
          (t.prototype.append = function (e, t) {
            return this._backEnd.push(e, !1), this._fetchData();
          }),
          (t.prototype.flush = function () {
            return this._backEnd.push(new Uint8Array(0), !0), this._fetchData();
          }),
          (n.prototype = Object.create(t.prototype)),
          (o.prototype = Object.create(t.prototype));
        var i = e.zip || e;
        (i.Deflater = i._pako_Deflater = n),
          (i.Inflater = i._pako_Inflater = o);
      })(this);
    }).call(window);
  }