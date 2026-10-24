/**
 * GLogoutAction
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GLogoutAction() {}

GObject.inherit(GLogoutAction, GAction);

// Prototype methods
GLogoutAction.prototype.getId = function () {
        return r.ID;
      }

GLogoutAction.prototype.getTitle = function () {
        return r.TITLE;
      }

GLogoutAction.prototype.getCategory = function () {
        return i.CATEGORY_ACCOUNT;
      }

GLogoutAction.prototype.getGroup = function () {
        return "account";
      }

GLogoutAction.prototype.execute = function () {
        gDesigner.runDeepLink("account");
      }

GLogoutAction.prototype.isVisible = function () {
        const e = gDesigner.getSyncUser();
        return (
          !(e && !e.canUpdateSelfAccountData()) && gDesigner.isTouchEnabled()
        );
      }

GLogoutAction.prototype.toString = function () {
        return "[Object GOpenAccountSettingsAction]";
      }









module.exports = GLogoutAction;
