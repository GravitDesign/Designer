/**
 * GImportFontsAction
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GImportFontsAction() {
  // Constructor (reconstructed)
}

GObject.inherit(GImportFontsAction, GAction);

// Prototype methods
GImportFontsAction.prototype.getId = function () {
        return l.ID;
      }

GImportFontsAction.prototype.getTitle = function () {
        return l.TITLE;
      }

GImportFontsAction.prototype.getCategory = function () {
        return a.CATEGORY_FILE_IMPORT;
      }

GImportFontsAction.prototype.getGroup = function () {
        return "import/import-fonts";
      }

GImportFontsAction.prototype.isEnabled = function (e) {
        return (
          (e = e || gDesigner.getDefaultStorage()),
          !!gDesigner.getApplicationManager().isImportResourcesEnabled() &&
            e.canPromptOpen() &&
            "undefined" != typeof window &&
            window.indexedDB
        );
      }

GImportFontsAction.prototype.execute = function (e, t) {
        (e = e || new s()).import(t);
      }

GImportFontsAction.prototype.getTooltipArea = function () {
        return i.TOOLTIP_AREA.MAIN_MENU.TRY_PRO_COMMON;
      }

GImportFontsAction.prototype.getTooltipConfig = function (e) {
        return (e && l.TOOLTIP_CONFIG[e]) || null;
      }

GImportFontsAction.prototype.toString = function () {
        return "[Object GImportFontsAction]";
      }


module.exports = GImportFontsAction;
