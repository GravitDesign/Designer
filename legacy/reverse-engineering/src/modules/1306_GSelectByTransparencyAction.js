/**
 * Webpack Module #1306
 * Type: class
 * Name: GSelectByTransparencyAction
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
      (r.ID = "edit.select-by-transparency"),
      (r.TITLE = new i.GLocaleKey("GSelectByTransparencyAction", "title")),
      (r.prototype.getGroup = function () {
        return "edit/select-by-style";
      }),
      (r.prototype._getValue = function (e) {
        return e.hasMixin(i.GNode.Properties)
          ? e.getProperty("_stop")
          : a.default.EmptyValue;
      }),
      (r.prototype.toString = function () {
        return "[Object GSelectByTransparencyAction]";
      }),
      (e.exports = r);
  }