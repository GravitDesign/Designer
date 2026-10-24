/**
 * GSharePointCheckOutAction
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GSharePointCheckOutAction() {}

GObject.inherit(GSharePointCheckOutAction, GAction);

// Prototype methods
GSharePointCheckOutAction.prototype.getId = function () {
        return u.ID;
      }

GSharePointCheckOutAction.prototype.getTitle = function () {
        return u.TITLE;
      }

GSharePointCheckOutAction.prototype.getCategory = function () {
        return s.CATEGORY_FILE;
      }

GSharePointCheckOutAction.prototype.getGroup = function () {
        return "file";
      }

GSharePointCheckOutAction.prototype.isEnabled = function () {
        if (!r()) return false;
        const e = gDesigner.getActiveDocument();
        if (!e) return false;
        const t = e.getStorageItem();
        return !!t && t instanceof c.Item;
      }

GSharePointCheckOutAction.prototype.isVisible = function () {
        return this.isEnabled();
      }

GSharePointCheckOutAction.prototype.toString = function () {
        return "[Object GSharePointCheckOutAction]";
      }


module.exports = GSharePointCheckOutAction;
