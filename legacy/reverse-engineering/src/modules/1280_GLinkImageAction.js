/**
 * Webpack Module #1280
 * Type: class
 * Name: GLinkImageAction
 */

function (e, t, n) {
    "use strict";
    n(3), n(4), n(41);
    var o = n(1),
      i = n(67),
      a = n(18),
      r = n(163),
      s = n(31),
      l = n(85);
    function c() {
      c.TOOLTIP_CONFIG = {
        [i.TOOLTIP_AREA.TOOLBAR]: i.GRichTooltipConfig.from({
          title: o.GLocale.get(
            new o.GLocaleKey("GLinkImageAction", "tooltip-title")
          ),
          description: o.GLocale.get(
            new o.GLocaleKey("GLinkImageAction", "tooltip-description")
          ),
          middle: !1,
          learnMore:
            "",
        }),
      };
    }
    o.GObject.inherit(c, s),
      (c.ID = "file.link-import"),
      (c.TITLE = new o.GLocaleKey("GLinkImageAction", "title")),
      (c.TOOLTIP_CONFIG = null),
      (c.prototype.getId = function () {
        return c.ID;
      }),
      (c.prototype.getTitle = function () {
        return c.TITLE;
      }),
      (c.prototype.getCategory = function () {
        return a.CATEGORY_FILE_IMPORT;
      }),
      (c.prototype.getGroup = function () {
        return "import/place-import";
      }),
      (c.prototype.getIcon = function () {
        return gDesigner.isTouchEnabled() ? "gravit-icon-link-image" : null;
      }),
      (c.prototype.isEnabled = function (e) {
        if (gContainer.getRuntime() !== l.Runtime.Electron) return !1;
        var t = gDesigner.getActiveDocument();
        return (
          !!t &&
          (e = e || t.getStorage() || gDesigner.getDefaultStorage()) &&
          e.canPromptOpen()
        );
      }),
      (c.prototype.execute = function (e, t) {
        var n = gDesigner.getActiveDocument();
        if (!n) return !1;
        (e = e || n.getStorage() || gDesigner.getDefaultStorage()).openPrompt(
          r.FileTypes.filter((e) => 0 === e.mime.indexOf("image")),
          (e) => {
            var i = "file://" + e.getUniqueId(),
              a = i,
              r = n.getScene().getDictionary().putValueIfAbsent(a);
            r && (a = r.getUrl());
            var s = new Image();
            (s.onload = () => {
              var e = new o.GImage();
              e.setProperties(
                ["iw", "ih", "url"],
                [s.naturalWidth, s.naturalHeight, a]
              ),
                n.insertElement(e, !0, !0),
                t && t();
            }),
              (s.src = i);
          },
          !1
        );
      }),
      (c.prototype.isAvailable = function () {
        return gContainer.getRuntime() !== l.Runtime.IPad;
      }),
      (c.prototype.getTooltipConfig = function (e) {
        return (e && c.TOOLTIP_CONFIG[e]) || null;
      }),
      (c.prototype.toString = function () {
        return "[Object GLinkImageAction]";
      }),
      (e.exports = c);
  }