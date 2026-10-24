/**
 * GSharePointCheckInAction
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GSharePointCheckInAction() {}

GObject.inherit(GSharePointCheckInAction, GAction);

// Prototype methods
GSharePointCheckInAction.prototype.getId = function () {
        return g.ID;
      }

GSharePointCheckInAction.prototype.getTitle = function () {
        return g.TITLE;
      }

GSharePointCheckInAction.prototype.getCategory = function () {
        return s.CATEGORY_FILE;
      }

GSharePointCheckInAction.prototype.getGroup = function () {
        return "file";
      }

GSharePointCheckInAction.prototype.isEnabled = function () {
        return (
          !!this._isSupported() &&
          gDesigner.getActiveDocument().getStorageItem().isCheckedOutByMe()
        );
      }

GSharePointCheckInAction.prototype._isSupported = function () {
        if (!r()) return false;
        const e = gDesigner.getActiveDocument();
        if (!e) return false;
        const t = e.getStorageItem();
        return !!t && t instanceof c.Item;
      }

GSharePointCheckInAction.prototype.isVisible = function () {
        return this._isSupported();
      }

GSharePointCheckInAction.prototype.toString = function () {
        return "[Object GSharePointCheckInAction]";
      }


module.exports = GSharePointCheckInAction;
