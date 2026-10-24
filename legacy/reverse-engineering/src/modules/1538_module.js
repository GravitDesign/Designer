/**
 * Webpack Module #1538
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(8), n(20), n(34), n(4), n(13), n(38);
    const { GLocale: o, GLocaleKey: i } = n(1),
      a = n(1166),
      r = n(177),
      {
        gApi: s,
        Notification: l,
        NotificationConstants: {
          ACTIONS: {
            ACTION_APPROVE: c,
            ACTION_REQUEST_APPROVE: d,
            ACTION_REOPEN: u,
            ACTION_IN_REVIEW: p,
          } = {},
        },
      } = n(10);
    function g() {
      (this._container = null), (this._opened = !1);
    }
    (g.prototype._updateHistoryList = async function () {
      const e = this._container.find(".list");
      e.empty(), e.addClass("loading");
      var t = await s.annotations
        .getDesignHistory(gDesigner.getActiveDocument().getId())
        .catch((e) => []);
      e.append(
        t.map((e) => {
          const t = l.from(e);
          var n;
          switch (t.getAction()) {
            case c:
              n = o.get(
                new i("GFileStatusHistoryDialog", "text.action-approved")
              );
              break;
            case d:
              n = o.get(
                new i(
                  "GFileStatusHistoryDialog",
                  "text.action-request-approval"
                )
              );
              break;
            case u:
              n = o.get(
                new i("GFileStatusHistoryDialog", "text.action-reopened")
              );
              break;
            case p:
              n = o.get(
                new i("GFileStatusHistoryDialog", "text.action-in-review")
              );
          }
          if (n) {
            var r = $("<span></span>").addClass("annotation-title-group"),
              s = $("<span></span>")
                .html(n.replace("%name", this._getUserNameFromNotification(t)))
                .addClass("annotation-title")
                .appendTo(r),
              g = o.toLocaleDate(t.created, {
                year: "numeric",
                month: "numeric",
                day: "numeric",
                hour: "numeric",
                minute: "numeric",
              });
            return (
              $("<span>").text("·").addClass("dot").appendTo(r),
              $("<span></span>")
                .text(g)
                .addClass("annotation-date")
                .appendTo(r),
              new a({ id: t.uid, name: t.uname, last_name: t.last_name })
                .build()
                .addClass("g-user-preview-history")
                .insertBefore(s),
              r
            );
          }
        })
      ),
        e.removeClass("loading");
    }),
      (g.prototype.open = function () {
        if (this._opened) return;
        (this._opened = !0),
          this._container && this._container.remove(),
          (this._container = $("<div/>").gDialog({
            className: "g-file-status-history-dialog",
          }));
        let e = $("<div/>")
          .addClass("row")
          .addClass("header")
          .appendTo(this._container);
        $("<div/>")
          .addClass("title")
          .text(o.get(new i("GFileStatusHistoryDialog", "text.status-history")))
          .appendTo(e),
          $("<div></div>")
            .addClass("btn-close")
            .click(() => {
              (this._opened = !1), this._container.gDialog("close");
            })
            .append($("<span></span>").addClass("gravit-icon-close"))
            .appendTo(e),
          $("<div/>").addClass("list").appendTo(this._container);
        this._container.gDialog("open", !1), this._updateHistoryList();
      }),
      (g.prototype._getUserNameFromNotification = function (e) {
        return new r({
          name: e.uname,
          last_name: e.last_name,
        }).getFullUserName();
      }),
      (e.exports = g);
  }