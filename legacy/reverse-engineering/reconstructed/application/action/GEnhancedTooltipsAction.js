/**
 * GEnhancedTooltipsAction
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GEnhancedTooltipsAction() {
      gContainer.getProperty(s).then((e) => {
        "boolean" == typeof e && (l = e);
      });
    }

// Prototype methods
GEnhancedTooltipsAction.prototype.getId = function () {
        return c.ID;
      }

GEnhancedTooltipsAction.prototype.getTitle = function () {
        return i.GLocale.get(c.TITLE);
      }

GEnhancedTooltipsAction.prototype.getCategory = function () {
        return a.default.CATEGORY_HELP_LEARN;
      }

GEnhancedTooltipsAction.prototype.getGroup = function () {
        return c.GroupID;
      }

GEnhancedTooltipsAction.prototype.isCheckable = function () {
        return true;
      }

GEnhancedTooltipsAction.prototype.isChecked = function () {
        return l;
      }

GEnhancedTooltipsAction.prototype.isEnabled = function () {
        return true;
      }

GEnhancedTooltipsAction.prototype.execute = function () {
        (l = !l), gContainer.setProperty(s, l);
      }

GEnhancedTooltipsAction.prototype.statsValue = function () {
        return "".concat(c.ID, ".").concat(l ? "on" : "off");
      }

GEnhancedTooltipsAction.prototype.toString = function () {
        return "[Object GEnhancedTooltipsAction]";
      }


module.exports = GEnhancedTooltipsAction;
