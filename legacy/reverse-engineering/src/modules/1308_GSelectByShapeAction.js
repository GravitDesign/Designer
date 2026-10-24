/**
 * Webpack Module #1308
 * Type: class
 * Name: GSelectByShapeAction
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    n(3);
    var i = n(1),
      a = o(n(609));
    function r() {
      a.default.call(this, r.ID, r.TITLE);
    }
    i.GObject.inherit(r, a.default),
      (r.ID = "edit.select-by-shape"),
      (r.TITLE = new i.GLocaleKey("GSelectByShapeAction", "title")),
      (r.prototype.getGroup = function () {
        return "edit/select-by-style";
      }),
      (r.prototype._getValue = function (e) {
        return e.getNodeName();
      }),
      (r.prototype.toString = function () {
        return "[Object GSelectByShapeAction]";
      }),
      (e.exports = r);
  }