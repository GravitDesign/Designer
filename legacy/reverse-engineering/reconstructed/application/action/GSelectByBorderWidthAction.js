/**
 * GSelectByBorderWidthAction
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GSelectByBorderWidthAction() {
      a.default.call(this, r.ID, r.TITLE);
    }

// Prototype methods
GSelectByBorderWidthAction.prototype._getFillPatterns = function (e) {
        if (e.hasMixin(i.GStylable)) {
          const t = e.getPaintLayers(),
            n = t && t.getFillLayers(!0);
          if (n && n.length > 0) return n.map((e) => e.getProperty("_pt"));
        }
        return a.default.EmptyValue;
      }

GSelectByBorderWidthAction.prototype._getBorderPatterns = function (e) {
        if (e.hasMixin(i.GStylable)) {
          const t = e.getPaintLayers(),
            n = t && t.getBorderLayers(!0);
          if (n && n.length) return n.map((e) => e.getProperty("_pt"));
        }
        return a.default.EmptyValue;
      }

GSelectByBorderWidthAction.prototype.toString = function () {
        return "[Object GSelectByPaintLayerAction]";
      }

GSelectByBorderWidthAction.prototype.getGroup = function () {
        return "edit/select-by-style";
      }

GSelectByBorderWidthAction.prototype._getValue = function (e) {
        if (e.hasMixin(i.GStylable)) {
          const t = e.getPaintLayers(),
            n = t && t.getBorderLayers(!0);
          if (n && n.length > 0) return n.map((e) => e.getProperty("_bw"));
        }
        return a.default.EmptyValue;
      }




module.exports = GSelectByBorderWidthAction;
