/**
 * Webpack Module #861
 * Type: class
 * Name: GExportAction
 */

function (e, t, n) {
    "use strict";
    n(30), n(3);
    var o = n(1),
      i = n(15),
      a = n(67),
      r = n(18),
      s = n(31),
      l = n(1513),
      c = n(446),
      d = n(447);
    const u = n(86),
      p = n(44);
    function g(e) {
      (this._options = e || null),
        (g.TOOLTIP_CONFIG = {
          [a.TOOLTIP_AREA.TOOLBAR]: a.GRichTooltipConfig.from({
            title: o.GLocale.get(
              new o.GLocaleKey("GExportAction", "tooltip-title")
            ),
            description: o.GLocale.get(
              new o.GLocaleKey("GExportAction", "tooltip-description")
            ),
            shortcut: g.SHORTCUT,
            learnMore:
              "",
          }),
          [a.TOOLTIP_AREA.MAIN_MENU.TRY_PRO_COMMON]: a.GRichTooltipConfig.from({
            title: o.GLocale.get(
              new o.GLocaleKey(
                "GExportAction",
                "text.try-this-feature-pro-tooltip-title"
              )
            ),
            description: o.GLocale.get(
              new o.GLocaleKey(
                "GExportAction",
                "text.try-this-feature-pro-tooltip-description"
              )
            ),
            learnMore:
              "",
            upgradeToProStatsValue: "file.export",
            middle: !1,
            side: !0,
          }),
          [a.TOOLTIP_AREA.MAIN_MENU.TRY_EXP_PDF_ADVANCED_SETTING]:
            a.GRichTooltipConfig.from({
              title: o.GLocale.get(
                new o.GLocaleKey(
                  "GExportAction",
                  "text.try-export-pdf-advanced-setting-tooltip-title"
                )
              ),
              description: o.GLocale.get(
                new o.GLocaleKey(
                  "GExportAction",
                  "text.try-export-pdf-advanced-setting-tooltip-description"
                )
              ),
              learnMore:
                "",
              upgradeToProStatsValue: "file.export.pdf",
              middle: !1,
              side: !0,
            }),
        }),
        this._initProTooltip();
    }
    o.GObject.inherit(g, s),
      (g.ID = "file.export"),
      (g.TITLE = new o.GLocaleKey("GExportAction", "title")),
      (g.SHORTCUT = [i.GKey.Constant.SHIFT, i.GKey.Constant.META, "E"]),
      (g.TOOLTIP_CONFIG = null),
      (g.prototype._initProTooltip = function () {
        g.TOOLTIP_CONFIG[a.TOOLTIP_AREA.TOOLBAR] = a.GRichTooltipConfig.from(
          Object.assign(g.TOOLTIP_CONFIG[a.TOOLTIP_AREA.TOOLBAR].getConfig(), {
            isPro: gDesigner.isProTooltipNeeded(g.ID),
          })
        );
      }),
      (g.prototype.getId = function () {
        return this._options && this._options.format
          ? g.ID + "." + this._options.format
          : g.ID;
      }),
      (g.prototype.getTitle = function () {
        return this._options
          ? new o.GLocaleKey("GExportAction", "title.advanced-options")
          : g.TITLE;
      }),
      (g.prototype.getGroupIcon = function () {
        return this._options ? null : "gravit-icon-export";
      }),
      (g.prototype.getIcon = function () {
        return gDesigner.isTouchEnabled() ? "gravit-icon-export" : null;
      }),
      (g.prototype.getCategory = function () {
        return this._options && "pdf" == this._options.format
          ? r.CATEGORY_FILE_EXPORT_PDF
          : r.CATEGORY_FILE_EXPORT;
      }),
      (g.prototype.getGroup = function () {
        return this._options ? "export/file-type/export" : "export/export";
      }),
      (g.prototype.isPro = function () {
        return !0;
      }),
      (g.prototype.getShortcut = function () {
        return this._options ? null : g.SHORTCUT;
      }),
      (g.prototype.isEnabled = function () {
        if (!gDesigner.getApplicationManager().isExportEnabled()) return !1;
        return !!gDesigner.getActiveDocument();
      }),
      (g.prototype.execute = function () {
        const e = arguments[0],
          t = gDesigner.getActiveDocument(),
          n = this;
        function i(t) {
          new l(t, n._options || e, n.getId()).open();
        }
        t && t.isCommercialProductFile()
          ? t.openPaywall(this.getId())
          : t.hasPagesWithInfiniteEmptyCanvas()
          ? p.alert(
              o.GLocale.get(
                new o.GLocaleKey(
                  "GCommonNames",
                  "text.error-emtpy-infinite-canvas"
                )
              )
            )
          : new c(
              () => {
                $(".g-export-dialog").length ||
                  (t.isNew()
                    ? p.confirm(
                        o.GLocale.get(
                          new o.GLocaleKey(
                            "GExportAction",
                            "text.save-before-export"
                          )
                        ),
                        (e) => {
                          e
                            ? gDesigner.executeAction(
                                d.ID,
                                [
                                  t,
                                  function () {
                                    let e =
                                      arguments.length > 0 &&
                                      void 0 !== arguments[0]
                                        ? arguments[0]
                                        : {};
                                    const { documentStatus: t = null } = e;
                                    t &&
                                      t === u.Saved &&
                                      i(gDesigner.getActiveDocument());
                                  },
                                  !0,
                                ],
                                "unsavedhandler"
                              )
                            : i(t);
                        },
                        o.GLocale.get(new o.GLocaleKey("GLocale", "no")),
                        o.GLocale.get(new o.GLocaleKey("GLocale", "yes"))
                      )
                    : i(t));
              },
              () => {
                gDesigner.stats("action-cancelled_anonymous", this.getId());
              }
            );
      }),
      (g.prototype.getTooltipArea = function () {
        return this._options && "pdf" === this._options.format
          ? a.TOOLTIP_AREA.MAIN_MENU.TRY_EXP_PDF_ADVANCED_SETTING
          : a.TOOLTIP_AREA.MAIN_MENU.TRY_PRO_COMMON;
      }),
      (g.prototype.getTooltipConfig = function (e) {
        return this._options
          ? ("pdf" === this._options.format && e && g.TOOLTIP_CONFIG[e]) || null
          : (e && g.TOOLTIP_CONFIG[e]) || null;
      }),
      (g.prototype.toString = function () {
        return "[Object GExportAction]";
      }),
      (e.exports = g);
  }