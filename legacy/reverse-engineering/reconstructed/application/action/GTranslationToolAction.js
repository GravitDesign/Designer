/**
 * GTranslationToolAction
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GTranslationToolAction() {}

GObject.inherit(GTranslationToolAction, GAction);

// Prototype methods
GTranslationToolAction.prototype.toString = function () {
        return "[Object GImportImageFromIOSAction]";
      }

GTranslationToolAction.prototype.getId = function () {
        return c.ID;
      }

GTranslationToolAction.prototype.getTitle = function () {
        return o.GLocale.get(c.TITLE) + " [DEVELOPMENT]";
      }

GTranslationToolAction.prototype.getCategory = function () {
        return i.CATEGORY_HELP;
      }

GTranslationToolAction.prototype.getGroup = function () {
        return "help";
      }

GTranslationToolAction.prototype.isEnabled = function () {
        return true;
      }

GTranslationToolAction.prototype.isVisible = function () {
        return !(!s && !l);
      }

GTranslationToolAction.prototype.execute = function () {
        this._translationTool || (this._translationTool = new r()),
          this._translationTool.init();
      }



module.exports = GTranslationToolAction;
