/**
 * Webpack Module #1671
 * Type: class
 * Name: GModule
 */

function (e, t, n) {
    "use strict";
    function o(e) {
      (this.id = e), (this._intervals = []), (this._timeouts = []);
    }
    n(3),
      n(4),
      n(32),
      n(33),
      (o.prototype.exports = null),
      (o.prototype.id = null),
      (o.prototype._intervals = null),
      (o.prototype._timeouts = null),
      (o.prototype.setTimeout = function () {
        let e = setTimeout.apply(null, arguments);
        return this._timeouts.push(e), e;
      }),
      (o.prototype.setInterval = function () {
        let e = setInterval.apply(null, arguments);
        return this._intervals.push(e), e;
      }),
      (o.prototype.unload = function () {
        this._timeouts.forEach((e) => clearTimeout(e)),
          this._intervals.forEach((e) => clearInterval(e)),
          (this._timeouts = []),
          (this._intervals = []);
      }),
      (o.prototype.toString = function () {
        return "[Object GModule]";
      }),
      (e.exports = o);
  }