/**
 * GShowShortcutsAction
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GShowShortcutsAction() {}

GObject.inherit(GShowShortcutsAction, GAction);

// Prototype methods
GShowShortcutsAction.prototype.getId = function () {
        return l.ID;
      }

GShowShortcutsAction.prototype.getTitle = function () {
        return l.TITLE;
      }

GShowShortcutsAction.prototype.getCategory = function () {
        return r.CATEGORY_HELP_LEARN;
      }

GShowShortcutsAction.prototype.getGroup = function () {
        return "help/learn";
      }

GShowShortcutsAction.prototype.execute = function () {
        new s().open();
      }

GShowShortcutsAction.prototype.toString = function () {
        return "[Object GShowShortcutsAction]";
      }


module.exports = GShowShortcutsAction;
