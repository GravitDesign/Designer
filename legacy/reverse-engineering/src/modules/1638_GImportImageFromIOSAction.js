/**
 * Webpack Module #1638
 * Type: class
 * Name: GImportImageFromIOSAction
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    n(8), n(3), n(4), n(41);
    var i = n(1),
      a = o(n(18)),
      r = o(n(163)),
      s = o(n(85)),
      l = o(n(106));
    function c(e) {
      this._source = e;
    }
    i.GObject.inherit(c, l.default),
      (c.getId = function (e) {
        return "file.import-image-from-ios-".concat(e);
      }),
      (c.Source = { FILES: "files", PHOTOS: "photos" }),
      (c.prototype._source = null),
      (c.prototype.getId = function () {
        return c.getId(this._source);
      }),
      (c.prototype.getTitle = function () {
        return new i.GLocaleKey(
          "GImportImageFromIOSAction",
          "text.ios-".concat(this._source)
        );
      }),
      (c.prototype.getCategory = function () {
        return a.default.CATEGORY_FILE_IMPORT_IMAGE;
      }),
      (c.prototype.getGroup = function () {
        return "import/image-type/".concat(this._source);
      }),
      (c.prototype.isAvailable = function () {
        return gContainer.getRuntime() === s.default.Runtime.IPad;
      }),
      (c.prototype.isEnabled = function (e) {
        if (!l.default.prototype.isEnabled.call(this)) return !1;
        const t = gDesigner.getActiveDocument();
        return (
          !!t &&
          !!(e = e || t.getStorage() || gDesigner.getDefaultStorage()) &&
          e.canPromptOpen() &&
          gDesigner.getApplicationManager().isImportResourcesEnabled()
        );
      }),
      (c.prototype.execute = async function (e, t) {
        const n = gDesigner.getActiveDocument();
        if (!n) return !1;
        e = e || n.getStorage() || gDesigner.getDefaultStorage();
        const o = r.default.FileTypes.filter((e) => e.import_image);
        try {
          let i;
          (i =
            this._source === c.Source.FILES
              ? await e.openFromFiles(o)
              : await e.openFromPhotos(o)),
            n.placeOrImport(i),
            t && t();
        } catch (e) {
          console.warn("GImportImageFromIOSAction.prototype.execute", e);
        }
      }),
      (c.prototype.toString = function () {
        return "[Object GImportImageFromIOSAction]";
      }),
      (e.exports = c);
  }