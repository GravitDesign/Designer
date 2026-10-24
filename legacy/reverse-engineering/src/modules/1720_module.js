/**
 * Webpack Module #1720
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(8);
    var o = n(1),
      i = n(10);
    const a = {
      init: function (e) {
        e = $.extend(
          {
            clazz: null,
            defaultText: o.GLocale.get(
              new o.GLocaleKey("GUnshareButton", "text.unshare-with-me")
            ),
            stats: "filespanel-view_infoPanel_unshare",
            restrictedStats: "filespanel-view_infoPanel_nonprotriespro-unshare",
            unshareCallback: null,
          },
          e
        );
        let t = $(this);
        return (
          t.data("gunsharebutton", { options: e }),
          this.addClass("unshare-button")
            .addClass("g-highlight-button")
            .addClass("highlighted")
            .addClass(e.clazz || "")
            .append($("<span/>").addClass("icon"))
            .append($("<span/>").addClass("label").text(e.defaultText))
            .on("click", () => {
              if (t.hasClass("g-disabled")) return;
              gDesigner.getShareManager().isShareProRestricted()
                ? (gDesigner.stats(e.restrictedStats),
                  gDesigner.handleShareFilePROFeatureInterruption())
                : (gDesigner.stats(e.stats),
                  gDesigner.getUser().then(async (n) => {
                    if (!n) return;
                    const o = t.data("gunsharebutton").storeItem.getId(),
                      a = n.getUID();
                    console.log(
                      "About to call unshare with item id: %s and user id: %s",
                      o,
                      a
                    ),
                      await i.gApi.unshareWithUser(o, a),
                      "function" == typeof e.unshareCallback &&
                        e.unshareCallback();
                  }));
            }),
          this
        );
      },
      update: function (e) {
        const { disabled: t, hidden: n } = e,
          o = $(this);
        t ? o.addClass("g-disabled") : o.removeClass("g-disabled"),
          n ? o.hide() : o.show();
        gDesigner.getShareManager().isShareProRestricted() && o.gPro();
        const i = o.data("gunsharebutton");
        return (
          (i.storeItem = e.storeItem),
          e.unshareCallback && (i.options.unshareCallback = e.unshareCallback),
          this
        );
      },
    };
    $.fn.gUnshareButton = function (e) {
      return a[e]
        ? a[e].apply(this, Array.prototype.slice.call(arguments, 1))
        : "object" != typeof e && e
        ? void $.error(
            "Method " + e + " does not exist on jQuery.gUnshareButton"
          )
        : a.init.apply(this, arguments);
    };
  }