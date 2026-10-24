/**
 * GSettingsAction
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GSettingsAction() {}

GObject.inherit(GSettingsAction, GAction);

// Prototype methods
GSettingsAction.prototype.getId = function () {
        return l.ID;
      }

GSettingsAction.prototype.getTitle = function () {
        return l.TITLE;
      }

GSettingsAction.prototype.getCategory = function () {
        return i.CATEGORY_EDIT;
      }

GSettingsAction.prototype.getGroup = function () {
        return "settings";
      }

GSettingsAction.prototype.getIcon = function () {
        return gDesigner.isTouchEnabled() ? "gravit-icon-setting-touch" : "";
      }

GSettingsAction.prototype.toString = function () {
        return "[Object GSettingsAction]";
      }




module.exports = GSettingsAction;
