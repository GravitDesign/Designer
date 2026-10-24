/**
 * GSelectByPaintLayerAction
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GSelectByPaintLayerAction(e) {
      (this._type = e), a.default.call(this, r.getId(e), r.getTitle(e));
    }

// Prototype methods
GSelectByPaintLayerAction.prototype.getGroup = function () {
        return "edit/select-by-paintlayer";
      }

GSelectByPaintLayerAction.prototype._getValue = function (e) {
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
      }

GSelectByPaintLayerAction.prototype._getFillPatterns = function (e) {
        if (e.hasMixin(i.GStylable)) {
          const t = e.getPaintLayers(),
            n = t && t.getFillLayers(!0);
          if (n && n.length > 0) return n.map((e) => e.getProperty("_pt"));
        }
        return a.default.EmptyValue;
      }

GSelectByPaintLayerAction.prototype._getBorderPatterns = function (e) {
        if (e.hasMixin(i.GStylable)) {
          const t = e.getPaintLayers(),
            n = t && t.getBorderLayers(!0);
          if (n && n.length) return n.map((e) => e.getProperty("_pt"));
        }
        return a.default.EmptyValue;
      }

GSelectByPaintLayerAction.prototype.toString = function () {
        return "[Object GSelectByPaintLayerAction]";
      }



module.exports = GSelectByPaintLayerAction;
