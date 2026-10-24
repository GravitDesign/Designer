/**
 * Webpack Module #1256
 * Type: class
 * Name: GVersionsHistoryAction
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    n(3);
    var i = n(1),
      a = o(n(31)),
      r = o(n(18)),
      s = o(n(119)),
      l = o(n(1159)),
      c = o(n(219)),
      d = o(n(256)),
      u = n(67);
    function p() {
      (this._title = new i.GLocaleKey("GVersionsHistoryAction", "title")),
        (p.TOOLTIP_CONFIG = {
          [u.TOOLTIP_AREA.MAIN_MENU.TRY_PRO_COMMON]: u.GRichTooltipConfig.from({
            title: i.GLocale.get(
              new i.GLocaleKey(
                "GVersionsHistoryAction",
                "text.try-this-feature-pro-tooltip-title"
              )
            ),
            description: i.GLocale.get(
              new i.GLocaleKey(
                "GVersionsHistoryAction",
                "text.try-this-feature-pro-tooltip-description"
              )
            ),
            learnMore:
              "",
            upgradeToProStatsValue: "gravit-versions-history",
            middle: !1,
            side: !0,
          }),
        });
    }
    i.GObject.inherit(p, a.default),
      (p.ID = "gravit-versions-history"),
      (p.GroupID = "file"),
      (p.TOOLTIP_CONFIG = null),
      (p.prototype._title = null),
      (p.prototype.getId = function () {
        return p.ID;
      }),
      (p.prototype.getTitle = function () {
        return this._title;
      }),
      (p.prototype.isPro = function () {
        return !0;
      }),
      (p.prototype.getTooltipArea = function () {
        return u.TOOLTIP_AREA.MAIN_MENU.TRY_PRO_COMMON;
      }),
      (p.prototype.getTooltipConfig = function (e) {
        return (e && p.TOOLTIP_CONFIG[e]) || null;
      }),
      (p.prototype.getIcon = function () {
        return "gravit-icon-versions";
      }),
      (p.prototype.getCategory = function () {
        return r.default.CATEGORY_FILE;
      }),
      (p.prototype.getGroup = function () {
        return p.GroupID;
      }),
      (p.prototype.isEnabled = function () {
        if (!gDesigner.getApplicationManager().isShareEnabled()) return !1;
        var e =
            (gDesigner.getActiveDocument() &&
              gDesigner.getActiveDocument().getStorageItem()) ||
            null,
          t =
            !!gDesigner.getActiveDocument() &&
            gDesigner.getActiveDocument().getScene().isCloudSynchronization();
        return s.default.isOnline() && e && t;
      }),
      (p.prototype.execute = function () {
        if (gDesigner.getWindows().getActiveWindow().getDocument().isModified())
          return (
            new c.default(
              i.GLocale.get(
                new i.GLocaleKey(
                  "GVersionsHistoryAction",
                  "unsaved-modifications"
                )
              )
            ).open(),
            !1
          );
        const e = () => {
          gDesigner &&
            gDesigner.hasEventListeners(l.default) &&
            (gDesigner.trigger(
              new l.default(
                l.default.Type.Enable,
                gDesigner.getActiveDocument().getScene().getProperty("cid")
              )
            ),
            gDesigner.intercomStats("Entered version history"));
        };
        gDesigner.isOffline() ? d.default.openUnavailableFeature(e) : e();
      }),
      (p.prototype.toString = function () {
        return "[Object GVersionsHistoryAction]";
      }),
      (e.exports = p);
  }