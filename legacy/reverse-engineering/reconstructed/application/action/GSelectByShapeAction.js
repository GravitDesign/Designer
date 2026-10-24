/**
 * GSelectByShapeAction
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GSelectByShapeAction() {
      a.default.call(this, r.ID, r.TITLE);
    }

// Prototype methods
GSelectByShapeAction.prototype.toString = function () {
        return "[Object GSelectByTransparencyAction]";
      }

GSelectByShapeAction.prototype.getGroup = function () {
        return "edit/select-by-style";
      }

GSelectByShapeAction.prototype._getValue = function (e) {
        return e.hasMixin(i.GNode.Properties)
          ? e.getProperty("_sbl")
          : a.default.EmptyValue;
      }
