/**
 * Webpack Module #1544
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    n(58), n(57), n(8), n(71), n(4), n(13), n(32), n(33);
    var i = n(1),
      a = n(10),
      r = n(357),
      s = n(40),
      l = o(n(256)),
      c = o(n(44)),
      d = o(n(734)),
      u = n(163),
      p = n(813),
      g = n(1299),
      h = n(119),
      f = n(1545),
      m = n(1558),
      y = n(1153),
      { youtubePlaylist: v } = n(1302),
      _ = n(446);
    n(220);
    const b = n(859),
      w = n(441);
    function C() {
      let e =
        arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : null;
      var t = this._createFooter(),
        n = this;
      this._createOption.bind(this),
        this._createPresetsFrame.bind(this),
        this.open.bind(this),
        this.isOpen.bind(this),
        this.close.bind(this),
        this._newDocumentCustomSize.bind(this),
        this.getDialogElement.bind(this),
        (this._openFromCloud = !1),
        (this._parentDialogInstance = e),
        (this._spectatorModeClazz = "on-spectator-mode"),
        (this._cb = null),
        (this._dialog = $("<div></div>"));
      $("<div></div>")
        .addClass("links")
        .append(
          $("<div></div>")
            .addClass("loader")
            .text(i.GLocale.get(new i.GLocaleKey("GLocale", "loading")) + "...")
        );
      var o = $("<div></div>").addClass("sidebar").appendTo(this._dialog);

      var s = $("<div/>").addClass("sidebar-options").appendTo(o),
        u = $("<div></div>").addClass("frame").appendTo(this._dialog),
        p = this._createPresetsFrame().appendTo(u),
        g = null;
      this._createSeparator(s, "start-option");
      var m = function (e) {
          this._dialog
            .find(".sidebar-options")
            .find(".option")
            .removeClass("active"),
            this._dialog.find(".sidebar-options").find(e).addClass("active");
        }.bind(this),
        y = function () {
          this._dialog.find(".option.start-option").trigger("click"),
            this._dialog.find(".frame").removeClass("cloud-frame"),
            this._dialog.find(".g-dialog-content").removeClass("cloud-dialog"),
            this._dialog.parent().removeClass("cloud-files-dialog"),
            m(".start-option");
        }.bind(this);
      this._createOption(
        s,
        i.GLocale.get(
          new i.GLocaleKey("GNewDocumentDialog", "text.start-option")
        ),
        i.GLocale.get(
          new i.GLocaleKey(
            "GNewDocumentDialog",
            "text.start-option-description"
          )
        ),
        "start-option",
        function (e) {
          u.children().detach(), u.append(p);
          var t = gDesigner.getSetting("show_welcome_screen"),
            o = "boolean" != typeof t || t;
          e ||
            n._isSpectatorMode() ||
            gDesigner.stats("newdocumentdialog_click_newdesign"),
            $("<div></div>")
              .addClass("footer-section")
              .append(
                $("<label></label>")
                  .text(
                    i.GLocale.get(
                      new i.GLocaleKey(
                        "GNewDocumentDialog",
                        "text.start-option-check"
                      )
                    )
                  )
                  .append(
                    $("<input>")
                      .attr("type", "checkbox")
                      .prop("checked", !o)
                      .on("change", (e) => {
                        gDesigner.stats(
                          "newdocumentdialog_toggle_show-welcome-screen",
                          o ? "enable" : "disable"
                        ),
                          gDesigner.setSetting(
                            "show_welcome_screen",
                            !$(e.target).is(":checked")
                          );
                      })
                  )
              )
              .appendTo(u),
            n._isSpectatorMode() || m(".start-option");
        }
      ),
        this._createSeparator(s, "local-option"),
        this._createOption(
          s,
          i.GLocale.get(
            new i.GLocaleKey("GNewDocumentDialog", "text.local-option")
          ),
          i.GLocale.get(
            new i.GLocaleKey(
              "GNewDocumentDialog",
              "text.local-option-description"
            )
          ),
          "local-option",
          function (e) {
            e || gDesigner.stats("newdocumentdialog_click_opendocument"),
              this._openDocument();
          }.bind(this),
          !0
        ),
        this._createSeparator(s, "recent-option");
      var v = this._createOption(
        s,
        i.GLocale.get(
          new i.GLocaleKey("GNewDocumentDialog", "text.recent-option")
        ),
        i.GLocale.get(
          new i.GLocaleKey(
            "GNewDocumentDialog",
            "text.recent-option-description"
          )
        ),
        "recent-option",
        function (e) {
          e || gDesigner.stats("newdocumentdialog_click_recent");
          var t = $("<div></div>").gOverlay({
              releaseOnClose: !0,
              clazz: "g-recent-documents",
              padding: !1,
            }),
            n = $("<div></div>").addClass("menu").appendTo(t),
            o = gContainer.getRecentDocuments();
          o && o.length
            ? o.forEach((e) => {
                var t = gContainer.getRecentDocumentIconClass(e);
                $("<div></div>")
                  .addClass("item file")
                  .data("file", e)
                  .on("click", async (e) => {
                    gDesigner.stats(
                      "newdocumentdialog_click_openrecentdocument"
                    );
                    try {
                      gDesigner.openDocument(
                        $(e.target).closest(".file").data("file")
                      );
                    } catch (e) {
                      if (!(e instanceof d.default)) throw (this.close(), e);
                      c.default.externalFileError(!0);
                    }
                    this.close();
                  })
                  .append(
                    $("<div/>")
                      .addClass("icon")
                      .addClass(t || "")
                  )
                  .append(
                    $("<div/>")
                      .addClass("name")
                      .append(
                        e.getName() + "." + e.getExtension().toLowerCase()
                      )
                  )
                  .appendTo(n);
              })
            : $("<div></div>")
                .addClass("item")
                .append(
                  i.GLocale.get(
                    new i.GLocaleKey(
                      "GNewDocumentDialog",
                      "text.recent-option-empty"
                    )
                  )
                )
                .appendTo(n);
          var a = v.offset().left + v.width() - 10,
            r = v.offset().top - t.height();
          t.gOverlay("open", { x: a, y: r });
        }.bind(this),
        !0
      );
      this._createSeparator(s);
      var b = $("<div></div>").addClass("footer").appendTo(o),
        w = $("<div />").addClass("links-container").appendTo(b),
        x = $("<div/>").addClass("links-column").appendTo(w),
        S = $("<div/>").addClass("links-column").appendTo(w),
        E = $("<div/>").addClass("links-column").appendTo(w),
        A = 0;
      t.forEach((e) => {
        e.links.forEach((e) => {
          var t = $("<div/>").addClass("link");
          $("<div/>").addClass("link-icon").appendTo(t),
            $("<a/>")
              .on("click", function (t) {
                e.statType
                  ? gDesigner.stats(e.statType)
                  : gDesigner.stats(
                      "newdocumentdialog_open_externallink",
                      i.GLocale.get(
                        e.labelLocale,
                        null,
                        i.GLocaleLanguage.English
                      )
                    ),
                  e.click
                    ? e.click.call(this)
                    : gContainer.openExternalLink(t, e.href);
              })
              .text(i.GLocale.get(e.labelLocale || e.text))
              .appendTo(t),
            A % 3 == 0
              ? t.appendTo(x)
              : A % 3 == 1
              ? t.appendTo(S)
              : t.appendTo(E),
            ++A;
        });
      }),
        r.SHOW_BETA_BRANDING &&
          gDesigner.isBeta() &&
          $("<div/>").addClass("beta-badge").attr("title", "βETA").appendTo(o),
        this._getVersionInfoWidget().appendTo(o),
        (this._closeCallbackListeners = []),
        this._dialog.gDialog({
          closeTimeout: 0,
          releaseOnClose: !1,
          className: "g-new-document-dialog",
          closeCallback: (e) => {
            this._closeCallback && this._closeCallback(e),
              this._closeCallbackListeners.length &&
                (this._closeCallbackListeners.forEach((t) => t.call(null, e)),
                (this._closeCallbackListeners = []));
          },
          alwaysCloseable: !0,
        }),
        document.addEventListener(
          "keydown",
          function (e) {
            13 === e.keyCode &&
              this._dialog.gDialog("isOpen") &&
              this._newDocumentCustomSize();
          }.bind(this)
        );
    }
    i.GObject.inherit(C, i.GObject),
      (C.prototype._getVersionInfoWidget = function () {
        let e = "";
        "lts" === gDesigner.getEnv()
          ? (e = " LTS")
          : "rc" === gDesigner.getEnv() && (e = " Staging");
        const t = b.getRuntime();
        return (
          t && (e += " ".concat(t.abbr)),
          $("<div/>")
            .addClass("version")
            .html(
              i.GLocale.get(new i.GLocaleKey("GCommonNames", "text.version")) +
                " " +
                gDesigner.getVersionFriendlyName() +
                e
            )
            .on("click", function () {
              if (
                (gDesigner.stats("newdocumentdialog_show_gravitversion"),
                "production" !== gDesigner.getEnv() &&
                  "lts" !== gDesigner.getEnv() &&
                  "rc" !== gDesigner.getEnv())
              ) {
                var t = $(this),
                  n = t.data("nfo");
                n || t.data("nfo", (n = { current: 0 })),
                  (function (n) {
                    switch (((n.current = (n.current + 1) % 4), n.current)) {
                      case 0:
                        t.html(
                          i.GLocale.get(
                            new i.GLocaleKey("GCommonNames", "text.version")
                          ) +
                            " " +
                            gDesigner.getVersionFriendlyName() +
                            e
                        );
                        break;
                      case 1:
                        t.html(
                          i.GLocale.get(
                            new i.GLocaleKey(
                              "GCommonNames",
                              "text.internal-version"
                            )
                          ) +
                            ": " +
                            gDesigner.getVersion()
                        );
                        break;
                      case 2:
                        t.html(
                          i.GLocale.get(
                            new i.GLocaleKey("GCommonNames", "text.build")
                          ) +
                            ": " +
                            (gDesigner.getBuildNum() || "")
                        );
                        break;
                      case 3:
                        t.html(
                          i.GLocale.get(
                            new i.GLocaleKey("GCommonNames", "text.commit")
                          ) +
                            ": " +
                            (gDesigner.getCommitSHA() || "").substr(0, 8)
                        );
                    }
                  })(n);
              }
            })
        );
      }),
      (C.prototype._licenseChangedEvent = function (e) {
        this._updateUI();
      }),
      (C.prototype._updateUI = function () {
        this._updateForUserLicense();
      }),
      (C.prototype.getDialogElement = function () {
        return this._dialog;
      }),
      (C.prototype._updateForUserLicense = function () {
        const e = this._dialog.find(".header"),
          t = this._dialog.find(".presets-frame"),
          n = e.find(".preset .g-input"),
          o = t.find(".presets .preset");
        if (!this._isSpectatorMode())
          return (
            this._dialog
              .find(".start-option")
              .removeClass(this._spectatorModeClazz)
              .removeAttr("data-title"),
            this._dialog
              .find(".templates-option")
              .removeClass(this._spectatorModeClazz)
              .removeAttr("data-title"),
            t.removeClass(this._spectatorModeClazz),
            e.removeClass(this._spectatorModeClazz),
            e.find(".select-overlay").remove(),
            n
              .find("input")
              .removeAttr("readonly")
              .removeAttr("disabled")
              .removeAttr("data-title"),
            n
              .find("select")
              .removeAttr("disabled")
              .removeAttr("data-title")
              .removeClass("g-disabled"),
            n
              .find(".cloud-button")
              .removeAttr("disabled")
              .removeAttr("data-title")
              .removeClass("g-disabled")
              .addClass("active"),
            o.find(".icon").removeAttr("data-title"),
            void o.find(".select-container").removeAttr("data-title")
          );
        const a = i.GLocale.get(
          new i.GLocaleKey(
            "GNewDocumentDialog",
            "text.option-not-available-in-view-mode"
          )
        );
        this._dialog
          .find(".start-option")
          .addClass(this._spectatorModeClazz)
          .attr("data-title", a),
          this._dialog
            .find(".templates-option")
            .addClass(this._spectatorModeClazz)
            .attr("data-title", a),
          t.addClass(this._spectatorModeClazz),
          e.addClass(this._spectatorModeClazz),
          n
            .find("input")
            .attr("readonly", !0)
            .attr("disabled", !0)
            .attr("data-title", a),
          n
            .find("select")
            .attr("disabled", !0)
            .attr("data-title", a)
            .addClass("g-disabled")
            .insertAfter(),
          n
            .find(".cloud-button")
            .attr("data-title", a)
            .addClass("g-disabled")
            .removeClass("active"),
          o.find(".icon").attr("data-title", a),
          o.find(".select-container").attr("data-title", a),
          e.find(".select-overlay").length ||
            $("<div>")
              .addClass("select-overlay")
              .attr("data-title", a)
              .insertAfter(e.find(".preset .g-input select"));
      }),
      (C.prototype._createOption = function (e, t, n, o, i, a) {
        var r = $("<div/>")
          .addClass("option")
          .addClass(o)
          .on(
            "click",
            function (e, t, n, o, s, l) {
              this._dialog.find(".frame").removeClass("loading"),
                a ||
                  (this._dialog
                    .find(".sidebar-options")
                    .find(".option-separator")
                    .removeClass("active"),
                  $(r)
                    .prevAll(".option-separator:visible")
                    .first()
                    .addClass("active"),
                  $(r)
                    .nextAll(".option-separator:visible")
                    .first()
                    .addClass("active")),
                i(!0 & e.isTrigger, t, n, o, s, l);
            }.bind(this)
          )
          .appendTo(e);
        $("<div/>").addClass("option-icon").appendTo(r);
        var s = $("<div/>").addClass("option-text").appendTo(r);
        return (
          $("<div/>").addClass("option-title").html(t).appendTo(s),
          $("<div/>").addClass("option-subtitle").html(n).appendTo(s),
          r
        );
      }),
      (C.prototype._createFooter = function () {
        return [
          {
            section: i.GLocale.get(
              new i.GLocaleKey("GNewDocumentDialog", "text.connect")
            ),
            links: [
              {
                href: v,
                labelLocale: new i.GLocaleKey(
                  "GOpenLinkAction",
                  "title.tutorials"
                ),
              },
              {
                href: "/docs/index.html",
                labelLocale: new i.GLocaleKey(
                  "GOpenLinkAction",
                  "title.user-guide"
                ),
              },
            ],
          },
        ];
      }),
      (C.prototype._createSeparator = function (e, t) {
        $("<div/>").addClass("option-separator").addClass(t).appendTo(e);
      }),
      (C.prototype._createPresetsFrame = function () {
        var e = $("<div></div>").addClass("presets-container"),
          t = $("<div/>").addClass("header").appendTo(e),
          n = $("<div></div>")
            .addClass("presets")
            .appendTo($("<div/>").addClass("presets-frame").appendTo(e));
        y.getPresets(!0).forEach((e, t) => {
          $("<div/>")
            .addClass("preset")
            .data("preset", e)
            .append($("<p/>").addClass("title").text(e.name))
            .append(
              $("<div/>")
                .addClass("icon")
                .on("click", (t) => {
                  this._isSpectatorMode() || this._showPresetDropdown(t, e);
                })
                .append(
                  $("<img/>").attr(
                    "src",
                    "assets/img/new-document/" + e.icon + "-white.svg"
                  )
                )
                .append(
                  $("<img/>")
                    .attr(
                      "src",
                      "assets/img/new-document/" + e.icon + "-black.svg"
                    )
                    .addClass("hover")
                )
            )
            .append(
              $("<div/>")
                .addClass("select-container")
                .append([
                  $("<p/>")
                    .addClass("name")
                    .text(e.subTitle)
                    .on("click", (t) => {
                      this._isSpectatorMode() || this._showPresetDropdown(t, e);
                    }),
                ])
            )
            .appendTo(n);
        });
        var o = (e) =>
          13 === e.keyCode ? this._newDocumentCustomSize() : void 0;
        return (
          $("<div/>")
            .addClass("preset custom-size")
            .append(
              $("<div/>")
                .addClass("g-input")
                .on("click", (e) => e.stopPropagation())
                .append(
                  $("<div/>")
                    .addClass("input-holder")
                    .append(
                      $("<div/>")
                        .append(
                          $("<input/>")
                            .on("keydown", o)
                            .attr("name", "width")
                            .attr(
                              "placeholder",
                              i.GLocale.get(
                                new i.GLocaleKey("GCommonNames", "text.width")
                              )
                            )
                            .val("")
                            .gInputBox({
                              minValue: 0,
                              incrementValue: 1,
                              allowEmptyValue: !0,
                            })
                        )
                        .append(
                          $("<img/>")
                            .addClass("versus")
                            .attr("src", "assets/icon/versus.svg")
                        )
                        .append(
                          $("<input/>")
                            .on("keydown", o)
                            .attr("name", "height")
                            .attr(
                              "placeholder",
                              i.GLocale.get(
                                new i.GLocaleKey("GCommonNames", "text.height")
                              )
                            )
                            .val("")
                            .gInputBox({
                              minValue: 0,
                              incrementValue: 1,
                              allowEmptyValue: !0,
                            })
                        )
                    )
                )
                .append(
                  $("<select/>")
                    .attr("name", "unit")
                    .val("px")
                    .gUnit({ short: !0 })
                )
                .on("change", function (e) {
                  var t = $(this).find(":selected").val() || "px";
                  "undefined" != typeof gDesigner &&
                    gDesigner.stats("newdocumentdialog_change_unit", t);
                })
                .append(
                  $("<img/>")
                    .addClass("result")
                    .attr("src", "assets/icon/result.svg")
                )
                .append(
                  $("<button/>")
                    .addClass("cloud-button")
                    .append(
                      $("<span/>").text(
                        i.GLocale.get(
                          new i.GLocaleKey(
                            "GNewDocumentDialog",
                            "action.create-canvas"
                          )
                        )
                      )
                    )
                    .addClass("active")
                    .on("click", () => {
                      this._isSpectatorMode() || this._newDocumentCustomSize();
                    })
                )
            )
            .append(
              $("<p/>")
                .addClass("infinite-canvas")
                .text(
                  i.GLocale.get(
                    new i.GLocaleKey(
                      "GNewDocumentDialog",
                      "action.leave-empty-infinite"
                    )
                  )
                )
            )
            .appendTo(t),
          r.NEWDOCUMENTDIALOG.HR_UNDER_PRESETS && $("<hr/>").appendTo(t),
          e
        );
      }),

      (C.prototype.open = function (e) {
        let {
          closable: t,
          cb: n,
          defaultOption: a,
          closeCallback: d,
        } = e;
        (this._cb = n || null),
          (this._closeCallback = d);
        var g = function () {
            this._dialog.find(".sidebar").css("display", ""),
              this._dialog
                .find(".sidebar-options")
                .find(".option")
                .css("display", ""),
              this._dialog
                .find(".sidebar-options")
                .find(".option-separator")
                .css("display", ""),
              this._dialog.find(".sidebar").find(".footer").css("display", ""),
              this._dialog.find(".sidebar").find(".version").css("display", "");
          }.bind(this),
          f = function () {
              this._dialog.find(".option.start-option").trigger("click"),
              a && this._dialog.find("." + a).trigger("click");
          }.bind(this);
        this._dialog.gDialog("open", t),
          g(),
          f(),
          this._updateUI(),
          this._closeCallbackListeners.push(() => {
            gDesigner.removeEventListener(w, this._licenseChangedEvent, this);
          }),
          gDesigner.addEventListener(w, this._licenseChangedEvent, this);
      }),
      (C.prototype.isOpen = function () {
        return this._dialog.gDialog("isOpen");
      }),
      (C.prototype.close = function () {
        return (
          this._dialog.gDialog("close", !1, 0),
          (0, s.sleep)(0)
        );
      }),
      (C.prototype._newDocumentFromPreset = async function (e, t, n) {
        var r = e.layouts[t];
        this._newDocument(r.width, r.height, r.unit, r.dpi);
      }),
      (C.prototype._newDocumentCustomSize = function () {
        gDesigner.stats("newdocumentdialog_new_custom-sized"),
          gDesigner
            .getAmplitudeHelper()
            .logEvent(a.AmplitudeData.Events.DOCUMENT_CREATED, {
              DOCUMENT_CATEGORY: "Blank",
              DOCUMENT_TYPE: "Blank",
            });
        var e = this._dialog.find(".preset.custom-size"),
          t = e.find('[name="width"]').gInputBox("value"),
          n = e.find('[name="height"]').gInputBox("value"),
          o = e.find('[name="unit"]').val(),
          i = "" === t,
          r = "" === n,
          s = i ? 0 : parseInt(t),
          l = r ? 0 : parseInt(n);
        isNaN(s) ||
          isNaN(l) ||
          !o ||
          (!s && !i) ||
          (!l && !r) ||
          this._newDocument(t, n, o);
      }),
      (C.prototype._newDocument = function (e, t, n, o) {
        var a = gDesigner.createScene();
        a.setProperties(["ut", "dpi"], [n, o || i.GLength.DPI]),
          a
            .getActivePage()
            .setProperties(
              ["bck", "w", "h"],
              [
                i.GRGBColor.WHITE,
                new i.GLength(e, n).toPoint(),
                new i.GLength(t, n).toPoint(),
              ]
            ),
          gDesigner.addDocument(new u(a)),
          this.close(),
          this._cb && this._cb();
      }),
      (C.prototype._openDocument = function () {
        gDesigner.executeAction(
          gDesigner.getAction(g.ID).isAvailable() ? g.ID : p.ID,
          [null, this.close.bind(this)],
          void 0,
          !0
        );
      }),
      (C.prototype._getLayoutFormattedSize = function (e) {
        var t = e.includes,
          n = "";
        if (t) {
          for (var o = [], i = 0, a = t.length; i < a; i++) {
            var r = t[i];
            o.push(r.width + "x" + r.height);
          }
          n = o.join(", ") + " " + e.unit;
        } else n = e.width + "x" + e.height + " " + e.unit;
        return n;
      }),
      (C.prototype._getLayoutDisplayName = function (e) {
        return e.name + " (" + this._getLayoutFormattedSize(e) + ")";
      }),
      (C.prototype._showPresetDropdown = function (e, t) {
        e.stopPropagation();
        var n = $(e.target).closest(".preset").find(".name"),
          o = $("<ul/>");
        t.layouts.forEach((e, n) => {
          var a = $("<li/>")
            .attr("data-value", n)
            .text(this._getLayoutDisplayName(e))
            .on("click", (e) => {
              o.gOverlay("close");
              var n = parseInt($(e.target).attr("data-value")),
                a = "";
              (a = t.localeClass
                ? i.GLocale.get(t.localeClass, null, i.GLocaleLanguage.English)
                : t.name || ""),
                (a = t.layouts[n].localeClass
                  ? a +
                    "/" +
                    i.GLocale.get(
                      t.layouts[n].localeClass,
                      null,
                      i.GLocaleLanguage.English
                    )
                  : a + "/" + t.layouts[n].name),
                "undefined" != typeof gDesigner &&
                  gDesigner.stats("newdocumentdialog_change_preset", a),
                this._newDocumentFromPreset(t, n, a);
            });
          o.append(a);
        }),
          o.gOverlay({ clazz: "preset-select", padding: !1, offsetY: 10 }),
          o.gOverlay("open", n);
      }),
      (C.prototype._isSpectatorMode = function () {
        return !1;
      }),
      (e.exports = C);
  }