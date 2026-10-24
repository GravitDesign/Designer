/**
 * Webpack Module #1288
 * Type: class
 * Name: GToggleSnapAction
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
            new o.GLocaleKey("GToggleSnapAction", "tooltip-title")
          ),
          description: o.GLocale.get(
            new o.GLocaleKey("GToggleSnapAction", "tooltip-description")
          ),
          shortcut: l.SHORTCUT,
          middle: !1,
          learnMore:
            "",
        }),
      };
    }
    o.GObject.inherit(l, s),
      (l.ID = "view.toggle-snap"),
      (l.TITLE = new o.GLocaleKey("GToggleSnapAction", "title")),
      (l.SHORTCUT = [i.GKey.Constant.SHIFT, i.GKey.Constant.F10]),
      (l.TOOLTIP_CONFIG = null),
      (l.prototype.getId = function () {
        return l.ID;
      }),
      (l.prototype.getTitle = function () {
        return l.TITLE;
      }),
      (l.prototype.getCategory = function () {
        return r.CATEGORY_VIEW_SNAP;
      }),
      (l.prototype.getGroup = function () {
        return "snap/enable";
      }),
      (l.prototype.getShortcut = function () {
        return l.SHORTCUT;
      }),
      (l.prototype.isCheckable = function () {
        return !0;
      }),
      (l.prototype.isChecked = function () {
        return !gDesigner.getSetting("snap_disabled");
      }),
      (l.prototype.execute = function () {
        gDesigner.setSetting(
          "snap_disabled",
          !gDesigner.getSetting("snap_disabled")
        );
      }),
      (l.prototype.getTooltipConfig = function (e) {
        if (!e) return null;
        const t = l.TOOLTIP_CONFIG[e];
        return (
          t.setConfig({
            title: o.GLocale.get(
              new o.GLocaleKey("GToggleSnapAction", "tootlip-title-action")
            ),
          }),
          t
        );
      }),
      (l.prototype.toString = function () {
        return "[Object GToggleSnapAction]";
      }),
      (e.exports = l);
  }