/**
 * Webpack Module #1307
 * Type: class
 * Name: GSelectByBlendModeAction
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
      (r.ID = "edit.select-by-blend-mode"),
      (r.TITLE = new i.GLocaleKey("GSelectByBlendModeAction", "title")),
      (r.prototype.getGroup = function () {
        return "edit/select-by-style";
      }),
      (r.prototype._getValue = function (e) {
        return e.hasMixin(i.GNode.Properties)
          ? e.getProperty("_sbl")
          : a.default.EmptyValue;
      }),
      (r.prototype.toString = function () {
        return "[Object GSelectByBlendModeAction]";
      }),
      (e.exports = r);
  }