/**
 * GPlaceImportAction
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GPlaceImportAction() {
  // Constructor (reconstructed)
}

// Prototype methods
GPlaceImportAction.prototype.getTitle = function () {
        return p.TITLE;
      }

GPlaceImportAction.prototype.getCategory = function () {
        return c.CATEGORY_FILE_IMPORT;
      }

GPlaceImportAction.prototype.getGroup = function () {
        return "import/place-import";
      }

GPlaceImportAction.prototype.isVisible = function () {
        return gContainer.getRuntime() !== s.default.Runtime.IPad;
      }

GPlaceImportAction.prototype.getIcon = function () {
        return gDesigner.isTouchEnabled() ? "gravit-icon-place-image" : null;
      }

GPlaceImportAction.prototype.isEnabled = function (e) {
        var t = gDesigner.getActiveDocument();
        return (
          !!t &&
          (e = e || t.getStorage() || gDesigner.getDefaultStorage()) &&
          e.canPromptOpen() &&
          gDesigner.getApplicationManager().isImportResourcesEnabled()
        );
      }

GPlaceImportAction.prototype.getShortcut = function () {
        return [a.GKey.Constant.OPTION, "P"];
      }

GPlaceImportAction.prototype.execute = function (e, t) {
        var n = gDesigner.getActiveDocument();
        if (!n) return false;
        (e = e || n.getStorage() || gDesigner.getDefaultStorage()).openPrompt(
          d.FileTypes.filter((e) => e.import_image),
          (e) => {
            gDesigner.stats(
              "import-placeimport_open_localfile",
              e.getExtension()
            ),
              n.placeOrImport(e),
              t && t();
          },
          !1
        );
      }

GPlaceImportAction.prototype.getTooltipConfig = function (e) {
        return (e && p.TOOLTIP_CONFIG[e]) || null;
      }

GPlaceImportAction.prototype.toString = function () {
        return "[Object GPlaceImportAction]";
      }

module.exports = GPlaceImportAction;
