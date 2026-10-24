/**
 * Webpack Module #449
 * Type: class
 * Name: GFitAllAction
 */

function (e, t, n) {
    "use strict";
    n(3);
    var o = n(1),
      i = n(15),
      a = n(67),
      r = n(18),
      s = n(31);
    function l() {
      l.TOOLTIP_CONFIG = {
        [a.TOOLTIP_AREA.TOOLBAR]: a.GRichTooltipConfig.from({
          title: o.GLocale.get(
            new o.GLocaleKey("GFitAllAction", "tooltip-title")
          ),
          description: o.GLocale.get(
            new o.GLocaleKey("GFitAllAction", "tooltip-description")
          ),
          shortcut: l.SHORTCUT,
        }),
      };
    }
    o.GObject.inherit(l, s),
      (l.ID = "view.zoom.fit.all"),
      (l.TITLE = new o.GLocaleKey("GFitAllAction", "title")),
      (l.SHORTCUT = [i.GKey.Constant.OPTION, i.GKey.Constant.META, "0"]),
      (l.TOOLTIP_CONFIG = null),
      (l.prototype.getId = function () {
        return l.ID;
      }),
      (l.prototype.getTitle = function () {
        return l.TITLE;
      }),
      (l.prototype.getCategory = function () {
        return r.CATEGORY_VIEW;
      }),
      (l.prototype.getIcon = function () {
        return gDesigner.isTouchEnabled() ? "gravit-icon-fit-all" : null;
      }),
      (l.prototype.getGroup = function () {
        return "zoom";
      }),
      (l.prototype.getShortcut = function () {
        return l.SHORTCUT;
      }),
      (l.prototype.isEnabled = function () {
        var e = gDesigner.getActiveDocument(),
          t = (e && e.getScene() && e.getScene().getPaintBBox()) || null;
        return t && !t.isEmpty();
      }),
      (l.prototype.execute = function () {
        var e,
          t = gDesigner.getActiveDocument(),
          n = t.getScene(),
          i = t
            .getActiveWindow()
            .getView()
            .getViewConfiguration().multiPageView;
        if (n.isFixedSized() && !i) {
          var a = n.getActivePage();
          e = new o.GRect(0, 0, a.getProperty("w"), a.getProperty("h"));
        } else e = n.getPaintBBox(i);
        e && !e.isEmpty() && t.getActiveWindow().getView().zoomAll(e, !1);
      }),
      (l.prototype.getTooltipConfig = function (e) {
        return (e && l.TOOLTIP_CONFIG[e]) || null;
      }),
      (l.prototype.toString = function () {
        return "[Object GFitAllAction]";
      }),
      (e.exports = l);
  }