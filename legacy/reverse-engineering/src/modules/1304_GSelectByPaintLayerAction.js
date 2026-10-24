/**
 * Webpack Module #1304
 * Type: class
 * Name: GSelectByPaintLayerAction
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    n(3), n(38);
    var i = n(1),
      a = o(n(609));
    function r(e) {
      (this._type = e), a.default.call(this, r.getId(e), r.getTitle(e));
    }
    i.GObject.inherit(r, a.default),
      (r.ID = "edit.select-by-paintlayer"),
      (r.getId = function (e) {
        return "".concat(r.ID, ".").concat(e);
      }),
      (r.getTitle = function (e) {
        return new i.GLocaleKey(
          "GSelectByPaintLayerAction",
          "title.".concat(e)
        );
      }),
      (r.Type = {
        Fill: "fill",
        Border: "border",
        FillAndBorder: "fill_border",
      }),
      (r.prototype._type = null),
      (r.prototype.getGroup = function () {
        return "edit/select-by-paintlayer";
      }),
      (r.prototype._getValue = function (e) {
        switch (this._type) {
          case r.Type.Fill:
            return this._getFillPatterns(e);
          case r.Type.Border:
            return this._getBorderPatterns(e);
          case r.Type.FillAndBorder: {
            const t = this._getFillPatterns(e),
              n = this._getBorderPatterns(e);
            return t === a.default.EmptyValue || n === a.default.EmptyValue
              ? a.default.EmptyValue
              : { fills: t, borders: n };
          }
          default:
            return a.default.EmptyValue;
        }
      }),
      (r.prototype._getFillPatterns = function (e) {
        if (e.hasMixin(i.GStylable)) {
          const t = e.getPaintLayers(),
            n = t && t.getFillLayers(!0);
          if (n && n.length > 0) return n.map((e) => e.getProperty("_pt"));
        }
        return a.default.EmptyValue;
      }),
      (r.prototype._getBorderPatterns = function (e) {
        if (e.hasMixin(i.GStylable)) {
          const t = e.getPaintLayers(),
            n = t && t.getBorderLayers(!0);
          if (n && n.length) return n.map((e) => e.getProperty("_pt"));
        }
        return a.default.EmptyValue;
      }),
      (r.prototype.toString = function () {
        return "[Object GSelectByPaintLayerAction]";
      }),
      (e.exports = r);
  }