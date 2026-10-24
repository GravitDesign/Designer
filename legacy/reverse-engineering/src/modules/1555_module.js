/**
 * Webpack Module #1555
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(30), n(4), n(38), n(97);
    const o = n(156),
      i = n(1301);
    function a(e) {
      var t, n, o;
      if (
        (e && ((t = e.nextPageToken), (n = e.items), (o = e.query)),
        n && !this._isItemValid(n))
      )
        throw Error("Must be a cloud item");
      (this.nextPageToken = t), (this.items = n || []), (this.query = o);
    }
    (a.prototype._isItemValid = function (e) {
      return !(e = e instanceof Array ? e : [e]).some((e) => !e instanceof o);
    }),
      (a.prototype.nextPageToken = null),
      (a.prototype.items = null),
      (a.prototype.isEmpty = function () {
        return (
          !this.items || (this.items instanceof Array && !this.items.length)
        );
      }),
      (a.prototype.getSize = function () {
        return this.items.length;
      }),
      (a.prototype.getItems = function () {
        return this.items;
      }),
      (a.prototype.update = function (e) {
        var t = e.nextPageToken,
          n = e.items,
          o = e.query;
        if (!this._isItemValid(n)) throw Error("Must be a cloud item");
        (this.nextPageToken = t),
          (this.items = this.items.concat(n)),
          o && (this.query = o);
      }),
      (a.from = function (e) {
        var t = new a();
        return (
          (t = Object.assign(t, e)).query && (t.query = i.from(t.query)),
          t.items && (t.items = t.items.map((e) => o.from(e))),
          t
        );
      }),
      (e.exports = a);
  }