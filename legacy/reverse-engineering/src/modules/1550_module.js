/**
 * Webpack Module #1550
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    n(8), n(20), n(34), n(4), n(41), n(13);
    var i = n(1),
      a = n(1163),
      r = o(n(1090)),
      s = o(n(358)),
      l = n(40),
      c = n(10);
    const d = n(0),
      u = n(1551),
      p = n(1174);
    function g() {}
    d.inherit(g, u),
      (g.prototype.render = async function (e, t) {
        this._createUI(e), await this._updateUIForFile(e, t);
      }),
      (g.prototype._createUI = function (e) {
        $("<div/>")
          .addClass("file-preview-container")
          .append($("<img/>").addClass("file-preview").attr("src", ""))
          .appendTo(e);
        const t = $("<div/>").addClass("file-button-container").appendTo(e);
        $("<button/>")
          .gShareButton({
            clazz: "file-panel-share-button",
            defaultText: i.GLocale.get(
              new i.GLocaleKey("GFilesPanelViewBase", "text.share-this-file")
            ),
            stats: "filespanel-view_infoPanel_share",
            restrictedStats: "filespanel-view_infoPanel_nonprotriespro-share",
          })
          .appendTo(t)
          .hide(),
          $("<div/>").addClass("file-name").appendTo(e),
          $("<div/>").addClass("file-created").appendTo(e);
        var n = $("<div/>").addClass("collaboration").appendTo(e);
        $("<span/>")
          .addClass("collaborators")
          .append($("<div/>").addClass("gravit-icon-collaborators"))
          .append($("<div/>").addClass("collaborators-number").text("0"))
          .append(
            $("<span/>").text(
              " " +
                i.GLocale.get(
                  new i.GLocaleKey("GFilesPanelViewBase", "text.collaborators")
                )
            )
          )
          .appendTo(n)
          .hide(),
          $("<span/>")
            .addClass("comments")
            .append($("<div/>").addClass("gravit-icon-comment"))
            .append($("<div/>").addClass("comments-number").text("0"))
            .append(
              $("<span/>")
                .addClass("comments-label")
                .text(
                  i.GLocale.get(
                    new i.GLocaleKey("GFilesPanelViewBase", "text.comments")
                  )
                )
            )
            .appendTo(n)
            .hide(),
          $("<div/>")
            .addClass("status")
            .append(
              $("<div/>")
                .addClass("label")
                .text(
                  i.GLocale.get(
                    new i.GLocaleKey("GFilesPanelViewBase", "text.status")
                  ) + ": "
                )
            )
            .append($("<div/>").addClass("state").text(""))
            .appendTo(e)
            .hide();
      }),
      (g.prototype._updateUIForFile = async function (e, t) {
        const n = e.find(".share-button"),
          o = e.find(".comments-number"),
          d = e.find(".comments-label"),
          u = e.find(".collaborators-number"),
          g = e.find(".file-created"),
          h = e.find(".collaboration"),
          f = e.find(".status"),
          m = e.find(".collaborators");
        e
          .find(".file-preview")
          .attr("src", t.getPreviewURL() || c.DEFAULT_FILE_THUMBNAIL),
          e.find(".file-preview").unbind("dblclick"),
          e.find(".file-preview").on("dblclick", (e) => {
            e.stopPropagation(),
              e.preventDefault(),
              this._triggerEvent(p.Type.DoubleClickFile, t);
          }),
          e.find(".file-name").text(t.name),
          e.data("fileId", t.id);
        const y = await r.default.createStorageItem(t);
        y.supportsShadowFile() && (await y.syncShadowFile());
        const v = await c.gApi.getFileExtended(y.getId()).catch(() => null);
        g.text(
          i.GLocale.get(
            new i.GLocaleKey("GFilesPanelViewBase", "text.created")
          ).replace(
            "%createdTime",
            (0, a.dateToFilePreviewFormat)(t.created || v.created)
          )
        );
        const _ = (v && s.default.getCommentsCount(v)) || 0;
        o.text(_),
          d.text(
            i.GLocale.get(
              new i.GLocaleKey(
                "GFilesPanelViewBase",
                1 === _ ? "text.comment" : "text.comments"
              )
            )
          );
        let b = null,
          w = null,
          C = !1;
        if (!v)
          return (
            h.hide(),
            n.gShareButton("update", { disabled: !0, isSharing: !1 }),
            void n.attr(
              "data-title",
              i.GLocale.get(
                new i.GLocaleKey(
                  "GFilesPanelViewBase",
                  "text.can-only-share-by-owner"
                )
              )
            )
          );
        {
          const e = gDesigner.getSyncUser();
          ({
            state: { isPrivate: b, sharing: w, owner: C },
          } = (0, l.getFileStateAndRole)(e, v, {})),
            !gDesigner.getApplicationManager().isShareEngineEnabled() ||
              (w && !C) ||
              n.show(),
            h.show();
        }
        if (
          (n.gShareButton("update", {
            disabled: !1,
            storeItem: y,
            isSharing: w,
            closeCallback: () => {
              this._triggerEvent(p.Type.Reload);
            },
            isPrivate: b,
          }),
          n.removeAttr("data-title"),
          !w)
        )
          return (
            f.hide(),
            e.find(".collaborators").hide(),
            void e.find(".comments").hide()
          );
        const x = await gDesigner
          .getFileReviewManager()
          .getDocumentReviewHistory(y.getId());
        e.find(".comments").show(),
          x.length > 1 && v
            ? (f.show(), this._updateStatus(e, v.status))
            : f.hide();
        const S = v.getPrivateShareList().filter((e) => !e.owner).length;
        S > 0 ? (m.show(), u.text(S)) : m.hide();
      }),
      (g.prototype._updateStatus = function (e, t) {
        const n = e.find(".state");
        switch (t) {
          case c.FileStatus.IN_REVIEW:
            n.text(
              i.GLocale.get(
                new i.GLocaleKey("GReviewDockerProperties", "text.review-title")
              )
            );
            break;
          case c.FileStatus.REOPENED:
            n.text(
              i.GLocale.get(
                new i.GLocaleKey("GReviewDockerProperties", "text.reopen-title")
              )
            );
            break;
          case c.FileStatus.AWAITING_APPROVAL:
            n.text(
              i.GLocale.get(
                new i.GLocaleKey(
                  "GReviewDockerProperties",
                  "text.request-approval-title"
                )
              )
            );
            break;
          case c.FileStatus.APPROVED:
            n.text(
              i.GLocale.get(
                new i.GLocaleKey(
                  "GReviewDockerProperties",
                  "text.approved-title"
                )
              )
            );
        }
      }),
      (e.exports = g);
  }