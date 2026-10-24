/**
 * Webpack Module #1665
 * Type: class
 * Name: GSoftwareUpdatePanel
 */

function (e, t, n) {
    "use strict";
    n(8), n(20), n(3), n(34), n(4), n(13);
    var o = n(1);
    const i = n(606),
      a = n(394),
      r = n(1188),
      s = n(85),
      l = n(44),
      { SOFTWARE_UPDATE: c, DateAPI: d } = n(10);
    function u() {}
    o.GObject.inherit(u, i),
      (u.ID = "software-update-panel"),
      (u.prototype._mustBeOpened = null),
      (u.prototype.init = function (e) {
        (this._htmlElement = e),
          this._htmlElement.addClass("software-update-panel"),
          $("<div></div>")
            .addClass("g-btn-close")
            .append($("<span></span>").addClass("gravit-icon-close"))
            .on("click", () => this._hide())
            .appendTo(this._htmlElement),
          this._updatePanelState(!1);
      }),
      (u.prototype._hide = function () {
        this._updatePanelState(!1);
      }),
      (u.prototype._changePanelVisibility = function (e) {
        e
          ? this._htmlElement.removeClass("g-hide")
          : this._htmlElement.addClass("g-hide");
      }),
      (u.prototype._updatePanelState = function (e) {
        e !== this._mustBeOpened &&
          (this._changePanelVisibility(e),
          (this._mustBeOpened = e),
          this.trigger(a.UPDATE_EVENT));
      }),
      (u.prototype._updateContent = function (e) {
        this._htmlElement.find(".content").remove(),
          this._htmlElement.append(
            $("<div></div>").addClass("content").append(e)
          );
      }),
      (u.prototype.activate = function () {
        this._addEventListeners();
      }),
      (u.prototype.deactivate = function () {
        this._removeEventListeners();
      }),
      (u.prototype._addEventListeners = function () {
        gDesigner.addEventListener(
          r.AfterUpdate,
          this._handleAfterUpdate,
          this
        ),
          gDesigner.addEventListener(
            r.DownloadComplete,
            this._handleDownloadComplete,
            this
          ),
          gDesigner.addEventListener(
            r.Downloading,
            this._handleDownloadInProgress,
            this
          ),
          gDesigner.addEventListener(
            r.UpdateAvailable,
            this._handleUpdateAvailable,
            this
          ),
          gDesigner.addEventListener(
            r.UpdateError,
            this._handleUpdateError,
            this
          ),
          gDesigner.addEventListener(
            r.UpdateNotAvailable,
            this._handleUpdateNotAvailable,
            this
          );
      }),
      (u.prototype._handleAfterUpdate = function (e) {
        if (!this._shouldShowMessages(e)) return;
        const t = e.currentVersion,
          n = o.GLocale.get(
            new o.GLocaleKey("GSoftwareUpdatePanel", "text.after-update")
          ).replace("%currentVersion", t);
        this._updateContent(
          $("<div></div>")
            .addClass("message")
            .addClass("featured")
            .append(n)
            .append(
              c.SHOW_CHANGE_LOG
                ? $("<a></a>")
                    .text(
                      o.GLocale.get(
                        new o.GLocaleKey(
                          "GSoftwareUpdatePanel",
                          "text.see-release-notes"
                        )
                      )
                    )
                    .click((e) => {
                      gContainer.openExternalLink(
                        e,
                        gDesigner
                          .getSoftwareUpdateManager()
                          .getReleaseNotesLink()
                      );
                    })
                : ""
            )
        ),
          this._updatePanelState(!0);
      }),
      (u.prototype._handleUpdateNotAvailable = function (e) {
        if (!this._shouldShowMessages(e)) return;
        const t = e.currentVersion,
          n = o.GLocale.get(
            new o.GLocaleKey(
              "GSoftwareUpdatePanel",
              "text.update-not-available"
            )
          ).replace("%currentVersion", t);
        this._updateContent($("<div></div>").addClass("message").append(n)),
          this._updatePanelState(!0);
      }),
      (u.prototype._handleDownloadComplete = function (e) {
        if (!this._shouldShowMessages(e)) return;
        const t = e.newVersion,
          n = e.forceUpdate,
          i = o.GLocale.get(
            new o.GLocaleKey("GSoftwareUpdatePanel", "text.download-ready")
          ).replace("%newVersion", t);
        var a = !1;
        this._updateContent(
          $("<div></div>")
            .addClass("message")
            .addClass("featured")
            .html(i)
            .click(async () => {
              a ||
                ((await gContainer.canUnload(
                  gDesigner.hasModifiedDocuments(),
                  gDesigner.hasSynchronizingDocuments()
                )) &&
                  ((a = !0),
                  gDesigner.getSoftwareUpdateManager().installUpdate(),
                  this._updateContent(
                    $("<div></div>")
                      .addClass("message")
                      .addClass("featured")
                      .append(
                        $("<span/>")
                          .addClass("gravit-icon-rotate-right-flat")
                          .addClass("icon")
                          .addClass("spin")
                      )
                      .append(
                        o.GLocale.get(
                          new o.GLocaleKey(
                            "GSoftwareUpdatePanel",
                            "text.updating"
                          )
                        )
                      )
                  )));
            })
        ),
          this._updatePanelState(!0),
          n && this._createForceUpdateMessageDialog();
      }),
      (u.prototype._handleDownloadInProgress = function (e) {
        if (!this._shouldShowMessages(e)) return;
        const t = e.percent,
          n = e.newVersion;
        var i = this._htmlElement.find(".progress-content");
        const a = o.GLocale.get(
          new o.GLocaleKey("GSoftwareUpdatePanel", "text.download-progress")
        ).replace("%newVersion", n);
        i.length ||
          (this._updateContent(
            $("<div></div>")
              .addClass("message")
              .text(a)
              .append(
                $("<div></div>")
                  .addClass("progress-content")
                  .append(
                    $("<div></div>")
                      .addClass("progress-element")
                      .append($("<div></div>").addClass("progress-bar"))
                  )
                  .append($("<div></div>").addClass("percent"))
              )
          ),
          (i = this._htmlElement.find(".progress-content")));
        i.find(".progress-bar").css({ width: "".concat(t, "%") }),
          i.find(".percent").text(t);
      }),
      (u.prototype._shouldShowMessages = function (e) {
        return !e.isSilent;
      }),
      (u.prototype._handleUpdateAvailable = function (e) {
        if (!this._shouldShowMessages(e)) return;
        const t = e.currentVersion,
          n = e.newVersion,
          i = e.forceUpdate;
        if (e.isSilent && !i) return;
        !i ||
          (gContainer.getRuntime() !== s.Runtime.Browser &&
            gContainer.getRuntime() !== s.Runtime.PWA) ||
          this._createForceUpdateMessageDialog();
        const a = o.GLocale.get(
            new o.GLocaleKey("GSoftwareUpdatePanel", "text.update-available")
          )
            .replace("%newVersion", n)
            .replace("%currentVersion", t),
          r = $("<span/>")
            .addClass("gravit-icon-rotate-right-flat")
            .addClass("icon");
        this._updateContent(
          $("<div></div>")
            .addClass("message")
            .addClass("featured")
            .append(r)
            .append(a)
            .append(
              $("<a></a>")
                .append(
                  o.GLocale.get(
                    new o.GLocaleKey("GSoftwareUpdatePanel", "text.update-now")
                  )
                )
                .click(() => {
                  r.addClass("spin"), this._installAfterDocumentUnload();
                })
            )
        ),
          this._updatePanelState(!0);
      }),
      (u.prototype._installAfterDocumentUnload = async function () {
        if (
          await gContainer.canUnload(
            gDesigner.hasModifiedDocuments(),
            gDesigner.hasSynchronizingDocuments()
          )
        )
          switch (gContainer.getRuntime()) {
            case s.Runtime.Browser:
            case s.Runtime.PWA:
              gDesigner.getSoftwareUpdateManager().installUpdate();
              break;
            case s.Runtime.Electron:
              gDesigner.getSoftwareUpdateManager().downloadUpdate();
          }
        else
          l.alert(
            o.GLocale.get(
              new o.GLocaleKey(
                "GSoftwareUpdatePanel",
                "text.dialog-unsaved-documents"
              )
            )
          );
      }),
      (u.prototype._createForceUpdateMessageDialog = function () {
        let e,
          t = !1;
        const n = d.minutesToMilliseconds(5),
          i = () => {
            t ||
              ((t = !0),
              e.gDialog("close"),
              gDesigner.createCountdown(() => {
                gDesigner.getSoftwareUpdateManager().installUpdate();
              }, n));
          };
        (e = $("<div></div>").gDialog({
          releaseOnClose: !0,
          className: "g-force-update-app-dialog",
          closeCallback: i,
        })),
          $("<div></div>")
            .addClass("g-btn-close")
            .append($("<span></span>").addClass("gravit-icon-close"))
            .on("click", () => i())
            .appendTo(e),
          $("<div></div>").addClass("logo").appendTo(e),
          $("<div></div>")
            .addClass("content")
            .append(
              $("<span></span>")
                .addClass("title")
                .html(
                  o.GLocale.get(
                    new o.GLocaleKey(
                      "GSoftwareUpdatePanel",
                      "text.force-new-version-available"
                    )
                  ).replace(
                    "%newVersion",
                    gDesigner.getSoftwareUpdateManager().getNewVersion()
                  )
                )
            )
            .append(
              $("<span></span>")
                .addClass("subtitle")
                .html(
                  o.GLocale.get(
                    new o.GLocaleKey(
                      "GSoftwareUpdatePanel",
                      "text.force-message-avoid-losing-progress"
                    )
                  )
                )
            )
            .append(
              $("<span></span>")
                .addClass("update-information")
                .html(
                  o.GLocale.get(
                    new o.GLocaleKey(
                      "GSoftwareUpdatePanel",
                      "text.force-update-information-time"
                    )
                  ).replace("%minutes", 5)
                )
            )
            .append(
              $("<div></div>")
                .addClass("buttons")
                .append(
                  $("<button></button>")
                    .append(
                      $("<span></span>").text(
                        o.GLocale.get(
                          new o.GLocaleKey("GSoftwareUpdatePanel", "text.ok")
                        )
                      )
                    )
                    .on("click", () => i())
                )
            )
            .appendTo(e),
          e.gDialog("open", !1);
      }),
      (u.prototype._handleUpdateError = function (e) {
        if (!this._shouldShowMessages(e)) return;
        const t = o.GLocale.get(
          new o.GLocaleKey("GSoftwareUpdatePanel", "text.update-error")
        );
        this._updateContent($("<div></div>").addClass("message").append(t)),
          this._updatePanelState(!0);
      }),
      (u.prototype._removeEventListeners = function () {
        gDesigner.removeEventListener(r.AfterUpdate, this._handleAfterUpdate),
          gDesigner.removeEventListener(
            r.DownloadComplete,
            this._handleDownloadComplete
          ),
          gDesigner.removeEventListener(
            r.Downloading,
            this._handleDownloadInProgress
          ),
          gDesigner.removeEventListener(
            r.UpdateAvailable,
            this._handleUpdateAvailable
          ),
          gDesigner.removeEventListener(r.UpdateError, this._handleUpdateError),
          gDesigner.removeEventListener(
            r.UpdateNotAvailable,
            this._handleUpdateNotAvailable
          );
      }),
      (u.prototype.getTitle = function () {
        return o.GLocale.get(new o.GLocaleKey("GSoftwareUpdatePanel", "title"));
      }),
      (u.prototype.isEnabled = function () {
        return !!this._mustBeOpened;
      }),
      (u.prototype.toString = function () {
        return "[Object GSoftwareUpdatePanel]";
      }),
      (u.prototype.getId = function () {
        return u.ID;
      }),
      (e.exports = u);
  }