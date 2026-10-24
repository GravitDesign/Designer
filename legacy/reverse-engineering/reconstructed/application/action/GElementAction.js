/**
 * GElementAction
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GElementAction() {}

// Prototype methods
GElementAction.prototype.isEnabled = function () {
        return (
          !s.default ||
          gDesigner.getRightSidebars().getActiveSidebar() !== r.default.ID
        );
      }

GElementAction.prototype.toString = function () {
        return "[Object GElementAction]";
      }

module.exports = GElementAction;
