/**
 * Webpack Module #1659
 * Type: class
 * Name: GSceneProperties
 */

function (e, t, n) {
    "use strict";
    n(193), n(57), n(8), n(3), n(4), n(13);
    var o = n(1),
      i = n(357),
      a = n(67),
      r = n(123),
      s = n(448),
      l = n(445),
      c = n(86),
      d = n(163),
      u = n(119),
      p = n(78),
      g = n(135),
      h = (n(446), n(44)),
      f = n(257);
    const { FILE_FORMATS: m, CLOUD_SYNC_FEATURE: { NEW_LAYOUT: y } = {} } =
      n(10);
    var v = "." + m.find((e) => e.default).ext;
    function _() {}
    o.GObject.inherit(_, r),
      (_.prototype._panel = null),
      (_.prototype._document = null),
      (_.prototype._scene = null),
      (_.prototype.init = function (e, t) {
        (this._panel = e.addClass("scene-properties-panel")),
          t.addClass("scene-properties-toolbar"),
          y || gDesigner.addEventListener(p, this._synchronismUpdated, this);
        var n = function (e) {
          let t =
            arguments.length > 1 && void 0 !== arguments[1]
              ? arguments[1]
              : null;
          var n = this;
          if ("dpi" === e)
            return $("<div></div>")
              .append(
                $("<div/>")
                  .attr("data-property", e)
                  .on("change", function () {
                    const t =
                      parseInt($(this).gInputSelect("value")) || o.GLength.DPI;
                    gDesigner.stats("sceneproperties_change_canvas-dpi", t),
                      n._assignProperty(
                        e,
                        t,
                        o.GLocale.get(
                          new o.GLocaleKey(
                            "GSceneProperties",
                            "action.change-canvas-dpi"
                          )
                        )
                      );
                  })
                  .gInputSelect({
                    list: [72, 96, 144, 300],
                    minValue: 72,
                    maxValue: 300,
                  })
              )
              .gRichTooltip(t);
          if ("gx" === e || "gy" === e || "gaw" === e)
            return $("<input>")
              .attr("type", "text")
              .attr("data-property", e)
              .on("change", function () {
                "gx" === e
                  ? gDesigner.stats(
                      "sceneproperties_change_rect-grid-settings",
                      "width"
                    )
                  : "gy" === e
                  ? gDesigner.stats(
                      "sceneproperties_change_rect-grid-settings",
                      "height"
                    )
                  : "gaw" === e &&
                    gDesigner.stats(
                      "sceneproperties_change_axono-grid-settings",
                      "size"
                    );
                var t = n._document
                  .getScene()
                  .stringToPoint($(this).gInputBox("value"));
                null !== t && "number" == typeof t
                  ? n._assignProperty(
                      e,
                      t,
                      o.GLocale.get(
                        new o.GLocaleKey(
                          "GSceneProperties",
                          "action.change-grid-settings"
                        )
                      )
                    )
                  : n._updateProperties();
              })
              .gInputBox();
          if ("ga1" === e || "ga2" === e)
            return $("<input>")
              .attr("type", "text")
              .attr("data-property", e)
              .on("change", function () {
                "ga1" === e
                  ? gDesigner.stats(
                      "sceneproperties_change_axono-grid-settings",
                      "angle1"
                    )
                  : gDesigner.stats(
                      "sceneproperties_change_axono-grid-settings",
                      "angle2"
                    );
                var t = parseFloat($(this).gInputBox("value"));
                null !== t && "number" == typeof t
                  ? ((t = o.GMath.normalizeAngleDegrees(t)),
                    "ga1" == e &&
                      (t = (t = t >= 180 ? t - 180 : t) >= 90 ? 89 : t),
                    "ga2" == e &&
                      (t =
                        (t = (t = t > 0 ? t - 360 : t) <= -180 ? t + 180 : t) <=
                        -90
                          ? -89
                          : t),
                    (t = o.GMath.toRadians(t)),
                    n._assignProperty(
                      e,
                      t,
                      o.GLocale.get(
                        new o.GLocaleKey(
                          "GSceneProperties",
                          "action.change-grid-settings"
                        )
                      )
                    ))
                  : n._updateProperties();
              })
              .gInputBox({ postfix: "°" });
          if (0 === e.indexOf("gm-")) {
            var i = "",
              a = e.substr("gm-".length);
            switch (a) {
              case o.GScene.GridMode.Boxed:
                i = o.GLocale.get(
                  new o.GLocaleKey("GSceneProperties", "text.on")
                );
                break;
              case o.GScene.GridMode.Axonometric:
                i = o.GLocale.get(
                  new o.GLocaleKey("GSceneProperties", "text.isometric")
                );
                break;
              default:
                i = o.GLocale.get(
                  new o.GLocaleKey("GSceneProperties", "text.off")
                );
            }
            return $("<label></label>")
              .append(
                $("<input>")
                  .addClass("grid-mode-radio")
                  .attr("type", "radio")
                  .attr("data-property", e)
                  .on("change", function () {
                    gDesigner.stats(
                      "sceneproperties_change_grid-mode",
                      "box" === a ? "on" : "axo" === a ? "isometric" : "off"
                    ),
                      n._assignProperty(
                        "gm",
                        a || null,
                        o.GLocale.get(
                          new o.GLocaleKey(
                            "GSceneProperties",
                            "action.change-grid-settings"
                          )
                        )
                      ),
                      n._updateUI();
                  })
                  .gRichTooltip(t)
              )
              .append($("<span></span>").text(i));
          }
          if ("cm" === e)
            return $("<select></select>")
              .attr("data-property", e)
              .gRichTooltip(t)
              .on("change", function () {
                const t = gDesigner.getActiveDocument(),
                  i = t.getScene();
                if (
                  !gDesigner.isEnabledProFeatures() &&
                  0 != this.selectedIndex
                )
                  return (
                    $(this).val(i.getProperty("cm")),
                    void gDesigner.handlePROFeatureInterruption()
                  );
                const a = $(this).val();
                gDesigner.stats("sceneproperties_change_color-mode", a);
                var r = i.getActivePage().getChildren();
                !!r &&
                  r.find((e) => !(e instanceof o.GAnnotationsList)) &&
                  h.alert(
                    o.GLocale.get(
                      new o.GLocaleKey("GSceneProperties", "text.reminder")
                    )
                  ),
                  gDesigner.setSetting("color_mode", a),
                  n._assignProperty(
                    e,
                    a,
                    o.GLocale.get(
                      new o.GLocaleKey(
                        "GSceneProperties",
                        "action.change-color-mode"
                      )
                    )
                  ),
                  t.setColorModeElms(r);
              });
          if ("ut" === e)
            return $("<select></select>")
              .gUnit()
              .attr("data-property", e)
              .gRichTooltip(t)
              .on("change", function () {
                gDesigner.stats(
                  "sceneproperties_change_canvas-unit",
                  $(this).val()
                ),
                  n._assignProperty(
                    e,
                    $(this).val(),
                    o.GLocale.get(
                      new o.GLocaleKey(
                        "GSceneProperties",
                        "action.change-canvas-unit"
                      )
                    )
                  );
              });
          if (0 === e.indexOf("sync-")) {
            i = o.GLocale.get(
              new o.GLocaleKey(
                "GSceneProperties",
                "text." + e.substring("sync-".length)
              )
            );
            return $("<label></label>")
              .append(
                $("<input>")
                  .attr("type", "radio")
                  .attr("data-property", e)
                  .on("change", function (e) {
                    var t = -1 !== $(e.target).data().property.indexOf("on");
                    gDesigner.stats(
                      "sceneproperties_toggle_sync",
                      t ? "enable" : "disable"
                    ),
                      n._assignProperty("cfs", t);
                  })
              )
              .append($("<span></span>").text(i));
          }
          if (0 === e.indexOf("action-")) {
            var r = e.substring("action-".length);
            return $("<button></button>")
              .append(
                $("<span></span>").text(
                  o.GLocale.get(gDesigner.getAction(r).getTitle())
                )
              )
              .on(
                "click",
                function (e) {
                  gDesigner.canExecuteAction(r) && gDesigner.executeAction(r);
                }.bind(this)
              );
          }
          throw new Error("Unknown input property: " + e);
        }.bind(this);
        if (
          ($("<label></label>")
            .text(
              o.GLocale.get(new o.GLocaleKey("GCommonNames", "text.document"))
            )
            .appendTo(t),
          $("<div></div>")
            .addClass("unit-row")
            .gPropertyRow({
              columns: [
                {
                  clazz: "unit-title-column",
                  content: $(
                    "<span>" +
                      o.GLocale.get(
                        new o.GLocaleKey("GCommonNames", "text.unit")
                      ) +
                      "</span>"
                  ),
                },
                {
                  clazz: "unit-selector-column",
                  content: n(
                    "ut",
                    a.GRichTooltipConfig.from({
                      title: o.GLocale.get(
                        new o.GLocaleKey(
                          "GSceneProperties",
                          "text.unit-tooltip-title"
                        )
                      ),
                      description: o.GLocale.get(
                        new o.GLocaleKey(
                          "GSceneProperties",
                          "text.unit-tooltip-description"
                        )
                      ),
                      middle: !1,
                    })
                  ),
                },
              ],
            })
            .appendTo(e),
          $("<hr/>").appendTo(e),
          $("<div></div>")
            .addClass("color-mode-row")
            .gPropertyRow({
              columns: [
                {
                  clazz: "color-mode-title-column",
                  content: $("<span></span>").text(
                    o.GLocale.get(
                      new o.GLocaleKey("GSceneProperties", "text.color-mode")
                    )
                  ),
                },
                {
                  clazz: "color-mode-selector-column",
                  content: n(
                    "cm",
                    a.GRichTooltipConfig.from({
                      title: o.GLocale.get(
                        new o.GLocaleKey(
                          "GSceneProperties",
                          "text.color-mode-tooltip-title"
                        )
                      ),
                      description: o.GLocale.get(
                        new o.GLocaleKey(
                          "GSceneProperties",
                          "text.color-mode-tooltip-description"
                        )
                      ),
                      middle: !1,
                    })
                  ),
                },
              ],
            })
            .appendTo(e),
          $("<hr/>").appendTo(e),
          $("<div></div>")
            .addClass("dpi-row")
            .gPropertyRow({
              columns: [
                {
                  clazz: "dpi-title-column",
                  content: $("<span></span>").text(
                    o.GLocale.get(
                      new o.GLocaleKey("GSceneProperties", "text.dpi")
                    )
                  ),
                },
                {
                  clazz: "dpi-selector-column",
                  content: n(
                    "dpi",
                    a.GRichTooltipConfig.from({
                      title: o.GLocale.get(
                        new o.GLocaleKey(
                          "GSceneProperties",
                          "text.dpi-tooltip-title"
                        )
                      ),
                      middle: !1,
                    })
                  ),
                },
              ],
            })
            .appendTo(e),
          $("<hr/>").appendTo(e),
          $("<div></div>")
            .addClass("grid-mode")
            .gPropertyRow({
              columns: [
                {
                  clazz: "grid-mode-title-column",
                  content: $(
                    "<span>" +
                      o.GLocale.get(
                        new o.GLocaleKey("GCommonNames", "text.grid")
                      ) +
                      "</span>"
                  ),
                },
                {
                  clazz: "grid-mode-off-column",
                  content: n(
                    "gm-",
                    a.GRichTooltipConfig.from({
                      title: o.GLocale.get(
                        new o.GLocaleKey(
                          "GSceneProperties",
                          "text.grid-tooltip-title"
                        )
                      ),
                      description: o.GLocale.get(
                        new o.GLocaleKey(
                          "GSceneProperties",
                          "text.grid-tooltip-description-off"
                        )
                      ),
                      learnMore:
                        "",
                    })
                  ),
                },
                {
                  clazz: "grid-mode-box-column",
                  content: n(
                    "gm-" + o.GScene.GridMode.Boxed,
                    a.GRichTooltipConfig.from({
                      title: o.GLocale.get(
                        new o.GLocaleKey(
                          "GSceneProperties",
                          "text.grid-tooltip-title"
                        )
                      ),
                      description: o.GLocale.get(
                        new o.GLocaleKey(
                          "GSceneProperties",
                          "text.grid-tooltip-description-on"
                        )
                      ),
                      learnMore:
                        "",
                    })
                  ),
                },
                {
                  clazz: "grid-mode-axo-column",
                  content: n(
                    "gm-" + o.GScene.GridMode.Axonometric,
                    a.GRichTooltipConfig.from({
                      title: o.GLocale.get(
                        new o.GLocaleKey(
                          "GSceneProperties",
                          "text.grid-tooltip-title"
                        )
                      ),
                      description: o.GLocale.get(
                        new o.GLocaleKey(
                          "GSceneProperties",
                          "text.grid-tooltip-description-isometric"
                        )
                      ),
                      learnMore:
                        "",
                    })
                  ),
                },
              ],
            })
            .appendTo(e),
          $("<div></div>")
            .addClass("grid-mode-type")
            .attr("data-grid-mode", o.GScene.GridMode.Boxed)
            .gPropertyRow({
              label: "",
              columns: [
                {
                  width: "33.3%",
                  label: o.GLocale.get(
                    new o.GLocaleKey("GCommonNames", "text.width")
                  ),
                  content: n("gx"),
                },
                {
                  width: "33.3%",
                  label: o.GLocale.get(
                    new o.GLocaleKey("GCommonNames", "text.height")
                  ),
                  content: n("gy"),
                },
              ],
            })
            .appendTo(e),
          $("<div></div>")
            .addClass("grid-mode-type")
            .attr("data-grid-mode", o.GScene.GridMode.Axonometric)
            .gPropertyRow({
              label: "",
              columns: [
                {
                  width: "33.3%",
                  label: o.GLocale.get(
                    new o.GLocaleKey("GCommonNames", "text.size")
                  ),
                  content: n("gaw"),
                },
                {
                  width: "33.3%",
                  label:
                    o.GLocale.get(
                      new o.GLocaleKey("GCommonNames", "text.angle")
                    ) + " 1",
                  content: n("ga1"),
                },
                {
                  width: "33.3%",
                  label:
                    o.GLocale.get(
                      new o.GLocaleKey("GCommonNames", "text.angle")
                    ) + " 2",
                  content: n("ga2"),
                },
              ],
            })
            .appendTo(e),
          $("<hr/>").appendTo(e),
          !y)
        ) {
          let t = $("<div></div>")
            .addClass("actions")
            .append(
              $("<button></button>")
                .addClass(f["sync-button"])
                .text(
                  o.GLocale.get(
                    new o.GLocaleKey("GSceneProperties", "sync.enable")
                  )
                )
                .on("click", () => {
                  gDesigner.stats("sceneproperties_enable_cloud-sync"),
                    this._enableCloudSync();
                })
            );
          $("<div></div>")
            .attr("data-property", "enable-cloud-sync")
            .append(
              $("<div></div>")
                .addClass("cloud-sync-panel")
                .append(
                  $("<div></div>").addClass(
                    "svg-cloud-icon svg-background-icon-theme"
                  )
                )
                .append(t)
            )
            .appendTo(e);
          const n = this._getWelcomeLink();
          n && t.append(n),
            $("<div></div>")
              .attr("data-property", "switch-cloud-sync")
              .addClass("cloud-sync-switch")
              .append(
                $("<div></div>").addClass(
                  "svg-cloud-icon svg-background-icon-theme"
                )
              )
              .append(
                $("<div></div>")
                  .addClass("actions")
                  .append(
                    $("<label></label>")
                      .addClass("g-switch")
                      .css("width", "28px")
                      .append(
                        $("<input>")
                          .attr("type", "checkbox")
                          .on("change", (e) => {
                            gDesigner.stats(
                              "sceneproperties_toggle_cloud-sync",
                              $(e.target).is(":checked") ? "enable" : "disable"
                            );
                            var t = this._document.getScene();
                            const n = $(e.target).is(":checked");
                            t.setProperty("cfs", n),
                              n &&
                                this._document.chooseLatestDocument(
                                  t,
                                  (e, n) => {
                                    if (e !== t || n) {
                                      var o = new d(
                                        this._document.getStorageItem()
                                      );
                                      o.setScene(e),
                                        gDesigner.replaceDocument(
                                          this._document,
                                          o
                                        );
                                    } else
                                      this._document.storeToCloud(
                                        e,
                                        async () => {
                                          if (
                                            gDesigner
                                              .getDefaultStorage()
                                              .canSave()
                                          ) {
                                            let e = !1,
                                              n =
                                                (await this._document.saveAnnotations(
                                                  e
                                                ),
                                                this._document.updateSaveOptionsLastModifiedDate(
                                                  {},
                                                  t.getLastSavedTime()
                                                ));
                                            this._document.store(
                                              null,
                                              this._updateProperties.bind(this),
                                              null,
                                              n
                                            );
                                          } else this._updateProperties();
                                        }
                                      );
                                  },
                                  null,
                                  (e, t) =>
                                    t.lastModifiedDate().getTime() >
                                    e.lastModifiedDate().getTime()
                                );
                          })
                      )
                      .append($("<div></div>"))
                  )
                  .append(
                    $("<span></span>")
                      .addClass("label")
                      .text(
                        o.GLocale.get(
                          new o.GLocaleKey("GSceneProperties", "sync.label")
                        )
                      )
                  )
                  .append($("<span></span>").addClass("last-modified-date"))
              )
              .appendTo(e),
            i.SCENEPROPERTIES.HAS_LOGO_UNDER_SYNC &&
              e.find(".svg-cloud-icon").load(f["cloud-logo"], () => {});
        }
      }),
      (_.prototype._getWelcomeLink = function () {
        return $("<div></div>")
          .addClass("more")
          .append(
            $("<span></span>").text(
              o.GLocale.get(new o.GLocaleKey("GSceneProperties", "sync.more"))
            )
          )
          .on("click", () => {
            gDesigner.stats(
              "sceneproperties_click_welcome-to-gravit-cloud-medium-com"
            ),
              gContainer.openExternalLink(
                null,
                "https://medium.com/gravitdesigner/welcome-to-the-gravit-cloud-c30f84a7eb1f"
              );
          });
      }),
      (_.prototype.update = function (e, t) {
        return (
          this._document &&
            (this._document
              .getScene()
              .removeEventListener(
                o.GNode.AfterPropertiesChangeEvent,
                this._afterPropertiesChange,
                this
              ),
            gDesigner.removeEventListener(g, this._settingChanged),
            (this._document = null)),
          (this._scene = null),
          !(
            !e ||
            (1 === t.length &&
              t[0] instanceof o.GPage &&
              (this._scene = t[0].getScene()),
            !this._scene)
          ) &&
            ((this._document = e),
            this._document
              .getScene()
              .addEventListener(
                o.GNode.AfterPropertiesChangeEvent,
                this._afterPropertiesChange,
                this
              ),
            gDesigner.addEventListener(g, this._settingChanged, this),
            this._updateColorMode(),
            this._updateProperties(),
            this._updateUI(),
            !0)
        );
      }),
      (_.prototype._afterPropertiesChange = function (e) {
        e.temporary || this._scene !== e.node || this._updateProperties();
      }),
      (_.prototype._updateUI = function () {
        let e = this._panel.find(".color-mode-row"),
          t = this._panel.find(".dpi-row");
        if (gDesigner.isTouchEnabled()) {
          this._panel.find('input[data-property="gm-"]').is(":checked")
            ? this._panel.find(".grid-mode").removeClass("mode-on")
            : this._panel.find(".grid-mode").addClass("mode-on"),
            e.insertAfter(t);
          let n = t.find(".dpi-selector-column .g-input-select");
          n.find(".dpi-text").length ||
            $("<span/>")
              .addClass("dpi-text")
              .text(
                o.GLocale.get(new o.GLocaleKey("GSceneProperties", "text.dpi"))
              )
              .insertAfter(n.find("input")),
            this._panel
              .find(".unit-title-column span")
              .text(
                o.GLocale.get(
                  new o.GLocaleKey(
                    "GSceneProperties",
                    "text.unit-tooltip-title"
                  )
                )
              );
        } else
          t.find(".dpi-selector-column .g-input-select .dpi-text").remove(),
            e.insertBefore(t.prev()),
            this._panel.find(".grid-mode").removeClass("mode-on"),
            this._panel
              .find(".unit-title-column span")
              .text(
                o.GLocale.get(new o.GLocaleKey("GCommonNames", "text.unit"))
              );
      }),
      (_.prototype._settingChanged = function (e) {
        "decimals_num" === e.key
          ? this._updateProperties()
          : "touch" === e.key && this._updateUI();
      }),
      (_.prototype._synchronismUpdated = function (e) {
        e.document !== this._document ||
          e.type !== p.Type.SynchronismUpdated ||
          e.document.isSynchronizing() ||
          this._updateProperties();
      }),
      (_.prototype._updateColorMode = function () {
        var e = this._panel.find('select[data-property="cm"]').empty(),
          t = [
            { value: o.GColor.ColorModes.RGB, pro: !1, text: "RGB" },
            { value: o.GColor.ColorModes.HSB, pro: !0, text: "HSB" },
            { value: o.GColor.ColorModes.CMYK, pro: !0, text: "CMYK" },
          ];
        Array.prototype.forEach.call(t, (t) => {
          var n = $("<option></option>")
            .attr("value", t.value)
            .text(t.text)
            .appendTo(e);
          1 != t.pro || gDesigner.getLicense().isPro() || n.gPro();
        });
      }),
      (_.prototype._updateProperties = function () {
        var e = this._document.getScene();
        this._panel
          .find('[data-property="dpi"]')
          .gInputSelect(
            "value",
            this._scene.getProperty("dpi") || o.GLength.DPI
          );
        var t = this._document.hasCDR();
        this._panel
          .find('[data-property="dpi"]')
          .find('[type="text"]')
          .prop("disabled", t),
          this._panel
            .find('[data-property="dpi"]')
            .find("button")
            .prop("disabled", t),
          this._panel
            .find('[data-property="dpi"]')
            .attr(
              "data-title",
              t
                ? o.GLocale.get(
                    new o.GLocaleKey(
                      "GCommonNames",
                      "text.cant-change-cdr-limitations"
                    )
                  )
                : ""
            );
        const n = gDesigner.getSetting("color_mode", o.GColor.ColorModes.RGB);
        n && this._scene.setProperty("cm", n),
          this._panel.find('select[data-property="cm"]').val(n),
          this._panel
            .find('select[data-property="ut"]')
            .val(this._scene.getProperty("ut")),
          this._panel
            .find('input[data-property="gx"]')
            .gInputBox(
              "value",
              e.pointToString(
                this._scene.getProperty("gx"),
                this._scene.getOptimalDecimalsCount()
              )
            );
        this._panel
          .find('input[data-property="gy"]')
          .gInputBox(
            "value",
            e.pointToString(
              this._scene.getProperty("gy"),
              this._scene.getOptimalDecimalsCount()
            )
          ),
          this._panel
            .find('input[data-property="gaw"]')
            .gInputBox(
              "value",
              e.pointToString(
                this._scene.getProperty("gaw"),
                this._scene.getOptimalDecimalsCount()
              )
            ),
          this._panel
            .find('[type="text"][data-property="ga1"]')
            .gInputBox(
              "value",
              o.GUtil.formatNumber(
                o.GMath.toDegrees(this._scene.getProperty("ga1")),
                1
              )
            ),
          this._panel
            .find('[type="text"][data-property="ga2"]')
            .gInputBox(
              "value",
              o.GUtil.formatNumber(
                o.GMath.toDegrees(this._scene.getProperty("ga2")),
                1
              )
            );
        var i = this._scene.getProperty("gm");
        if (
          (this._panel.find('[data-property^="gm"]').each(function (e, t) {
            var n = $(t),
              o = n.attr("data-property").substr("gm-".length);
            n.prop("checked", (!o && !i) || o === i);
          }),
          !y)
        ) {
          var a = this._document.isCloudFile()
              ? !this._document.getScene().getProperty("cid")
              : !this._document.hasCloudReference(),
            r =
              !a &&
              (this._document.isCloudFile() ||
                this._document.hasCloudReference());
          this._panel
            .find('[data-property="enable-cloud-sync"]')
            .css("display", a ? "" : "none")
            .find("button")
            .prop("disabled", this._document.getStatus() === c.Loading),
            this._panel
              .find('[data-property="switch-cloud-sync"]')
              .css("display", r ? "" : "none")
              .find("input")
              .prop(
                "checked",
                (this._document.getScene() &&
                  this._document.getScene().isCloudSynchronization()) ||
                  this._document.isCloudFile()
              )
              .prop("disabled", this._document.isCloudFile());
          var s = (function (e) {
            if (0 === e.getTime()) return null;
            var t = e.getHours(),
              n = e.getMinutes(),
              o = (t = (t %= 12) || 12) + ":" + (n = n < 10 ? "0" + n : n);
            return (
              e.getMonth() +
              1 +
              "/" +
              e.getDate() +
              "/" +
              e.getFullYear() +
              "  " +
              o
            );
          })(this._document.getScene().lastModifiedDate());
          this._panel
            .find('[data-property="switch-cloud-sync"]')
            .find(".last-modified-date")
            .text(s || "")
            .css("display", s ? "" : "none");
        }
        this._panel.find("[data-grid-mode]").each(function (e, t) {
          var n = $(t),
            o = n.attr("data-grid-mode");
          n.css("display", (!o && !i) || o === i ? "" : "none");
        });
      }),
      (_.prototype._assignProperty = function (e, t, n) {
        this._assignProperties([e], [t], n);
      }),
      (_.prototype._assignProperties = function (e, t, n) {
        var o = this._document.getEditor();
        o.beginTransaction();
        try {
          this._scene.setProperties(e, t);
        } finally {
          o.commitTransaction(n);
        }
      }),
      (_.prototype._enableCloudSync = function () {
        var e = () => {
          var e = this._document;
          gDesigner.getDefaultStorage().canSave()
            ? this._document.isNew()
              ? u.createFile(e, (t) => {
                  e.getScene().setCloudSynchronization(t.id),
                    gDesigner.executeAction(
                      l.ID + v,
                      [
                        null,
                        e,
                        () => {
                          u.renameFile(t, e.getTitle(), () => {
                            e.storeToCloud(
                              e.getScene(),
                              this._updateProperties.bind(this)
                            );
                          });
                        },
                      ],
                      void 0,
                      !0
                    );
                })
              : this._document.isCloudFile()
              ? gDesigner.executeAction(l.ID + v, void 0, (void 0).true)
              : this._document.hasCloudReference()
              ? console.warn("Enable Sync for referenced file")
              : u.createFile(e, (t) => {
                  e.getScene().setCloudSynchronization(t.id),
                    e.storeToCloud(e.getScene(), () => {
                      e.store();
                    });
                })
            : this._document.isNew()
            ? gDesigner.executeAction(
                s.ID + ".save-as",
                [
                  this._document,
                  (t) => {
                    t === c.Loaded && gDesigner.removeDocument(e, null, !0);
                  },
                ],
                void 0,
                !0
              )
            : this._document.isCloudFile()
            ? gDesigner.executeAction(l.ID + v, void 0, void 0, !0)
            : this._document.hasCloudReference()
            ? console.warn("Enable Sync for referenced file")
            : gDesigner.executeAction(
                s.ID + ".save-as",
                [
                  this._document,
                  (t) => {
                    t === c.Loaded && gDesigner.removeDocument(e, null, !0);
                  },
                ],
                void 0,
                !0
              );
        };
        gDesigner.getUser().then((t) => {
          t
            ? e()
            : u.performLogin().then((t) => {
                t && e();
              });
        });
      }),
      (_.prototype.toString = function () {
        return "[Object GSceneProperties]";
      }),
      (e.exports = _);
  }