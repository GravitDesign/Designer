/**
 * Webpack Module #1621
 * Type: class
 * Name: GOpenLinkAction
 */

function (e, t, n) {
    "use strict";
    n(3);
    var o = n(1),
      i = (n(18), n(31));
    function a(e) {
      let { name: t, category: n, group: i, link: a, icon: r, builder: s } = e;
      (this._name = t),
        (this._category = n),
        (this._group = i),
        (this._link = a),
        (this._builder = s),
        (this._title = new o.GLocaleKey("GOpenLinkAction", "title." + t)),
        (this._icon = r);
    }
    (a.Links = n(1622)),
      o.GObject.inherit(a, i),
      (a.ID = "open-link"),
      (a.prototype._name = null),
      (a.prototype._title = null),
      (a.prototype.getIcon = function () {
        return this._icon || null;
      }),
      (a.prototype.getId = function () {
        return a.ID + "." + this._name;
      }),
      (a.prototype.getTitle = function () {
        return this._title;
      }),
      (a.prototype.getCategory = function () {
        return this._category;
      }),
      (a.prototype.getGroup = function () {
        return this._group;
      }),
      (a.prototype.isEnabled = function () {
        return !0;
      }),
      (a.prototype.execute = function () {
        if (this._link || this._builder) {
          let e =
            (this._builder &&
              "function" == typeof this._builder &&
              this._builder()) ||
            this._link;
          e && gContainer.openExternalLink(null, e);
        }
      }),
      (a.prototype.toString = function () {
        return "[Object GOpenLinkAction]";
      }),
      (e.exports = a);
  }