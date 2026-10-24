/**
 * Webpack Module #1631
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    n(8), n(4), n(13);
    var i = n(1),
      a = o(n(1239));
    const r = [
      {
        text: new i.GLocaleKey(
          "GFilesPanelViewSharepoint",
          "text.checkin-type-minor"
        ),
        value: a.default.CheckinType.MinorCheckIn,
        selected: !0,
      },
      {
        text: new i.GLocaleKey(
          "GFilesPanelViewSharepoint",
          "text.checkin-type-major"
        ),
        value: a.default.CheckinType.MajorCheckIn,
      },
      {
        text: new i.GLocaleKey(
          "GFilesPanelViewSharepoint",
          "text.checkin-type-overwrite"
        ),
        value: a.default.CheckinType.OverwriteCheckIn,
      },
    ];
    e.exports = class {
      static openCheckInDialog(e) {
        return new Promise(async (t) => {
          var n = $("<div></div>")
            .addClass("g-container-sharepoint-check-in-dialog")
            .append(
              $("<div></div>")
                .addClass("minor-related")
                .addClass("row")
                .text(
                  i.GLocale.get(
                    new i.GLocaleKey(
                      "GFilesPanelViewSharepoint",
                      "text.choose-checkin-type"
                    )
                  )
                )
            )
            .append(
              $("<div></div>")
                .addClass("row")
                .addClass("minor-related")
                .append(
                  $("<select/>")
                    .addClass("check-in-type")
                    .addClass("field")
                    .append(
                      r.map((e) => {
                        let { text: t, value: n, selected: o } = e;
                        return $("<option/>")
                          .attr("value", n)
                          .text(i.GLocale.get(t))
                          .prop("selected", !!o);
                      })
                    )
                )
            )
            .append(
              $("<div></div>")
                .addClass("row")
                .text(
                  i.GLocale.get(
                    new i.GLocaleKey(
                      "GFilesPanelViewSharepoint",
                      "text.checkin-comment"
                    )
                  )
                )
            )
            .append(
              $("<div></div>")
                .addClass("row")
                .append(
                  $("<textarea/>")
                    .addClass("comment")
                    .addClass("field")
                    .addClass("max-width")
                    .attr("type", "text")
                )
            );
          n.gDialog({
            releaseOnClose: !0,
            className: "g-sharepoint-check-in-dialog",
            buttons: [
              $("<button></button>")
                .text(i.GLocale.get(new i.GLocaleKey("GLocale", "cancel")))
                .on("click", () => {
                  n.gDialog("close"),
                    t({ ok: !1 }),
                    gDesigner.stats(
                      "filespanel-view_sharepoint-checkin_cancel"
                    );
                }),
              $("<button></button>")
                .addClass("primary")
                .text(i.GLocale.get(new i.GLocaleKey("GLocale", "ok")))
                .on("click", () => {
                  n.gDialog("close");
                  const o = e.enableMinorVersions
                    ? n.find(".check-in-type").val()
                    : a.default.CheckinType.MajorCheckIn;
                  let i;
                  (i =
                    o === a.default.CheckinType.MinorCheckIn
                      ? "minor"
                      : o === a.default.CheckinType.MajorCheckIn
                      ? "major"
                      : "overwrite-minor-version"),
                    gDesigner.stats(
                      "filespanel-view_sharepoint-checkin_confirm",
                      i
                    ),
                    t({ ok: !0, comment: n.find(".comment").val(), type: o });
                }),
            ],
          }),
            n.gDialog("open", !1),
            e.enableMinorVersions ||
              (n.find(".minor-related").hide(), n.find("textarea").focus());
        });
      }
    };
  }