/**
 * Webpack Module #1603
 * Type: action
 * Name: Action_view_fast_view
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    n(3);
    var i = n(1),
      a = o(n(1339)),
      r = o(n(31)),
      s = o(n(18));
    function l() {}
    i.GObject.inherit(l, r.default),
      (l.ID = "view.fast-view"),
      (l.TITLE = new i.GLocaleKey("GFastViewAction", "title")),
      (l.GroupID = "view"),
      (l.prototype.getId = function () {
        return l.ID;
      }),
      (l.prototype.getTitle = function () {
        return i.GLocale.get(l.TITLE);
      }),
      (l.prototype.getCategory = function () {
        return s.default.CATEGORY_VIEW;
      }),
      (l.prototype.getGroup = function () {
        return l.GroupID;
      }),
      (l.prototype.isEnabled = function () {
        return !!gDesigner.getWindows().getActiveWindow();
      }),
      (l.prototype.isCheckable = function () {
        return !0;
      }),
      (l.prototype.isChecked = function () {
        const e = gDesigner.getActiveDocument(),
          t = e && e.getActiveWindow();
        if (t) {
          var n = t.getView().getViewConfiguration();
          return (
            !!n && n.paintMode === i.GScenePaintConfiguration.PaintMode.Fast
          );
        }
        return !1;
      }),
      (l.prototype.execute = function () {
        var e,
          t = gDesigner
            .getActiveDocument()
            .getActiveWindow()
            .getView()
            .getViewConfiguration();
        if (t.paintMode === i.GScenePaintConfiguration.PaintMode.Fast) {
          var n = gDesigner.getActiveDocument().getScene().getActivePage();
          if (((t.defaultEffectDetailLevel = null), n && !n.isFixedSized()))
            e = i.GScenePaintConfiguration.PaintMode.Full;
          else
            e =
              (n.getProperty(a.default.CLIP_PROPERTY_NAME, !0) ||
                a.default.CLIP_CONTENT_ENABLED) ===
              a.default.CLIP_CONTENT_ENABLED
                ? i.GScenePaintConfiguration.PaintMode.Output
                : i.GScenePaintConfiguration.PaintMode.Full;
        } else
          (t.defaultEffectDetailLevel = 0.5 / i.GPaintCanvas.getScreenDPI()),
            (e = i.GScenePaintConfiguration.PaintMode.Fast);
        gDesigner.setPaintMode(e),
          gDesigner.updateGEditorSceneConfigurationPaintMode(e);
      }),
      (l.prototype.toString = function () {
        return "[GAction GFastViewAction]";
      }),
      (e.exports = l);
  }