/**
 * GSelectByTransparencyAction
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GSelectByTransparencyAction() {
      a.default.call(this, r.ID, r.TITLE);
    }

// Prototype methods
GSelectByTransparencyAction.prototype.getGroup = function () {
        return "edit/select-by-style";
      }

GSelectByTransparencyAction.prototype._getValue = function (e) {
        if (e.hasMixin(i.GStylable)) {
          const t = e.getPaintLayers(),
            n = t && t.getBorderLayers(!0);
          if (n && n.length > 0) return n.map((e) => e.getProperty("_bw"));
        }
        return a.default.EmptyValue;
      }

GSelectByTransparencyAction.prototype.toString = function () {
        return "[Object GSelectByBorderWidthAction]";
      }






module.exports = GSelectByTransparencyAction;
