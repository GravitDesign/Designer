/**
 * Webpack Module #1291
 * Type: class
 * Name: GZoomOutAction
 */

function (e, t, n) {
    "use strict";
    n(3);
    var o = n(53),
      i = n(1),
      a = n(15),
      r = n(67),
      s = n(18),
      l = n(31);
    function c() {
      c.TOOLTIP_CONFIG = {
        [r.TOOLTIP_AREA.TOOLBAR]: r.GRichTooltipConfig.from({
          title: i.GLocale.get(
            new i.GLocaleKey("GZoomOutAction", "tooltip-title")
          ),
          description: i.GLocale.get(
            new i.GLocaleKey("GZoomOutAction", "tooltip-description")
          ),
          shortcut: c.SHORTCUT,
        }),
      };
    }
    i.GObject.inherit(c, l),
      (c.ID = "zoom.out"),
      (c.TITLE = new i.GLocaleKey("GZoomOutAction", "title")),
      (c.ZOOM_STEP = 2),
      (c.SHORTCUT = [a.GKey.Constant.META, "-"]),
      (c.TOOLTIP_CONFIG = null),
      (c.prototype.getId = function () {
        return c.ID;
      }),
      (c.prototype.getTitle = function () {
        return c.TITLE;
      }),
      (c.prototype.getCategory = function () {
        return s.CATEGORY_VIEW_MAGNIFICATION;
      }),
      (c.prototype.getGroup = function () {
        return "zoom/magnification";
      }),
      (c.prototype.getShortcut = function () {
        return c.SHORTCUT;
      }),
      (c.prototype.isShortcutGlobal = function () {
        return !0;
      }),
      (c.prototype.getIcon = function () {
        return gDesigner.isTouchEnabled() ? "gravit-icon-zoom-out" : null;
      }),
      (c.prototype.isEnabled = function () {
        var e = gDesigner.getWindows().getActiveWindow(),
          t = e ? e.getView() : null;
        return t && t.getZoom() > a.GSceneWidget.options.minZoomFactor;
      }),
      (c.prototype.execute = function () {
        var e = gDesigner.getWindows().getActiveWindow().getView(),
          t = null;
        if (o.GZoomTool.options.zoomLevels) {
          for (
            var n = o.GZoomTool.options.zoomLevels,
              i = e.getZoom(),
              r = (n.length, 0);
            r < n.length;
            r++
          )
            if ((i > n[r] && (t = n[r]), i === n[r])) {
              t = r > 0 ? n[r - 1] : a.GSceneWidget.options.minZoomFactor;
              break;
            }
        } else t = e.getZoom() / c.ZOOM_STEP;
        gDesigner.zoomAtViewCenter(e, t);
      }),
      (c.prototype.getTooltipConfig = function (e) {
        return (e && c.TOOLTIP_CONFIG[e]) || null;
      }),
      (c.prototype.toString = function () {
        return "[Object GZoomOutAction]";
      }),
      (e.exports = c);
  }