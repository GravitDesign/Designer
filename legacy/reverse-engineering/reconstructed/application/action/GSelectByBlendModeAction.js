/**
 * GSelectByBlendModeAction
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GSelectByBlendModeAction() {
      a.default.call(this, r.ID, r.TITLE);
    }

// Prototype methods
GSelectByBlendModeAction.prototype.toString = function () {
        return "[Object GSelectByBorderWidthAction]";
      }

GSelectByBlendModeAction.prototype.getGroup = function () {
        return "edit/select-by-style";
      }

GSelectByBlendModeAction.prototype._getValue = function (e) {
        return e.hasMixin(i.GNode.Properties)
          ? e.getProperty("_stop")
          : a.default.EmptyValue;
      }
