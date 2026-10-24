/**
 * Webpack Module #1528
 * Type: class
 * Name: GVersionHistoryProperties
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    n(19), n(57), n(8), n(20), n(3), n(34), n(4), n(13), n(26);
    var i = n(1),
      a = n(10),
      r = n(1163),
      s = o(n(123)),
      l = o(n(1159)),
      c = o(n(220)),
      d = o(n(163)),
      u = o(n(219)),
      p = o(n(78)),
      g = o(n(86)),
      h = o(n(217)),
      f = o(n(336)),
      m = o(n(67));
    function y() {}
    i.GObject.inherit(y, s.default),
      (y.ID = "version-history"),
      (y.TITLE = new i.GLocaleKey("GVersionHistoryProperties", "title")),
      (y.prototype._relayoutBindedToActiveDocument = null),
      (y.prototype._panel = null),
      (y.prototype._toolbar = null),
      (y.prototype._loadingIndicator = null),
      (y.prototype._previewOverlay = null),
      (y.prototype._fileId = null),
      (y.prototype._enabledInputs = null),
      (y.prototype._previousDoc = null),
      (y.prototype._previewDoc = null),
      (y.prototype.isGroup = function (e) {
        return !0;
      }),
      (y.prototype.isAvailable = function (e) {
        return !1;
      }),
      (y.prototype.init = function (e, t) {
        (this._panel = e), (this._toolbar = t);
        t.addClass("filled"),
          t.addClass("version-history-toolbar"),
          $("<label/>")
            .addClass("version-history-toolbar")
            .append(
              $("<span />")
                .addClass("pro")
                .text(
                  i.GLocale.get(
                    new i.GLocaleKey("GVersionHistoryProperties", "title")
                  )
                )
            )
            .appendTo(t),
          $("<button/>")
            .append($("<span></span>").addClass("gravit-icon-detach"))
            .on(
              "click",
              function () {
                gDesigner.stats("version-history-panel_close_panel"),
                  this.close();
              }.bind(this)
            )
            .appendTo(t),
          (this._loadingIndicator = $("<div/>")
            .addClass("version-history-panel-loading g-loading")
            .appendTo(e)),
          (this._versionsContainer = $("<div/>")
            .addClass("section")
            .append([
              $("<div/>")
                .addClass("title")
                .text(
                  i.GLocale.get(
                    new i.GLocaleKey(
                      "GVersionHistoryProperties",
                      "text.title-manual-save"
                    )
                  )
                )
                .gRichTooltip(
                  m.default.from({
                    title: i.GLocale.get(
                      new i.GLocaleKey(
                        "GVersionHistoryProperties",
                        "text.title-manual-save-tooltip-title"
                      )
                    ),
                    middle: !1,
                    marginLeft: 10,
                  })
                ),
              $("<div/>").addClass("content"),
            ]));
        var n = $("<div/>")
          .addClass("container")
          .append(this._versionsContainer)
          .appendTo(e);
        a.AUTO_SAVE_ENABLED &&
          (this._autoSaveContainer = $("<div/>")
            .addClass("section")
            .append([
              $("<div/>")
                .addClass("title")
                .text(
                  i.GLocale.get(
                    new i.GLocaleKey(
                      "GVersionHistoryProperties",
                      "text.title-auto-save"
                    )
                  )
                )
                .gRichTooltip(
                  m.default.from({
                    title: i.GLocale.get(
                      new i.GLocaleKey(
                        "GVersionHistoryProperties",
                        "text.title-auto-save-tooltip-title"
                      )
                    ),
                    middle: !1,
                    marginLeft: 10,
                  })
                ),
              $("<div/>").addClass("content"),
            ])
            .appendTo(n)),
          gDesigner.addEventListener(l.default, this._handleEvent, this);
      }),
      (y.prototype._handleEvent = function (e) {
        e.type === l.default.Type.Enable
          ? this._updateVersionHistory(e.fileId)
          : e.type === l.default.Type.Close && this.close();
      }),
      (y.prototype._updateVersionHistory = function (e) {
        this._versionsContainer.find(".content").empty(),
          a.AUTO_SAVE_ENABLED &&
            this._autoSaveContainer.find(".content").empty(),
          this._toggleLoading(!0);
        var t = this;
        this._fileId = e;
        const n = [
          a.gApi.listVersions(this._fileId, "tf").then((e) => {
            const { f: t, t: n } = e;
            let o = [];
            for (let e = 0, t = n ? n.length : 0; e < t; e++)
              n[e]
                ? o.push(a.gApi.getFile(this._fileId, !1, n[e].versionId, "t"))
                : o.push(null);
            return Promise.all(o).then((e) => {
              let n = [];
              for (let o = 0, i = t.length; o < i; o++) {
                let i = {
                  version: t[o],
                  thumbnail: e[o] || {
                    name: gDesigner.getWindows().getActiveWindow().getTitle(),
                    url_t: "assets/icon/versus.svg",
                  },
                };
                n.push(i);
              }
              return Promise.resolve(n);
            });
          }),
        ];
        a.AUTO_SAVE_ENABLED &&
          n.push(
            a.gApi.listAutoSaves(this._fileId).then((e) => {
              let t = [],
                n = [];
              for (let t = 0, o = e.versions.length; t < o; t++)
                n.push(
                  e.versions_t && e.versions_t[t]
                    ? a.gApi.getAutoSaveThumbnail(
                        this._fileId,
                        e.versions_t[t].versionId
                      )
                    : null
                );
              return Promise.all(n).then((n) => {
                for (let o = 0, i = e.versions.length; o < i; o++) {
                  let i = {
                    version: e.versions[o],
                    thumbnail: {
                      name: gDesigner.getWindows().getActiveWindow().getTitle(),
                      url_t:
                        (n && n[o] && n[o].url) || "assets/icon/versus.svg",
                    },
                    autosave: !0,
                  };
                  t.push(i);
                }
                return t;
              });
            })
          ),
          Promise.all(n)
            .then((e) => {
              let [n, o] = e;
              t._renderVersionsList(n, o), this._toggleLoading(!1);
            })
            .catch(
              (e) => (
                new u.default(
                  i.GLocale.get(
                    new i.GLocaleKey(
                      "GVersionHistoryProperties",
                      "error-loading"
                    )
                  )
                ).open(),
                this._toggleLoading(!1),
                !1
              )
            );
      }),
      (y.prototype._renderVersionsList = function (e, t) {
        const n = gDesigner.isEnabledProFeatures(),
          o = this,
          s = gDesigner.getActiveDocument().getStorageItem(),
          l = s && s.getVersionId && s.getVersionId(),
          c = !!l;
        let d,
          u = this._versionsContainer.find(".content");
        a.AUTO_SAVE_ENABLED && (d = this._autoSaveContainer.find(".content"));
        const g = e.find((e) => e.version.latest);
        let h = g,
          m = !1;
        if (a.AUTO_SAVE_ENABLED && t && t.length) {
          const e = t.find((e) => e.version.latest);
          a.DateAPI.lt(g.version.modified, e.version.modified, !1) &&
            ((h = e), (m = !0));
        }
        const y = (e, t, a) => {
          let { version: s, thumbnail: d, autosave: u } = e;
          return $("<div />")
            .addClass("version-history-item")
            .addClass(
              (c ? l === s.versionId : ((m && u) || (!m && !u)) && s.latest)
                ? "vhi-initial"
                : ""
            )
            .addClass(n || s.latest ? "" : "vhi-disabled")
            .addClass(
              (c ? l === s.versionId : s.versionId === h.version.versionId)
                ? "vhi-active"
                : ""
            )
            .append(
              $("<div />")
                .addClass("vhi-thumbnail")
                .css("background-image", "url(" + d.url_t + ")")
            )
            .append(
              $("<div />")
                .addClass("vhi-info")
                .append(
                  $("<div />")
                    .addClass("vhi-title")
                    .text(
                      s.versionId === h.version.versionId
                        ? i.GLocale.get(
                            new i.GLocaleKey(
                              "GVersionHistoryProperties",
                              "text.current-version"
                            )
                          )
                        : i.GLocale.get(
                            new i.GLocaleKey(
                              "GVersionHistoryProperties",
                              "text.version"
                            )
                          ).replace("%version", a - t)
                    )
                )
                .append(
                  $("<div />")
                    .addClass("vhi-updated")
                    .text((0, r.dateToVersionFormat)(s.modified))
                )
            )
            .append(
              $("<div />")
                .addClass("vhi-settings")
                .addClass("gravit-icon-settings")
                .on("click", function (e) {
                  e.stopPropagation(),
                    (n || s.latest) &&
                      ($(this).find(".vhi-settings-list").toggle(),
                      gDesigner.stats(
                        "version-history-panel_click_setting-icon"
                      ));
                })
                .on("dblclick", function (e) {
                  e.stopPropagation();
                })
                .append(
                  $("<div />")
                    .addClass("vhi-settings-list")
                    .append(
                      $("<div />")
                        .addClass("vhi-settings-item g-menu-item-menu")
                        .text(
                          i.GLocale.get(
                            new i.GLocaleKey(
                              "GVersionHistoryProperties",
                              "preview"
                            )
                          )
                        )
                        .on("click", function (e) {
                          e.stopPropagation(),
                            gDesigner.stats(
                              "version-history-panel_show-preview_from-settings-menu"
                            ),
                            gDesigner.intercomStats(
                              "Preview version from history"
                            ),
                            o._showPreview(
                              s.versionId,
                              d.name,
                              $(this).closest(".version-history-item"),
                              u
                            ),
                            $(this).parent(".vhi-settings-list").hide();
                        })
                    )
                    .append(
                      $("<div />")
                        .addClass("vhi-settings-item g-menu-item-menu")
                        .text(
                          i.GLocale.get(
                            new i.GLocaleKey(
                              "GVersionHistoryProperties",
                              "restore"
                            )
                          )
                        )
                        .on("click", function (e) {
                          e.stopPropagation(),
                            gDesigner.stats(
                              "version-history-panel_restore-version_from-settings-menu"
                            ),
                            gDesigner.intercomStats(
                              "Open version from history"
                            ),
                            o._applyVersion(s.versionId, d.name, u),
                            $(this).parent(".vhi-settings-list").hide();
                        })
                    )
                )
            )
            .on("click", function (e) {
              if ($(this).hasClass("vhi-disabled"))
                return (
                  gDesigner.stats("version-history-panel_click_disabled"),
                  gDesigner.handlePROFeatureInterruption(),
                  !1
                );
              var t = this;
              setTimeout(function () {
                var e = parseInt($(t).data("dblclicked"), 10);
                e
                  ? $(t).data("dblclicked", e - 1)
                  : (gDesigner.stats(
                      "version-history-panel_show-preview_from-main-panel"
                    ),
                    o._showPreview(s.versionId, d.name, $(t), u),
                    gDesigner.intercomStats("Preview version from history"));
              }, 500);
            })
            .on("dblclick", function (e) {
              if ($(this).hasClass("vhi-disabled"))
                return (
                  gDesigner.stats("version-history-panel_dblclick_disabled"),
                  gDesigner.handlePROFeatureInterruption(),
                  !1
                );
              $(this).data("dblclicked", 2),
                gDesigner.stats("version-history-panel_apply-version"),
                o._applyVersion(s.versionId, d.name, u),
                gDesigner.intercomStats("Open version from history");
            })
            .on("mouseenter", function () {
              (n || s.latest) && $(this).addClass("show-icon");
            })
            .on("mouseleave", function () {
              $(this).removeClass("show-icon"),
                $(this).find(".vhi-settings-list").hide();
            });
        };
        function v(e) {
          for (let t = 0, n = e.length; t < n; t++) {
            let o = e[t],
              i = null;
            (i = o.autosave ? d : u), i.append(y(o, t, n));
          }
        }
        u.empty(),
          d && d.empty(),
          v(e),
          a.AUTO_SAVE_ENABLED && v(t),
          this._updatePanelHeight(),
          gDesigner.addEventListener(p.default, this._documentEvent, this),
          gDesigner.addEventListener(
            f.default,
            this._storageEventHandler,
            this
          );
      }),
      (y.prototype._updatePanelHeight = function () {
        let e =
          parseInt(
            this._panel.closest(".sidebar-inspector").outerHeight(),
            10
          ) - parseInt(this._toolbar.outerHeight(), 10);
        this._panel.css("height", e);
      }),
      (y.prototype._documentStatusEventHandler = function (e) {
        let { status: t } = e;
        t === g.default.LoadFailed && this._closePreview();
      }),
      (y.prototype._documentEvent = function (e) {
        let { document: t, type: n } = e;
        if (n === p.default.Type.AutoSaveSynchronized)
          return void this._updateVersionHistory(this._fileId);
        if (this._loadingPreview) return;
        const o = t.getStorageItem() instanceof c.default.Item,
          i = t.getScene();
        ((o && t.getStorageItem().getId() !== this._fileId) ||
          (!o && i && i.getProperty("cid") !== this._fileId)) &&
          this.close();
      }),
      (y.prototype._storageEventHandler = function (e) {
        let { type: t, storageItem: n } = e;
        t === f.default.Type.VersionUpdate &&
          n instanceof c.default.Item &&
          this._fileId === n.getId() &&
          this._updateVersionHistory(this._fileId);
      }),
      (y.prototype._showPreview = async function (e, t, n, o) {
        var a = gDesigner.getActiveDocument();
        if (a.isModified())
          return (
            new u.default(
              i.GLocale.get(
                new i.GLocaleKey(
                  "GVersionsHistoryAction",
                  "unsaved-modifications"
                )
              )
            ).open(),
            !1
          );
        this._loadingPreview = !0;
        var r = new d.default(
          await c.default.from(
            gDesigner.getDefaultStorage(),
            this._fileId,
            t,
            e,
            !!o
          )
        );
        r.lockByVersionHistory(),
          this._previewDoc
            ? (gDesigner.replaceDocument(this._previewDoc, r),
              this._previewDoc.removeEventListener(
                h.default,
                this._documentStatusEventHandler,
                this
              ),
              (this._previewDoc = r))
            : ((this._previousDoc = a),
              (this._previewDoc = r),
              gDesigner.replaceDocument(this._previousDoc, r)),
          r.addEventListener(h.default, this._documentStatusEventHandler, this),
          r.load(null, {
            progress: (e) => {
              100 == e &&
                ((this._loadingPreview = !1),
                gDesigner.trigger(
                  new p.default(p.default.Type.StorageItemUpdated, r)
                ));
            },
          }),
          this._enabledInputs ||
            ((this._enabledInputs = {
              allEnabledButtons: $("button:not([disabled=true])"),
              allEnabledInput: $("input:not([disabled=true])"),
              allEnabledTextarea: $("textarea:not([disabled=true])"),
            }),
            this._enabledInputs.allEnabledButtons.attr("disabled", !0),
            this._enabledInputs.allEnabledInput.attr("disabled", !0),
            this._enabledInputs.allEnabledTextarea.attr("disabled", !0)),
          $(".version-history-item.vhi-active").removeClass("vhi-active"),
          n.addClass("vhi-active"),
          this._previewOverlay ||
            ((this._previewOverlay = $("<div />")
              .css({
                position: "absolute",
                zIndex: 9999,
                left: 0,
                right: 0,
                top: 0,
                bottom: 0,
              })
              .data("versionId", e)
              .data("title", t)
              .appendTo($("body"))),
            this._relayout(e, t, o),
            this._relayoutBindedToActiveDocument &&
              window.removeEventListener(
                "resize",
                this._relayoutBindedToActiveDocument
              ),
            (this._relayoutBindedToActiveDocument = this._relayout.bind(
              this,
              e,
              t,
              o
            )),
            window.addEventListener(
              "resize",
              this._relayoutBindedToActiveDocument
            ));
      }),
      (y.prototype._relayout = function (e, t, n) {
        if (this._previewOverlay) {
          var o = $("#toolbar");
          (this._buttonsToolbar = $("<div />")
            .addClass("vhp-preview-overlay")
            .css({
              position: o.css("position"),
              top: o.css("top"),
              left: o.css("left"),
              right: o.css("right"),
              bottom: o.css("bottom"),
              background: o.css("background") || o.css("background-color"),
              border: o.css("border"),
            })
            .append(
              $("<button />")
                .addClass("edit-version")
                .text(
                  i.GLocale.get(
                    new i.GLocaleKey(
                      "GVersionHistoryProperties",
                      "edit-version"
                    )
                  )
                )
                .on(
                  "click",
                  function () {
                    gDesigner.stats("version-history-panel_edit-version"),
                      gDesigner.intercomStats("Open version from history"),
                      this._applyVersion(e, t, n);
                  }.bind(this)
                )
            )
            .append(
              $("<button />")
                .addClass("close-preview")
                .text(
                  i.GLocale.get(
                    new i.GLocaleKey(
                      "GVersionHistoryProperties",
                      "close-preview"
                    )
                  )
                )
                .on(
                  "click",
                  function () {
                    gDesigner.stats("version-history-panel_close_preview"),
                      this._closePreview();
                  }.bind(this)
                )
            )),
            this._previewOverlay.empty().append(this._buttonsToolbar),
            this._panel.addClass("z-index-top"),
            this._toolbar.addClass("z-index-top");
        }
        this._updatePanelHeight();
      }),
      (y.prototype._closePreview = function () {
        this._enabledInputs &&
          (this._enabledInputs.allEnabledButtons.removeAttr("disabled"),
          this._enabledInputs.allEnabledInput.removeAttr("disabled"),
          this._enabledInputs.allEnabledTextarea.removeAttr("disabled"),
          (this._enabledInputs = null)),
          this._previousDoc &&
            (gDesigner.openDocument(this._previousDoc.getStorageItem()),
            (this._previousDoc = null)),
          this._previewDoc &&
            (this._previewDoc.removeEventListener(
              h.default,
              this._documentStatusEventHandler,
              this
            ),
            this._previewDoc !== gDesigner.getActiveDocument() &&
              gDesigner.removeDocument(this._previewDoc),
            (this._previewDoc = null),
            $(".version-history-item.vhi-active").removeClass("vhi-active"),
            $(".version-history-item.vhi-initial").addClass("vhi-active")),
          this._previewOverlay &&
            (window.removeEventListener(
              "resize",
              this._relayoutBindedToActiveDocument
            ),
            this._panel.removeClass("z-index-top"),
            this._toolbar.removeClass("z-index-top"),
            this._previewOverlay.remove(),
            (this._previewOverlay = null));
      }),
      (y.prototype._applyVersion = async function (e, t, n) {
        gDesigner.stats("version-history-panel_open_version", this._fileId);
        var o = gDesigner.getActiveDocument();
        if (o.isModified())
          return (
            new u.default(
              i.GLocale.get(
                new i.GLocaleKey(
                  "GVersionsHistoryAction",
                  "unsaved-modifications"
                )
              )
            ).open(),
            !1
          );
        var a = gDesigner.openDocumentWithReload(
          await c.default.from(
            gDesigner.getDefaultStorage(),
            this._fileId,
            t,
            e,
            n
          )
        );
        gDesigner.activateDocument(a),
          this._previousDoc && (this._previousDoc = null),
          this._previewDoc || gDesigner.removeDocument(o),
          this.close();
      }),
      (y.prototype._toggleLoading = function (e) {
        var t = this._panel.find(".container");
        e
          ? (t.hide(), this._loadingIndicator.show())
          : (t.show(), this._loadingIndicator.hide());
      }),
      (y.prototype.close = function () {
        gDesigner.stats("version-history-panel_close_panel", this._fileId),
          this._closePreview(),
          gDesigner.trigger(new l.default(l.default.Type.Disable)),
          gDesigner.removeEventListener(p.default, this._documentEvent, this),
          gDesigner.removeEventListener(
            f.default,
            this._storageEventHandler,
            this
          );
      }),
      (y.prototype.toString = function () {
        return "[Object GVersionHistoryProperties]";
      }),
      (e.exports = y);
  }