/**
 * GMergeMainAction
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GMergeMainAction() {}

GObject.inherit(GMergeMainAction, GAction);

// Prototype methods
GMergeMainAction.prototype.getTooltipConfig = function (e) {
        return (e && c.TOOLTIP_CONFIG[e]) || null;
      }

GMergeMainAction.prototype.toString = function () {
        return "[Object GGroupAction]";
      }

GMergeMainAction.prototype.getId = function () {
        return c.ID;
      }

GMergeMainAction.prototype.getTitle = function () {
        return c.TITLE;
      }


module.exports = GMergeMainAction;
