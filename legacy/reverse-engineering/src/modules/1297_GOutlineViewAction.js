/**
 * Webpack Module #1297
 * Type: class
 * Name: GOutlineViewAction
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    n(3);
    var i = n(1),
      a = n(15),
      r = o(n(18)),
      s = o(n(31)),
      l = o(n(442));
    function c() {}
    i.GObject.inherit(c, s.default),
      (c.ID = "view.outline-view"),
      (c.TITLE = new i.GLocaleKey("GOutlineViewAction", "title")),
      (c.GroupID = "view"),
      (c.StoragePropertyName = "designer.settings.outline-view.enabled"),
      (c.prototype.getId = function () {
        return c.ID;
      }),
      (c.prototype.getTitle = function () {
        return i.GLocale.get(c.TITLE);
      }),
      (c.prototype.getCategory = function () {
        return r.default.CATEGORY_VIEW;
      }),
      (c.prototype.getGroup = function () {
        return c.GroupID;
      }),
      (c.prototype.isCheckable = function () {
        return !0;
      }),
      (c.prototype.getIcon = function () {
        return gDesigner.isTouchEnabled() ? "gravit-icon-out-line" : null;
      }),
      (c.prototype.isChecked = function () {
        const e = gDesigner.getWindows().getActiveWindow();
        if (e) {
          const t = e.getView().getViewConfiguration();
          return (
            !!t && t.paintMode === i.GScenePaintConfiguration.PaintMode.Outline
          );
        }
        return !1;
      }),
      (c.prototype.isEnabled = function () {
        return !!gDesigner.getWindows().getActiveWindow();
      }),
      (c.prototype.getShortcut = function () {
        return [a.GKey.Constant.OPTION, "Y"];
      }),
      (c.prototype.execute = function () {
        let e;
        if (
          gDesigner
            .getWindows()
            .getActiveWindow()
            .getView()
            .getViewConfiguration().paintMode ===
          i.GScenePaintConfiguration.PaintMode.Outline
        ) {
          var t = gDesigner.getActiveDocument();
          if (t) {
            var n = t.getScene().getActivePage();
            if (n && !n.isFixedSized())
              e = i.GScenePaintConfiguration.PaintMode.Full;
            else
              e =
                (n.getProperty(l.default.PAGE_CLIP_PROPERTY_NAME, !0) ||
                  l.default.PAGE_CLIP_CONTENT_ENABLED) ===
                l.default.PAGE_CLIP_CONTENT_ENABLED
                  ? i.GScenePaintConfiguration.PaintMode.Output
                  : i.GScenePaintConfiguration.PaintMode.Full;
          } else e = i.GScenePaintConfiguration.PaintMode.Output;
        } else e = i.GScenePaintConfiguration.PaintMode.Outline;
        gDesigner.setPaintMode(e),
          gDesigner.updateGEditorSceneConfigurationPaintMode(e);
      }),
      (c.prototype.toString = function () {
        return "[Object GOutlineViewAction]";
      }),
      (e.exports = c);
  }