/**
 * GDeselectAllAction
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GDeselectAllAction() {}

GObject.inherit(GDeselectAllAction, GAction);

// Prototype methods
GDeselectAllAction.prototype.toString = function () {
        return "[Object GSelectAllAction]";
      }

GDeselectAllAction.prototype.getId = function () {
        return s.ID;
      }

GDeselectAllAction.prototype.getTitle = function () {
        return s.TITLE;
      }

GDeselectAllAction.prototype.getCategory = function () {
        return a.CATEGORY_EDIT;
      }

GDeselectAllAction.prototype.getGroup = function () {
        return "select";
      }

GDeselectAllAction.prototype.getShortcut = function () {
        return [i.GKey.Constant.SHIFT, i.GKey.Constant.META, "A"];
      }

GDeselectAllAction.prototype.isEnabled = function () {
        if (document.activeElement && $(document.activeElement).is(":editable"))
          return true;
        if (gDesigner.getActiveDocument()) {
          var e = gDesigner.getActiveDocument().getEditor().getSelection();
          if (e && e.length) return true;
        }
        return false;
      }

GDeselectAllAction.prototype.execute = function () {
        document.activeElement &&
        $(document.activeElement).is(":editable") &&
        !$(document.activeElement).is("button") &&
        !gDesigner.isGravitIME(document.activeElement)
          ? document.execCommand("selectAll")
          : gDesigner.getActiveDocument().getEditor().clearSelection();
      }



module.exports = GDeselectAllAction;
