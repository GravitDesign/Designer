/**
 * Webpack Module #1537
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    n(58), n(8), n(71), n(4), n(13);
    var i = o(n(1155));
    const { GLocale: a, GLocaleKey: r, GObject: s } = n(1),
      l = n(392),
      c = n(1165),
      d = n(123),
      u = n(78),
      p = n(447),
      {
        FileStatus: {
          IN_REVIEW: g,
          AWAITING_APPROVAL: h,
          APPROVED: f,
          REOPENED: m,
        },
        GFileReviewActions: {
          ACTION_REQUEST_REVIEW: y,
          ACTION_REQUEST_APPROVAL: v,
          ACTION_REOPEN: _,
          ACTION_APPROVE: b,
        },
        FileReviewStatusAvailable: w,
        ShareRoles: C,
        FILE_REVIEW_ENABLED: x,
      } = n(10),
      S = n(1538);
    function E() {}
    s.inherit(E, d),
      (E.prototype.init = function (e, t) {
        (this._container = e),
          (this._fileStatusHistoryDialog = new S()),
          this._init();
      }),
      (E.prototype.update = function (e, t, n) {
        return (
          e !== this._document && e
            ? ((this._document = e),
              this._reviewManager &&
                this._reviewManager.removeEventListener(
                  c.UpdateEvent,
                  this._handleReviewUpdate,
                  this
                ),
              gDesigner.addEventListener(l, this._stateChangedEvent, this),
              (this._reviewManager = gDesigner.getFileReviewManager()),
              this._reviewManager.addEventListener(
                c.UpdateEvent,
                this._handleReviewUpdate,
                this
              ),
              this._requestUIUpdate())
            : e ||
              (gDesigner.removeEventListener(l, this._stateChangedEvent, this),
              this._reviewManager &&
                (this._reviewManager.removeEventListener(
                  c.UpdateEvent,
                  this._handleReviewUpdate,
                  this
                ),
                (this._reviewManager = null))),
          (this._document = e),
          !!this._document
        );
      }),
      (E.prototype.isAvailable = function () {
        return !!x;
      }),
      (E.prototype._init = function () {
        x &&
          ((this._updatingStatus = !1),
          this._container.addClass("g-annotation-review-docker"),
          this._buildMainPanel(
            $("<div/>").addClass("panel").addClass("main-panel").hide()
          ),
          this._document && this._requestUIUpdate());
      }),
      (E.prototype._getDAOStatus = async function (e) {
        const t = this._getAppManager();
        var n;
        switch (e) {
          case g:
            return (
              (n = await t.hasAccess(y, !0)),
              {
                status: e,
                getLabel: () =>
                  a.get(new r("GReviewDockerProperties", "text.review-title")),
                getDescription: () =>
                  a.get(
                    new r("GReviewDockerProperties", "text.review-description")
                  ),
                getIcon: () => null,
                getIconLabel: () => null,
                isAvailable: async () =>
                  n &&
                  !!this._reviewManager &&
                  this._reviewManager.canUpdateToStatus(g),
              }
            );
          case m:
            return (
              (n = await t.hasAccess(_, !0)),
              {
                status: e,
                getLabel: () =>
                  a.get(
                    new r(
                      "GReviewDockerProperties",
                      n ? "text.reopen-title" : "text.reopened-title"
                    )
                  ),
                getDescription: () =>
                  a.get(
                    new r("GReviewDockerProperties", "text.reopen-description")
                  ),
                getIcon: () => null,
                getIconLabel: () => null,
                isAvailable: async () =>
                  n &&
                  !!this._reviewManager &&
                  this._reviewManager.canUpdateToStatus(m),
              }
            );
          case h:
            const i = t.hasRole(C.Owner),
              s = await this._reviewManager.hasApprovers();
            return (
              (n = await t.hasAccess(v, !0)),
              {
                status: e,
                getLabel: () =>
                  a.get(
                    new r(
                      "GReviewDockerProperties",
                      n
                        ? "text.request-approval-title"
                        : "text.requested-approval-title"
                    )
                  ),
                getDescription: () =>
                  a.get(
                    new r(
                      "GReviewDockerProperties",
                      "text.request-approval-description"
                    )
                  ),
                getIcon: () => (i && !s ? "info" : null),
                getIconLabel: () =>
                  i && !s
                    ? a.get(
                        new r(
                          "GReviewDockerProperties",
                          "text.request-approval-tooltip"
                        )
                      )
                    : null,
                isAvailable: async () => {
                  const e =
                    !!this._reviewManager &&
                    this._reviewManager.canUpdateToStatus(h);
                  return s && n && e;
                },
              }
            );
          case f:
            n = await t.hasAccess(b, !0);
            var o = this._getStatus();
            return {
              status: e,
              getLabel: () =>
                a.get(
                  new r(
                    "GReviewDockerProperties",
                    n && e !== o ? "text.approve-title" : "text.approved-title"
                  )
                ),
              getDescription: () =>
                a.get(
                  new r("GReviewDockerProperties", "text.approved-description")
                ),
              getIcon: () => null,
              getIconLabel: () => null,
              isAvailable: async () =>
                n &&
                !!this._reviewManager &&
                this._reviewManager.canUpdateToStatus(f),
            };
        }
      }),
      (E.prototype._stateChangedEvent = function () {
        this._requestUIUpdate();
      }),
      (E.prototype._handleReviewUpdate = function () {
        this._requestUIUpdate();
      }),
      (E.prototype._buildMainPanel = function (e) {
        this._mainPanel = e;
        let t = $("<div/>")
          .addClass("row")
          .addClass("header")
          .appendTo(this._mainPanel);
        $("<div/>")
          .text(a.get(new r("GReviewDockerProperties", "text.current-status")))
          .addClass("status")
          .click(() => {
            (this._opened = !1), this._container.gDialog("close");
          })
          .appendTo(t),
          $("<div/>")
            .text(
              a.get(new r("GReviewDockerProperties", "text.status-history"))
            )
            .addClass("history-actions")
            .hide()
            .click(() => {
              gDesigner.stats("reviewdocker_open_status-history"),
                this._fileStatusHistoryDialog.open();
            })
            .appendTo(t),
          (this._statusSelectorContainer = $("<div/>")
            .addClass("row")
            .addClass("status-selector")
            .appendTo(this._mainPanel));
        let n = $("<div/>")
          .addClass("row")
          .addClass("footer")
          .hide()
          .appendTo(this._mainPanel);
        $("<div/>")
          .addClass("footer-title")
          .text(
            a.get(
              new r("GReviewDockerProperties", "text.please-share-to-start")
            )
          )
          .appendTo(n),
          $("<div/>")
            .addClass("footer-action")
            .text(
              a.get(new r("GReviewDockerProperties", "text.share-design-now"))
            )
            .addClass("footer-action")
            .click(() => this._requestShare())
            .appendTo(n),
          this._mainPanel.appendTo(this._container);
      }),
      (E.prototype._requestShare = function () {
        const e = gDesigner.getShareManager();
        e.isShareProRestricted()
          ? gDesigner.stats("reviewdocker_nonprotriespro_share")
          : gDesigner.stats("reviewdocker_share"),
          this._document.getStorageItem()
            ? e.share()
            : (new i.default()
                .listen(u)
                .when(
                  (e) =>
                    !!(
                      e &&
                      e.type &&
                      e.document &&
                      !e.document.isLockedByVersionHistory() &&
                      e.type === u.Type.StorageItemUpdated &&
                      e.document.getId()
                    ) &&
                    (this._document === e.document ||
                      (this._document.getStorageItem() &&
                        this._document.getId() === e.document.getId()))
                )
                .do(() => e.share()),
              gDesigner.executeAction(p.ID));
      }),
      (E.prototype._requestUIUpdate = async function () {
        this.isAvailable() &&
          (this._updatingUI
            ? (this._requestedDuringUIUpdate = !0)
            : ((this._updatingUI = !0),
              await this._updateUI(),
              (this._updatingUI = !1),
              this._requestedDuringUIUpdate &&
                ((this._requestedDuringUIUpdate = !1),
                await this._updateUI())));
      }),
      (E.prototype._getAppManager = function () {
        return (
          this._appManager ||
            (this._appManager = gDesigner.getApplicationManager()),
          this._appManager
        );
      }),
      (E.prototype._updateFooter = function () {
        var e = this._mainPanel.find(".footer"),
          t = this._mainPanel.find(".history-actions");
        const n = !(!this._document || !this._document.getStorageItem());
        e
          .find(".footer-title")
          .text(
            a.get(
              new r(
                "GReviewDockerProperties",
                n
                  ? "text.please-share-to-start"
                  : "text-please-save-share-to-start"
              )
            )
          ),
          e
            .find(".footer-action")
            .text(
              a.get(
                new r(
                  "GReviewDockerProperties",
                  n ? "text.share-design-now" : "text.save-share-design-now"
                )
              )
            ),
          this._isDocumentSane() ? (e.hide(), t.show()) : (e.show(), t.hide());
      }),
      (E.prototype._updateUI = async function () {
        w.includes(this._getStatus()) &&
          (this._statusSelectorContainer.empty(),
          this._mainPanel && this._mainPanel.hide(),
          this._document &&
            (this._mainPanel && this._mainPanel.show(),
            await this._createStatusList(this._statusSelectorContainer),
            this._updateFooter(),
            this._mainPanel.show()));
      }),
      (E.prototype._getStatus = function () {
        return (this._reviewManager && this._reviewManager.getStatus()) || g;
      }),
      (E.prototype._isDocumentSane = function () {
        return (
          !!this._document &&
          this._getAppManager().isSharing() &&
          this._document.isCollaborative()
        );
      }),
      (E.prototype._createStatusList = async function (e) {
        var t = this._getStatus(),
          n = this._isStatusChangeAllowed();
        $("<div/>").addClass("dropdown-icon").appendTo(e),
          (this._selectedItemContainer = $("<div/>")
            .addClass("selected-item-container")
            .toggleClass("disabled", !this._isDocumentSane() || !n)
            .appendTo(e)),
          (this._currentSelectedStatusElement = await this._makeItemForDAO(
            await this._getDAOStatus(t),
            { selected: !0, canHover: !1, disabled: !this._isDocumentSane() }
          )),
          this._currentSelectedStatusElement.appendTo(
            this._selectedItemContainer
          ),
          (this._statusListOverlay = $("<div/>").gOverlay({
            padding: !1,
            clazz: "g-file-status-selector-overlay",
            offsetY: -66,
            releaseOnClose: !1,
          })),
          (this._statusSelector = $("<div/>")
            .addClass("g-file-status-selector")
            .appendTo(this._statusListOverlay));
        const o = async (e) => {
          var n = await this._makeItemForDAO(e, {
            selected: e.status === t,
            canHover: !0,
          });
          n.appendTo(this._statusSelector);
          (await e.isAvailable())
            ? n.on("click", async () => {
                if (
                  (gDesigner.stats(
                    "reviewdocker_design",
                    ((e) => {
                      switch (e) {
                        case g:
                          return "InReview";
                        case h:
                          return "RequestApproval";
                        case f:
                          return "Approved";
                        case m:
                          return "ReOpened";
                      }
                    })(e.status)
                  ),
                  this._statusListOverlay.gOverlay("close"),
                  this._getStatus() !== e.status)
                ) {
                  this._updatingStatus = !0;
                  const t = await this._makeItemForDAO(e, {
                    selected: !1,
                    canHover: !1,
                    loading: !0,
                  });
                  this._currentSelectedStatusElement.replaceWith(t),
                    (this._currentSelectedStatusElement = t),
                    this._reviewManager
                      .updateReviewStatus(e.status)
                      .then(() => (this._updatingStatus = !1))
                      .catch(() => (this._updatingStatus = !1));
                }
              })
            : n.on("click", () => this._statusListOverlay.gOverlay("close"));
        };
        if (this._isDocumentSane() && n) {
          this._selectedItemContainer.removeClass("disabled");
          for (let e = 0; e < w.length; e++) {
            var i = w[e],
              a = await this._getDAOStatus(i);
            await o(a);
          }
          e.on("click", async () => {
            this._updatingStatus ||
              this._statusListOverlay.gOverlay(
                "open",
                this._selectedItemContainer
              );
          });
        }
      }),
      (E.prototype._makeItemForDAO = async function (e, t) {
        let {
          selected: n = !1,
          canHover: o = !0,
          loading: i = !1,
          disabled: a = !1,
        } = t;
        var r = $("<div/>")
            .addClass("g-annotation-review-docker-status-item")
            .data("status", e)
            .attr("status-id", e.status)
            .toggleClass("disabled", a || (!n && !(await e.isAvailable())))
            .toggleClass("can-hover", o)
            .toggleClass("loading", i),
          s = $("<div/>")
            .addClass("icon-container")
            .toggleClass("loading", i)
            .append($("<div/>").addClass("loading-indicator"))
            .appendTo(r);
        if (!i) {
          var l = e.getIcon();
          l
            ? (s.addClass(l),
              e.getIconLabel() && s.attr("data-title", e.getIconLabel()))
            : s.toggleClass("selected", n);
        }
        var c = $("<div/>").addClass("details-container").appendTo(r);
        return (
          $("<div/>").addClass("title").text(e.getLabel()).appendTo(c),
          $("<div/>")
            .addClass("description")
            .text(e.getDescription())
            .appendTo(c),
          r
        );
      }),
      (E.prototype._isStatusChangeAllowed = function () {
        return !0;
      }),
      (e.exports = E);
  }