/**
 * Webpack Module #1305
 * Type: class
 * Name: GSelectByBorderWidthAction
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    n(3), n(38);
    var i = n(1),
      a = o(n(609));
    function r() {
      a.default.call(this, r.ID, r.TITLE);
    }
    i.GObject.inherit(r, a.default),
      (r.ID = "edit.select-by-border-width"),
      (r.TITLE = new i.GLocaleKey("GSelectByBorderWidthAction", "title")),
      (r.prototype.getGroup = function () {
        return "edit/select-by-style";
      }),
      (r.prototype._getValue = function (e) {
        if (e.hasMixin(i.GStylable)) {
          const t = e.getPaintLayers(),
            n = t && t.getBorderLayers(!0);
          if (n && n.length > 0) return n.map((e) => e.getProperty("_bw"));
        }
        return a.default.EmptyValue;
      }),
      (r.prototype.toString = function () {
        return "[Object GSelectByBorderWidthAction]";
      }),
      (e.exports = r);
  }