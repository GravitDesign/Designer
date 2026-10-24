/**
 * GCheckForUpdatesAction
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GCheckForUpdatesAction() {}

GObject.inherit(GCheckForUpdatesAction, GAction);

// Prototype methods
GCheckForUpdatesAction.prototype.getId = function () {
        return r.ID;
      }

GCheckForUpdatesAction.prototype.getTitle = function () {
        return r.TITLE;
      }

GCheckForUpdatesAction.prototype.getCategory = function () {
        return a.CATEGORY_HELP;
      }

GCheckForUpdatesAction.prototype.getGroup = function () {
        return "help";
      }

GCheckForUpdatesAction.prototype.isEnabled = function () {
        return (
          (!gDesigner._newDocumentDialog ||
            !gDesigner._newDocumentDialog.isOpen()) &&
          gDesigner.getApplicationManager().isCreatingNewDocumentEnabled() &&
          gDesigner.getLicense().canAccessFreemium()
        );
      }

GCheckForUpdatesAction.prototype.execute = function () {
        gDesigner.openNewDocumentDialog({ closable: !0, showCloudOptions: !0 });
      }

GCheckForUpdatesAction.prototype.toString = function () {
        return "[Object GOpenWelcomeScreenAction]";
      }









module.exports = GCheckForUpdatesAction;
