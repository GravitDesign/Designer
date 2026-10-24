/**
 * GImportImageFromIOSAction
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GImportImageFromIOSAction() {}

GObject.inherit(GImportImageFromIOSAction, GAction);

// Prototype methods
GImportImageFromIOSAction.prototype.getTitle = function () {
        return new i.GLocaleKey(
          "GImportImageFromIOSAction",
          "text.ios-".concat(this._source)
        );
      }

GImportImageFromIOSAction.prototype.getCategory = function () {
        return a.default.CATEGORY_FILE_IMPORT_IMAGE;
      }

GImportImageFromIOSAction.prototype.getGroup = function () {
        return "import/image-type/".concat(this._source);
      }

GImportImageFromIOSAction.prototype.isAvailable = function () {
        return gContainer.getRuntime() === s.default.Runtime.IPad;
      }

GImportImageFromIOSAction.prototype.isEnabled = function (e) {
        if (!l.default.prototype.isEnabled.call(this)) return false;
        const t = gDesigner.getActiveDocument();
        return (
          !!t &&
          !!(e = e || t.getStorage() || gDesigner.getDefaultStorage()) &&
          e.canPromptOpen() &&
          gDesigner.getApplicationManager().isImportResourcesEnabled()
        );
      }

GImportImageFromIOSAction.prototype.toString = function () {
        return "[Object GImportImageFromIOSAction]";
      }

GImportImageFromIOSAction.prototype.getId = function () {
        return c.ID;
      }


module.exports = GImportImageFromIOSAction;
