/**
 * GToggleProBETALicenseAction
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GToggleProBETALicenseAction() {}

GObject.inherit(GToggleProBETALicenseAction, GAction);

// Prototype methods
GToggleProBETALicenseAction.prototype.getId = function () {
        return l.ID;
      }

GToggleProBETALicenseAction.prototype.getTitle = function () {
        const e = gDesigner.getLicense();
        return e.isPro() && !e.isExpired()
          ? "Switch to Basic License"
          : "Switch to PRO License";
      }

GToggleProBETALicenseAction.prototype.getCategory = function () {
        return a.CATEGORY_HELP;
      }

GToggleProBETALicenseAction.prototype.getGroup = function () {
        return "help";
      }

GToggleProBETALicenseAction.prototype.isEnabled = function () {
        return gDesigner.isBeta();
      }

GToggleProBETALicenseAction.prototype.isVisible = function () {
        return gDesigner.isBeta();
      }

GToggleProBETALicenseAction.prototype.toString = function () {
        return "[Object GToggleProBETALicenseAction]";
      }


module.exports = GToggleProBETALicenseAction;
