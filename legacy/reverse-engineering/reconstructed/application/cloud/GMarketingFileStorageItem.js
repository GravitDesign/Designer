/**
 * GMarketingFileStorageItem
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GMarketingFileStorageItem(e, t, n, o) {
      i.default.Item.call(this, e, t, n), (this._fileId = o);
    }

GObject.inherit(GMarketingFileStorageItem, GObject);

// Prototype methods
GMarketingFileStorageItem.prototype.isRegistrable = function () {
        return !!this.getId();
      }

GMarketingFileStorageItem.prototype.getId = function () {
        return this._fileId;
      }

GMarketingFileStorageItem.prototype.toString = function () {
        return "[Object GMarketingFileStorageItem]";
      }

module.exports = GMarketingFileStorageItem;
