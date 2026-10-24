/**
 * GShareAction
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GShareAction() {}

GObject.inherit(GShareAction, GAction);

// Prototype methods
GShareAction.prototype.getId = function () {
        return r.ID;
      }

GShareAction.prototype.getTitle = function () {
        return r.TITLE;
      }

GShareAction.prototype.getCategory = function () {
        return i.CATEGORY_FILE_SHARE;
      }

GShareAction.prototype.getGroup = function () {
        return "file-share/share";
      }

GShareAction.prototype.isEnabled = function () {
        return gDesigner.getApplicationManager().isShareEnabled();
      }

GShareAction.prototype.isVisible = function () {
        return true;
      }

GShareAction.prototype.execute = function () {
        gDesigner.getShareManager().share();
      }

GShareAction.prototype.toString = function () {
        return "[Object GShareAction]";
      }


module.exports = GShareAction;
