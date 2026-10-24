/**
 * Webpack Module #1191
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(4), n(32), n(33);
    const { GObject: o } = n(1),
      { GPlatform: i } = n(15);
    function a() {
      this._children = [];
    }
    o.inherit(a, o),
      (a.prototype._children = null),
      (a.prototype.clear = function () {
        this._clearChildren(), this._clearOwnData();
      }),
      (a.prototype._clearOwnData = function () {}),
      (a.prototype._clearChildren = function () {
        this._children &&
          this._children.length &&
          this._children.forEach((e) => e.clear()),
          (this._children = []);
      }),
      (a.prototype.clearChildren = function () {
        this._clearChildren();
      }),
      (a.prototype.getChildren = function () {
        return this._children;
      }),
      (a.prototype.addChild = function (e) {
        this._children.push(e);
      }),
      (a.prototype.scrollIntoView = function () {}),
      (a.prototype.setVisiblity = function (e) {
        throw Error("Not implemented!");
      }),
      (a.prototype._scrollToElement = function (e) {
        if (!e || !e[0]) return;
        const t = i.webBrowser === i.constructor.WebBrowser.Firefox,
          n = t ? "start" : "nearest",
          o = t ? "auto" : "smooth";
        "function" == typeof e[0].scrollIntoView &&
          e[0].scrollIntoView({ behavior: o, block: n });
      }),
      (e.exports = a);
  }