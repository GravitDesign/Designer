/**
 * Webpack Module #1069
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    function o() {
      for (var e = arguments.length, t = new Array(e), n = 0; n < e; n++)
        t[n] = arguments[n];
      t && this._updateFromArguments(t);
    }
    n(19),
      n(26),
      (o.prototype._updateFromArguments = function () {
        for (var e = arguments.length, t = new Array(e), n = 0; n < e; n++)
          t[n] = arguments[n];
        const o = new Map(...t);
        var i = !1;
        const a = 0,
          r = 1,
          s = o.entries();
        let l = s.next();
        do {
          if (((i = l.done), l.value)) {
            const e = l.value[a],
              t = l.value[r];
            (this[e] = t), (l = s.next());
          }
        } while (!i);
      }),
      (o.prototype.has = function (e) {
        return this.hasOwnProperty(e);
      }),
      (o.prototype.delete = function (e) {
        this.isFrozen() || delete this[e];
      }),
      (o.prototype.set = function (e, t) {
        this.isFrozen() || (this[e] = t);
      }),
      (o.prototype.get = function (e) {
        return this[e];
      }),
      (o.prototype.isFrozen = function () {
        return Object.isFrozen(this);
      }),
      Object.freeze(o.prototype),
      (e.exports = o);
  }