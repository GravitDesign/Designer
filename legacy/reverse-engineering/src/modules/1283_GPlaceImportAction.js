/**
 * Webpack Module #1283
 * Type: class
 * Name: GPlaceImportAction
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    n(3), n(4), n(41);
    var i = n(1),
      a = n(15),
      r = n(67),
      s = o(n(85)),
      l = n(10),
      c = n(18),
      d = n(163),
      u = n(31);
    function p() {
      p.TOOLTIP_CONFIG = {
        [r.TOOLTIP_AREA.TOOLBAR]: r.GRichTooltipConfig.from({
          title: i.GLocale.get(
            new i.GLocaleKey("GPlaceImportAction", "tooltip-title")
          ),
          description: i.GLocale.get(
            new i.GLocaleKey("GPlaceImportAction", "tooltip-description")
          ),
          middle: !1,
          video: l.gApi.getRichTooltipVideoURL("Place_Image.mp4"),
          learnMore:
            "",
        }),
      };
    }
    i.GObject.inherit(p, u),
      (p.ID = "file.place-import"),
      (p.TITLE = new i.GLocaleKey("GPlaceImportAction", "title")),
      (p.TOOLTIP_CONFIG = null),
      (p.prototype.getId = function () {
        return p.ID;
      }),
      (p.prototype.getTitle = function () {
        return p.TITLE;
      }),
      (p.prototype.getCategory = function () {
        return c.CATEGORY_FILE_IMPORT;
      }),
      (p.prototype.getGroup = function () {
        return "import/place-import";
      }),
      (p.prototype.isVisible = function () {
        return gContainer.getRuntime() !== s.default.Runtime.IPad;
      }),
      (p.prototype.getIcon = function () {
        return gDesigner.isTouchEnabled() ? "gravit-icon-place-image" : null;
      }),
      (p.prototype.isEnabled = function (e) {
        var t = gDesigner.getActiveDocument();
        return (
          !!t &&
          (e = e || t.getStorage() || gDesigner.getDefaultStorage()) &&
          e.canPromptOpen() &&
          gDesigner.getApplicationManager().isImportResourcesEnabled()
        );
      }),
      (p.prototype.getShortcut = function () {
        return [a.GKey.Constant.OPTION, "P"];
      }),
      (p.prototype.execute = function (e, t) {
        var n = gDesigner.getActiveDocument();
        if (!n) return !1;
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
      }),
      (p.prototype.getTooltipConfig = function (e) {
        return (e && p.TOOLTIP_CONFIG[e]) || null;
      }),
      (p.prototype.toString = function () {
        return "[Object GPlaceImportAction]";
      }),
      (e.exports = p);
  }