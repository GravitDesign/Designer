/**
 * GSelectByEffectAction
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GSelectByEffectAction() {
      a.default.call(this, r.ID, r.TITLE);
    }

// Prototype methods
GSelectByEffectAction.prototype._getValue = function (e) {
        return e.hasMixin(i.GNode.Properties)
          ? e.getProperty("_sbl")
          : a.default.EmptyValue;
      }

GSelectByEffectAction.prototype.toString = function () {
        return "[Object GSelectByBlendModeAction]";
      }

GSelectByEffectAction.prototype.getGroup = function () {
        return "edit/select-by-style";
      }







module.exports = GSelectByEffectAction;
