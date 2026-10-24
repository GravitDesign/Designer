/**
 * Webpack Module #1339
 * Type: class
 * Name: GPageProperties
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    n(58), n(20), n(3), n(71), n(34), n(4), n(41), n(13), n(32), n(33);
    var i = n(1),
      a = n(53),
      r = n(40),
      s = n(10),
      l = n(67),
      c = o(n(340)),
      d = n(123),
      u = n(1153),
      p = n(135),
      g = n(603),
      h = n(1328),
      f = n(442);
    const m = n(44),
      y = n(1604),
      v = n(78);
    function _() {}
    i.GObject.inherit(_, d),
      (_.prototype._panel = null),
      (_.prototype._canvasPropertiesRowInTouch = null),
      (_.prototype._canvasPropertiesRowInNormal = null),
      (_.prototype._hrAfterCanvasRow = null),
      (_.prototype._bleedRowInTouch = null),
      (_.prototype._bleedRowInNormal = null),
      (_.prototype._pageSizeRowInNormal = null),
      (_.prototype._hrAfterPageSizeRow = null),
      (_.prototype._toolbar = null),
      (_.prototype._document = null),
      (_.prototype._oldDocument = null),
      (_.prototype._pages = null),
      (_.prototype._styleEditorChange = !1),
      (_.prototype._styleEdOn = !1),
      (_.prototype._ownChange = !1),
      (_.prototype._chooserElem = null),
      (_.prototype._clipContentButton = null),
      (_.prototype._excludedPresets = [u.TYPE.MERCH]),
      (_.prototype._createInput = function (e) {
        var t = this,
          n = this;
        if ("bck" === e)
          return $("<div></div>")
            .attr("data-property", e)
            .gPatternChooser({
              types: [i.GColor, i.GGradient, i.GTexturePattern],
            })
            .on("chooseropen", function () {
              gDesigner
                .getWorkspace()
                .getStyleEdManager()
                .updateEditor(n._pages[0], e, !1),
                (n._styleEdOn = !0),
                (n._chooserElem = $(this)),
                n.updatePropertiesAvailability(
                  gDesigner.getActiveDocument().getScene().getActivePage()
                );
            })
            .on("chooserclose", function (e, t, o) {
              if (
                gDesigner.getWorkspace().getStyleEdManager().getOverlayLock(o)
              )
                t();
              else {
                if (n._document && n._document.hasCDR()) {
                  var a = gPatternChooser.getPattern();
                  !a ||
                    a instanceof i.GRGBColor ||
                    m.showCDRUnsupportedObjectWarning();
                }
                (n._styleEdOn = !1),
                  gDesigner
                    .getWorkspace()
                    .getStyleEdManager()
                    .deactivateEditor();
              }
              n._chooserElem = null;
            })
            .on("patternchange", function (e, t, o, a, r, s) {
              var l = [],
                c = [];
              if (
                (void 0 !== t && (l.push("bck"), c.push(t)),
                "number" == typeof o && (l.push("bop"), c.push(o)),
                n._pages)
              )
                if (a)
                  n._pages.forEach(function (e) {
                    e.setProperties(l, c, !1, !1, a);
                  });
                else {
                  var d = null;
                  r &&
                    ((d = { chooserOn: !0, pagePattern: !0 }),
                    null !== s && (d.activeStopIdx = s)),
                    n._assignProperties(
                      l,
                      c,
                      i.GLocale.get(
                        new i.GLocaleKey(
                          "GPageProperties",
                          "action.change-background"
                        )
                      ),
                      d
                    );
                }
            });
        if ("preset-size" === e)
          return $("<select></select>")
            .attr("data-property", "preset-size")
            .css("width", "100%")
            .on("change", (e) => {
              var t = $(e.target).find("option:selected"),
                n = t.attr("data-preset-locale-en"),
                o = "";
              (o = n || t.text()),
                gDesigner.stats("pageproperties_preset_size", o),
                this._assignPresetSize(e.target.value);
            });
        if ("w" === e || "h" === e) {
          var o = i.GLocale.get(
            new i.GLocaleKey(
              "GCommonNames",
              "property-".concat(e.toLowerCase())
            ),
            e
          );
          return $("<div>")
            .append(
              $("<input>")
                .attr("type", "text")
                .attr("data-property", e)
                .on("change", function () {
                  gDesigner.stats("pageproperties_change_size");
                  var t = $(this).gInputBox("value"),
                    o = n._document.getScene().stringToPoint(t);
                  "" === t || 0 === o
                    ? n._assignProperties(
                        ["w", "h"],
                        [o, o],
                        i.GLocale.get(
                          new i.GLocaleKey(
                            "GPageProperties",
                            "action.change-size"
                          )
                        )
                      )
                    : null !== o && "number" == typeof o && o >= 0
                    ? n._assignProperty(
                        e,
                        o,
                        i.GLocale.get(
                          new i.GLocaleKey(
                            "GPageProperties",
                            "action.change-size"
                          )
                        )
                      )
                    : n._updateProperties();
                })
                .gInputBox()
            )
            .gInputLabel({ label: o, autoPadding: o.length > 1 });
        }
        if ("bl" === e)
          return $("<input>")
            .attr("type", "text")
            .attr("data-property", e)
            .on("change", function () {
              gDesigner.stats("pageproperties_change_bleeding");
              var t = n._document
                .getScene()
                .stringToPoint($(this).gInputBox("value"));
              null !== t && "number" == typeof t && t >= 0
                ? n._assignProperty(
                    e,
                    t,
                    i.GLocale.get(
                      new i.GLocaleKey(
                        "GPageProperties",
                        "action.change-bleeding"
                      )
                    )
                  )
                : n._updateProperties();
            })
            .gInputBox();
        if ("mt" === e || "mb" === e || "ml" === e || "mr" === e)
          return $("<input>")
            .attr("type", "text")
            .attr("data-property", e)
            .on("change", function () {
              gDesigner.stats("pageproperties_change_margins");
              var t = n._document
                .getScene()
                .stringToPoint($(this).gInputBox("value"));
              null !== t && "number" == typeof t && t >= 0
                ? "yes" ===
                  n._panel.find("[data-lock-margin]").attr("data-lock-margin")
                  ? n._assignProperties(
                      ["mt", "mb", "ml", "mr"],
                      [t, t, t, t],
                      i.GLocale.get(
                        new i.GLocaleKey(
                          "GPageProperties",
                          "action.change-margins"
                        )
                      )
                    )
                  : n._assignProperty(
                      e,
                      t,
                      i.GLocale.get(
                        new i.GLocaleKey(
                          "GPageProperties",
                          "action.change-margin"
                        )
                      )
                    )
                : n._updateProperties();
            })
            .gInputBox();
        if ("equal-margins" === e)
          return $("<span></span>")
            .addClass("g-button g-flat valign-middle")
            .append($("<span></span>").addClass("gravit-icon-linked"))
            .on("click", function () {
              var e = $(this).closest(".g-button");
              gDesigner.stats(
                "pageproperties_lock_margin",
                e.attr("data-lock-margin")
              ),
                "yes" === e.attr("data-lock-margin")
                  ? e
                      .attr("data-lock-margin", "no")
                      .find("span:first-child")
                      .attr("class", "gravit-icon-unlinked")
                  : e
                      .attr("data-lock-margin", "yes")
                      .find("span:first-child")
                      .attr("class", "gravit-icon-linked");
            })
            .attr(
              "data-title",
              i.GLocale.get(
                new i.GLocaleKey("GPageProperties", "action.equal-margin")
              )
            )
            .attr("data-lock-margin", "yes");
        if ("master-page" === e)
          return $("<select></select>")
            .attr("data-property", "master-page")
            .css("width", "100%")
            .gPro()
            .on(
              "mousedown",
              r.watchDog.trap(null, null, () =>
                gDesigner.stats("pageproperties_nonprotriespro_masterpages")
              )
            )
            .on(
              "change",
              r.watchDog.trap(
                (e) => {
                  gDesigner.stats("pageproperties_change_masterpages"),
                    this._assignMasterPage(
                      $(e.target)
                        .find('option[value="' + e.target.value + '"]')
                        .data("page")
                    );
                },
                null,
                () =>
                  gDesigner.stats("pageproperties_nonprotriespro_masterpages")
              )
            );
        if ("bop" === e)
          return $("<input>")
            .attr("type", "text")
            .attr("data-property", e)
            .on("change", function () {
              gDesigner.stats("pageproperties_change_canvas-opacity"),
                n._assignProperty(
                  e,
                  i.GLength.parseEquationValue($(this).gInputBox("value")) /
                    100,
                  i.GLocale.get(
                    new i.GLocaleKey(
                      "GPageProperties",
                      "action.change-canvas-opacity"
                    )
                  )
                );
            })
            .gInputBox({
              minValue: 0,
              maxValue: 100,
              incrementValue: gDesigner.getOpacityIncrement(),
              postfix: "%",
            });
        if ("rotate-canvas" === e)
          return $("<button>")
            .attr("data-property", e)
            .attr(
              "data-title",
              i.GLocale.get(
                new i.GLocaleKey("GPageProperties", "text.rotate-canvas")
              )
            )
            .append($("<span/>").addClass("gravit-icon-flip-canvas"))
            .on("click", function () {
              gDesigner.stats("pageproperties_change_rotate");
              var e = n._pages[0];
              e &&
                e.getProperty("w") > 0 &&
                e.getProperty("h") > 0 &&
                n._assignProperties(
                  ["w", "h"],
                  [e.getProperty("h"), e.getProperty("w")],
                  i.GLocale.get(
                    new i.GLocaleKey("GPageProperties", "action.change-size")
                  )
                );
            });
        if ("trim-canvas" === e)
          return $("<button>")
            .attr("data-property", e)
            .attr(
              "data-title",
              i.GLocale.get(
                new i.GLocaleKey("GPageProperties", "text.size-trim")
              )
            )
            .append($("<span/>").addClass("gravit-icon-trim-canvas"))
            .on("click", function () {
              gDesigner.stats("pageproperties_trim_page"),
                n._panel
                  .find('select[data-property="preset-size"]')
                  .val("@trim"),
                n._assignPresetSize("@trim");
            });
        if ("clip-content" === e) {
          this._clipContentButton = $("<button>")
            .attr("data-property", e)
            .attr("disabled", !0)
            .addClass("g-disabled")
            .attr(
              "data-title",
              i.GLocale.get(
                new i.GLocaleKey("GPageProperties", "text.clip-content")
              )
            )
            .append($("<span/>").addClass("gravit-icon-clip-content"))
            .on("click", function () {
              var e = gDesigner.getWindows().getActiveWindow();
              if (e) {
                var t = e.getView().getViewConfiguration().paintMode;
                gDesigner.stats(
                  "pageproperties_clip_content",
                  t !== i.GScenePaintConfiguration.PaintMode.Output
                ),
                  n(t !== i.GScenePaintConfiguration.PaintMode.Output, !1);
              }
            });
          const n = function (e) {
            let n =
              arguments.length > 1 && void 0 !== arguments[1] && arguments[1];
            var o;
            (n && e) ||
              (e
                ? ((o = i.GScenePaintConfiguration.PaintMode.Output),
                  t._updatePageSetting(f.PAGE_CLIP_CONTENT_ENABLED))
                : ((o = i.GScenePaintConfiguration.PaintMode.Full),
                  t._updatePageSetting(f.PAGE_CLIP_CONTENT_DISABLED)),
              gDesigner.setPaintMode(o));
          };
          return this._clipContentButton;
        }
        throw new Error("Unknown input property: " + e);
      }),
      (_.prototype._windowEvent = function (e) {
        const { type: t, window: n } = e;
        if (t !== g.WindowEvent.Type.Activated)
          return void (
            t === g.WindowEvent.Type.Removed &&
            this._lastScene &&
            (this._lastScene.removeEventListener(
              i.GNode.AfterPropertiesChangeEvent,
              this._propertiesUpdateEventHandler,
              this
            ),
            this._lastScene.removeEventListener(
              i.GNode.AfterFlagChangeEvent,
              this._pageActivationEventHandler,
              this
            ),
            (this._lastScene = null))
          );
        if (n.getDocument() !== gDesigner.getActiveDocument()) return;
        const o = gDesigner.getActiveDocument().getScene();
        o.addEventListener(
          i.GNode.AfterFlagChangeEvent,
          this._pageActivationEventHandler,
          this
        ),
          o.addEventListener(
            i.GNode.AfterPropertiesChangeEvent,
            this._propertiesUpdateEventHandler,
            this
          ),
          this._lastScene &&
            (this._lastScene.removeEventListener(
              i.GNode.AfterPropertiesChangeEvent,
              this._propertiesUpdateEventHandler,
              this
            ),
            this._lastScene.removeEventListener(
              i.GNode.AfterFlagChangeEvent,
              this._pageActivationEventHandler,
              this
            )),
          (this._lastScene = o),
          this._pageActivationEventHandler({
            node: o.getActivePage(),
            flag: i.GNode.Flag.Active,
          });
      }),
      (_.prototype._paintModeEvent = function () {
        this.updatePropertiesAvailability(
          gDesigner.getActiveDocument().getScene().getActivePage()
        );
      }),
      (_.prototype._pageActivationEventHandler = function (e) {
        let { node: t, flag: n } = e;
        if (t instanceof i.GPage && n === i.GNode.Flag.Active) {
          const e = gDesigner
              .getWindows()
              .getActiveWindow()
              .getView()
              .getViewConfiguration().paintMode,
            n = !t.isFixedSized();
          if (n && e === i.GScenePaintConfiguration.PaintMode.Output)
            gDesigner.setPaintMode(i.GScenePaintConfiguration.PaintMode.Full),
              this._updatePageSetting(f.PAGE_CLIP_CONTENT_DISABLED);
          else if (!n) {
            var o =
              t.getProperty(f.PAGE_CLIP_PROPERTY_NAME, !0) ||
              (s.PAGE_CLIP_DEFAULT
                ? f.PAGE_CLIP_CONTENT_ENABLED
                : f.PAGE_CLIP_CONTENT_DISABLED);
            gDesigner.setPaintMode(
              o === f.PAGE_CLIP_CONTENT_ENABLED
                ? i.GScenePaintConfiguration.PaintMode.Output
                : i.GScenePaintConfiguration.PaintMode.Full
            );
          }
          this.updatePropertiesAvailability(t);
        }
      }),
      (_.prototype._propertiesUpdateEventHandler = function (e) {
        let { node: t, temporary: n, properties: o } = e;
        if (
          !n &&
          t instanceof i.GPage &&
          (o.indexOf("w") >= 0 || o.indexOf("h") >= 0)
        ) {
          var a = gDesigner
              .getWindows()
              .getActiveWindow()
              .getView()
              .getViewConfiguration().paintMode,
            r = !t.isFixedSized();
          r && a === i.GScenePaintConfiguration.PaintMode.Output
            ? (gDesigner.setPaintMode(
                i.GScenePaintConfiguration.PaintMode.Full
              ),
              this._updatePageSetting(f.PAGE_CLIP_CONTENT_DISABLED))
            : this._manageClipButtonState(!1, !r);
        }
      }),
      (_.prototype._updatePageSetting = function (e) {
        gDesigner
          .getActiveDocument()
          .getScene()
          .getActivePage()
          .setProperty(f.PAGE_CLIP_PROPERTY_NAME, e, !0);
      }),
      (_.prototype._reInitLayout = function () {
        (this._canvasPropertiesRowInNormal = $("<div></div>")
          .attr("data-property-row", "canvas-size")
          .addClass("canvas-properties-normal")
          .gPropertyRow({
            columns: [
              {
                width: "25%",
                content: this._createInput("bck"),
                label: i.GLocale.get(
                  new i.GLocaleKey("GCommonNames", "text.color")
                ),
              },
              {
                width: "25%",
                content: this._createInput("w"),
                label: i.GLocale.get(
                  new i.GLocaleKey("GCommonNames", "text.width")
                ),
              },
              {
                width: "25%",
                content: this._createInput("h"),
                label: i.GLocale.get(
                  new i.GLocaleKey("GCommonNames", "text.height")
                ),
              },
              {
                width: "25%",
                content: this._createInput("bop"),
                label: i.GLocale.get(
                  new i.GLocaleKey("GCommonNames", "text.opacity")
                ),
              },
            ],
          })
          .insertBefore(this._hrAfterbleedRow)),
          (this._hrAfterCanvasRow = $("<hr/>").insertBefore(
            this._hrAfterbleedRow
          )),
          (this._pageSizeRowInNormal = $("<div></div>")
            .addClass("page-size-properties-normal")
            .gPropertyRow({
              columns: [
                {
                  width: "25%",
                  content: $(
                    "<span>" +
                      i.GLocale.get(
                        new i.GLocaleKey("GPageProperties", "text.page-size")
                      ) +
                      "</span>"
                  ),
                },
                { width: "30%", content: this._createInput("preset-size") },
                { width: "15%", content: this._createInput("rotate-canvas") },
                { width: "15%", content: this._createInput("trim-canvas") },
                { width: "15%", content: this._createInput("clip-content") },
              ],
            })
            .insertBefore(this._hrAfterbleedRow)),
          (this._hrAfterPageSizeRow = $("<hr/>")
            .attr("data-property-row", "fixed-size")
            .insertBefore(this._hrAfterbleedRow)),
          (this._bleedRowInNormal = $("<div></div>")
            .addClass("bleed-properties-normal")
            .attr("data-property-row", "fixed-size")
            .gPropertyRow({
              columns: [
                {
                  width: "25%",
                  content: $(
                    "<span>" +
                      i.GLocale.get(
                        new i.GLocaleKey("GPageProperties", "text.bleed")
                      ) +
                      "</span>"
                  ),
                },
                { width: "20%", content: this._createInput("bl") },
              ],
            })
            .insertBefore(this._hrAfterbleedRow));
      }),
      (_.prototype.init = function (e, t) {
        (this._panel = e),
          (this._toolbar = t),
          gDesigner
            .getWindows()
            .addEventListener(g.WindowEvent, this._windowEvent, this),
          gDesigner.addEventListener(h, this._paintModeEvent, this),
          gDesigner.addEventListener(v, this._documentEvent, this),
          this.setTouchTools([
            new c.default({
              id: "document",
              icon: "gravit-icon-touch-document",
              panel: [this._panel, ".scene-properties-panel"],
              toolbar: [this._toolbar, ".scene-properties-toolbar"],
              panelWidth: "380px",
            }),
          ]),
          t.addClass("filled"),
          t.addClass("page-toolbar"),
          t.addClass("page-properties-toolbar"),
          e.addClass("page-properties-panel"),
          $("<label></label>")
            .text(
              i.GLocale.get(
                new i.GLocaleKey("GPageProperties", "title")
              ).toUpperCase()
            )
            .appendTo(t),
          (this._hrAfterbleedRow = $("<hr/>")
            .attr("data-property-row", "fixed-size")
            .appendTo(e));
        const n = l.GRichTooltipConfig.from({
          title: i.GLocale.get(
            new i.GLocaleKey("GPageProperties", "text.margin-tooltip-title")
          ),
          description: i.GLocale.get(
            new i.GLocaleKey(
              "GPageProperties",
              "text.margin-tooltip-description"
            )
          ),
          learnMore:
            "",
        });
        $("<div></div>")
          .attr("data-property-row", "fixed-size")
          .addClass("page-margin-properties")
          .gPropertyRow({
            columns: [
              {
                clazz: "margin-title-column",
                content: $(
                  "<span>" +
                    i.GLocale.get(
                      new i.GLocaleKey("GPageProperties", "text.margin")
                    ) +
                    "</span>"
                ).addClass("margin-title"),
              },
              {
                clazz: "margin-input-column",
                labelClass: "margin-input-labels",
                label: i.GLocale.get(
                  new i.GLocaleKey("GCommonNames", "text.left")
                ),
                content: this._createInput("ml").gRichTooltip(n),
              },
              {
                clazz: "margin-input-column",
                labelClass: "margin-input-labels",
                label: i.GLocale.get(
                  new i.GLocaleKey("GCommonNames", "text.top")
                ),
                content: this._createInput("mt").gRichTooltip(n),
              },
              {
                clazz: "margin-input-column",
                labelClass: "margin-input-labels",
                label: i.GLocale.get(
                  new i.GLocaleKey("GCommonNames", "text.right")
                ),
                content: this._createInput("mr").gRichTooltip(n),
              },
              {
                clazz: "margin-input-column",
                labelClass: "margin-input-labels",
                label: i.GLocale.get(
                  new i.GLocaleKey("GCommonNames", "text.bottom")
                ),
                content: this._createInput("mb").gRichTooltip(n),
              },
              {
                clazz: "margin-btn-column",
                labelClass: "margin-input-labels",
                content: this._createInput("equal-margins"),
              },
            ],
          })
          .appendTo(e),
          $("<hr/>").attr("data-property-row", "fixed-size").appendTo(e);
        var o = gDesigner.getLicense();
        $("<div></div>")
          .attr("data-property-row", "fixed-size")
          .addClass("master-property-row")
          .gPropertyRow({
            columns: [
              {
                clazz: "master-property-title",
                content: $(
                  "<span>" +
                    i.GLocale.get(
                      new i.GLocaleKey("GPageProperties", "text.master")
                    ) +
                    "</span>"
                ),
              },
              {
                clazz: "master-property-selector",
                content: $("<div></div>")
                  .append(this._createInput("master-page"))
                  .append($("<span></span>").gPro())
                  .gRichTooltip(
                    l.GRichTooltipConfig.from({
                      title: i.GLocale.get(
                        new i.GLocaleKey(
                          "GPageProperties",
                          "text.master-tooltip-title"
                        )
                      ),
                      description: i.GLocale.get(
                        new i.GLocaleKey(
                          "GPageProperties",
                          "text.master-tooltip-description"
                        )
                      ),
                      middle: !1,
                      isPro:
                        !gDesigner.isEnabledProFeatures() ||
                        !(o.isPro() && !o.isExpired()),
                      learnMore:
                        "",
                    })
                  ),
              },
            ],
          })
          .appendTo(e),
          e
            .find('[data-property="rotate-canvas"]')
            .parent(".content")
            .gRichTooltip(
              l.GRichTooltipConfig.from({
                title: i.GLocale.get(
                  new i.GLocaleKey(
                    "GPageProperties",
                    "text.rotate-canvas-tooltip-title"
                  )
                ),
                description: i.GLocale.get(
                  new i.GLocaleKey(
                    "GPageProperties",
                    "text.rotate-canvas-tooltip-description"
                  )
                ),
                learnMore:
                  "",
              })
            ),
          e
            .find('[data-property="trim-canvas"]')
            .parent(".content")
            .gRichTooltip(
              l.GRichTooltipConfig.from({
                title: i.GLocale.get(
                  new i.GLocaleKey(
                    "GPageProperties",
                    "text.trim-canvas-tooltip-title"
                  )
                ),
                description: i.GLocale.get(
                  new i.GLocaleKey(
                    "GPageProperties",
                    "text.trim-canvas-tooltip-description"
                  )
                ),
                learnMore:
                  "",
              })
            ),
          e
            .find('[data-property="clip-content"]')
            .parent(".content")
            .gRichTooltip(
              l.GRichTooltipConfig.from({
                title: i.GLocale.get(
                  new i.GLocaleKey(
                    "GPageProperties",
                    "text.clip-content-tooltip-title"
                  )
                ),
                description: i.GLocale.get(
                  new i.GLocaleKey(
                    "GPageProperties",
                    "text.clip-content-tooltip-description"
                  )
                ),
              })
            ),
          e
            .find('[data-property="bl"]')
            .parent(".content")
            .gRichTooltip(
              l.GRichTooltipConfig.from({
                title: i.GLocale.get(
                  new i.GLocaleKey(
                    "GPageProperties",
                    "text.bleed-tooltip-title"
                  )
                ),
                description: i.GLocale.get(
                  new i.GLocaleKey(
                    "GPageProperties",
                    "text.bleed-tooltip-description"
                  )
                ),
                middle: !1,
                learnMore:
                  "",
              })
            ),
          gDesigner
            .getWorkspace()
            .getStyleEdManager()
            .addEventListener(
              a.GStyleEdManager.EditorEvent,
              this._styleEditorEventHandler,
              this
            ),
          this._updateUI();
      }),
      (_.prototype._documentEvent = function (e) {
        e.type === v.Type.Removed &&
          this._panel
            .find('select[data-property="master-page"]')
            .empty()
            .append($("<option></option>"));
      }),
      (_.prototype._assignPresetSize = function (e) {
        if ("@infinite" === e)
          this._assignProperties(
            ["w", "h"],
            [0, 0],
            i.GLocale.get(
              new i.GLocaleKey("GPageProperties", "action.change-size")
            ),
            null,
            !0
          );
        else if ("@trim" === e) {
          this._ownChange = !0;
          var t = this._document.getEditor();
          t.beginTransaction();
          try {
            this._pages.forEach((e) => e.trimToContent());
          } finally {
            t.commitTransaction(
              i.GLocale.get(
                new i.GLocaleKey("GPageProperties", "action.change-size")
              )
            ),
              (this._ownChange = !1);
          }
        } else {
          var n = this._document.getScene(),
            o = e.split("x"),
            a = n.stringToPoint(o[0]),
            r = n.stringToPoint(o[1]),
            s = +o[2];
          n.getProperty("dpi") !== s && n.setProperty("dpi", s),
            this._assignProperties(
              ["w", "h"],
              [a, r],
              i.GLocale.get(
                new i.GLocaleKey("GPageProperties", "action.change-size")
              )
            );
        }
      }),
      (_.prototype._assignMasterPage = function (e) {
        var t = this._document.getScene(),
          n = this._document.getEditor();
        if (e) {
          n.beginTransaction();
          try {
            this._pages.forEach((n) => {
              var o = n.getMasterPages(),
                i = !1;
              o.forEach(function (o) {
                e !== o ? t.unlink(o, n) : (i = !0);
              }),
                i || t.link(e, n);
            }),
              this._updateSlavePages(e);
          } finally {
            n.commitTransaction(
              i.GLocale.get(
                new i.GLocaleKey("GPageProperties", "action.assign-master-page")
              )
            );
          }
        } else {
          n.beginTransaction();
          try {
            this._pages.forEach((e) => {
              e.getMasterPages().forEach(function (n) {
                t.unlink(n, e);
              });
            });
          } finally {
            n.commitTransaction(
              i.GLocale.get(
                new i.GLocaleKey("GPageProperties", "action.assign-master-page")
              )
            );
          }
        }
      }),
      (_.prototype.update = function (e, t, n) {
        if ((this._updateUI(), this._styleEditorChange))
          return (this._styleEditorChange = !1), !0;
        if (this._ownChange) return !0;
        this._chooserElem && this._chooserElem.gPatternChooser("close");
        var o = e !== this._oldDocument;
        if (
          ((this._oldDocument = e),
          this._document &&
            (this._document
              .getScene()
              .removeEventListener(
                i.GNode.AfterPropertiesChangeEvent,
                this._afterPropertiesChange,
                this
              ),
            gDesigner.removeEventListener(p, this._settingChanged),
            (this._document = null)),
          (this._pages = null),
          e && (t = t.filter((e) => e instanceof i.GPage)).length)
        )
          return (
            (this._pages = t.slice()),
            (this._document = e),
            this._document
              .getScene()
              .addEventListener(
                i.GNode.AfterPropertiesChangeEvent,
                this._afterPropertiesChange,
                this
              ),
            gDesigner.addEventListener(p, this._settingChanged, this),
            o && this._updatePresetSizes(),
            this._updateProperties(n),
            !0
          );
        const r = gDesigner.getActiveDocument(),
          s = r && r.getScene();
        if (gDesigner.isTouchEnabled() && s && s.getActivePage()) {
          const e = gDesigner.getActiveView(),
            t = e && e.getViewConfiguration();
          if (t && t.elementAnnotations) {
            const e = gDesigner.getToolManager().getActiveTool();
            if (!e || e instanceof a.GSelectTool) return !0;
          }
        }
        return !1;
      }),
      (_.prototype._afterPropertiesChange = function (e) {
        e.node === this._pages[0]
          ? this._updateProperties()
          : !e.temporary &&
            e.node === this._document.getScene() &&
            e.properties.indexOf("ut") >= 0 &&
            (this._updatePresetSizes(), this._updateProperties()),
          this._updateSlavePages(e.node, e.properties);
      }),
      (_.prototype._updateUI = function () {
        this._removeOldHtmlElement(),
          gDesigner.isTouchEnabled()
            ? y._reInitLayout.call(this)
            : this._reInitLayout(),
          this._document
            ? (this._updatePresetSizes(), this._updateProperties())
            : this._oldDocument && this._updatePresetSizes();
      }),
      (_.prototype._removeOldHtmlElement = function () {
        this._removeHtmlElem(this._canvasPropertiesRowInNormal),
          (this._canvasPropertiesRowInNormal = null),
          this._removeHtmlElem(this._hrAfterCanvasRow),
          (this._hrAfterCanvasRow = null),
          this._removeHtmlElem(this._bleedRowInNormal),
          (this._bleedRowInNormal = null),
          this._removeHtmlElem(this._pageSizeRowInNormal),
          (this._pageSizeRowInNormal = null),
          this._removeHtmlElem(this._hrAfterPageSizeRow),
          (this._hrAfterPageSizeRow = null),
          this._removeHtmlElem(this._canvasPropertiesRowInTouch),
          (this._canvasPropertiesRowInTouch = null),
          this._removeHtmlElem(this._bleedRowInTouch),
          (this._bleedRowInTouch = null);
      }),
      (_.prototype._removeHtmlElem = function (e) {
        e && e.remove();
      }),
      (_.prototype._settingChanged = function (e) {
        "decimals_num" === e.key
          ? this._updateProperties()
          : "touch" === e.key && this._updateUI();
      }),
      (_.prototype._updateSlavePages = function (e, t) {
        var n = ["mt", "mb", "ml", "mr", "bop", "bl", "bck"];
        if (e instanceof i.GPage) {
          t || (t = n);
          var o = n.filter((e) => t.indexOf(e) >= 0);
          o.length &&
            e.getSlavePages().forEach((t) => {
              var n;
              t.setProperties(
                o,
                ((n = []), o.forEach((t) => n.push(e.getProperty(t))), n)
              );
            });
        }
      }),
      (_.prototype._updatePresetSizes = function () {
        var e = (this._document || this._oldDocument)
            .getScene()
            .getProperty("ut"),
          t = this._panel.find('select[data-property="preset-size"]').empty(),
          n = $("<optgroup></optgroup>").attr(
            "label",
            i.GLocale.get(
              new i.GLocaleKey("GPageProperties", "text.size-custom")
            )
          );
        $("<option></option>")
          .attr("value", "@infinite")
          .text(
            i.GLocale.get(
              new i.GLocaleKey("GPageProperties", "text.size-infinite")
            )
          )
          .appendTo(n),
          t.append(n),
          u.getPresets().forEach((n) => {
            var o = $("<optgroup></optgroup>").attr("label", n.name),
              a = !1;
            n.layouts.forEach((t) => {
              if (t.unit === e) {
                var r = t.includes;
                if (r)
                  for (var s = 0; s < r.length; s++) {
                    var l = r[s];
                    $("<option></option>")
                      .attr("data-preset-id", n.id)
                      .attr(
                        "data-preset-locale-en",
                        i.GLocale.get(
                          l.localeClass,
                          null,
                          i.GLocaleLanguage.English
                        )
                      )
                      .attr(
                        "value",
                        l.width + "x" + l.height + "x" + (t.dpi || 72)
                      )
                      .text(
                        ""
                          .concat(l.name)
                          .concat(
                            l.displaySize ? " " + l.width + "x" + l.height : ""
                          )
                      )
                      .appendTo(o);
                  }
                else
                  $("<option></option>")
                    .attr("data-preset-id", n.id)
                    .attr(
                      "data-preset-locale-en",
                      i.GLocale.get(
                        t.localeClass,
                        null,
                        i.GLocaleLanguage.English
                      )
                    )
                    .attr(
                      "value",
                      t.width + "x" + t.height + "x" + (t.dpi || 72)
                    )
                    .text(
                      ""
                        .concat(t.name)
                        .concat(
                          t.displaySize ? " " + t.width + "x" + t.height : ""
                        )
                    )
                    .appendTo(o);
                a = !0;
              }
            }),
              n.hidden && o.css({ display: "none" }),
              a && t.append(o);
          });
      }),
      (_.prototype._styleEditorEventHandler = function (e) {
        this._styleEdOn &&
          e.type === a.GStyleEdManager.EditorEventType.PrepareModifiedEvent &&
          (this._styleEditorChange = !0);
      }),
      (_.prototype._updateProperties = function (e) {
        var t = this._document.getScene(),
          n = this._pages[0],
          o = t.isFixedSized(),
          r = i.GLocale.get(new i.GLocaleKey("GCommonNames", "text.page"));
        gDesigner.isTouchEnabled() && (r = r.toUpperCase());
        var s = r + " (";
        this._pages.length > 1
          ? (s +=
              this._pages.length +
              " " +
              i.GLocale.get(new i.GLocaleKey("GCommonNames", "text.pages")))
          : (s +=
              n.getProperty("name") ||
              i.GLocale.get(new i.GLocaleKey("GCommonNames", "text.active"))),
          (s += ")"),
          this._toolbar.find("label:first-child").text(s),
          this._panel
            .find('input[data-property="bl"]')
            .val(
              t.pointToString(n.getProperty("bl"), t.getOptimalDecimalsCount())
            ),
          n.getProperty("bck") ||
            (n.setProperty("bck", i.GRGBColor.WHITE), n.setProperty("bop", 0));
        var l = n.getProperty("bck", !1, !1, !0);
        if (
          (this._panel
            .find('[data-property-row="background"]')
            .css("display", ""),
          this._panel
            .find('[data-property="bck"]')
            .css("display", l ? "" : "none")
            .gPatternChooser(
              "updateSettings",
              o
                ? { types: [i.GColor, i.GGradient, i.GTexturePattern] }
                : { types: [i.GColor] }
            )
            .gPatternChooser("setPattern", l)
            .gPatternChooser("value", l)
            .gPatternChooser("opacity", n.getProperty("bop", !1, !1, !0)),
          this._panel
            .find('input[data-property="bop"]')
            .css("display", l ? "" : "none")
            .gInputBox(
              "value",
              i.GUtil.formatOpacity(100 * n.getProperty("bop"))
            ),
          o)
        ) {
          var c =
              t.pointToString(n.getProperty("w"), t.getOptimalDecimalsCount()) +
              "x" +
              t.pointToString(n.getProperty("h"), t.getOptimalDecimalsCount()) +
              "x" +
              t.getProperty("dpi"),
            d = this._panel.find('select[data-property="preset-size"]');
          d.val(d.find('option[value="' + c + '"]').length ? c : "@custom");
        } else
          this._panel
            .find('select[data-property="preset-size"]')
            .val("@infinite");
        this._panel
          .find('input[data-property="w"]')
          .gInputBox(
            "value",
            t.pointToString(n.getProperty("w"), t.getOptimalDecimalsCount())
          ),
          this._panel
            .find('input[data-property="h"]')
            .gInputBox(
              "value",
              t.pointToString(n.getProperty("h"), t.getOptimalDecimalsCount())
            ),
          this._panel
            .find('input[data-property="mt"]')
            .gInputBox(
              "value",
              t.pointToString(n.getProperty("mt"), t.getOptimalDecimalsCount())
            ),
          this._panel
            .find('input[data-property="mb"]')
            .gInputBox(
              "value",
              t.pointToString(n.getProperty("mb"), t.getOptimalDecimalsCount())
            ),
          this._panel
            .find('input[data-property="ml"]')
            .gInputBox(
              "value",
              t.pointToString(n.getProperty("ml"), t.getOptimalDecimalsCount())
            ),
          this._panel
            .find('input[data-property="mr"]')
            .gInputBox(
              "value",
              t.pointToString(n.getProperty("mr"), t.getOptimalDecimalsCount())
            );
        var u = this._panel
            .find('select[data-property="master-page"]')
            .empty()
            .append($("<option></option>")),
          p = -1,
          g = null;
        this._pages.forEach(function (e) {
          var t = e.getMasterPages();
          t.length && (null === g ? (g = t[0]) : g !== t[0] && (g = void 0));
        }),
          t.iteratePages((e) => {
            if (this._pages.indexOf(e) < 0) {
              p++;
              var t = $("<option></option>")
                .data("page", e)
                .attr("value", p)
                .text(e.getProperty("name"))
                .appendTo(u);
              g === e && t.prop("selected", !0);
            }
          }, !0),
          e &&
            (e.evtType === a.GEditor.ModifiedEvent.Type.Undo ||
              e.evtType === a.GEditor.ModifiedEvent.Type.Redo) &&
            e.chooserOn &&
            e.pagePattern &&
            this._panel
              .find('[data-property="bck"]')
              .find(".preview")
              .trigger(
                "click",
                null !== e.activeStopIdx ? e.activeStopIdx : null
              ),
          this.updatePropertiesAvailability(n);
      }),
      (_.prototype.updatePropertiesAvailability = function (e) {
        var t = e.getProperty("plkt"),
          n = e.isFixedSized(),
          o = !1;
        if (t && t & i.GBlock.ProgramLck.NoSizeChanges)
          this._panel.find('[data-property="bck"]').attr("disabled", !0),
            this._panel.find('input[data-property="bop"]').attr("disabled", !0),
            this._panel.find('input[data-property="w"]').attr("disabled", !0),
            this._panel.find('input[data-property="h"]').attr("disabled", !0),
            this._panel
              .find('button[data-property="rotate-canvas"]')
              .attr("disabled", !0),
            this._panel
              .find('select[data-property="preset-size"]')
              .attr("disabled", !0),
            this._panel
              .find('button[data-property="trim-canvas"]')
              .attr("disabled", !0),
            this._manageClipButtonState(!1, !1),
            this._panel.find('input[data-property="bl"]').attr("disabled", !0),
            this._panel.find('input[data-property="mt"]').attr("disabled", !0),
            this._panel.find('input[data-property="mb"]').attr("disabled", !0),
            this._panel.find('input[data-property="ml"]').attr("disabled", !0),
            this._panel.find('input[data-property="mr"]').attr("disabled", !0),
            this._panel.find("[data-lock-margin]").attr("disabled", !0),
            this._panel
              .find('select[data-property="master-page"]')
              .attr("disabled", !0);
        else {
          o = this._document && this._document.isDocumentFromTemplate();
          var a = e.getProperty("bck", !1, !1, !0),
            r = this._panel.find('select[data-property="preset-size"]'),
            s = r.find('option[value="' + r.val() + '"]').data("preset-id"),
            l = o && this._excludedPresets.includes(s);
          r.attr("disabled", l),
            this._panel.find('[data-property="bck"]').attr("disabled", !a),
            this._panel.find('input[data-property="bop"]').attr("disabled", !a),
            this._panel.find('input[data-property="w"]').attr("disabled", !1),
            this._panel.find('input[data-property="h"]').attr("disabled", !1),
            n
              ? this._panel
                  .find('button[data-property="rotate-canvas"]')
                  .attr("disabled", !1)
              : this._panel
                  .find('button[data-property="rotate-canvas"]')
                  .attr("disabled", !0),
            this._panel
              .find('button[data-property="trim-canvas"]')
              .attr("disabled", !1),
            this._manageClipButtonState(
              gDesigner.getWindows().getActiveWindow() &&
                gDesigner.getWindows().getActiveWindow().getView() &&
                gDesigner
                  .getWindows()
                  .getActiveWindow()
                  .getView()
                  .getViewConfiguration().paintMode ===
                  i.GScenePaintConfiguration.PaintMode.Output,
              n
            ),
            this._panel.find('input[data-property="bl"]').attr("disabled", !1),
            this._panel.find('input[data-property="mt"]').attr("disabled", !1),
            this._panel.find('input[data-property="mb"]').attr("disabled", !1),
            this._panel.find('input[data-property="ml"]').attr("disabled", !1),
            this._panel.find('input[data-property="mr"]').attr("disabled", !1),
            this._panel.find("[data-lock-margin]").attr("disabled", !1);
          var c = !1,
            d = e.getScene();
          d &&
            f.CDR_ORIGIN_PROPERTY_NAME &&
            (c = !!d.getProperty(f.CDR_ORIGIN_PROPERTY_NAME, !0)),
            this._panel
              .find('select[data-property="master-page"]')
              .attr("disabled", c)
              .attr("i18n", "text.plkt-no-size-changes");
        }
        var u =
          t && t & i.GBlock.ProgramLck.NoSizeChanges
            ? "text.plkt-no-size-changes"
            : "text.infinite-canvas-no-size-changes";
        this._panel
          .find("[data-title]:not([default-data-title])")
          .each(function () {
            const e = $(this);
            e.attr("default-data-title", e.attr("data-title") || "");
          }),
          this._panel.find(":disabled").each(function () {
            const e = $(this);
            l ||
              (e.attr("default-data-title", e.attr("default-data-title") || ""),
              e.attr(
                "data-title",
                i.GLocale.get(
                  new i.GLocaleKey("GCommonNames", e.attr("i18n") || u)
                ).replace("%name", e.attr("default-data-title") || "")
              ));
          }),
          this._panel
            .find(":not(:disabled)[default-data-title]")
            .removeAttr("data-title")
            .each(function () {
              const e = $(this);
              e.attr("default-data-title").length &&
                e.attr("data-title", e.attr("default-data-title"));
            });
        const p = (e) =>
          $("<div></div>")
            .addClass("tooltip-wrapper")
            .attr(
              "data-title",
              i.GLocale.get(
                new i.GLocaleKey("GCommonNames", (e && e.attr("i18n")) || u)
              )
            );
        this._panel.find(".tooltip-wrapper").remove(),
          this._panel.find("select:disabled").each(function () {
            l || p($(this)).insertAfter($(this));
          }),
          p().insertAfter(this._panel.find('[data-property="bck"][disabled]'));
      }),
      (_.prototype._manageClipButtonState = function (e, t) {
        this._clipContentButton &&
          (t || this._clipContentButton.hasClass("g-disabled")
            ? t &&
              (this._clipContentButton.hasClass("g-disabled") &&
                (this._clipContentButton.removeAttr("disabled"),
                this._clipContentButton.removeClass("g-disabled")),
              e
                ? this._clipContentButton.addClass("g-active")
                : this._clipContentButton.removeClass("g-active"))
            : (this._clipContentButton.attr("disabled", !0),
              this._clipContentButton.addClass("g-disabled"),
              this._clipContentButton.removeClass("g-active")));
      }),
      (_.prototype._assignProperty = function (e, t, n) {
        this._assignProperties([e], [t], n);
      }),
      (_.prototype._assignProperties = function (e, t, n, o, a) {
        this._ownChange = !0;
        var r = this._document.getEditor();
        r.beginTransaction();
        try {
          this._pages.forEach(function (n) {
            var o = e,
              r = t;
            a &&
              ((o = e.slice()),
              (r = t.slice()),
              n.getProperty("bck") instanceof i.GColor ||
                (o.push("bck"),
                r.push(i.GRGBColor.WHITE),
                o.push("bop"),
                r.push(1)));
            n.setProperties(o, r);
          });
        } finally {
          r.commitTransaction(n, o || null), (this._ownChange = !1);
        }
      }),
      (_.prototype.toString = function () {
        return "[Object GPageProperties]";
      }),
      (e.exports = _);
  }