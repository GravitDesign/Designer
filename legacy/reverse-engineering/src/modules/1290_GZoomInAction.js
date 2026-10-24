/**
 * Webpack Module #1290
 * Type: class
 * Name: GZoomInAction
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
            new i.GLocaleKey("GZoomInAction", "tooltip-title")
          ),
          description: i.GLocale.get(
            new i.GLocaleKey("GZoomInAction", "tooltip-description")
          ),
          shortcut: c.SHORTCUT,
        }),
      };
    }
    i.GObject.inherit(c, l),
      (c.ID = "view.zoom.in"),
      (c.TITLE = new i.GLocaleKey("GZoomInAction", "title")),
      (c.ZOOM_STEP = 2),
      (c.SHORTCUT = [a.GKey.Constant.META, "+"]),
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
        return gDesigner.isTouchEnabled() ? "gravit-icon-zoom-in" : null;
      }),
      (c.prototype.isEnabled = function () {
        var e = gDesigner.getWindows().getActiveWindow(),
          t = e ? e.getView() : null;
        return t && t.getZoom() < a.GSceneWidget.options.maxZoomFactor;
      }),
      (c.prototype.execute = function () {
        var e = gDesigner.getWindows().getActiveWindow().getView(),
          t = null;
        if (o.GZoomTool.options.zoomLevels) {
          for (
            var n = o.GZoomTool.options.zoomLevels,
              i = e.getZoom(),
              r = n.length - 1,
              s = 0;
            s < n.length;
            s++
          )
            if ((i < n[r - s] && (t = n[r - s]), i === n[s])) {
              t = r > 0 ? n[s + 1] : a.GSceneWidget.options.maxZoomFactor;
              break;
            }
        } else t = e.getZoom() * c.ZOOM_STEP;
        gDesigner.zoomAtViewCenter(e, t);
      }),
      (c.prototype.getTooltipConfig = function (e) {
        return (e && c.TOOLTIP_CONFIG[e]) || null;
      }),
      (c.prototype.toString = function () {
        return "[Object GZoomInAction]";
      }),
      (e.exports = c);
  }