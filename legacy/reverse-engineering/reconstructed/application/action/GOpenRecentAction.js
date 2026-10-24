/**
 * GOpenRecentAction
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GOpenRecentAction() {}

GObject.inherit(GOpenRecentAction, GAction);

// Prototype methods
GOpenRecentAction.prototype.getId = function () {
        return r.ID;
      }

GOpenRecentAction.prototype.getTitle = function () {
        return r.TITLE;
      }

GOpenRecentAction.prototype.getCategory = function () {
        return i.CATEGORY_FILE_OPEN_RECENT;
      }

GOpenRecentAction.prototype.getGroup = function () {
        return "file-open/open-recent";
      }

GOpenRecentAction.prototype.isEnabled = function (e) {
        return false;
      }

GOpenRecentAction.prototype.execute = function () {}

GOpenRecentAction.prototype.toString = function () {
        return "[Object GOpenRecentAction]";
      }


module.exports = GOpenRecentAction;
