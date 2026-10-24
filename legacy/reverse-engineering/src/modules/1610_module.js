/**
 * Webpack Module #1610
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(1),
      i = n(237);
    function a() {}
    o.GObject.inherit(a, i),
      (a.Item = function (e) {
        i.Item.call(this, new a()), (this._extension = e);
      }),
      o.GObject.inherit(a.Item, i.Item),
      (a.Item.prototype._extension = null),
      (a.Item.prototype.getExtension = function () {
        return this._extension;
      }),
      (a.Item.prototype.read = function (e, t, n) {
        return e(this._data);
      }),
      (a.Item.prototype.write = function (e, t, n, o) {
        (this._data = e), t && t();
      }),
      (e.exports = a);
  }