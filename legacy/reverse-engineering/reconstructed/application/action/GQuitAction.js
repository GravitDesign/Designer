/**
 * GQuitAction
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GQuitAction() {}

GObject.inherit(GQuitAction, GAction);

// Prototype methods
GQuitAction.prototype.getId = function () {
        return l.ID;
      }

GQuitAction.prototype.getTitle = function () {
        return l.TITLE;
      }

GQuitAction.prototype.getCategory = function () {
        return r.CATEGORY_FILE;
      }

GQuitAction.prototype.getGroup = function () {
        return "file-quit";
      }

GQuitAction.prototype.isEnabled = function () {
        return (
          gContainer.getRuntime() !== s.Runtime.Browser &&
          gContainer.getRuntime() !== s.Runtime.PWA
        );
      }

GQuitAction.prototype.getShortcut = function () {
        return [i.GKey.Constant.META, "Q"];
      }

GQuitAction.prototype.isAvailable = function () {
        return (
          gContainer.getRuntime() !== s.Runtime.Browser &&
          gContainer.getRuntime() !== s.Runtime.PWA
        );
      }

GQuitAction.prototype.execute = function () {
        gContainer.triggerClose();
      }

GQuitAction.prototype.toString = function () {
        return "[Object GQuitAction]";
      }


module.exports = GQuitAction;
