/**
 * GOpenQuickHelpScreenAction
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GOpenQuickHelpScreenAction() {}

GObject.inherit(GOpenQuickHelpScreenAction, GAction);

// Prototype methods
GOpenQuickHelpScreenAction.prototype.getId = function () {
        return s.ID;
      }

GOpenQuickHelpScreenAction.prototype.getTitle = function () {
        return s.TITLE;
      }

GOpenQuickHelpScreenAction.prototype.getCategory = function () {
        return i.CATEGORY_HELP;
      }

GOpenQuickHelpScreenAction.prototype.getGroup = function () {
        return "help";
      }

GOpenQuickHelpScreenAction.prototype.isEnabled = function () {
        return true;
      }

GOpenQuickHelpScreenAction.prototype.isVisible = function () {
        return gDesigner.isTouchEnabled();
      }

GOpenQuickHelpScreenAction.prototype.execute = function () {
        r.open();
      }

GOpenQuickHelpScreenAction.prototype.toString = function () {
        return "[Object GOpenQuickHelpScreenAction]";
      }


module.exports = GOpenQuickHelpScreenAction;
