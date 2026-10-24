/**
 * GOpenWelcomeScreenAction
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GOpenWelcomeScreenAction() {}

GObject.inherit(GOpenWelcomeScreenAction, GAction);

// Prototype methods
GOpenWelcomeScreenAction.prototype.getId = function () {
        return r.ID;
      }

GOpenWelcomeScreenAction.prototype.getTitle = function () {
        return r.TITLE;
      }

GOpenWelcomeScreenAction.prototype.getCategory = function () {
        return a.CATEGORY_HELP;
      }

GOpenWelcomeScreenAction.prototype.getGroup = function () {
        return "help";
      }

GOpenWelcomeScreenAction.prototype.isEnabled = function () {
        return (
          (!gDesigner._newDocumentDialog ||
            !gDesigner._newDocumentDialog.isOpen()) &&
          gDesigner.getApplicationManager().isCreatingNewDocumentEnabled() &&
          gDesigner.getLicense().canAccessFreemium()
        );
      }

GOpenWelcomeScreenAction.prototype.execute = function () {
        gDesigner.openNewDocumentDialog({ closable: !0, showCloudOptions: !0 });
      }

GOpenWelcomeScreenAction.prototype.toString = function () {
        return "[Object GOpenWelcomeScreenAction]";
      }
