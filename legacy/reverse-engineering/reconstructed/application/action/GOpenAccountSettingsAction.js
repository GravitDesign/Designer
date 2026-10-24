/**
 * GOpenAccountSettingsAction
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GOpenAccountSettingsAction() {}

GObject.inherit(GOpenAccountSettingsAction, GAction);

// Prototype methods
GOpenAccountSettingsAction.prototype.getId = function () {
        return r.ID;
      }

GOpenAccountSettingsAction.prototype.getTitle = function () {
        return r.TITLE;
      }

GOpenAccountSettingsAction.prototype.getCategory = function () {
        return i.CATEGORY_ACCOUNT;
      }

GOpenAccountSettingsAction.prototype.getGroup = function () {
        return "account";
      }

GOpenAccountSettingsAction.prototype.execute = function () {
        gDesigner.runDeepLink("account");
      }

GOpenAccountSettingsAction.prototype.isVisible = function () {
        const e = gDesigner.getSyncUser();
        return (
          !(e && !e.canUpdateSelfAccountData()) && gDesigner.isTouchEnabled()
        );
      }

GOpenAccountSettingsAction.prototype.toString = function () {
        return "[Object GOpenAccountSettingsAction]";
      }
