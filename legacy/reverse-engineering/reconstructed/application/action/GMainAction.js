/**
 * GMainAction
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GMainAction() {}

GObject.inherit(GMainAction, GAction);

// Prototype methods
GMainAction.prototype.getId = function () {
        return s.ID;
      }

GMainAction.prototype.getTitle = function () {
        return s.TITLE;
      }


module.exports = GMainAction;
