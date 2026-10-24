/**
 * GNewFromTemplateAction
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GNewFromTemplateAction() {}

GObject.inherit(GNewFromTemplateAction, GAction);

// Prototype methods
GNewFromTemplateAction.prototype.getId = function () {
        return s.ID;
      }

GNewFromTemplateAction.prototype.getTitle = function () {
        return s.TITLE;
      }

GNewFromTemplateAction.prototype.getCategory = function () {
        return i.CATEGORY_FILE;
      }

GNewFromTemplateAction.prototype.getGroup = function () {
        return "document";
      }

GNewFromTemplateAction.prototype.isEnabled = function () {
        return (
          r.isOnline() &&
          !gDesigner.isOffline(6e5) &&
          gDesigner.getApplicationManager().isCreatingNewDocumentEnabled()
        );
      }

GNewFromTemplateAction.prototype.execute = function () {
        gContainer.newDocumentActionPerformed(),
          gDesigner.openNewDocumentDialog({
            closable: !0,
            showCloudOptions: !0,
            defaultOption: "templates-option",
            newOrFromTemplate: !0,
          });
      }

GNewFromTemplateAction.prototype.toString = function () {
        return "[Object GNewFromTemplateAction]";
      }


module.exports = GNewFromTemplateAction;
