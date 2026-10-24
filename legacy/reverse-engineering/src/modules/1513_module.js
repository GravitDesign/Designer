/**
 * Webpack Module #1513
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(19),
      n(596),
      n(30),
      n(57),
      n(8),
      n(20),
      n(34),
      n(4),
      n(41),
      n(13),
      n(38),
      n(97),
      n(26);
    var o = n(1),
      i = n(797),
      a = n(15),
      r = n(40),
      s = n(10),
      l = n(238),
      c = n(444),
      d = n(257),
      u = n(1253);
    const p = n(1238);
    var g = n(44);
    const h = n(389);
    var f = {};
    function m(e, t, n) {
      (this._document = e),
        (this._options = t),
        (this._settings = o.GUtil.extend(
          {
            size: "1x",
            format: "png",
            jpegQuality: s.JPEG_EXPORT_QUALITY_DEFAULT,
            backgroundColor: e
              ? e.getScene().getActivePage().getProperty("bck")
              : null,
            backgroundOpacity: e
              ? e.getScene().getActivePage().getProperty("bop")
              : 1,
            chooserColor: e
              ? e.getScene().getActivePage().getProperty("bck")
              : null,
            chooserOpacity: e
              ? e.getScene().getActivePage().getProperty("bop")
              : 1,
            convertTextToPath: !1,
            decimalPlacesPrecision: 3,
            configuration: {
              ignoreEffects: !1,
              forceEffectsWhenZoomed: !0,
              sceneBackground: !0,
              isOutline: function () {
                return !1;
              },
            },
            preserveEditingCapabilities: !1,
            layerNamesAsId: i.GSVGExport.DefaultOptions.layerNamesAsId,
            downsampleImages: !1,
          },
          this._options || f
        ));
      var a = this._isUserFree();
      this.init(a, n);
    }
    o.GObject.inherit(m, o.GObject),
      (m.prototype._warningSection = null),
      (m.prototype._isUserFree = function () {
        var e = gDesigner.getLicense();
        return (
          !e.isLegacy() &&
          (e.isFree() || gDesigner.isAnonymous() || e.isExpired())
        );
      }),
      (m.prototype.init = function (e, t) {
        this._settings.background ||
          (this._settings.background = "page-background"),
          (this._chooserElem = null),
          (this._dialog = $("<div></div>")),
          (this._setupContainer = $("<div></div>")
            .addClass("setup-container")
            .appendTo(this._dialog)),
          (this._modeContainer = $("<div/>")
            .addClass("mode-container")
            .appendTo(this._setupContainer));
        var n = function (e, t, n) {
          return $("<label/>")
            .attr("data-mode", e)
            .append($("<span></span>").addClass("icon " + n))
            .append($("<span></span>").addClass("name").text(t))
            .on(
              "click",
              function (t) {
                gDesigner.stats("export_change_mode", e),
                  $(t.target).closest("label").hasClass("g-disabled") ||
                    this._setActiveMode(e);
              }.bind(this)
            )
            .appendTo(this._modeContainer);
        }.bind(this);
        n(
          "canvas",
          o.GLocale.get(new o.GLocaleKey("GExportDialog", "text.canvas")),
          d["gravit-icon-display"]
        ),
          n(
            "selection",
            o.GLocale.get(new o.GLocaleKey("GExportDialog", "text.selection")),
            d["gravit-icon-cursor-filled"]
          ),
          n(
            "assets",
            o.GLocale.get(new o.GLocaleKey("GExportDialog", "text.assets")),
            "gravit-icon-layers"
          ),
          (this._settingsContainer = $("<div/>")
            .addClass("settings-container")
            .appendTo(this._setupContainer));
        var i = function (n, o, i, a) {
            a = $.extend({ controlLeft: !1, forbiddenForFree: !0 }, a);
            var s = $("<span></span>").addClass("control").append(i);
            e && a.forbiddenForFree
              ? (s
                  .find("*")
                  .on(
                    "mousedown",
                    r.watchDog.trap(
                      null,
                      null,
                      (e) => {
                        e.stopPropagation(),
                          e.stopImmediatePropagation(),
                          e.preventDefault(),
                          a.prostats && gDesigner.stats(a.prostats);
                      },
                      t
                    )
                  )
                  .on(
                    "click",
                    r.watchDog.trap(
                      null,
                      null,
                      (e) => {
                        e.stopPropagation(),
                          e.stopImmediatePropagation(),
                          e.preventDefault();
                      },
                      t
                    )
                  ),
                s.find("*").each((e, t) => {
                  $._data(t, "events").click.reverse(),
                    $._data(t, "events").mousedown.reverse();
                }))
              : a.pro &&
                s
                  .find("input")
                  .gPro()
                  .on(
                    "click",
                    r.watchDog.trap(
                      null,
                      null,
                      (e) => a.prostats && gDesigner.stats(a.prostats)
                    )
                  )
                  .after($("<span></span>").gPro()),
              a.controlLeft && s.addClass("control-left"),
              "jpeg-quality" === n &&
                s
                  .css("width", "55%")
                  .css("height", "100%")
                  .css("display", "flex")
                  .css("justify-content", "center");
            var l = $("<div></div>").attr("data-setting", n);
            return (
              "" !== o &&
                l.append($("<span></span>").addClass("label").text(o)),
              l.append(s).appendTo(this._settingsContainer),
              l
            );
          }.bind(this),
          a = { controlLeft: !0 };
        i(
          "format",
          o.GLocale.get(new o.GLocaleKey("GCommonNames", "text.format")),
          $("<select/>")
            .on(
              "change",
              function (e) {
                (this._settings.format = $(e.target).val()),
                  gDesigner.stats(
                    "export_change_documenttype",
                    this._settings.format
                  ),
                  "pdf" !== this._settings.format &&
                    (this._settings.configuration.ignoreEffects = !1),
                  ("pdf" != this._settings.format &&
                    "jpg" != this._settings.format) ||
                    "no-background" != this._settings.background ||
                    (this._settings.background = "page-background"),
                  this._updateSettings(),
                  this._updatePreview(),
                  this._updateSizeMenu();
              }.bind(this)
            )
            .append($("<option></option>").attr("value", "png").text("PNG"))
            .append($("<option></option>").attr("value", "jpg").text("JPEG"))
            .append($("<option></option>").attr("value", "svg").text("SVG"))
            .append($("<option></option>").attr("value", "pdf").text("PDF")),
          { forbiddenForFree: !1 }
        ),
          i(
            "size",
            o.GLocale.get(new o.GLocaleKey("GCommonNames", "text.size")),
            $("<div></div>")
              .addClass("g-input-select")
              .append(
                $("<input/>")
                  .attr("size", "6")
                  .val(this._settings.size)
                  .on(
                    "change",
                    function (e) {
                      gDesigner.stats("export_change_size", $(e.target).val()),
                        (this._settings.size = $(e.target).val()),
                        this._updatePreview();
                    }.bind(this)
                  )
              )
              .append(
                $("<button></button>").on(
                  "click",
                  function (e) {
                    gDesigner.stats("export_open_size-menu"),
                      this._sizeMenu.open(
                        e.target,
                        c.Position.Right_Bottom,
                        c.Position.Right_Bottom,
                        function (t) {
                          $(e.target)
                            .closest("div")
                            .find("input")
                            .val(this._formatCaption(t.getCaption()))
                            .trigger("change")
                            .focus()
                            .select();
                        }.bind(this)
                      );
                  }.bind(this)
                )
              ),
            { prostats: "export_nonprotriespro_size" }
          );
        const u = $("<div />")
            .gInputSlider({ min: 25, max: 100 })
            .css("align-self", "center")
            .gInputSlider("value", this._settings.jpegQuality)
            .on(
              "change",
              function (e) {
                gDesigner.stats("export_change_jpeg-quality");
                var t = parseInt($(e.target).gInputSlider("value"), 10);
                (this._settings.jpegQuality = t),
                  this._updatePreview(),
                  p.gInputBox("value", t);
              }.bind(this)
            ),
          p = $("<input />")
            .attr("type", "text")
            .gInputBox({
              minValue: 25,
              maxValue: 100,
              incrementValue: 1,
              postfix: "%",
            })
            .gInputBox("value", this._settings.jpegQuality)
            .on(
              "change",
              function (e) {
                var t = parseInt(p.gInputBox("value"), 10);
                t > 100 ? (t = 100) : t < 25 && (t = 25),
                  u.gInputSlider("value", t),
                  (this._settings.jpegQuality = t),
                  this._updatePreview();
              }.bind(this)
            );
        i(
          "jpeg-quality",
          o.GLocale.get(new o.GLocaleKey("GExportDialog", "text.jpeg-quality")),
          $("<div/>")
            .addClass("jpeg-quality")
            .append(u)
            .append($("<label />").append(p)),
          { prostats: "export_nonprotriespro_jpeg-quality" }
        );
        var g = $("<div/>")
          .addClass("export-background-selector")
          .append(
            $("<select/>")
              .on(
                "change",
                function (e) {
                  !1 & e.isTrigger &&
                    gDesigner.stats(
                      "export_change_background-pattern",
                      $(e.target).val()
                    ),
                    (this._settings.background = $(e.target).val()),
                    $(e.target)
                      .next(".export-background-pattern-chooser")
                      .css(
                        "display",
                        "custom-background" === this._settings.background
                          ? ""
                          : "none"
                      ),
                    this._updateBackground(),
                    this._updatePreview();
                }.bind(this)
              )
              .append(
                $("<option></option>")
                  .attr("value", "page-background")
                  .text(
                    o.GLocale.get(
                      new o.GLocaleKey("GExportDialog", "text.page-background")
                    )
                  )
              )
              .append(
                $("<option></option>")
                  .attr("value", "custom-background")
                  .text(
                    o.GLocale.get(
                      new o.GLocaleKey(
                        "GExportDialog",
                        "text.custom-background"
                      )
                    )
                  )
              )
              .append(
                $("<option></option>")
                  .attr("value", "no-background")
                  .text(
                    o.GLocale.get(
                      new o.GLocaleKey("GExportDialog", "text.no-background")
                    )
                  )
              )
          )
          .append(
            $("<span></span>")
              .css(
                "display",
                "custom-background" === this._settings.background ? "" : "none"
              )
              .addClass("export-background-pattern-chooser")
              .gPatternChooser({
                noEyedropper: !0,
                types: [o.GColor],
                hasOpacity: !0,
              })
              .gPatternChooser("value", this._settings.chooserColor)
              .on("chooseropen", function () {
                this._chooserElem = $(this);
              })
              .on("chooserclose", function (e, t, n) {
                this._chooserElem = null;
              })
              .on(
                "patternchange",
                function (e, t, n, o) {
                  t &&
                    ((this._settings.backgroundColor = t),
                    (this._settings.chooserColor = t)),
                    n
                      ? ((this._settings.backgroundOpacity = n),
                        (this._settings.chooserOpacity = n))
                      : (this._settings.backgroundOpacity = this._document
                          ? this._document
                              .getScene()
                              .getActivePage()
                              .getProperty("bop")
                          : 1),
                    this._updateBackground(),
                    this._updatePreview();
                }.bind(this)
              )
          );
        this._settings.chooserColor &&
          g
            .find(".export-background-pattern-chooser")
            .gPatternChooser("setPattern", this._settings.chooserColor),
          this._settings.chooserOpacity &&
            g
              .find(".export-background-pattern-chooser")
              .gPatternChooser("opacity", this._settings.chooserOpacity),
          i(
            "background-color",
            o.GLocale.get(
              new o.GLocaleKey("GCommonNames", "text.background-color")
            ),
            g,
            { prostats: "export_nonprotriespro_select-background" }
          ),
          g
            .find('option[value="' + this._settings.background + '"]')
            .prop("selected", !0),
          i(
            "color-space",
            o.GLocale.get(new o.GLocaleKey("GExportDialog", "text.color-mode")),
            $("<select/>")
              .on(
                "change",
                function (e) {
                  gDesigner.stats(
                    "export_change_colorspace",
                    $(e.target).val()
                  ),
                    (this._settings.colorSpace = $(e.target).val());
                }.bind(this)
              )
              .append($("<option/>").attr("value", "rgb").text("RGB"))
              .append($("<option/>").attr("value", "cmyk").text("CMYK")),
            { prostats: "export_nonprotriespro_color-space" }
          ),
          i(
            "ignore-effects",
            "",
            $("<label></label>")
              .addClass("label")
              .append(
                $("<input/>")
                  .attr("type", "checkbox")
                  .prop("checked", !0)
                  .on(
                    "change",
                    function (e) {
                      gDesigner.stats(
                        "export_toggle_ignoreeffects",
                        $(e.target).prop("checked") ? "enable" : "disable"
                      ),
                        (this._settings.configuration.ignoreEffects = !$(
                          e.target
                        ).prop("checked")),
                        this._updatePreview();
                    }.bind(this)
                  )
              )
              .append(
                $("<span></span>").html(
                  "&nbsp;" +
                    o.GLocale.get(
                      new o.GLocaleKey("GExportDialog", "text.with-effects")
                    )
                )
              ),
            Object.assign({}, a, {
              prostats: "export_nonprotriespro_ignore-effects",
            })
          ),
          i(
            "decimal-places-precision",
            o.GLocale.get(
              new o.GLocaleKey("GExportDialog", "text.decimal-places-precision")
            ),
            $("<input/>")
              .attr("type", "text")
              .css("width", "63px")
              .gInputBox({ minValue: 0, maxValue: 6 })
              .gInputBox("value", this._settings.decimalPlacesPrecision)
              .on(
                "change",
                function (e) {
                  gDesigner.stats("export_change_decimalprecision"),
                    (this._settings.decimalPlacesPrecision = parseInt(
                      $(e.target).gInputBox("value")
                    ));
                }.bind(this)
              ),
            { pro: !0, prostats: "export_nonprotriespro_decimalprecision" }
          ),
          i(
            "convert-text-to-path",
            "",
            $("<label></label>")
              .addClass("label")
              .append(
                $("<input/>")
                  .attr("type", "checkbox")
                  .prop("checked", !0)
                  .on(
                    "change",
                    function (e) {
                      gDesigner.stats(
                        "export_toggle_convert-to-path",
                        $(e.target).prop("checked") ? "enable" : "disable"
                      ),
                        (this._settings.convertTextToPath = $(e.target).prop(
                          "checked"
                        ));
                    }.bind(this)
                  )
              )
              .append(
                $("<span></span>").html(
                  "&nbsp;" +
                    o.GLocale.get(
                      new o.GLocaleKey("GExportDialog", "text.export-as-curves")
                    )
                )
              ),
            Object.assign({}, a, {
              prostats: "export_nonprotriespro_convert-text-to-path",
            })
          ),
          i(
            "export-all",
            "",
            $("<label></label>")
              .addClass("label")
              .append(
                $("<input/>")
                  .attr("type", "checkbox")
                  .prop("checked", !0)
                  .on(
                    "change",
                    function (e) {
                      gDesigner.stats("export_click_exportall");
                      var t = $(e.target).prop("checked");
                      this._previewContainer
                        .find(".item .preview-check input")
                        .each((e, n) => {
                          $(n).prop("checked", t),
                            this._updateStorageDestinationSetting();
                        });
                    }.bind(this)
                  )
              )
              .append(
                $("<span></span>").html(
                  "&nbsp;" +
                    o.GLocale.get(
                      new o.GLocaleKey("GExportDialog", "text.export-all")
                    )
                )
              ),
            Object.assign({}, a, {
              prostats: "export_nonprotriespro_export-all",
            })
          ),
          i(
            "layer-as-id",
            "",
            $("<label></label>")
              .addClass("label")
              .append(
                $("<input/>")
                  .attr("type", "checkbox")
                  .prop("checked", this._settings.layerNamesAsId)
                  .on(
                    "change",
                    function (e) {
                      gDesigner.stats("export_click_layer-as-id"),
                        (this._settings.layerNamesAsId = $(e.target).prop(
                          "checked"
                        ));
                    }.bind(this)
                  )
              )
              .append(
                $("<span></span>").html(
                  "&nbsp;" +
                    o.GLocale.get(
                      new o.GLocaleKey("GExportDialog", "text.layer-as-id")
                    )
                )
              )
              .append(
                $("<div></div>")
                  .addClass("description")
                  .html(
                    o.GLocale.get(
                      new o.GLocaleKey("GExportDialog", "text.layer-as-id-info")
                    )
                  )
              ),
            Object.assign(a, {
              pro: !0,
              prostats: "export_nonprotriespro_layer-as-id",
            })
          ),
          i(
            "export-preserve-editing-capabilities",
            "",
            $("<label></label>")
              .addClass("label")
              .append(
                $("<input/>")
                  .attr("type", "checkbox")
                  .prop("checked", !0)
                  .on(
                    "change",
                    function (e) {
                      gDesigner.stats(
                        "export_toggle_preserve-svg-editing-capabilities",
                        $(e.target).prop("checked") ? "enable" : "disable"
                      ),
                        (this._settings.preserveEditingCapabilities = $(
                          e.target
                        ).prop("checked"));
                    }.bind(this)
                  )
              )
              .append(
                $("<span></span>").html(
                  "&nbsp;" +
                    o.GLocale.get(
                      new o.GLocaleKey(
                        "GExportDialog",
                        "text.preserve-svg-editing-capabilites"
                      )
                    )
                )
              )
              .append(
                $("<div></div>")
                  .addClass("description")
                  .html(
                    o.GLocale.get(
                      new o.GLocaleKey(
                        "GExportDialog",
                        "text.preserve-svg-editing-capabilites-description"
                      )
                    )
                  )
              ),
            Object.assign(a, {
              pro: !0,
              prostats:
                "export_nonprotriespro_preserve-svg-editing-capabilities",
            })
          ),
          i(
            "do-not-downsample-images",
            "",
            $("<label></label>")
              .addClass("label")
              .append(
                $("<input/>")
                  .attr("type", "checkbox")
                  .prop("checked", !this._settings.downsampleImages)
                  .on(
                    "change",
                    function (e) {
                      gDesigner.stats(
                        "export_toggle_do-not-downsample-images",
                        $(e.target).prop("checked")
                      ),
                        (this._settings.downsampleImages = !$(e.target).prop(
                          "checked"
                        ));
                    }.bind(this)
                  )
              )
              .append(
                $("<span></span>").html(
                  "&nbsp;" +
                    o.GLocale.get(
                      new o.GLocaleKey(
                        "GExportDialog",
                        "text.do-not-downsample-images"
                      )
                    )
                )
              )
              .append(
                $("<div></div>")
                  .addClass("description")
                  .html(
                    o.GLocale.get(
                      new o.GLocaleKey(
                        "GExportDialog",
                        "text.do-not-downsample-images-info"
                      )
                    )
                  )
              ),
            Object.assign({}, a, { prostats: "do-not-downsample-images" })
          ),
          i(
            "storage-destination",
            o.GLocale.get(new o.GLocaleKey("GExportDialog", "text.export-to")),
            $("<select/>").on("change", () => {
              const e = this._getSelectedStorageDestination();
              e && gDesigner.stats("export_change_output", e.stats);
            })
          ),
          (this._previewContainer = $("<div></div>")
            .addClass("preview-container")
            .appendTo(this._dialog)),
          (this._sizeMenu = new l()),
          this._setActiveMode("canvas", !0),
          this._updateSettings(),
          this._updateSizeMenu(),
          this._dialog.gDialog({
            releaseOnClose: !0,
            className: e
              ? "g-export-dialog dialog-expired-pro"
              : "g-export-dialog",
            buttons: [
              $(
                "<button>" +
                  o.GLocale.get(new o.GLocaleKey("GLocale", "cancel")) +
                  "</button>"
              ).on("click", () => {
                gDesigner.stats("export_cancel_button"), this.close();
              }),
              $(
                "<button>" +
                  o.GLocale.get(
                    new o.GLocaleKey("GCommonNames", "text.export")
                  ) +
                  "</button>"
              )
                .addClass("primary")
                .on(
                  "click",
                  r.watchDog.trap(
                    () => {
                      gDesigner.stats(
                        "export_execute_button",
                        this._settings && this._settings.format
                      ),
                        gDesigner
                          .getAmplitudeHelper()
                          .logEvent(s.AmplitudeData.Events.DOCUMENT_EXPORTED, {
                            DOCUMENT_EXPORT_TYPE:
                              s.AmplitudeData.ExportTypes.Advanced,
                            DOCUMENT_FILE_FORMAT: this._getFormat(),
                          }),
                        this._export();
                    },
                    null,
                    (e) => gDesigner.stats("export_nonprotriespro_export"),
                    t
                  )
                ),
            ],
          }),
          g.find("select").trigger("change");
      }),
      (m.prototype.open = function () {
        this._dialog.gDialog("open", !0);
      }),
      (m.prototype.close = function () {
        this._chooserElem && this._chooserElem.gPatternChooser("close"),
          this._dialog.gDialog("close");
      }),
      (m.prototype._shouldWarningBeShown = function (e) {
        if (!this._hasFormat()) return !1;
        if (!(this._settings.format === h.PDF.ext)) return !1;
        if (!e || !e.length) return !1;
        const t = new o.GLength(200, o.GLength.Unit.IN).toUnit(
            o.GLength.Unit.PX
          ),
          n = o.GLength.DPI;
        return e.some((e) => {
          const o = i.GBitmapExport.getBitmapPaintArea(e.element, e.size, n);
          if (o.getWidth() > t || o.getHeight() > t) return !0;
        });
      }),
      (m.prototype._updateWarningSection = function (e) {
        this._shouldWarningBeShown(e)
          ? (this._warningSection ||
              (this._warningSection = this._buildWarningSection().appendTo(
                this._settingsContainer
              )),
            this._warningSection.show())
          : this._warningSection && this._warningSection.hide();
      }),
      (m.prototype._buildWarningSection = function () {
        return $("<div/>")
          .addClass("warning-section")
          .append(
            $("<span/>")
              .addClass("control")
              .append(
                $("<label/>")
                  .addClass("label")
                  .append(
                    $("<span/>")
                      .addClass("icon")
                      .addClass("gravit-icon-export-warning")
                  )
                  .append(
                    $("<span/>")
                      .addClass("title")
                      .text(
                        o.GLocale.get(
                          new o.GLocaleKey("GExportDialog", "text.warning")
                        )
                      )
                  )
                  .append(
                    $("<div/>")
                      .addClass("description")
                      .text(
                        o.GLocale.get(
                          new o.GLocaleKey(
                            "GExportDialog",
                            "text.canvas-bigger-than-200-in"
                          )
                        )
                      )
                  )
              )
          );
      }),
      (m.prototype._getStorageDestinations = function () {
        const e = this._getFormat();
        if (e) {
          const t = gContainer.getStorageDestinations();
          if (t) return t.filter((t) => t.isSupported(e));
        }
        return [];
      }),
      (m.prototype._getSelectedStorageDestination = function () {
        const e = parseInt(
          this._settingsContainer
            .find("[data-setting=storage-destination] > .control > select")
            .val()
        );
        return this._getStorageDestinations().find((t) => t.id === e);
      }),
      (m.prototype._isStorageDestinationSettingAvailable = function () {
        return !(this._getStorageDestinations().length < 2);
      }),
      (m.prototype._updateStorageDestinationSetting = function () {
        const e = this._isStorageDestinationSettingAvailable(),
          t = e ? this._getStorageDestinations() : [];
        this._settingsContainer
          .find("[data-setting=storage-destination]")
          .css("display", e ? "" : "none")
          .find("select")
          .empty()
          .append(
            t.map((e) => $("<option/>").attr("value", e.id).text(e.label))
          );
      }),
      (m.prototype._getFormat = function () {
        if (this._hasFormat()) {
          if ("assets" === this._activeMode) return h.ZIP.ext;
          if (
            this._previewContainer.find(".item .preview-check input:checked")
              .length > 1
          ) {
            if (!(this._settings.format === h.PDF.ext)) return h.ZIP.ext;
          }
          return this._settings.format;
        }
        return null;
      }),
      (m.prototype._setActiveMode = function (e, t) {
        e !== this._activeMode &&
          ((this._activeMode = e),
          this._modeContainer.find("> label").each(function (t, n) {
            var o = $(n);
            o.toggleClass("g-active", o.attr("data-mode") === e);
          }),
          "selection" === e &&
            "page-background" === this._settings.background &&
            (this._settings.background = "custom-background"),
          this._updateSettings(),
          t || this._updatePreview(),
          this._updateSizeMenu());
      }),
      (m.prototype._hasBackgroundColor = function () {
        return (
          "canvas" === this._activeMode ||
          ("selection" === this._activeMode &&
            this._settings.format in { png: 1, jpg: 1, pdf: 1 })
        );
      }),
      (m.prototype._hasSize = function () {
        return (
          this._hasFormat() &&
          this._settings.format in { png: 1, jpg: 1, pdf: 1 }
        );
      }),
      (m.prototype._hasJpegQuality = function () {
        return this._hasFormat() && this._settings.format in { jpg: 1, pdf: 1 };
      }),
      (m.prototype._hasFormat = function () {
        return (
          "canvas" === this._activeMode || "selection" === this._activeMode
        );
      }),
      (m.prototype._updateBackground = function () {
        if (
          ((this._settings.configuration.sceneBackground = !0),
          !this._hasBackgroundColor())
        )
          return (
            (this._settings.backgroundColor = null),
            void (this._settings.backgroundOpacity = 0)
          );
        if ("custom-background" !== this._settings.background)
          (this._settings.configuration.sceneBackground =
            "page-background" == this._settings.background),
            (this._settings.backgroundColor =
              "jpg" === this._settings.format ? o.GRGBColor.WHITE : null),
            (this._settings.backgroundOpacity = 1);
        else {
          this._settings.configuration.sceneBackground = !1;
          var e = this._settingsContainer
            .find("[data-setting=background-color]")
            .find(".export-background-pattern-chooser");
          if (
            (e.gPatternChooser("value")
              ? ((this._settings.backgroundColor = e.gPatternChooser("value")),
                (this._settings.backgroundOpacity =
                  e.gPatternChooser("opacity")),
                this._settings.backgroundColor instanceof o.GColor ||
                  ((this._settings.backgroundColor = o.GRGBColor.WHITE),
                  (this._settings.backgroundOpacity = 1),
                  e.gPatternChooser("value", this._settings.backgroundColor),
                  e.gPatternChooser(
                    "opacity",
                    this._settings.backgroundOpacity
                  )))
              : ((this._settings.backgroundColor = this._document
                  ? this._document.getScene().getActivePage().getProperty("bck")
                  : null),
                (this._settings.backgroundOpacity = this._document
                  ? this._document.getScene().getActivePage().getProperty("bop")
                  : 1),
                this._settings.backgroundColor &&
                this._settings.backgroundColor instanceof o.GColor
                  ? null == this._settings.backgroundOpacity &&
                    (this._settings.backgroundOpacity = 1)
                  : ((this._settings.backgroundOpacity = 1),
                    (this._settings.backgroundColor = o.GRGBColor.WHITE)),
                e.gPatternChooser("value", this._settings.backgroundColor),
                e.gPatternChooser("opacity", this._settings.backgroundOpacity)),
            "jpg" === this._settings.format)
          ) {
            var t = o.GRGBColor.WHITE.getValue().slice(),
              n = this._settings.backgroundColor.getValue().slice();
            (t[3] = 1), (n[3] = this._settings.backgroundOpacity);
            var i = o.GRGBColor.mix(t, n);
            (this._settings.backgroundColor = new o.GRGBColor(i)),
              (this._settings.backgroundOpacity = 1);
          }
        }
      }),
      (m.prototype._updateSettings = function () {
        this._updateBackground(),
          this._settingsContainer
            .find("[data-setting=size]")
            .css("display", this._hasSize() ? "" : "none"),
          this._settingsContainer
            .find("[data-setting=format]")
            .css("display", this._hasFormat() ? "" : "none"),
          this._settingsContainer
            .find("[data-setting=jpeg-quality]")
            .css("display", this._hasJpegQuality() ? "" : "none"),
          this._settingsContainer
            .find("[data-setting=background-color]")
            .css("display", this._hasBackgroundColor() ? "" : "none"),
          this._settingsContainer
            .find("[data-setting=background-color]")
            .find(".export-background-pattern-chooser")
            .css(
              "display",
              "custom-background" === this._settings.background ? "" : "none"
            ),
          this._settingsContainer
            .find("[data-setting=color-space]")
            .css(
              "display",
              this._hasFormat() && "pdf" === this._settings.format ? "" : "none"
            ),
          this._settingsContainer
            .find("[value=no-background]")
            .css(
              "display",
              !this._hasFormat() ||
                ("pdf" !== this._settings.format &&
                  "jpg" !== this._settings.format)
                ? ""
                : "none"
            ),
          this._settingsContainer
            .find("[data-setting=retina-display]")
            .css(
              "display",
              !this._hasSize() ||
                ("jpg" !== this._settings.format &&
                  "png" !== this._settings.format)
                ? "none"
                : ""
            ),
          this._settingsContainer
            .find("[data-setting=ignore-effects]")
            .css(
              "display",
              this._hasFormat() && "pdf" === this._settings.format ? "" : "none"
            )
            .find("input")
            .prop("checked", !this._settings.configuration.ignoreEffects),
          this._settingsContainer
            .find("[data-setting=convert-text-to-path]")
            .css(
              "display",
              !this._hasFormat() ||
                ("svg" !== this._settings.format &&
                  "pdf" !== this._settings.format)
                ? "none"
                : ""
            )
            .find("input")
            .prop("checked", this._settings.convertTextToPath),
          this._settingsContainer
            .find("[data-setting=layer-as-id]")
            .css(
              "display",
              this._hasFormat() && "svg" === this._settings.format ? "" : "none"
            )
            .find("input")
            .prop("checked", this._settings.layerNamesAsId),
          this._settingsContainer
            .find("[data-setting=export-preserve-editing-capabilities]")
            .css(
              "display",
              this._hasFormat() && "svg" === this._settings.format ? "" : "none"
            )
            .find("input")
            .prop("checked", this._settings.preserveEditingCapabilities),
          this._settingsContainer
            .find("[data-setting=decimal-places-precision]")
            .css(
              "display",
              this._hasFormat() && "svg" === this._settings.format ? "" : "none"
            ),
          this._settingsContainer
            .find("[data-setting=format]")
            .find("[value=" + this._settings.format + "]")
            .attr("selected", !0),
          this._settings.colorSpace &&
            this._settingsContainer
              .find("[data-setting=color-space]")
              .find("[value=" + this._settings.colorSpace + "]")
              .attr("selected", !0),
          this._settingsContainer
            .find("[data-setting=do-not-downsample-images]")
            .css(
              "display",
              this._hasFormat() && "pdf" === this._settings.format ? "" : "none"
            )
            .find("input")
            .prop("checked", !this._settings.downsampleImages),
          this._settingsContainer
            .find("[data-setting=export-all]")
            .find("input")
            .prop("checked", !this._options || !this._options.element),
          $(".export-background-selector")
            .find('option[value="page-background"]')
            .css("display", "selection" === this._activeMode ? "none" : ""),
          $(".export-background-selector")
            .find('option[value="' + this._settings.background + '"]')
            .prop("selected", !0),
          this._updateStorageDestinationSetting();
      }),
      (m.prototype._generateExportables = function () {
        if ("canvas" === this._activeMode || "selection" === this._activeMode) {
          var e = {
            size: this._settings.size,
            suffix: "",
            format: this._settings.format,
            jpegQuality: this._settings.jpegQuality,
            backgroundColor: this._settings.backgroundColor,
            backgroundOpacity: this._settings.backgroundOpacity,
            colorSpace: this._settings.colorSpace,
            configuration: this._settings.configuration,
            convertTextToPath: this._settings.convertTextToPath,
            decimalPlacesPrecision: this._settings.decimalPlacesPrecision,
            preserveEditingCapabilities:
              this._settings.preserveEditingCapabilities,
            layerNamesAsId: this._settings.layerNamesAsId,
            overrideBackground: "page-background" !== this._settings.background,
            downsampleImages: this._settings.downsampleImages,
          };
          if ("canvas" === this._activeMode)
            return u.generateExportables(
              this._document.getScene(),
              $.extend({ name: this._document.getTitle() }, e),
              !1
            );
          var t = this._document.getEditor().getSelection();
          return t && t.length ? u.generateExportables(t, e, !1) : [];
        }
        if ("assets" === this._activeMode)
          return u.generateExportables(this._document.getScene(), null, !0);
      }),
      (m.prototype._export = async function (e) {
        this._options || (f = this._settings);
        var t = this._generateExportables();
        let n = [];
        try {
          var r = this._previewContainer.find(".item .preview-check input");
          if (r.length) {
            var s = [];
            r.each(function (e, t) {
              var n = $(t);
              n.prop("checked") && s.push(n.closest(".item").data("element"));
            });
            for (var l = [], c = 0; c < t.length; ++c)
              for (var d = 0; d < s.length; ++d) {
                if (
                  (s[d] instanceof o.GPage &&
                    t[c].element instanceof o.GPage &&
                    s[d].getReferenceId() === t[c].element.getReferenceId()) ||
                  s[d] === t[c].element
                ) {
                  l.push(t[c]);
                  break;
                }
              }
            t = l;
          }
          var h = i.GBitmapExport.getMaximumCanvasSize();
          if (
            t.some((e) => {
              if ("jpg" === e.format || "png" === e.format) {
                var t = o.GLength.DPI,
                  n = i.GBitmapExport.getBitmapPaintArea(e.element, e.size, t);
                if (
                  n.getWidth() > h.width ||
                  n.getHeight() > h.height ||
                  n.getWidth() * n.getHeight() > h.area
                )
                  return !0;
              }
              return !1;
            })
          )
            return void g
              .alert(
                o.GLocale.get(
                  new o.GLocaleKey("GExportDialog", "text.default-limit")
                )
                  .replace("%width", h.width)
                  .replace("%height", h.height)
                  .replace("%area", h.area / 1024 / 1024 + "MP")
              )
              .css({ width: "500px" });
          if (
            t.some(
              (e) =>
                "pdf" === e.format &&
                !i.GPDFExport.isSupported(
                  e.element,
                  !e.configuration || !e.configuration.ignoreEffects,
                  e.size
                )
            )
          )
            return void g
              .alert(
                o.GLocale.get(
                  new o.GLocaleKey("GExportDialog", "text.pdf-limit")
                ).replace(
                  "%limit",
                  Math.round(a.GPlatform.maxPngDataSize / 1024 / 1024) + "MB"
                )
              )
              .css({ width: "500px" });
          if (((n = this._persistOpacities(t)), t.length)) {
            const e = this._getSelectedStorageDestination();
            if (e && !(await this._checkWriteAccess(e))) return;
            var m = $("<div></div>")
                .addClass("export-overlay")
                .text(
                  o.GLocale.get(
                    new o.GLocaleKey("GExportDialog", "text.exporting")
                  ) + "..."
                )
                .appendTo(this._dialog),
              y = $("<div></div>")
                .addClass("message")
                .append($("<span></span>"));
            let n = {
              abort: void 0,
              message: (e) => {
                y.find("span").text(e);
              },
              close: () => m.remove(),
              error: () =>
                n.message(
                  o.GLocale.get(
                    new o.GLocaleKey("GCommonNames", "text.pdf-export-error")
                  )
                ),
            };
            const a = { storageDestination: e },
              r = (e) => {
                e && g.error(e, { closeCallback: () => this.close() });
              };
            t.length &&
              "pdf" === t[0].format &&
              (m.append(
                $("<button>")
                  .text(
                    o.GLocale.get(
                      new o.GLocaleKey("GCommonNames", "text.cancel")
                    )
                  )
                  .on("click", () => {
                    n.abort && n.abort(), n.close();
                  })
              ),
              m.append(y)),
              u.export(
                t,
                this._document.getStorage() || gDesigner.getDefaultStorage(),
                this._document.getTitle(),
                () => {
                  if (
                    (this.close(),
                    !gDesigner.getSetting(
                      "disable_warning_unsupported_features",
                      !1
                    ))
                  ) {
                    let e = [];
                    for (let n of t)
                      "svg" === n.format &&
                        (e = e.concat(
                          i.GSVGExport.getUnsupportedFeatures(n.element)
                        ));
                    e.length && new p(e).open();
                  }
                },
                () => this.close(),
                "assets" === this._activeMode,
                function (e) {
                  var t = m.find("progress");
                  t.length ||
                    m.append(
                      $("<p>").append(
                        (t = $("<progress>")
                          .attr({ min: "0", max: "100" })
                          .css("width", "200px"))
                      )
                    ),
                    t.val(e);
                },
                n,
                r,
                a
              );
          }
        } finally {
          this._restoreOpacities(t, n);
        }
      }),
      (m.prototype._checkWriteAccess = async function (e) {
        const t = this._document.getStorage() || gDesigner.getDefaultStorage(),
          n = await t.getWritePermission(e),
          o = n.isAuthorized();
        return (
          !o &&
            n.hasStatusText() &&
            g.error(n.getStatusText(), { showTitle: !1 }),
          o
        );
      }),
      (m.prototype._formatCaption = function (e) {
        return "pdf" === this._settings.format
          ? e.replace(/[^0-9\.]/g, "") + "dpi"
          : e;
      }),
      (m.prototype._updateSizeMenu = function () {
        this._sizeMenu.clearItems();
        let e = "1x";
        if ("pdf" === this._settings.format) {
          const t =
            this._document &&
            this._document.getScene() &&
            this._document.getScene().getProperty("dpi");
          (e = isNaN(t) ? "72dpi" : t + "dpi"),
            this._sizeMenu.createAddItem(
              o.GLocale.get(new o.GLocaleKey("GCommonNames", "text.default")) +
                " (72dpi)"
            ),
            this._sizeMenu.createAddItem(
              o.GLocale.get(new o.GLocaleKey("GCommonNames", "text.web")) +
                " (96dpi)"
            ),
            this._sizeMenu.createAddItem(
              o.GLocale.get(
                new o.GLocaleKey("GExportDialog", "text.medium-quality")
              ) + " (150dpi)"
            ),
            this._sizeMenu.createAddItem(
              o.GLocale.get(
                new o.GLocaleKey("GExportDialog", "text.high-quality")
              ) + " (300dpi)"
            );
        } else
          this._sizeMenu.createAddItem("1x"),
            this._sizeMenu.createAddItem("2x"),
            this._sizeMenu.createAddItem("0.5x"),
            this._sizeMenu.createAddItem("3x"),
            this._sizeMenu.createAddItem("512w"),
            this._sizeMenu.createAddItem("512h"),
            this._sizeMenu.createAddItem("128x128"),
            this._sizeMenu.createAddItem("300dpi");
        for (var t = 0; t < this._sizeMenu.getItemCount(); t++)
          if (
            -1 !==
            this._sizeMenu.getItem(t).getCaption().indexOf(this._settings.size)
          )
            return;
        (this._settings.size = e),
          this._settingsContainer
            .find(".g-input-select > input")
            .val(this._settings.size);
      }),
      (m.prototype._updatePreview = function () {
        this._previewContainer.empty();
        var e = this._generateExportables();
        let t = [];
        try {
          if (
            ((t = this._persistOpacities(e)),
            this._settingsContainer
              .find("[data-setting=export-all]")
              .css(
                "display",
                "canvas" !== this._activeMode || e.length > 1 ? "" : "none"
              ),
            e.length)
          ) {
            for (
              var n = $("<div></div>")
                  .addClass("loader")
                  .append(
                    $("<span></span>")
                      .addClass("text")
                      .text(
                        o.GLocale.get(
                          new o.GLocaleKey(
                            "GExportDialog",
                            "text.preparing-preview"
                          )
                        ) + "..."
                      )
                  )
                  .appendTo(this._previewContainer),
                a = [],
                r = 0;
              r < e.length;
              ++r
            ) {
              for (var s = e[r], l = null, c = 0; c < a.length; ++c)
                if (a[c].element === s.element) {
                  l = a[c];
                  break;
                }
              l ||
                ((l = {
                  element: s.element,
                  name: s.name,
                  format: s.format,
                  size: s.size,
                  jpegQuality: s.jpegQuality,
                  backgroundColor: s.backgroundColor,
                  backgroundOpacity: s.backgroundOpacity,
                  sizes: "",
                  formats: "",
                  configuration: s.configuration,
                }),
                a.push(l)),
                "" !== l.formats && (l.formats += ", "),
                (l.formats += s.format),
                s.size &&
                  ("" !== l.sizes && (l.sizes += ", "), (l.sizes += s.size));
            }
            var d = null;
            (a.length > 1 || "assets" === this._activeMode) &&
              (d = $("<div></div>")
                .addClass("list content")
                .appendTo(this._previewContainer));
            var u = [];
            for (r = 0; r < a.length; ++r) {
              l = a[r];
              var p,
                g,
                h = o.GBitmap.ImageType.PNG,
                f = null;
              "jpg" === l.format &&
                ((h = o.GBitmap.ImageType.JPEG),
                (f = (l.jpegQuality || 100) / 100));
              var m = window.devicePixelRatio;
              if (d) {
                var y = new o.GLength(50, o.GLength.Unit.PX);
                p = (g = l.element.toBitmap(
                  y,
                  y,
                  2,
                  l.backgroundColor,
                  l.configuration,
                  null,
                  l.backgroundOpacity
                )).toImageDataUrl(h, f);
              } else {
                var v = null;
                this._hasBackgroundColor() && (v = l.backgroundColor);
                var _ = l.element._getBitmapPaintArea(),
                  b = [0],
                  w = i.GBitmapExport.convertSizeToScale(
                    _.getWidth(),
                    _.getHeight(),
                    l.size,
                    null,
                    b
                  ),
                  C = _.getWidth() * (b[0] / o.GLength.DPI) * w.getX(),
                  x = _.getHeight() * (b[0] / o.GLength.DPI) * w.getY(),
                  S = l.size;
                (C > 1920 || x > 1080) &&
                  (S =
                    Math.min(1920 / _.getWidth(), 1080 / _.getHeight()) + "x"),
                  (p = (g = i.GBitmapExport.export(
                    l.element,
                    S,
                    v,
                    l.configuration,
                    null,
                    l.backgroundOpacity,
                    !0
                  )).toImageDataUrl(h, f));
              }
              var E = g.getWidth() / m,
                A = g.getHeight() / m,
                T = $("<img />").attr("src", p),
                G = $("<div></div>")
                  .addClass("preview-image")
                  .css("background", o.GPattern.asCSSBackground(null, 0))
                  .append(T);
              if ((u.push({ img: T, w: E, h: A, preview: G }), d)) {
                var P = "";
                "assets" === this._activeMode &&
                  (l.sizes && (P = l.sizes + " - "), (P += l.formats)),
                  $("<div></div>")
                    .addClass("item")
                    .data("element", l.element)
                    .append(G)
                    .append(
                      $("<div></div>")
                        .addClass("preview-check")
                        .append(
                          $("<input/>")
                            .prop(
                              "checked",
                              !this._options ||
                                !this._options.element ||
                                this._options.element == l.element
                            )
                            .on("change", () => {
                              this._updateStorageDestinationSetting();
                            })
                            .attr("type", "checkbox")
                        )
                    )
                    .append(
                      $("<div></div>").addClass("preview-name").text(l.name)
                    )
                    .append($("<div></div>").addClass("preview-meta").text(P))
                    .appendTo(d);
              } else G.addClass("content").appendTo(this._previewContainer);
            }
            n.remove();
          } else
            switch (this._activeMode) {
              case "selection":
                $("<div></div>")
                  .addClass("empty")
                  .text(
                    o.GLocale.get(
                      new o.GLocaleKey(
                        "GExportDialog",
                        "text.selection-warning"
                      )
                    )
                  )
                  .appendTo(this._previewContainer);
                break;
              case "assets":
                $("<div></div>")
                  .addClass("empty")
                  .text(
                    o.GLocale.get(
                      new o.GLocaleKey("GExportDialog", "text.assets-warning")
                    )
                  )
                  .appendTo(this._previewContainer);
            }
        } finally {
          this._restoreOpacities(e, t);
        }
        this._updateStorageDestinationSetting(), this._updateWarningSection(e);
      }),
      (m.prototype._persistOpacities = function (e) {
        let t = [];
        if (
          "canvas" === this._activeMode &&
          "svg" !== this._settings.format &&
          "pdf" !== this._settings.format
        )
          for (var n = 0; n < e.length; ++n) {
            var o = e[n];
            if (o.overrideBackground) {
              var i = o.element.getProperty("bop");
              t.push({ index: n, opacity: i }), o.element.setProperty("bop", 0);
            }
          }
        return t;
      }),
      (m.prototype._restoreOpacities = function (e, t) {
        if (t.length > 0)
          for (var n = 0; n < e.length; ++n)
            for (var o = e[n], i = 0; i < t.length; ++i)
              if (n === t[i].index) {
                o.element.setProperty("bop", t[i].opacity);
                break;
              }
      }),
      (e.exports = m);
  }