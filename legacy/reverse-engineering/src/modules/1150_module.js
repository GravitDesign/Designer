/**
 * Webpack Module #1150
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(193),
      n(57),
      n(20),
      n(107),
      n(34),
      n(134),
      n(4),
      n(13),
      n(32),
      n(38),
      n(33);
    var o = n(53),
      i = n(1),
      a = n(15),
      r = n(40),
      s = n(67),
      l = n(1151),
      c = n(857),
      d = n(44);
    function u() {
      this.initLayout(),
        this._container.gOverlay({ releaseOnClose: !1, padding: !1 });
    }
    (u.ColorMode = { RGB: "rgb", HSV: "hsv", CMYK: "cmyk" }),
      (u._ColorModeToFrameworkColorMode = {
        [u.ColorMode.RGB]: i.GColor.ColorModes.RGB,
        [u.ColorMode.HSV]: i.GColor.ColorModes.HSB,
        [u.ColorMode.CMYK]: i.GColor.ColorModes.CMYK,
      }),
      (u.ColorModeLabel = { RGB: "RGB", HSV: "HSB", CMYK: "CMYK" }),
      (u.ColorModelFree = { RGB: !0 }),
      (u.ExtendedGamut = { COMPONENTS: "cp", COLOR_SLIDER: "cs", MAP: "map" }),
      (u.canDragSwatch = !1),
      (u.dragSwatch = null),
      (u.dragDeltaX = 0),
      (u.dragDeltaY = 0),
      (u.hasDropped = !1),
      (u.EXTEND_DRAG_RANGE = 50),
      i.GObject.inheritAndMix(u, i.GObject),
      (u.enableFileTypes = [
        { ext: "png", mime: "image/png" },
        { ext: "jpg", mime: "image/jpeg" },
        { ext: "jpeg", mime: "image/jpeg" },
        { ext: "gif", mime: "image/gif" },
      ]),
      (u.prototype._container = null),
      (u.prototype._toolbar = null),
      (u.prototype._settingsMenu = null),
      (u.prototype._rgbModeItem = null),
      (u.prototype._hsvModeItem = null),
      (u.prototype._cmykModeItem = null),
      (u.prototype._gradientEditor = null),
      (u.prototype._gradientActions = null),
      (u.prototype._colorEditor = null),
      (u.prototype._patternEditor = null),
      (u.prototype._noiseEditor = null),
      (u.prototype._colorMap = null),
      (u.prototype._colorSlider = null),
      (u.prototype._colorComponents = null),
      (u.prototype._systemColorInput = null),
      (u.prototype._colorPreview = null),
      (u.prototype._colorPreviewOld = null),
      (u.prototype._colorPreviewNew = null),
      (u.prototype._opacitySlider = null),
      (u.prototype._palettes = null),
      (u.prototype._activePalette = null),
      (u.prototype._swatchesScope = "user"),
      (u.prototype._colorMode = null),
      (u.prototype._oldColor = i.GRGBColor.BLACK),
      (u.prototype._color = i.GRGBColor.BLACK),
      (u.prototype._oldColorOpacity = 100),
      (u.prototype._colorOpacity = 100),
      (u.prototype._activeGradientStop = null),
      (u.prototype._activeGradient = null),
      (u.prototype._pattern = null),
      (u.prototype._patternUpdateBlocker = !1),
      (u.prototype._texture = null),
      (u.prototype._opacity = null),
      (u.prototype._settings = null),
      (u.prototype._isVisible = !1),
      (u.prototype._extendedGamutInitiated = null),
      (u.prototype._sliderColorThumb = null),
      (u.prototype._sliderOpacityThumb = null),
      (u.prototype._extValue = null),
      (u.prototype.getPattern = function () {
        return this._pattern;
      }),
      (u.prototype.setPattern = function (e) {
        this._updatePattern(e, "set_pattern");
      }),
      (u.prototype.getOpacity = function () {
        return this._opacity;
      }),
      (u.prototype.setOpacity = function (e) {
        this._updateOpacity(e, "set_opacity");
      }),
      (u.prototype.initLayout = function () {
        (this._container = $("<div/>")
          .addClass("pattern-chooser")
          .on(
            "close",
            function (e, t, n) {
              if (
                this._settings &&
                this._settings.onClose &&
                this._settings.onClose(this._pattern, this._opacity, t, n)
              ) {
                var i = gDesigner.getActiveDocument();
                i &&
                  (i
                    .getEditor()
                    .removeEventListener(
                      o.GEditor.ModifiedEvent,
                      this._closeIfNeeded,
                      this
                    ),
                  i.getEditor().keysOn([a.GKey.Constant.OPTION])),
                  gDesigner.getWorkspace().getStyleEdManager() &&
                    gDesigner
                      .getWorkspace()
                      .getStyleEdManager()
                      .isActivated() &&
                    gDesigner
                      .getWorkspace()
                      .getStyleEdManager()
                      .removeEventListener(
                        o.GStyleEdManager.EditorEvent,
                        this._styleEditorHandler,
                        this
                      );
              }
            }.bind(this)
          )),
          (this._toolbar = $("<div/>")
            .addClass("toolbar")
            .appendTo(this._container)),
          u.PATTERN_TYPES || (u.PATTERN_TYPES = u.initPatternType());
        var e = u.PATTERN_TYPES.map(u._createPatternOption);
        this._toolbar.append(
          $("<select></select>")
            .addClass("pattern-type-select")
            .append(e)
            .on("change", (e) => {
              var t = $(e.target).children("option:selected").data("type"),
                n = $(".colormode-selector")
                  .children("option:selected")
                  .data("colormode"),
                o = t.createDefault(this._pattern);
              null === o
                ? gDesigner.stats("patternchooser_change_type", "transparent")
                : o instanceof i.GBackground
                ? gDesigner.stats("patternchooser_change_type", "background")
                : o instanceof i.GTexturePattern
                ? gDesigner.stats("patternchooser_change_type", "texture")
                : o instanceof i.GNoisePattern
                ? gDesigner.stats("patternchooser_change_type", "noise")
                : o instanceof i.GRadialGradient
                ? gDesigner.stats(
                    "patternchooser_change_type",
                    "radialgradient"
                  )
                : o instanceof i.GLinearGradient
                ? gDesigner.stats(
                    "patternchooser_change_type",
                    "lineargradient"
                  )
                : o instanceof i.GAngularGradient
                ? gDesigner.stats(
                    "patternchooser_change_type",
                    "angulargradient"
                  )
                : o instanceof i.GColor &&
                  gDesigner.stats("patternchooser_change_type", "color"),
                this._updateOpacity(1),
                this._updatePattern(o, "set_type"),
                this._updateSwatchesPalette(
                  this._getSwatchScope("global", this._pattern)
                ),
                this._updateSwatchesPalette(
                  this._getSwatchScope("document", this._pattern)
                ),
                this.setColorMode(n),
                this._updateActiveGradient();
            })
        );
        var t = $("<select></select>").addClass("colormode-selector");
        Array.prototype.forEach.call(Object.keys(u.ColorMode), function (e) {
          $("<option></option>")
            .addClass("color-mode")
            .data("colormode", u.ColorMode[e])
            .text(u.ColorModeLabel[e])
            .appendTo(t)
            .gPro({ pro: !u.ColorModelFree[e], feature: e.toLowerCase() });
        }),
          t
            .on(
              "change",
              r.watchDog.trap(
                (e) => {
                  var t = $(e.target)
                    .children("option:selected")
                    .data("colormode");
                  u.ColorModelFree[(t || "").toUpperCase()]
                    ? gDesigner.stats("patternchooser_change_colormode", t)
                    : gDesigner.stats("patternchooser_change_procolormode", t);
                  var n =
                      gDesigner.getActiveDocument().getColorModeElms() || [],
                    o = gDesigner
                      .getActiveDocument()
                      .getEditor()
                      .getIndividualSelection();
                  o &&
                    (n.push(o[0]),
                    gDesigner.getActiveDocument().setColorModeElms(n)),
                    this.setColorMode(t),
                    this._updateActiveGradient();
                },
                (e) => {
                  var t = (
                    $(e.target).children("option:selected").data("colormode") ||
                    ""
                  ).toUpperCase();
                  return (
                    !!gDesigner.isEnabledProFeatures(t.toLowerCase()) ||
                    !!u.ColorModelFree[t]
                  );
                },
                (e) => {
                  var t = $(e.target)
                    .children("option:selected")
                    .data("colormode");
                  this.setColorMode(this._colorMode, !0),
                    gDesigner.stats(
                      "patternchooser_nonprotriespro_procolormode",
                      t
                    );
                }
              )
            )
            .appendTo(this._toolbar),
          (this._gradientEditor = $("<div/>")
            .addClass("gradient-editor")
            .append($("<div/>").addClass("stops"))
            .on(
              "mousedown",
              function (e) {
                var t = this._gradientEditor.offset(),
                  n = e.pageX - t.left,
                  o = {
                    position: n / this._gradientEditor.outerWidth(),
                    color: this._defineStopInitColor(n),
                    opacity: 1,
                  };
                this._activeGradient.getStops().push(o);
                var i = this._insertGradientStop(o);
                this._setActiveGradientStop(o),
                  this._updatePatternFromActiveGradient(),
                  this._updateOnlineEditorStops(),
                  i.trigger("mousedown");
              }.bind(this)
            )
            .appendTo(this._container)),
          (this._patternEditor = this._createPatternEditor().appendTo(
            this._container
          )),
          (this._noiseEditor = this._createNoiseEditor().appendTo(
            this._container
          )),
          (this._colorEditor = $("<div/>")
            .addClass("color-editor")
            .appendTo(this._container)),
          (this._systemColorInput = $("<input>")
            .attr("type", "color")
            .css({ position: "absolute", visibility: "hidden" })
            .on(
              "change",
              function (e) {
                this._updateColor(i.GRGBColor.fromCSSColor($(e.target).val()));
              }.bind(this)
            )
            .appendTo(this._colorEditor)),
          (this._colorMap = $("<div/>")
            .addClass("color-map")
            .append($("<canvas></canvas>"))
            .append(
              $("<div/>")
                .addClass("overlay")
                .on("mousedown touchstart", this._colorMapMouseDown.bind(this))
                .on("mousemove", function (e) {
                  e.originalEvent.isTrusted &&
                    (e.preventDefault(), e.stopPropagation());
                })
            )
            .append($("<div/>").addClass("marker"))
            .appendTo(this._colorEditor));
        var n = $("<div/>")
          .addClass("color-details")
          .appendTo(this._colorEditor);
        $("<div/>")
          .addClass("color-eyedropper g-flat eye-drop")
          .gEyeDropper()
          .on(
            "colorchange",
            function (e, t) {
              this._updateColor(new i.GRGBColor(t)),
                this._updateOpacity(t[3] / 255, "eyedropper");
            }.bind(this)
          )
          .appendTo(n);
        var s = $("<div/>").addClass("color-sliders").appendTo(n);
        (this._colorSlider = $("<div>")
          .gColorSlider()
          .css("box-sizing", "border-box")
          .on(
            "input",
            function () {
              this._updateColorFromColorSlider(!0);
            }.bind(this)
          )
          .on(
            "change",
            function () {
              gDesigner.stats("patternchooser_change_color-from-colorslider"),
                this._updateColorFromColorSlider();
            }.bind(this)
          )
          .appendTo(s)),
          (this._opacitySlider = $("<div/>")
            .gInputSlider(c.prototype.OPACITY_DEFAULT)
            .css("box-sizing", "border-box")
            .on(
              "input",
              function (e) {
                this._updateOpacity(
                  $(e.target).gInputSlider("value") / 100,
                  "slider",
                  !0
                );
              }.bind(this)
            )
            .on(
              "change",
              function (e) {
                gDesigner.stats("patternchooser_change_opacity"),
                  this._updateOpacity(
                    $(e.target).gInputSlider("value") / 100,
                    "slider",
                    !1,
                    !0
                  );
              }.bind(this)
            )
            .appendTo(s)),
          (this._sliderColorThumb = $(this._colorSlider)
            .find(".g-input-slider-thumb")
            .css("box-sizing", "border-box")),
          (this._sliderOpacityThumb = $(this._opacitySlider)
            .find(".g-input-slider-thumb")
            .css("box-sizing", "border-box"));
        var l = $("<div/>").addClass("color-preview-container").appendTo(n);
        (this._colorPreview = $("<div/>")
          .addClass("color-preview")
          .css("background", i.GPattern.asCSSBackground(null, 0))
          .appendTo(l)),
          (this._colorPreviewOld = $("<div/>")
            .addClass("color-preview-old")
            .appendTo(this._colorPreview)),
          (this._colorPreviewNew = $("<div/>")
            .addClass("color-preview-new")
            .appendTo(this._colorPreview)),
          $("<div/>")
            .addClass("color-preview-overlay")
            .appendTo(this._colorPreview),
          (this._colorComponents = $("<div/>")
            .addClass("color-components")
            .appendTo(this._colorEditor)),
          (this._gradientActions = $("<div/>")
            .addClass("gradient-actions")
            .append(
              $("<button />")
                .addClass("g-flat")
                .attr("data-action", "exchange")
                .attr(
                  "data-title",
                  i.GLocale.get(
                    new i.GLocaleKey(
                      "GPatternChooser",
                      "action.change-stops-order"
                    )
                  )
                )
                .on(
                  "click",
                  function () {
                    gDesigner.stats("patternchooser_change_stops-order");
                    for (
                      var e = this._activeGradient.getStops(), t = 0;
                      t < e.length;
                      ++t
                    )
                      (e[t].position = 1 - e[t].position),
                        this._updateGradientStop(e[t]);
                    this._updatePatternFromActiveGradient();
                  }.bind(this)
                )
                .append($("<span />").addClass("gravit-icon-exchange"))
            )
            .append(
              $("<div/>")
                .addClass("g-flat")
                .css("float", "right")
                .append(
                  $("<button />")
                    .addClass("g-flat")
                    .attr("data-action", "rotate-left")
                    .attr(
                      "data-title",
                      i.GLocale.get(
                        new i.GLocaleKey(
                          "GPatternChooser",
                          "action.rotate-gradient-left"
                        )
                      )
                    )
                    .on(
                      "click",
                      function () {
                        gDesigner.stats(
                          "patternchooser_rotate_gradient",
                          "left"
                        ),
                          this._rotateActiveGradient(-45);
                      }.bind(this)
                    )
                    .append($("<span />").addClass("gravit-icon-rotate-left"))
                )
                .append(
                  $("<button />")
                    .addClass("g-flat")
                    .attr("data-action", "rotate-right")
                    .attr(
                      "data-title",
                      i.GLocale.get(
                        new i.GLocaleKey(
                          "GPatternChooser",
                          "action.rotate-gradient-right"
                        )
                      )
                    )
                    .on(
                      "click",
                      function () {
                        gDesigner.stats(
                          "patternchooser_rotate_gradient",
                          "right"
                        ),
                          this._rotateActiveGradient(45);
                      }.bind(this)
                    )
                    .append($("<span />").addClass("gravit-icon-rotate-right"))
                )
            )
            .appendTo(this._container)),
          (this._palettes = $("<div/>")
            .addClass("palettes")
            .appendTo(this._container));
        var d = function (e) {
          var t = $(e.target).closest("[data-palette]").attr("data-palette");
          gDesigner.stats("patternchooser_activate_palette", t),
            this._activatePalette(t);
        }.bind(this);
        this._createChoosers(d).appendTo(this._palettes),
          this._createColorsPalette(
            $("<div/>")
              .attr("data-palette", "colors")
              .addClass("palette colors-palette")
              .appendTo(this._palettes)
          ),
          this._createMixerPalette(
            $("<div/>")
              .attr("data-palette", "mixer")
              .addClass("palette mixer-palette")
              .appendTo(this._palettes)
          ),
          $("<div/>")
            .attr("data-palette", "used")
            .addClass("palette used-palette")
            .appendTo(this._palettes);
        var p = $("<div/>")
          .attr("data-palette", "swatches")
          .addClass("palette swatches-palette global")
          .appendTo(this._palettes);
        const g = this._palettes
          .find(".chooser")
          .find("button[data-palette=swatches]")
          .hasClass("trial")
          ? " trial"
          : "";
        this._createSwatchesPalette(p, "global" + g),
          this._createSwatchesPalette(
            $("<div/>")
              .attr("data-palette", "swatches")
              .addClass("palette swatches-palette document")
              .appendTo(this._palettes),
            "document"
          ),
          (this._swatchesScope = this._getSwatchScope("global", this._pattern)),
          this._activatePalette("colors"),
          this._container.find("button").each(function (e, t) {
            $(t).on("mousedown", function (e) {
              e.preventDefault();
            });
          }),
          this.setColorMode(u.ColorMode.RGB);
      }),
      (u.prototype._createChoosers = function (e) {
        return $("<div/>")
          .addClass("chooser")
          .append(
            $("<button />")
              .attr("data-palette", "colors")
              .text(
                i.GLocale.get(new i.GLocaleKey("GCommonNames", "text.colors"))
              )
              .on("click", e)
          )
          .append(
            $("<button />")
              .gPro({ feature: "swatches" })
              .attr("data-palette", "swatches")
              .text(
                i.GLocale.get(
                  new i.GLocaleKey("GPatternChooser", "text.swatches")
                )
              )
              .on(
                "click",
                r.watchDog.trap(
                  e,
                  null,
                  () =>
                    gDesigner.stats(
                      "patternchooser_nonprotriespro_palette",
                      "swatches"
                    ),
                  "swatches"
                )
              )
          )
          .append(
            $("<button />")
              .attr("data-palette", "used")
              .text(
                i.GLocale.get(
                  new i.GLocaleKey("GPatternChooser", "text.in-use")
                )
              )
              .on("click", e)
          )
          .append(
            $("<button />")
              .attr("data-palette", "mixer")
              .text(
                i.GLocale.get(new i.GLocaleKey("GPatternChooser", "text.mixer"))
              )
              .on("click", e)
          );
      }),
      (u.prototype.__getColorModeParams = function () {
        return {
          hexWidth: "27%",
          isTouchEnabled: !1,
          rgbWidth: "15%",
          cmykWidth: "18%",
        };
      }),
      (u.prototype._updateActiveGradient = function () {
        if (this._activeGradient) {
          const e = this._activeGradient.getStops();
          if (e && e.length) {
            const t =
              u._ColorModeToFrameworkColorMode[this._colorMode] ||
              i.GColor.ColorModes.RGB;
            e.forEach((e) => {
              const n = i.GColorHelper.convertColor(e.color, t);
              n && (e.color = n), this._updateGradientStop(e);
            }),
              this._updatePatternFromActiveGradient();
          }
        }
      }),
      (u.prototype.setColorMode = function (e, t) {
        var n = this.__getColorModeParams();
        if (e !== this._colorMode || t) {
          this._colorMode = e;
          var o = null;
          if (
            (this._toolbar.find(".color-mode").each((t, n) => {
              var o = $(n),
                i = o.data("colormode");
              i && o.prop("selected", e === i);
            }),
            this._colorComponents.empty(),
            this._colorMode === u.ColorMode.RGB ||
              this._colorMode === u.ColorMode.HSV)
          ) {
            this._colorMap.css("display", ""),
              this._colorSlider.css("display", ""),
              this._colorEditor.toggleClass("cmyk-mode", !1),
              this._opacitySlider.toggleClass("cmyk-mode", !1),
              $("<label />")
                .css("width", n.hexWidth)
                .attr("data-css", "")
                .append(
                  $("<input>")
                    .attr("type", "text")
                    .attr("data-long-press-delay", "500")
                    .gInputBox({
                      keyIncrement: !1,
                      wheelIncrement: !1,
                      mousemoveIncrement: !1,
                    })
                    .on("long-press", (e) => {
                      n.isTouchEnabled &&
                        ((this._currentLongPressTarget = e.target),
                        this._contextMenu.open(e.target));
                    })
                    .on(
                      "change",
                      function (t) {
                        var n = i.GRGBColor.fromCSSColor($(t.target).val());
                        n || (n = this._color),
                          e === u.ColorMode.HSV &&
                            (n = new i.GHSVColor(
                              i.GColor.rgbToHSV(n.getValue())
                            )),
                          gDesigner.stats("patternchooser_update_color", e),
                          this._updateColor(n, null, !1, !0);
                      }.bind(this)
                    )
                    .on("paste keydown keyup", (e) => {
                      var t = $(e.target),
                        n = e.target,
                        o = t.val();
                      if ("keydown" === e.type) {
                        var i = /[0-9a-z\u017F\u212A]/i.test(
                          String.fromCharCode(e.keyCode || e.charCode)
                        );
                        if (
                          o.length >= 7 &&
                          i &&
                          n.selectionStart === n.selectionEnd
                        )
                          return !1;
                      }
                      o.startsWith("#") || ((o = "#" + o), t.val(o));
                      var a = /^#[0-9A-Za-z]{0,6}/.exec(o);
                      a && a[0] && o !== a[0] && t.val(a[0]);
                    })
                )
                .append(
                  $("<span />").text(
                    i.GLocale.get(
                      new i.GLocaleKey("GPatternChooser", "text.hex")
                    )
                  )
                )
                .appendTo(this._colorComponents),
              n.isTouchEnabled &&
                $("<div/>").css("width", "11%").appendTo(this._colorComponents);
            var a =
              this._colorMode === u.ColorMode.RGB
                ? ["R", "G", "B"]
                : ["H", "S", "B"];
            Array.prototype.forEach.call(
              a,
              function (e, t) {
                var o = 0;
                switch (e) {
                  case "R":
                  case "G":
                  case "B":
                    this._colorMode === u.ColorMode.RGB
                      ? (o = 255)
                      : this._colorMode === u.ColorMode.HSV && (o = 100);
                    break;
                  case "H":
                    o = 360;
                    break;
                  case "S":
                    o = 100;
                }
                $("<label />")
                  .css("width", n.rgbWidth)
                  .attr("data-component-index", t)
                  .append(
                    $("<input>")
                      .attr("type", "text")
                      .gInputBox({ minValue: 0, maxValue: o })
                  )
                  .append($("<span />").text(e))
                  .appendTo(this._colorComponents);
              }.bind(this)
            );
          } else
            this._colorMode === u.ColorMode.CMYK &&
              (this._colorMap.css("display", "none"),
              this._colorEditor.toggleClass("cmyk-mode", !0),
              this._opacitySlider.toggleClass("cmyk-mode", !0),
              this._colorSlider.css("display", "none"),
              Array.prototype.forEach.call(
                ["C", "M", "Y", "K"],
                function (e, t) {
                  $("<label />")
                    .addClass("cymk-label")
                    .css("width", n.cmykWidth)
                    .attr("data-component-index", t)
                    .append(
                      $("<input>")
                        .attr("type", "text")
                        .gInputBox({ minValue: 0, maxValue: 100, postfix: "%" })
                    )
                    .append($("<span />").text(e))
                    .appendTo(this._colorComponents);
                }.bind(this)
              ),
              this._color instanceof i.GCMYKColor ||
                (o = new i.GCMYKColor(
                  i.GColor.rgbToCMYK(this._color.toScreen())
                )));
          var r = this._updateColorFromColorComponents.bind(this);
          this._colorComponents
            .find("[data-component-index] input")
            .each(function (e, t) {
              $(t).on("change", () => {
                gDesigner.stats("patternchooser_change_colorinput"), r();
              });
            }),
            $("<label />")
              .css("width", "18%")
              .attr("data-opacity", "")
              .append(
                $("<input>")
                  .attr("type", "text")
                  .gInputBox({ minValue: 0, maxValue: 100, postfix: "%" })
                  .gInputBox(
                    "value",
                    i.GUtil.formatOpacity(100 * this._colorOpacity)
                  )
                  .on(
                    "change",
                    function (e) {
                      gDesigner.stats("patternchooser_change_opacity"),
                        this._updateOpacity(
                          i.GLength.parseEquationValue(
                            $(e.target).gInputBox("value")
                          ) / 100,
                          "input"
                        );
                    }.bind(this)
                  )
              )
              .append($("<span />").text("A"))
              .appendTo(this._colorComponents),
            this._updateColorMap(),
            o
              ? this._updateColor(o, "mode")
              : this._updateColorComponentsFromColor(),
            this._relayout();
        }
      }),
      (u.prototype.open = function (e, t) {
        this._updateSettings(t, !0),
          this._container.gOverlay("open", e),
          "used" === this._activePalette && this._updateUsedPalette(),
          gDesigner.getWorkspace().getStyleEdManager() &&
            gDesigner.getWorkspace().getStyleEdManager().isActivated() &&
            gDesigner
              .getWorkspace()
              .getStyleEdManager()
              .addEventListener(
                o.GStyleEdManager.EditorEvent,
                this._styleEditorHandler,
                this
              );
        var n = gDesigner.getActiveDocument();
        n &&
          (n
            .getEditor()
            .addEventListener(
              o.GEditor.ModifiedEvent,
              this._closeIfNeeded,
              this
            ),
          n.getEditor().keysOff([a.GKey.Constant.OPTION]));
      }),
      (u.prototype.close = function () {
        this._container.gOverlay("close");
      }),
      (u.prototype.isOpenned = function (e) {
        return this._container.gOverlay("isOpenned", e);
      }),
      (u.prototype.setActiveGradientStopByIdx = function (e) {
        if (this._activeGradient && null !== e) {
          var t = this._activeGradient.getStops();
          if (e >= 0 && e < t.length) {
            var n = t[e];
            this._setActiveGradientStop(n), this._updateOnlineEditorStops();
          }
        }
      }),
      (u.prototype._updateSettings = function (e, t) {
        this._settings = t
          ? $.extend({ types: [] }, e)
          : $.extend({ types: [] }, this._settings, e);
        const { types: n, singleOption: o } = this._settings;
        if (o) this._toolbar.css("display", "none");
        else {
          "none" === this._toolbar.css("display") &&
            this._toolbar.css("display", "");
          const e = [];
          for (let t = 0, o = u.PATTERN_TYPES.length; t < o; t++) {
            var i = u.PATTERN_TYPES[t],
              a = !n.length;
            if (!a)
              for (var r = 0; r < n.length; ++r)
                if (i.isCompatible(n[r])) {
                  a = !0;
                  break;
                }
            if (a) {
              var s = u._createPatternOption(i);
              e.push(s);
            }
          }
          this._toolbar.find(".pattern-type-select").empty().append(e);
        }
        this._opacitySlider.gInputSlider(
          "disabled",
          this._settings.hasOwnProperty("hasOpacity") &&
            !this._settings.hasOpacity
        ),
          this._patternEditor
            .find('[data-property="texture_mask"]')
            .prop("disabled", !this._settings.hasMask);
      }),
      (u.prototype._createNoiseEditor = function () {
        var e = $("<div/>").addClass("noise-editor");
        $("<div/>")
          .gPropertyRow({
            label: i.GLocale.get(
              new i.GLocaleKey("GPatternChooser", "text.intensity")
            ),
            columns: [
              {
                width: "auto",
                content: $("<div/>")
                  .attr("data-property", "noise_amount")
                  .gInputSlider({ min: 0, max: 100 })
                  .on(
                    "input",
                    function (t) {
                      var n = $(t.target),
                        o = parseFloat(n.gInputSlider("value")) / 100;
                      if (
                        (e
                          .find('[type="text"][data-property="noise_amount"]')
                          .gInputBox("value", i.GUtil.formatNumber(100 * o, 0)),
                        this._pattern)
                      ) {
                        var a = this._pattern.clone();
                        a.setAmount(o),
                          this._updatePattern(a, "noise_amount", null, !0);
                      }
                    }.bind(this)
                  )
                  .on(
                    "change",
                    function (e) {
                      if (
                        (gDesigner.stats("patternchooser_change_noise-amount"),
                        this._pattern)
                      ) {
                        var t = this._pattern.clone();
                        t.setAmount(
                          parseFloat($(e.target).gInputSlider("value")) / 100
                        ),
                          this._updatePattern(t, "noise_amount");
                      }
                    }.bind(this)
                  ),
              },
              {
                width: "40px",
                content: $("<input>")
                  .attr("data-property", "noise_amount")
                  .attr("type", "text")
                  .on(
                    "change",
                    function (e) {
                      if (
                        (gDesigner.stats(
                          "patternchooser_change_noise",
                          "amount"
                        ),
                        this._pattern)
                      ) {
                        var t = this._pattern.clone();
                        t.setAmount(
                          i.GLength.parseEquationValue(
                            $(e.target).gInputBox("value")
                          ) / 100
                        ),
                          this._updatePattern(t, "noise_amount");
                      }
                    }.bind(this)
                  )
                  .gInputBox({ minValue: 0, maxValue: 100, incrementValue: 1 }),
              },
            ],
          })
          .appendTo(e);
        var t, n, o;
        return (
          $("<div/>")
            .gPropertyRow({
              label: i.GLocale.get(
                new i.GLocaleKey("GPatternChooser", "text.type")
              ),
              columns: [
                {
                  width: "auto",
                  content: ((t = i.GNoisePattern.Type),
                  (n = "type"),
                  (o = $("<select></select>")),
                  (t = t || []),
                  Array.prototype.forEach.call(Object.keys(t), function (e) {
                    $("<option></option>")
                      .attr("value", t[e])
                      .text(
                        i.GLocale.get(
                          new i.GLocaleKey(
                            "GCommonNames",
                            "noise." + n + "." + t[e]
                          )
                        )
                      )
                      .appendTo(o);
                  }),
                  o)
                    .attr("data-property", "noise_type")
                    .on(
                      "change",
                      function (e) {
                        if (
                          (gDesigner.stats(
                            "patternchooser_change_noise",
                            "type"
                          ),
                          this._pattern)
                        ) {
                          var t = this._pattern.clone();
                          t.setType($(e.target).val()),
                            this._updatePattern(t, "noise_type");
                        }
                      }.bind(this)
                    ),
                },
              ],
            })
            .appendTo(e),
          e
        );
      }),
      (u.prototype._createPatternEditorFirstRow = function (e, t) {
        return [
          {
            padding: !1,
            content: $(
              "<button>" +
                i.GLocale.get(
                  new i.GLocaleKey("GPatternChooser", "action.choose-image")
                ) +
                "...</button>"
            )
              .addClass("pattern-choose-image-button")
              .on("click", e),
          },
          {
            width: "auto",
            content: $("<button />")
              .addClass("paste-btn")
              .addClass("g-flat")
              .append($("<span />").addClass("gravit-icon-paste"))
              .append(
                $("<span />")
                  .addClass("title")
                  .html(
                    i.GLocale.get(new i.GLocaleKey("GPasteAction", "title"))
                  )
              )
              .on("click", t),
          },
        ];
      }),
      (u.prototype._createPatternEditorMaskRow = function (e) {
        return [
          {
            padding: !1,
            width: "auto",
            content: $("<span />").text(
              i.GLocale.get(
                new i.GLocaleKey(
                  "GPatternChooser",
                  "action.set-transparency-mask"
                )
              )
            ),
          },
          {
            padding: !1,
            width: "40px",
            content: $("<label />")
              .addClass("g-switch")
              .append(
                $("<input>")
                  .attr("type", "checkbox")
                  .attr("data-property", "texture_mask")
                  .prop("disabled", !0)
                  .on("change", e)
              )
              .append($("<div/>")),
          },
        ];
      }),
      (u.prototype._createPatternEditorScaleRow = function (e, t, n) {
        return [
          {
            width: "auto",
            content: $("<div/>")
              .attr("data-property", "texture_tile")
              .gInputSlider({ min: 10, max: 200 })
              .on("input", e)
              .on("change", t),
          },
          {
            width: "40px",
            content: $("<input>")
              .attr("data-property", "texture_tile")
              .attr("type", "text")
              .on("change", n)
              .gInputBox({
                minValue: 10,
                maxValue: 200,
                incrementValue: 1,
                postfix: "%",
              }),
          },
        ];
      }),
      (u.prototype._createPatternEditorAdvancedRow = function (e) {
        return [
          {
            width: "auto",
            content: $(
              "<button>" +
                i.GLocale.get(
                  new i.GLocaleKey("GCommonNames", "text.advanced")
                ) +
                "</button>"
            ).on(
              "click",
              function () {
                gDesigner.stats("patternchooser_click_advanced"),
                  e.slideToggle();
              }.bind(this)
            ),
          },
        ];
      }),
      (u.prototype.__getCreatePatternEditorParams = function () {
        return {
          isTouchEnabled: !1,
          repeatWidth: "50%",
          ghostWidth: "0%",
          postionWith: "50%",
          sizeWidth: "52%",
          unitWidth: "10%",
        };
      }),
      (u.prototype._createPatternEditor = function () {
        var e = this.__getCreatePatternEditorParams(),
          t = $("<div/>").addClass("pattern-editor"),
          n = function (e, t) {
            var n = $("<select></select>");
            return (
              (e = e || []),
              Array.prototype.forEach.call(Object.keys(e), function (o) {
                $("<option></option>")
                  .attr("value", e[o])
                  .text(
                    i.GLocale.get(
                      new i.GLocaleKey(
                        "GCommonNames",
                        "texture." + t + "." + e[o]
                      )
                    )
                  )
                  .appendTo(n);
              }),
              n
            );
          },
          o = (e) => {
            gDesigner.stats("patternchooser_change_texture", "mask");
            var t = this._pattern.clone();
            t.setMask($(e.target).prop("checked")),
              this._updatePattern(t, "texture_mask");
          },
          a = (e) => {
            var n = $(e.target),
              o = n.attr("data-property"),
              a = parseFloat(n.gInputSlider("value")) / 100;
            if (
              (t
                .find('[type="text"][data-property="' + o + '"]')
                .gInputBox("value", i.GUtil.formatNumber(100 * a, 0)),
              this._pattern)
            ) {
              var r = this._pattern.clone();
              r.setTileSize(a),
                this._updatePattern(r, "texture_tile", null, !0);
            }
          },
          r = (e) => {
            if (
              (gDesigner.stats("patternchooser_change_texture", "tile"),
              this._pattern)
            ) {
              var t = this._pattern.clone();
              t.setTileSize(
                parseFloat($(e.target).gInputSlider("value")) / 100
              ),
                this._updatePattern(t, "texture_tile");
            }
          },
          s = (e) => {
            if (
              (gDesigner.stats("patternchooser_change_texture", "tile"),
              this._pattern)
            ) {
              var t = this._pattern.clone();
              t.setTileSize(
                i.GLength.parseEquationValue($(e.target).gInputBox("value")) /
                  100
              ),
                this._updatePattern(t, "texture_tile");
            }
          };
        $("<div/>")
          .addClass("choose-section")
          .append(
            $("<div/>")
              .addClass("pattern-preview-container")
              .append($("<div/>").addClass("pattern-preview"))
          )
          .append(
            $("<div/>")
              .addClass("pattern-info-container")
              .append(
                $("<div/>").gPropertyRow({
                  clazz: "first-row",
                  columns: this._createPatternEditorFirstRow(
                    () => {
                      gDesigner.stats("patternchooser_choose_image");
                      var e = gDesigner.getActiveDocument(),
                        t =
                          t ||
                          (e ? e.getStorage() : null) ||
                          gDesigner.getDefaultStorage();
                      t &&
                        t.canPromptOpen() &&
                        t.openPrompt(
                          u.enableFileTypes,
                          (e) => {
                            e.read((e) => {
                              var t = new FileReader();
                              (t.onload = () => {
                                var e,
                                  n = t.result;
                                this._pattern instanceof i.GTexturePattern
                                  ? (e = this._pattern.clone()).setTexture(n)
                                  : (e = new i.GTexturePattern(n)).setScene(
                                      gDesigner.getActiveDocument().getScene()
                                    ),
                                  this._updatePattern(e, "texture_upload");
                              }),
                                t.readAsDataURL(new Blob([e]));
                            });
                          },
                          !1
                        );
                    },
                    () => {
                      gDesigner.stats("patternchooser_paste_texture");
                      var e = !1,
                        t = i.GNode.deserialize(
                          gDesigner.getClipboardContent(i.GNode.MIME_TYPE)
                        );
                      if (t && t.length)
                        for (var n = 0; n < t.length; ++n) {
                          var o = t[n];
                          if (
                            o.hasMixin(i.GVertexSource) ||
                            o instanceof i.GGroup
                          ) {
                            if (this._pattern) {
                              var a = this._pattern.clone();
                              a.setTexture(o),
                                this._updatePattern(a, "texture_paste");
                            }
                            e = !0;
                            break;
                          }
                        }
                      e ||
                        window.alert(
                          i.GLocale.get(
                            new i.GLocaleKey(
                              "GCommonNames",
                              "arrow-paste.alert"
                            )
                          )
                        );
                    }
                  ),
                })
              )
              .append(
                $("<div/>").gPropertyRow({
                  columns: [
                    {
                      width: "100%",
                      content: n(i.GTexturePattern.ScaleMode, "scale")
                        .attr("data-property", "texture_scale")
                        .on(
                          "change",
                          function (e) {
                            if (this._pattern) {
                              var t = this._pattern.clone();
                              t.setScaleMode($(e.target).val()),
                                (0,
                                i.GTexturePattern.ScaleSettings[
                                  $(e.target).val()
                                ])(t),
                                gDesigner.stats(
                                  "patternchooser_change_texture",
                                  t.getScaleMode()
                                ),
                                this._updatePattern(t, "texture_pattern");
                            }
                          }.bind(this)
                        ),
                    },
                  ],
                })
              )
              .append(
                $("<div/>").gPropertyRow({
                  columns: e.isTouchEnabled
                    ? this._createPatternEditorMaskRow(o)
                    : this._createPatternEditorScaleRow(a, r, s),
                })
              )
          )
          .appendTo(t),
          $("<div/>")
            .addClass(e.isTouchEnabled ? "scale" : "")
            .gPropertyRow({
              columns: e.isTouchEnabled
                ? this._createPatternEditorScaleRow(a, r, s)
                : this._createPatternEditorMaskRow(o),
            })
            .appendTo(t);
        var l = $("<div/>").addClass("pattern-advanced-settings");
        return (
          $("<div/>")
            .gPropertyRow({ columns: this._createPatternEditorAdvancedRow(l) })
            .appendTo(t),
          $("<div/>")
            .gPropertyRow({
              columns: [
                {
                  label: i.GLocale.get(
                    new i.GLocaleKey("GPatternChooser", "text.repeat")
                  ),
                  width: e.repeatWidth,
                  content: n(i.GTexturePattern.RepeatMode, "repeat")
                    .attr("data-property", "texture_repeat")
                    .on(
                      "change",
                      function (e) {
                        if (
                          (gDesigner.stats(
                            "patternchooser_change_texture",
                            "repeat"
                          ),
                          this._pattern)
                        ) {
                          var t = this._pattern.clone();
                          t.setRepeatMode($(e.target).val()),
                            this._updatePattern(t, "texture_repeat");
                        }
                      }.bind(this)
                    ),
                },
                { width: e.ghostWidth },
                {
                  label: i.GLocale.get(
                    new i.GLocaleKey("GCommonNames", "text.position")
                  ),
                  width: e.postionWith,
                  content: n(i.GTexturePattern.PositionMode, "position")
                    .attr("data-property", "texture_position")
                    .on(
                      "change",
                      function (e) {
                        if (
                          (gDesigner.stats(
                            "patternchooser_change_texture",
                            "position"
                          ),
                          this._pattern)
                        ) {
                          var t = this._pattern.clone();
                          t.setPosition($(e.target).val()),
                            this._updatePattern(t, "texture_position");
                        }
                      }.bind(this)
                    ),
                },
              ],
            })
            .gPropertyRow({
              columns: [
                {
                  label: i.GLocale.get(
                    new i.GLocaleKey("GCommonNames", "text.size")
                  ),
                  width: e.sizeWidth,
                  content: n(i.GTexturePattern.SizeMode, "size")
                    .attr("data-property", "texture_size")
                    .on(
                      "change",
                      function (e) {
                        if (
                          (gDesigner.stats(
                            "patternchooser_change_texture",
                            "size"
                          ),
                          this._pattern)
                        ) {
                          var t = this._pattern.clone();
                          t.setSizeMode($(e.target).val()),
                            this._updatePattern(t, "texture_size");
                        }
                      }.bind(this)
                    ),
                },
                { width: e.ghostWidth },
                {
                  label: i.GLocale.get(
                    new i.GLocaleKey("GCommonNames", "text.width")
                  ),
                  width: "20%",
                  content: $("<input>")
                    .attr("data-property", "texture_size_w")
                    .attr("type", "text")
                    .on(
                      "change",
                      function (e) {
                        if (
                          (gDesigner.stats(
                            "patternchooser_change_texture",
                            "size"
                          ),
                          this._pattern)
                        ) {
                          var t = i.GLength.parseEquationValue(
                            $(e.target).val()
                          );
                          if (null !== t && t >= 0) {
                            var n = this._pattern.clone();
                            n.setWidth(t),
                              this._updatePattern(n, "texture_size");
                          }
                        }
                      }.bind(this)
                    )
                    .gInputBox(),
                },
                {
                  label: i.GLocale.get(
                    new i.GLocaleKey("GCommonNames", "text.height")
                  ),
                  width: "20%",
                  content: $("<input>")
                    .attr("data-property", "texture_size_h")
                    .attr("type", "text")
                    .on(
                      "change",
                      function (e) {
                        if (
                          (gDesigner.stats(
                            "patternchooser_change_texture",
                            "size-h"
                          ),
                          this._pattern)
                        ) {
                          var t = i.GLength.parseEquationValue(
                            $(e.target).val()
                          );
                          if (null !== t && t >= 0) {
                            var n = this._pattern.clone();
                            n.setHeight(t),
                              this._updatePattern(n, "texture_size");
                          }
                        }
                      }.bind(this)
                    )
                    .gInputBox(),
                },
                {
                  label: e.isTouchEnabled
                    ? ""
                    : i.GLocale.get(
                        new i.GLocaleKey("GCommonNames", "text.unit")
                      ),
                  width: e.unitWidth,
                  content: $("<label />").attr(
                    "data-property",
                    "texture_size_u"
                  ),
                },
              ],
            })
            .appendTo(l),
          l.appendTo(t),
          t
        );
      }),
      (u.prototype.__getCreatePaletteSwatchParamas = function () {
        return { isTouchEnabled: !1 };
      }),
      (u.prototype._findOrCreateLastSwitchContiner = function (e) {
        var t = e.find(".swatches:last");
        t.length > 0
          ? t.find(".swatch").length >= 8 &&
            (t = $("<div/>").addClass("swatches").appendTo(e))
          : (t = $("<div/>").addClass("swatches").appendTo(e));
        return t;
      }),
      (u.prototype._createPaletteSwatch = function (e, t, n, o) {
        var r = this.__getCreatePaletteSwatchParamas(),
          s = e instanceof i.GSwatch ? e : new i.GSwatch(e),
          l = t;
        r.isTouchEnabled &&
          (l = o
            ? $("<div/>").addClass("swatches").appendTo(t)
            : this._findOrCreateLastSwitchContiner(t));
        var c = function (e) {
            if (!u.canDragSwatch)
              return e.preventDefault(), void e.stopPropagation();
            var t = $(e.target).closest(".swatch"),
              n = t.offset(),
              o = e.originalEvent;
            o.stopPropagation(),
              (u.dragSwatch = t),
              (u.hasDropped = !1),
              (u.dragDeltaX = o.pageX - n.left),
              (u.dragDeltaY = o.pageY - n.top),
              (o.dataTransfer.effectAllowed = "move"),
              o.dataTransfer.setData("text/plain", "dummy_data");
          }.bind(this),
          d = function (e) {
            var t = e.originalEvent;
            t.stopPropagation(), l.find(".grid-drag-overlay").remove();
            var n = !1,
              o = $(".pattern-chooser"),
              a = o.offset().top,
              r = o.offset().left,
              s = r + o.width(),
              c = a + o.height(),
              d = t.pageX,
              p = t.pageY;
            if (
              ((d > s || d < r || p > c || p < a) && (n = !0),
              u.dragSwatch && n)
            ) {
              var g = gDesigner.getActiveDocument().getEditor();
              g.beginTransaction();
              try {
                var h = u.dragSwatch.data("swatch"),
                  f = this._getSwatchScope(
                    u.dragSwatch.closest(".swatches-wrapper").hasClass("global")
                      ? "global"
                      : "document",
                    h.getProperty("_pt")
                  ),
                  m = gDesigner.getSwatches(f);
                if (h && m) {
                  for (var y = 0; y < m.length; ++y)
                    if (i.GUtil.equals(h, m[y])) {
                      (m = m.slice()).splice(y, 1);
                      break;
                    }
                  gDesigner.setSwatches(f, m);
                }
              } finally {
                g.commitTransaction(
                  i.GLocale.get(
                    new i.GLocaleKey("GPatternChooser", "action.remove-swatch")
                  ),
                  { chooserOn: !0 }
                );
              }
            }
            u.hasDropped = !1;
          }.bind(this),
          p = s.getProperty("_pt");
        const g =
          p instanceof i.GTexturePattern && !(p instanceof i.GNoisePattern);
        gDesigner.getActiveDocument() && g && (p = this._clonePattern(p));
        var h = s.getProperty("_op"),
          f = $("<div/>")
            .addClass("swatch")
            .css("background", i.GPattern.asCSSBackground(p, h))
            .data("swatch", s)
            .attr("draggable", n)
            .attr("data-long-press-delay", "500")
            .on("long-press", (e) => {
              r.isTouchEnabled &&
                ((this._currentLongPressTarget = e.target),
                this._contextMenu.open(e.target));
            })
            .on(
              "click",
              function (e) {
                gDesigner.stats("patternchooser_click_swatch");
                var t = $(e.target).closest(".swatch").data("swatch"),
                  n = t.getProperty("_pt"),
                  o = t.getProperty("_op"),
                  r = $(".colormode-selector")
                    .children("option:selected")
                    .data("colormode");
                if (a.GPlatform.modifiers.optionKey) {
                  var s = gDesigner
                    .getActiveDocument()
                    .getEditor()
                    .selectFromPattern(n, !0);
                  if (s) {
                    $(".g-overlay .pattern-chooser").length > 0 &&
                      $(".g-overlay .pattern-chooser").gOverlay("close"),
                      gDesigner
                        .getActiveDocument()
                        .getEditor()
                        .updateSelection(!1, s),
                      gDesigner
                        .getActiveDocument()
                        .getEditor()
                        .blinkSelection(2e3, 4);
                    for (
                      var l = $(
                          ".fill-properties-panel .g-pattern-chooser .preview"
                        ),
                        c = 0;
                      c < l.length;
                      ++c
                    )
                      if (
                        $(l[c]).data("gpatterntarget") &&
                        i.GUtil.equals(
                          $(l[c]).data("gpatterntarget").pattern,
                          n
                        )
                      ) {
                        $(l[c]).trigger("click");
                        break;
                      }
                  }
                } else
                  this._updateOpacity(o),
                    this._updatePattern(n, "set_type", !0);
                this.setColorMode(r);
              }.bind(this)
            )
            .appendTo(l);
        if (
          (s.isCMYK() && this._addCmykIcon(f),
          n &&
            f
              .on("mousedown", function (e) {
                u.canDragSwatch = $(e.target).hasClass("swatch");
              })
              .on("dragenter", function () {
                (function (e) {
                  let t = u.dragSwatch
                      .closest(".swatches-wrapper")
                      .hasClass("global"),
                    n = e.closest(".swatches-wrapper").hasClass("global"),
                    o =
                      u.dragSwatch.data("swatch").isCMYK() ===
                      e.data("swatch").isCMYK();
                  return !(!((t && n) || (!t && !n)) || !o);
                })($(this)) && $(this).addClass("g-drop");
              })
              .on("dragleave", function () {
                $(this).removeClass("g-drop");
              })
              .on("dragstart", c)
              .on("dragend", d)
              .on("dragover", function (e) {
                e.preventDefault();
              })
              .on(
                "drop",
                function () {
                  l.find(".grid-drag-overlay").remove();
                  var e = u.dragSwatch
                    .closest(".swatches-wrapper")
                    .find(".g-drop");
                  if ((e.removeClass("g-drop"), u.dragSwatch && e.length > 0)) {
                    var t = u.dragSwatch.data("swatch"),
                      n = $(e).data("swatch"),
                      o = this._getSwatchScope(
                        u.dragSwatch
                          .closest(".swatches-wrapper")
                          .hasClass("global")
                          ? "global"
                          : "document",
                        t.getProperty("_pt")
                      ),
                      a = gDesigner.getSwatches(o),
                      r = -1,
                      s = -1;
                    if (t && a && n) {
                      for (var c = 0; c < a.length; ++c)
                        i.GUtil.equals(t, a[c])
                          ? (r = c)
                          : i.GUtil.equals(n, a[c]) && (s = c);
                      r > -1 &&
                        s > -1 &&
                        ((a = a.slice()).splice(r, 1), a.splice(s, 0, t)),
                        gDesigner.setSwatches(o, a);
                    }
                  }
                }.bind(this)
              ),
          g && !p.isReady())
        ) {
          const e = () => {
            p.isReady() &&
              (f.css("background", i.GPattern.asCSSBackground(p, h)),
              p.removeEventListener(i.GTexturePattern.UpdateEvent, e));
          };
          p.addEventListener(i.GTexturePattern.UpdateEvent, e);
        }
      }),
      (u.prototype._addCmykIcon = function (e) {
        e.append(
          $("<div/>")
            .addClass("cmyk-swatch")
            .append($("<div/>").addClass("cmyk-icon c"))
            .append($("<div/>").addClass("cmyk-icon m"))
            .append($("<div/>").addClass("cmyk-icon y"))
            .append($("<div/>").addClass("cmyk-icon k"))
        );
      }),
      (u.prototype.__getCreateColorsPaletteParams = function () {
        return { isTouchEnabled: !1 };
      }),
      (u.prototype._createColorsPalette = function (e) {
        var t = this.__getCreatePaletteSwatchParamas(),
          n = $("<div/>").addClass("swatches").appendTo(e);
        t.isTouchEnabled && (n = e);
        var o = [0, 0, 0],
          a = [255, 255, 255];
        this._createPaletteSwatch(new i.GRGBColor(o), n, !1, !1);
        for (var r = 1; r <= 10; r += 1)
          this._createPaletteSwatch(
            new i.GRGBColor(i.GRGBColor.blend(o, a, r * (1 / 11))),
            n,
            !1,
            !1
          );
        this._createPaletteSwatch(new i.GRGBColor(a), n, !1, !1);
        var s = [
            [152, 0, 0],
            [255, 0, 0],
            [255, 153, 0],
            [255, 255, 0],
            [0, 255, 0],
            [0, 255, 255],
            [0, 150, 136],
            [96, 125, 139],
            [74, 134, 232],
            [0, 0, 255],
            [153, 0, 255],
            [255, 0, 255],
          ],
          l = [];
        for (let n = -1; n < l.length; ++n) {
          var c = e;
          t.isTouchEnabled ||
            (c = $("<div/>").addClass("swatches").appendTo(e));
          var d = null,
            u = 0;
          n >= 0 && ((d = l[n].color), (u = l[n].factor));
          for (let e = 0; e < s.length; ++e) {
            var p = s[e],
              g = d ? i.GRGBColor.blend(p, d, u) : p;
            this._createPaletteSwatch(new i.GRGBColor(g), c, !1, !1);
          }
        }
      }),
      (u.prototype._createMixerPalette = function (e) {
        for (
          var t = $("<div/>")
              .attr("data-container", "tints")
              .addClass("swatches")
              .append(
                $("<label />").text(
                  i.GLocale.get(
                    new i.GLocaleKey("GPatternChooser", "text.tints")
                  )
                )
              )
              .appendTo(e),
            n = $("<div/>")
              .attr("data-container", "shades")
              .append(
                $("<label />").text(
                  i.GLocale.get(
                    new i.GLocaleKey("GPatternChooser", "text.shades")
                  )
                )
              )
              .addClass("swatches")
              .appendTo(e),
            o = $("<div/>")
              .attr("data-container", "tones")
              .append(
                $("<label />").text(
                  i.GLocale.get(
                    new i.GLocaleKey("GPatternChooser", "text.tones")
                  )
                )
              )
              .addClass("swatches")
              .appendTo(e),
            a = $("<div/>")
              .attr("data-container", "mixes")
              .append(
                $("<label />").text(
                  i.GLocale.get(
                    new i.GLocaleKey("GPatternChooser", "text.mixes")
                  )
                )
              )
              .addClass("swatches")
              .appendTo(e),
            r = 1;
          r <= 10;
          r += 1
        )
          this._createPaletteSwatch(i.GRGBColor.WHITE, t),
            this._createPaletteSwatch(i.GRGBColor.WHITE, n),
            this._createPaletteSwatch(i.GRGBColor.WHITE, o),
            this._createPaletteSwatch(i.GRGBColor.WHITE, a);
        this._updateMixerPalette();
      }),
      (u.prototype.__getUpdateMixerPaletteParams = function () {
        return { maxCount: 10 };
      }),
      (u.prototype._updateMixerPalette = function () {
        var e = this.__getUpdateMixerPaletteParams();
        function t(e, t, n) {
          $(t[n])
            .css("background", i.GPattern.asCSSBackground(e))
            .data("swatch", new i.GSwatch(e));
        }
        for (
          var n = [255, 255, 255],
            o = [0, 0, 0],
            a = [128, 128, 128],
            r = this._color.toScreen(),
            s = this._palettes.find(
              '.mixer-palette [data-container="tints"] .swatch'
            ),
            l = this._palettes.find(
              '.mixer-palette [data-container="shades"] .swatch'
            ),
            c = this._palettes.find(
              '.mixer-palette [data-container="tones"] .swatch'
            ),
            d = this._palettes.find(
              '.mixer-palette [data-container="mixes"] .swatch'
            ),
            u = 0;
          u < e.maxCount;
          u += 1
        ) {
          var p = (u + 1) / (1 * e.maxCount);
          t(new i.GRGBColor(i.GRGBColor.blend(r, n, p)), s, u),
            t(new i.GRGBColor(i.GRGBColor.blend(r, o, p)), l, u),
            t(new i.GRGBColor(i.GRGBColor.blend(r, a, p)), c, u),
            t(
              new i.GRGBColor(
                i.GRGBColor.blend(r, this._oldColor.toScreen(), p)
              ),
              d,
              u
            );
        }
      }),
      (u.prototype.__getCreateUsedPaletteParams = function () {
        return { isTouchEnabled: !1, maxCount: 12 };
      }),
      (u.prototype._createUsedPalette = function (e) {
        var t = this.__getCreateUsedPaletteParams();
        let n;
        t.isTouchEnabled || (n = $("<div/>").addClass("swatches").appendTo(e));
        for (var o = 0; o < t.maxCount; o += 1)
          this._createPaletteSwatch(
            i.GRGBColor.WHITE,
            t.isTouchEnabled ? e : n,
            !1,
            !1
          );
      }),
      (u.prototype._updateUsedPalette = function () {
        var e = gDesigner.getActiveDocument()
          ? gDesigner.getActiveDocument().getDocumentColors()
          : [];
        $(".palettes > .used-palette").empty(),
          this._createUsedPalette($(".palettes > .used-palette"));
        for (var t = 12, n = 0; n < t; n += 1) {
          var o = n < e.length,
            a = o ? e[n] : null,
            r = this._palettes.find(".used-palette .swatches .swatch")[n],
            s = new i.GSwatch(a);
          o &&
            $(r)
              .css("background", i.GPattern.asCSSBackground(a))
              .data("swatch", s),
            $(r).css("display", o ? "" : "none"),
            s.isCMYK() && this._addCmykIcon($(r)),
            n % 11 == 0 &&
              o &&
              ((t += 12),
              this._createUsedPalette($(".palettes > .used-palette")));
        }
      }),
      (u.prototype._createSwatchesPalette = function (e, t) {
        var n = $("<span/>").text(
            "global" === t
              ? i.GLocale.get(new i.GLocaleKey("GCommonNames", "text.global"))
              : i.GLocale.get(new i.GLocaleKey("GCommonNames", "text.document"))
          ),
          o = $("<div/>").addClass("swatches-wrapper").addClass(t),
          a = $("<div/>")
            .addClass("toolbar")
            .addClass(t)
            .append(n)
            .append(
              $("<button/>")
                .append("<span/>")
                .attr(
                  "data-title",
                  i.GLocale.get(
                    new i.GLocaleKey("GCommonNames", "text.import-swatches")
                  )
                )
                .addClass("swatch-icon")
                .addClass("gravit-icon-swatches-import")
                .on("click", () => {
                  gDesigner.stats("patternchooser_import_swatches"),
                    gDesigner.importSwatches(t);
                })
            )
            .append(
              $("<button/>")
                .append("<span/>")
                .attr(
                  "data-title",
                  i.GLocale.get(
                    new i.GLocaleKey("GCommonNames", "text.export-swatches")
                  )
                )
                .addClass("swatch-icon")
                .addClass("gravit-icon-swatches-export")
                .on("click", () => {
                  gDesigner.stats("patternchooser_export_swatches"),
                    gDesigner.exportSwatches(t);
                })
            )
            .appendTo(e);
        o.appendTo(e), a.gAccordion(o, "span", !1);
      }),
      (u.prototype._getSwatchScope = function (e, t) {
        return t && t instanceof i.GLinearGradient
          ? e + "-linear-gradient"
          : t && t instanceof i.GRadialGradient
          ? e + "-radial-gradient"
          : t && t instanceof i.GAngularGradient
          ? e + "-angular-gradient"
          : t &&
            t instanceof i.GTexturePattern &&
            !(t instanceof i.GNoisePattern)
          ? e + "-texture-pattern"
          : t && t instanceof i.GNoisePattern
          ? e + "-noise-pattern"
          : e;
      }),
      (u.prototype.__getUpdateSwatchesPaletteParams = function () {
        return { isTouchEnabled: !1 };
      }),
      (u.prototype._updateSwatchesPalette = function (e) {
        var t = this.__getUpdateSwatchesPaletteParams(),
          n = e.indexOf("-") > 0,
          o = this._palettes
            .find(
              ".swatches-palette .swatches-wrapper." +
                (n ? e.substring(0, e.indexOf("-")) : e)
            )
            .empty(),
          a = gDesigner.getSwatches(e);
        if (!a)
          return void $("<div/>")
            .addClass("info")
            .text(
              i.GLocale.get(
                new i.GLocaleKey("GPatternChooser", "text.error-on-loading")
              )
            )
            .appendTo(o);
        var r = [],
          s = [];
        for (let e = 0; e < a.length; ++e)
          a[e].isCMYK() ? s.push(a[e]) : r.push(a[e]);
        r = r.concat(s);
        let l = null;
        var c = 1;
        if (!t.isTouchEnabled && r.length)
          for (let e = 0; e < r.length; ++e)
            l || (l = $("<div/>").addClass("swatches").appendTo(o)),
              this._createPaletteSwatch(r[e], l, !0, !1),
              14 == ++c && ((c = 1), (l = null));
        if (
          (l || (l = $("<div/>").addClass("swatches").appendTo(o)),
          $("<button />")
            .addClass(
              t.isTouchEnabled ? "add-button swatch-button" : "swatch-button"
            )
            .addClass("g-flat")
            .attr(
              "data-title",
              i.GLocale.get(
                new i.GLocaleKey("GPatternChooser", "action.add-swatch")
              )
            )
            .append($('<span class="gravit-icon-plus"/>'))
            .on(
              "click",
              function () {
                gDesigner.stats("patternchooser_add_swatch", e);
                var t = new i.GSwatch(this._pattern, this._opacity),
                  n = gDesigner.getSwatches(e);
                if (n) {
                  for (var o = 0; o < n.length; ++o)
                    if (i.GUtil.equals(t, n[o], !0))
                      return void d.alert(
                        i.GLocale.get(
                          new i.GLocaleKey(
                            "GPatternChooser",
                            "text.equal-swatch-alert"
                          )
                        )
                      );
                  n.push(t), gDesigner.setSwatches(e, n);
                }
              }.bind(this)
            )
            .appendTo(l),
          t.isTouchEnabled && ((l = null), r.length))
        )
          for (var u = 0; u < r.length; ++u)
            this._createPaletteSwatch(r[u], o, !0, 7 === u);
        this._updateActiveSwatch(n ? e.substring(0, e.indexOf("-")) : e);
      }),
      (u.prototype._updateActiveSwatch = function (e) {
        if ("swatches" === this._activePalette) {
          var t = this._palettes.find(".swatches-palette." + e),
            n = !1;
          t.find(".swatches-wrapper .swatches .swatch").each(
            function (e, t) {
              var o = $(t),
                a = i.GUtil.equals(
                  o.data("swatch"),
                  new i.GSwatch(this._pattern, this._opacity),
                  !0
                );
              a && (n = !0), o.data("isActive", a).toggleClass("g-active", a);
            }.bind(this)
          ),
            t.find(".toolbar button[data-active-swatch]").each(function (e, t) {
              $(t).prop("disabled", !n);
            });
        }
      }),
      (u.prototype._swatchesChanged = function (e) {
        this._updateSwatchesPalette(e.scope);
      }),
      (u.prototype._activatePalette = function (e) {
        if (e !== this._activePalette) {
          switch (this._activatePalette) {
            case "swatches":
              gDesigner.removeEventListener(l, this._swatchesChanged, this);
          }
          switch (
            (this._palettes
              .find(".chooser [data-palette]")
              .each(function (t, n) {
                var o = $(n);
                o.toggleClass("g-active", o.attr("data-palette") === e);
              }),
            this._palettes.find(".palette").each(function (t, n) {
              var o = $(n);
              o.css("display", o.attr("data-palette") === e ? "" : "none");
            }),
            e)
          ) {
            case "mixer":
              this._updateMixerPalette();
              break;
            case "used":
              this._updateUsedPalette();
              break;
            case "swatches":
              this._updateSwatchesPalette(
                this._getSwatchScope("global", this._pattern)
              ),
                this._updateSwatchesPalette(
                  this._getSwatchScope("document", this._pattern)
                ),
                gDesigner.addEventListener(l, this._swatchesChanged, this);
          }
          (this._activePalette = e), this._relayout();
        }
      }),
      (u.prototype._setActiveGradientStop = function (e, t, n) {
        (e !== this._activeGradientStop || n) &&
          ((this._activeGradientStop = e),
          this._activeGradientStop &&
            (this._updateColor(
              t || this._activeGradientStop.color,
              n ? "" : "gradient-stop"
            ),
            this._updateOpacity(
              this._activeGradientStop.opacity,
              "gradient-stop"
            ),
            Array.prototype.forEach.call(
              this._activeGradient.getStops(),
              function (e) {
                this._updateGradientStop(e);
              }.bind(this)
            )));
      }),
      (u.prototype._updateOnlineEditorStops = function () {
        if (
          gDesigner.getWorkspace().getStyleEdManager() &&
          gDesigner.getWorkspace().getStyleEdManager().isActivated()
        ) {
          var e = null;
          this._activeGradientStop &&
            this._activeGradient &&
            Array.prototype.forEach.call(
              this._activeGradient.getStops(),
              function (t, n) {
                t === this._activeGradientStop && (e = n);
              }.bind(this)
            );
          var t = gDesigner
              .getWorkspace()
              .getStyleEdManager()
              .getActiveEditor(),
            n = null;
          null !== e &&
            t &&
            (n = { type: o.GGradientStyleEditor.STOP_HANDLE_PART_ID, idx: e }),
            t && t.updatePartSelection(!1, n ? [n] : null, !0);
        }
      }),
      (u.prototype._insertGradientStop = function (e) {
        var t = this._gradientEditor.find(".stops"),
          n = t.width(),
          o = t.height(),
          a = t.offset(),
          r = null,
          s = function (t, i) {
            var s = Math.max(0, Math.min(n, Math.round(t.pageX - a.left)));
            t.pageY < a.top - u.EXTEND_DRAG_RANGE ||
            t.pageY > a.top + o + u.EXTEND_DRAG_RANGE
              ? this._activeGradient.getStops().length >= 3 &&
                (r.css("display", "none"), (e.remove = !0))
              : (r.css("display", ""), (e.remove = !1)),
              (e.position = s / n),
              this._updateGradientStop(e),
              this._updatePatternFromActiveGradient(!i);
          }.bind(this),
          l = function (t) {
            if (
              (s(t, !0),
              t.stopPropagation(),
              document.removeEventListener("mouseup", l, !0),
              document.removeEventListener("mousemove", s, !0),
              e.remove)
            ) {
              var n = this._activeGradient.getStops(),
                o = n.indexOf(e);
              n.splice(o, 1);
            }
          }.bind(this);
        return (
          (r = $("<div/>")
            .addClass("stop")
            .data("stop", e)
            .on(
              "mousedown",
              function (t) {
                t.stopPropagation(),
                  this._setActiveGradientStop(e),
                  this._updateOnlineEditorStops(),
                  document.addEventListener("mouseup", l, !0),
                  document.addEventListener("mousemove", s, !0);
                var n = this._activeGradient.getStops()[0].color;
                n instanceof i.GCMYKColor
                  ? this.setColorMode(u.ColorMode.CMYK)
                  : n instanceof i.GHSVColor
                  ? this.setColorMode(u.ColorMode.HSV)
                  : n instanceof i.GRGBColor &&
                    this.setColorMode(u.ColorMode.RGB);
              }.bind(this)
            )
            .appendTo(t)),
          this._updateGradientStop(e),
          r
        );
      }),
      (u.prototype.__getUpdateGradientStopParams = function () {
        return { isTouchEnabled: !1 };
      }),
      (u.prototype._updateGradientStop = function (e) {
        var t = this.__getUpdateGradientStopParams(),
          n = this._gradientEditor.find(".stops"),
          o = n.width();
        n.find(".stop").each(
          function (n, i) {
            var a = $(i);
            if (a.data("stop") === e) {
              a.toggleClass("g-active", e === this._activeGradientStop),
                t.isTouchEnabled &&
                  (e === this._activeGradientStop
                    ? (a.css("background", e.color.toScreenCSS(e.opacity)),
                      a.css("border", "2px solid #FFFFFF"))
                    : (a.css("background", "transparent"),
                      a.css("border", "2px solid transparent")));
              var r = Math.round(e.position * o),
                s = a.outerWidth() / 2 + 1;
              r < s
                ? t.isTouchEnabled || (r = s)
                : r > o - s && (t.isTouchEnabled || (r = o - s)),
                a.css("left", r + "px");
            }
          }.bind(this)
        );
      }),
      (u.prototype._updatePatternFromActiveGradient = function (e) {
        if (this._activeGradient) {
          this._activeGradient.sortStops();
          var t = this._activeGradient.clone(),
            n = t.getStops();
          Array.prototype.forEach.call(
            this._activeGradient.getStops(),
            function (e, t) {
              e.remove && n.splice(t, 1);
            }
          ),
            this._updatePattern(t, "gradient", null, e);
        }
      }),
      (u.prototype._rotateActiveGradient = function (e) {
        var t = i.GMath.toRadians(e),
          n = new i.GPoint(this._activeGradient._fx, this._activeGradient._fy);
        (n = n.rotatedAt(t, new i.GPoint(0.5, 0.5))),
          (this._activeGradient._fx = n.getX()),
          (this._activeGradient._fy = n.getY()),
          (this._activeGradient._angle = this._activeGradient._angle + t),
          this._updatePatternFromActiveGradient();
      }),
      (u.prototype._updateTexture = function (e) {
        i.GUtil.equals(e, this._texture) || (this._texture = e);
      }),
      (u.prototype.__getUpdateColorParams = function () {
        return { isTouchEnabled: !1 };
      }),
      (u.prototype._updateColor = function (e, t, n, o) {
        var a = this.__getUpdateColorParams();
        (i.GUtil.equals(e, this._color) && "set_pattern" !== t && !o) ||
          ((this._color = e),
          this._updateSwatchesPalette(
            this._getSwatchScope("global", this._pattern)
          ),
          this._updateSwatchesPalette(
            this._getSwatchScope("document", this._pattern)
          ),
          this._pattern &&
            this._pattern instanceof i.GColor &&
            "set_pattern" !== t &&
            "update_pattern" !== t &&
            this._updatePattern(this._color, "set_color", null, n),
          this._activeGradientStop &&
            "gradient-stop" !== t &&
            ((this._activeGradientStop.color = this._color),
            this._updatePatternFromActiveGradient(n)),
          "mode" !== t &&
            (this._color instanceof i.GCMYKColor
              ? this.setColorMode(u.ColorMode.CMYK)
              : this._color instanceof i.GHSVColor
              ? this.setColorMode(u.ColorMode.HSV)
              : this._color instanceof i.GRGBColor &&
                this.setColorMode(u.ColorMode.RGB)),
          this._updateColorComponentsFromColor(),
          "slider" !== t && "map" !== t && this._updateColorSliderFromColor(),
          this._systemColorInput.val(this._color.toScreenCSS()),
          "map" !== t && this._updateMapMarker(),
          ("set_pattern" !== t && "gradient-stop" !== t) ||
            ((this._oldColor = this._color),
            this._colorPreviewOld.css(
              "background",
              this._oldColor.toScreenCSS(this._oldColorOpacity)
            )),
          "swatch" !== t &&
            "mixer" === this._activePalette &&
            this._updateMixerPalette(),
          i.GUtil.equals(this._oldColor, this._color) ||
            (0 === this._oldColorOpacity && this._updateOpacity(1)),
          a.isTouchEnabled &&
            (this._sliderColorThumb.css(
              "background",
              this._color.toScreenCSS(1)
            ),
            this._sliderOpacityThumb.css(
              "background",
              this._color.toScreenCSS(this._colorOpacity)
            )),
          this._colorPreviewNew.css(
            "background",
            this._color.toScreenCSS(this._colorOpacity)
          ));
      }),
      (u.prototype.__getUpdateOpacityParams = function () {
        return { isTouchEnabled: !1 };
      }),
      (u.prototype._updateOpacity = function (e, t, n, o) {
        var a = this.__getUpdateColorParams();
        if (e !== this._colorOpacity || "set_opacity" === t || o) {
          if (this._activeGradientStop && "set_opacity" === t) return;
          this._activeGradientStop ||
            ((this._opacity = e),
            "set_opacity" !== t &&
              this._settings &&
              this._settings.onOpacity &&
              this._settings.onOpacity(this._opacity, !!n)),
            (this._colorOpacity = e),
            ("set_opacity" !== t && "gradient-stop" !== t) ||
              ((this._oldColorOpacity = this._colorOpacity),
              this._colorPreviewOld.css(
                "background",
                this._oldColor.toScreenCSS(this._oldColorOpacity)
              )),
            this._colorPreviewNew.css(
              "background",
              this._color.toScreenCSS(this._colorOpacity)
            ),
            "slider" !== t &&
              this._opacitySlider.gInputSlider(
                "value",
                Math.round(100 * this._colorOpacity)
              ),
            this._colorComponents
              .find("[data-opacity]")
              .find("input")
              .prop(
                "disabled",
                this._settings &&
                  this._settings.hasOwnProperty("hasOpacity") &&
                  !this._settings.hasOpacity
              )
              .gInputBox(
                "value",
                i.GUtil.formatOpacity(100 * this._colorOpacity)
              ),
            this._activeGradientStop &&
              "gradient-stop" !== t &&
              ((this._activeGradientStop.opacity = this._colorOpacity),
              this._updatePatternFromActiveGradient(n)),
            a.isTouchEnabled &&
              (this._sliderColorThumb.css(
                "background",
                this._color.toScreenCSS(1)
              ),
              this._sliderOpacityThumb.css(
                "background",
                this._color.toScreenCSS(this._colorOpacity)
              ));
        }
      }),
      (u.prototype._updatePattern = function (e, t, n, o) {
        if (!this._patternUpdateBlocker) {
          ("set_pattern" !== t && "gradient" !== t) ||
            (this._patternUpdateBlocker = !0),
            (!n || e instanceof i.GGradient) &&
              ((this._pattern = e),
              this._toolbar.find(".pattern-type").each(function (t, n) {
                var o = $(n),
                  i = o.data("type");
                i && o.prop("selected", !!i.isInstance(e));
              }));
          var a = this._pattern && this._pattern instanceof i.GGradient,
            r = this._pattern && this._pattern instanceof i.GColor,
            s =
              this._pattern &&
              this._pattern instanceof i.GTexturePattern &&
              !(e instanceof i.GNoisePattern),
            l = this._pattern && this._pattern instanceof i.GNoisePattern,
            c = this._pattern && this._pattern instanceof i.GBackground;
          this._gradientEditor.css("display", a ? "" : "none"),
            this._gradientActions.css("display", a ? "" : " none"),
            this._colorEditor.css("display", r || a ? "" : "none"),
            this._palettes.css("display", r || a || s || l ? "" : "none"),
            s || l
              ? (this._palettes
                  .find(".chooser")
                  .find("button[data-palette!='swatches']")
                  .css("display", "none"),
                this._activatePalette("swatches"))
              : this._palettes
                  .find(".chooser")
                  .find("button")
                  .css("display", ""),
            this._patternEditor.css("display", s && !l ? "" : "none"),
            this._noiseEditor.css("display", l ? "" : "none"),
            ("set_pattern" === t || ("set_type" === t && !a)) &&
              ((this._activeGradient = null),
              (this._activeGradientStop = null));
          var d = null;
          if (a) {
            if (
              (this._gradientEditor.css(
                "background",
                i.GPattern.asCSSBackground(
                  new i.GLinearGradient(this._pattern.getStops()),
                  this._opacity
                )
              ),
              "set_pattern" === t || "set_type" === t)
            ) {
              this._gradientEditor.find(".stops").empty(),
                (this._activeGradient = this._pattern.clone());
              var u = null,
                p = null;
              Array.prototype.forEach.call(
                this._activeGradient.getStops(),
                function (e, t) {
                  this._insertGradientStop(e),
                    0 === t && (u = e),
                    this._activeGradientStop &&
                      this._activeGradientStop.position === e.position &&
                      (p = e);
                }.bind(this)
              );
              var g = gDesigner.getWorkspace().getStyleEdManager()
                ? gDesigner.getWorkspace().getStyleEdManager().getActiveEditor()
                : null;
              if (!p && g && g.getPartsSelectionLength()) {
                var h = this._activeGradient.getStops(),
                  f = g.getPartSelection(),
                  m = f && null !== f[0].idx ? f[0].idx : null;
                h && null !== m && h.length > m && ((p = h[m]), (d = m));
              }
              p || (p = u),
                this._setActiveGradientStop(
                  p,
                  e && e instanceof i.GColor ? e : null,
                  n
                ),
                this._gradientActions
                  .find("[data-action]")
                  .each(function (t, n) {
                    var o = $(n),
                      a = !0;
                    switch (o.attr("data-action")) {
                      case "rotate-left":
                      case "rotate-right":
                        a = e instanceof i.GLinearGradient;
                    }
                    o.css("display", a ? "" : "none");
                  });
            }
            null === d &&
              Array.prototype.forEach.call(
                this._activeGradient.getStops(),
                function (e, t) {
                  e === this._activeGradientStop && (d = t);
                }.bind(this)
              );
          } else if (r) this._updateColor(e, t || "update_pattern", !!o);
          else if (l) {
            var y = 100 * e.getAmount();
            this._noiseEditor
              .find('.g-input-slider[data-property="noise_amount"]')
              .gInputSlider("value", y),
              this._noiseEditor
                .find('[type="text"][data-property="noise_amount"]')
                .gInputBox("value", i.GUtil.formatNumber(y, 0));
            var v = this._patternEditor.find('[data-property="noise_type"]');
            v.children("option").attr("selected", !1),
              v
                .children('option[value="' + e.getType() + '"]')
                .attr("selected", !0);
          } else if (s) {
            this._updateTexture(e, t || "update_pattern");
            var _ = !!e.getTexture(),
              b =
                -1 !==
                i.GTexturePattern.SizeMode.Length.concat(
                  i.GTexturePattern.SizeMode.Percent
                ).indexOf(e.getSizeMode()),
              w = function (e, t) {
                var n = this._patternEditor
                  .find('[data-property="' + e + '"]')
                  .prop("disabled", !_);
                n.children("option").attr("selected", !1),
                  n.children('option[value="' + t + '"]').attr("selected", !0),
                  n.val(t);
              }.bind(this),
              C = function (e, t) {
                this._patternEditor
                  .find('[data-property="' + e + '"]')
                  .prop("disabled", !(_ && b))
                  .val(i.GUtil.formatNumber(t));
              }.bind(this);
            w("texture_repeat", e.getRepeatMode()),
              w("texture_position", e.getPosition()),
              w("texture_size", e.getSizeMode()),
              w("texture_scale", e.getScaleMode()),
              C("texture_size_w", e.getWidth()),
              C("texture_size_h", e.getHeight());
            var x = 100 * e.getTileSize();
            if (
              (this._patternEditor
                .find('.g-input-slider[data-property="texture_tile"]')
                .gInputSlider("value", x),
              this._patternEditor
                .find('[type="text"][data-property="texture_tile"]')
                .gInputBox("value", i.GUtil.formatNumber(x, 0)),
              this._patternEditor
                .find('[data-property="texture_tile"]')
                .gInputSlider(
                  "disabled",
                  e.getScaleMode() !== i.GTexturePattern.ScaleMode.Tile
                ),
              this._patternEditor
                .find('[data-property="texture_size_u"]')
                .text(
                  e.getSizeMode() === i.GTexturePattern.SizeMode.Length
                    ? "px"
                    : "%"
                ),
              this._patternEditor
                .find('[data-property="texture_mask"]')
                .prop("checked", e.isMask()),
              this._patternEditor
                .find(".pattern-preview")
                .css("background-image", e.asCSSBackground())
                .css("background-repeat", "no-repeat")
                .css("background-position", "center")
                .css("background-size", "contain"),
              "set_type" === t)
            ) {
              const t = this._clonePattern(e);
              this._updatePattern(t, "texture_pattern");
            }
          }
          this._relayout(!c),
            "set_pattern" !== t &&
              this._settings &&
              this._settings.onPattern &&
              this._settings.onPattern(
                n ? this._pattern : e,
                !!o,
                null !== d ? d : null
              ),
            a && this._updateOnlineEditorStops(),
            "swatches" === this._activePalette &&
              (this._updateSwatchesPalette(
                this._getSwatchScope("global", this._pattern)
              ),
              this._updateSwatchesPalette(
                this._getSwatchScope("document", this._pattern)
              )),
            (this._patternUpdateBlocker = !1);
        }
      }),
      (u.prototype._styleEditorHandler = function (e) {
        if (e.type === o.GStyleEdManager.EditorEventType.ActivePointChange) {
          var t = this._activeGradient ? this._activeGradient.getStops() : null,
            n = e.data ? e.data.idx : null;
          t && null !== n && t.length > n
            ? this._setActiveGradientStop(t[n])
            : t && this._setActiveGradientStop(t.null),
            this._updatePatternFromActiveGradient();
        }
      }),
      (u.prototype._closeIfNeeded = function (e) {
        !this.isOpenned() || (e.data && e.data.chooserOn) || this.close();
      }),
      (u.prototype._updateColorFromColorSlider = function (e) {
        var t = parseInt(this._colorSlider.gColorSlider("value")),
          n = null,
          o = null;
        if (
          this._colorMode === u.ColorMode.RGB ||
          this._colorMode === u.ColorMode.HSV
        ) {
          switch (this._colorMode) {
            case u.ColorMode.RGB:
              o = i.GColor.rgbToHSV(this._color.toScreen());
              break;
            case u.ColorMode.HSV:
              (o = []),
                this._colorComponents
                  .find("[data-component-index]")
                  .each(function (e, t) {
                    var n = $(t),
                      i = parseInt(n.attr("data-component-index"));
                    0 !== i &&
                      (o[i] =
                        parseInt(n.find("input").gInputBox("value")) / 100);
                  });
          }
          o &&
            ((o = [t, o[1], o[2]]),
            (n =
              this._colorMode === u.ColorMode.RGB
                ? new i.GRGBColor(i.GColor.hsvToRGB(o))
                : new i.GHSVColor(o)),
            (this._extendedGamutInitiated = u.ExtendedGamut.COLOR_SLIDER),
            this._updateColor(n, "slider", e, !0),
            this._updateColorMap(),
            (this._extendedGamutInitiated = null));
        }
      }),
      (u.prototype._updateColorSliderFromColor = function () {
        var e;
        switch (this._colorMode) {
          case u.ColorMode.RGB:
          case u.ColorMode.HSV:
            if (
              this._extendedGamutInitiated === u.ExtendedGamut.COLOR_SLIDER ||
              this._extendedGamutInitiated === u.ExtendedGamut.MAP
            )
              return;
            (e =
              this._extendedGamutInitiated === u.ExtendedGamut.COMPONENTS &&
              this._extValue &&
              this._colorMode === u.ColorMode.HSV
                ? this._extValue[0]
                : i.GColor.rgbToHSV(this._color.toScreen())[0]),
              parseInt(this._colorSlider.gColorSlider("value")) !== e &&
                (this._colorSlider.gColorSlider("value", e),
                this._updateColorMap());
            break;
          case u.ColorMode.CMYK:
        }
      }),
      (u.prototype._updateColorFromColorComponents = function () {
        var e = [];
        this._colorComponents
          .find("[data-component-index]")
          .each(function (t, n) {
            var o = $(n),
              i = parseInt(o.attr("data-component-index"));
            e[i] = parseInt(o.find("input").gInputBox("value"));
          });
        var t = null;
        switch (this._colorMode) {
          case u.ColorMode.RGB:
            t = new i.GRGBColor(e);
            break;
          case u.ColorMode.HSV: {
            const n = e.map(function (e, t) {
              return 0 === t ? e : e / 100;
            });
            t = new i.GHSVColor(n);
            break;
          }
          case u.ColorMode.CMYK:
            t = new i.GCMYKColor(
              e.map(function (e) {
                return e / 100;
              })
            );
        }
        (this._extendedGamutInitiated = u.ExtendedGamut.COMPONENTS),
          t && this._updateColor(t, "components", !1, !0),
          (this._extendedGamutInitiated = null);
      }),
      (u.prototype._updateColorComponentsFromColor = function () {
        if (
          (this._colorComponents
            .find("[data-css]")
            .find("input")
            .gInputBox("value", this._color.toScreenCSS()),
          this._extendedGamutInitiated !== u.ExtendedGamut.COMPONENTS ||
            this._colorMode !== u.ColorMode.HSV)
        ) {
          var e = null,
            t = function (e, t) {
              return t;
            };
          switch (this._colorMode) {
            case u.ColorMode.RGB:
              e = this._color.toScreen();
              break;
            case u.ColorMode.HSV:
              (e =
                (this._extendedGamutInitiated !==
                  u.ExtendedGamut.COLOR_SLIDER &&
                  this._extendedGamutInitiated !== u.ExtendedGamut.MAP) ||
                !this._extValue
                  ? this._color instanceof i.GHSVColor
                    ? this._color.getValue()
                    : i.GColor.rgbToHSV(this._color.toScreen())
                  : this._extValue),
                (t = function (e, t) {
                  return 0 === e ? t : i.GUtil.formatNumber(100 * t, 0);
                });
              break;
            case u.ColorMode.CMYK:
              (e =
                this._color instanceof i.GCMYKColor
                  ? this._color.getValue()
                  : i.GColor.rgbToCMYK(this._color.toScreen())),
                (t = function (e, t) {
                  return i.GUtil.formatNumber(100 * t, 0);
                });
          }
          this._colorComponents
            .find("[data-component-index]")
            .each(function (n, o) {
              var i = $(o),
                a = parseInt(i.attr("data-component-index"));
              i.find("input").gInputBox("value", t(a, e[a]));
            });
        }
      }),
      (u.prototype._updateMapMarker = function () {
        if (this._extendedGamutInitiated !== u.ExtendedGamut.MAP) {
          var e,
            t = this._colorMap.find("canvas")[0],
            n = t.width,
            o = t.height;
          e =
            (this._extendedGamutInitiated !== u.ExtendedGamut.COLOR_SLIDER &&
              this._extendedGamutInitiated !== u.ExtendedGamut.COMPONENTS) ||
            !this._extValue ||
            this._colorMode !== u.ColorMode.HSV
              ? i.GColor.rgbToHSV(this._color.toScreen())
              : this._extValue;
          var a = Math.round(e[1] * n),
            r = Math.round((1 - e[2]) * o);
          this._setMarkerPosition(a, r);
        }
      }),
      (u.prototype._setMarkerPosition = function (e, t) {
        var n = this._colorMap.find(".marker"),
          o = this._colorMap.find("canvas"),
          i = o[0].width,
          a = o[0].height,
          r = n.width() / 2,
          s = n.height() / 2;
        e < r && (e = r),
          t < s && (t = s),
          e > i - r && (e = i - r),
          t > a - s && (t = a - s),
          n.css({ left: e + "px", top: t + "px" });
      }),
      (u.prototype._updateColorMap = function () {
        var e = this._colorMap.find("canvas")[0];
        this._colorMap.width() &&
          this._colorMap.height() &&
          ((e.width = this._colorMap.width()),
          (e.height = this._colorMap.height()));
        var t = e.width,
          n = e.height,
          o = e.getContext("2d"),
          a = this._colorSlider.gColorSlider("value"),
          r = o.getImageData(0, 0, t, n);
        if (r) {
          for (var s = 0; s < t; ++s)
            for (var l = 0; l < n; ++l) {
              var c = i.GColor.hsvToRGB([parseInt(a), s / t, 1 - l / n]),
                d = 4 * (l * t + s);
              (r.data[d] = c[0]),
                (r.data[d + 1] = c[1]),
                (r.data[d + 2] = c[2]),
                (r.data[d + 3] = 255);
            }
          o.putImageData(r, 0, 0);
        }
      }),
      (u.prototype._colorMapMouseDown = function (e) {
        if (e.originalEvent.isTrusted) {
          var t = function (e, t) {
              if (!e.isTrusted) return;
              e.cancelable && e.preventDefault();
              let n = e.pageX,
                o = e.pageY;
              if ("touchstart" === e.type || "touchmove" === e.type) {
                const t = e.changedTouches[0];
                (n = t && t.pageX), (o = t && t.pageY);
              }
              var a = this._colorMap.find("canvas")[0],
                r = a.width,
                s = a.height,
                l = this._colorMap.offset(),
                c = Math.max(0, Math.min(r, Math.round(n - l.left))),
                d = Math.max(0, Math.min(s, Math.round(o - l.top)));
              const p = [
                parseInt(this._colorSlider.gColorSlider("value")),
                c / r,
                1 - d / s,
              ];
              var g;
              (g =
                this._colorMode === u.ColorMode.HSV
                  ? new i.GHSVColor(p)
                  : new i.GRGBColor(i.GColor.hsvToRGB(p))),
                this._setMarkerPosition(c, d),
                (this._extendedGamutInitiated = u.ExtendedGamut.MAP),
                this._updateColor(g, "map", !t, t),
                (this._extendedGamutInitiated = null);
            }.bind(this),
            n = function (e) {
              t(e, !0),
                e.stopPropagation(),
                document.removeEventListener("mouseup", n, !0),
                document.removeEventListener("mousemove", t, !0),
                document.removeEventListener("touchmove", t, !0);
            };
          t(e.originalEvent),
            document.addEventListener("mouseup", n, !0),
            document.addEventListener("mousemove", t, !0),
            document.addEventListener("touchmove", t, !0);
        }
      }),
      (u.prototype._defineStopInitColor = function (e) {
        var t = this._gradientEditor.find(".stop:visible"),
          n = function (e) {
            return Number($(e).css("left").replace("px", ""));
          },
          o = function (e) {
            var t = $(e).data("stop");
            return t && t.color instanceof i.GColor
              ? t.color.toScreen()
              : [0, 0, 0];
          },
          a = [],
          r = [],
          s = null,
          l = null,
          c = null,
          d = null;
        for (let o = 0; o < t.length; ++o)
          n(t[o]) < e ? r.push(t[o]) : a.push(t[o]);
        for (let e = 0; e < r.length; ++e)
          s
            ? n(r[e]) > c && ((s = r[e]), (c = n(r[e])))
            : ((s = r[e]), (c = n(r[e])));
        for (let e = 0; e < a.length; ++e)
          l
            ? n(a[e]) < d && ((l = a[e]), (d = n(a[e])))
            : ((l = a[e]), (d = n(a[e])));
        var p = (100 * (e -= c)) / (d -= c) / 100;
        const g = (function (e, t, n) {
          var o = ((2 * n - 1) / 1 + 1) / 2,
            i = 1 - o;
          return [
            Math.round(t[0] * o + e[0] * i),
            Math.round(t[1] * o + e[1] * i),
            Math.round(t[2] * o + e[2] * i),
          ];
        })(o(s), o(l), p);
        switch (this._colorMode) {
          case u.ColorMode.CMYK:
            return new i.GCMYKColor(i.GColor.rgbToCMYK(g));
          case u.ColorMode.HSV:
            return new i.GHSVColor(i.GColor.rgbToHSV(g));
          default:
            return new i.GRGBColor(g);
        }
      }),
      (u._createPatternOption = function (e) {
        return $("<option></option>")
          .addClass("pattern-type")
          .data("type", e)
          .attr("data-title", e.name)
          .attr("value", e.name)
          .text(e.name);
      }),
      (u.prototype._relayout = function () {
        this._container.gOverlay("relayout", { preserveTop: !1 });
      }),
      (u.getGradientStopsFromCurrentPattern = function (e) {
        var t;
        return (
          e instanceof i.GGradient
            ? (t = e.getClonedStops())
            : ((t = [
                { color: i.GRGBColor.WHITE, position: 0, opacity: 1 },
                { color: i.GRGBColor.BLACK, position: 1, opacity: 1 },
              ]),
              e instanceof i.GColor &&
                !i.GUtil.equals(e.toScreen(), t[1].color.toScreen()) &&
                (t[0].color = e)),
          t
        );
      }),
      (u.PATTERN_TYPES = null),
      (u.initPatternType = function () {
        return [
          {
            name: i.GLocale.get(
              new i.GLocaleKey("GPatternChooser", "pattern-type.color")
            ),
            cssBackgroundImage: new i.GLinearGradient(
              [
                { color: i.GRGBColor.WHITE, position: 0, opacity: 0.5 },
                { color: i.GRGBColor.WHITE, position: 1, opacity: 0.5 },
              ],
              1,
              i.GMath.toRadians(90)
            ).asCSSBackground(),
            isCompatible: function (e) {
              return e === i.GColor;
            },
            isInstance: function (e) {
              return e && e instanceof i.GColor;
            },
            createDefault: function (e) {
              if (e instanceof i.GGradient)
                for (var t = e.getStops(), n = 0; n < t.length; ++n)
                  if (t[n].hasOwnProperty("color")) return t[n].color;
              return new i.GRGBColor();
            },
          },
          {
            name: i.GLocale.get(
              new i.GLocaleKey("GPatternChooser", "pattern-type.lineargradient")
            ),
            cssBackgroundImage: new i.GLinearGradient(
              [
                { color: i.GRGBColor.WHITE, position: 0, opacity: 1 },
                { color: i.GRGBColor.BLACK, position: 1, opacity: 0 },
              ],
              1,
              i.GMath.toRadians(90)
            ).asCSSBackground(),
            isCompatible: function (e) {
              return e === i.GLinearGradient || e === i.GGradient;
            },
            isInstance: function (e) {
              return e && e instanceof i.GLinearGradient;
            },
            createDefault: function (e) {
              return new i.GLinearGradient(
                u.getGradientStopsFromCurrentPattern(e)
              );
            },
          },
          {
            name: i.GLocale.get(
              new i.GLocaleKey("GPatternChooser", "pattern-type.radialgradient")
            ),
            cssBackgroundImage: new i.GRadialGradient([
              { color: i.GRGBColor.WHITE, position: 0, opacity: 1 },
              { color: i.GRGBColor.BLACK, position: 1, opacity: 0 },
            ]).asCSSBackground(),
            isCompatible: function (e) {
              return e === i.GRadialGradient || e === i.GGradient;
            },
            isInstance: function (e) {
              return e && e instanceof i.GRadialGradient;
            },
            createDefault: function (e) {
              return new i.GRadialGradient(
                u.getGradientStopsFromCurrentPattern(e)
              );
            },
          },
          {
            name: i.GLocale.get(
              new i.GLocaleKey(
                "GPatternChooser",
                "pattern-type.angulargradient"
              )
            ),
            cssBackgroundImage: new i.GAngularGradient([
              { color: i.GRGBColor.WHITE, position: 0, opacity: 1 },
              { color: i.GRGBColor.BLACK, position: 1, opacity: 0 },
            ]).asCSSBackground(),
            isCompatible: function (e) {
              return e === i.GAngularGradient || e === i.GGradient;
            },
            isInstance: function (e) {
              return e && e instanceof i.GAngularGradient;
            },
            createDefault: function (e) {
              return new i.GAngularGradient(
                u.getGradientStopsFromCurrentPattern(e)
              );
            },
          },
          {
            name: i.GLocale.get(
              new i.GLocaleKey("GPatternChooser", "pattern-type.texture")
            ),
            cssBackgroundImage:
              'url("data:image/svg+xml;base64,' +
              btoa(
                '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20">\n                        <circle r="9.2" stroke-width="2" stroke="white" fill="none"/>\n                        <circle cy="18.4" r="9.2" stroke-width="2px" stroke="white" fill="none"/>\n                        <circle cx="18.4" cy="18.4" r="9.2" stroke-width="2" stroke="white" fill="none"/>\n                    </svg>'
              ) +
              '")',
            isCompatible: function (e) {
              return e === i.GTexturePattern;
            },
            isInstance: function (e) {
              return (
                e &&
                e instanceof i.GTexturePattern &&
                !(e instanceof i.GNoisePattern)
              );
            },
            createDefault: function () {
              var e = i.GNode.deserialize(
                  '[{"@":"group","$":[{"@":"rectangle","uf":true,"ct":"R","sl":0,"reftxt":null,"trf":[9.948817641447532,0,0,9.692411708290129,370.93546258325506,25.987797270522503],"_sdf":84,"_layers":{"@":"paintLayers","$":[{"@":"fillPaintLayer","_pt":"C#[0,0,0]"}]}},{"@":"rectangle","uf":true,"ct":"R","sl":0,"reftxt":null,"trf":[9.948817641447532,0,0,9.692411708290129,410.7307331490452,25.987797270522503],"_sdf":84,"_layers":{"@":"paintLayers","$":[{"@":"fillPaintLayer","_pt":"C#[0,0,0]"}]}},{"@":"rectangle","uf":true,"ct":"R","sl":0,"reftxt":null,"trf":[9.948817641447532,0,0,9.692411708290129,390.7793771686299,44.58515959609013],"_sdf":84,"_layers":{"@":"paintLayers","$":[{"@":"fillPaintLayer","_pt":"C#[0,0,0]"}]}},{"@":"rectangle","uf":true,"ct":"R","sl":0,"reftxt":null,"trf":[9.948817641447532,0,0,9.692411708290129,430.57464773441995,44.58515959609013],"_sdf":84,"_layers":{"@":"paintLayers","$":[{"@":"fillPaintLayer","_pt":"C#[0,0,0]"}]}},{"@":"rectangle","uf":true,"ct":"R","sl":0,"reftxt":null,"trf":[9.948817641447532,0,0,9.692411708290129,370.9623229320152,63.96998301267038],"_sdf":84,"_layers":{"@":"paintLayers","$":[{"@":"fillPaintLayer","_pt":"C#[0,0,0]"}]}},{"@":"rectangle","uf":true,"ct":"R","sl":0,"reftxt":null,"trf":[9.948817641447532,0,0,9.692411708290129,410.75759349780526,63.96998301267038],"_sdf":84,"_layers":{"@":"paintLayers","$":[{"@":"fillPaintLayer","_pt":"C#[0,0,0]"}]}},{"@":"rectangle","uf":true,"ct":"R","sl":0,"reftxt":null,"trf":[9.948817641447532,0,0,9.692411708290129,390.80623751739,82.56734533823798],"_sdf":84,"_layers":{"@":"paintLayers","$":[{"@":"fillPaintLayer","_pt":"C#[0,0,0]"}]}},{"@":"rectangle","uf":true,"ct":"R","sl":0,"reftxt":null,"trf":[9.948817641447532,0,0,9.692411708290129,430.60150808318014,82.56734533823798],"_sdf":84,"_layers":{"@":"paintLayers","$":[{"@":"fillPaintLayer","_pt":"C#[0,0,0]"}]}}]}]'
                ).pop(),
                t = new i.GTexturePattern(e, i.GTexturePattern.RepeatMode.Both);
              return t.setScene(gDesigner.getActiveDocument().getScene()), t;
            },
          },
          {
            name: i.GLocale.get(
              new i.GLocaleKey("GPatternChooser", "pattern-type.noise")
            ),
            cssBackgroundImage:
              'url("data:image/svg+xml;base64,' +
              btoa(
                '<svg width="100%" height="100%" viewBox="0 0 20 20" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:1.41421;"><rect x="-0.994" y="-1.097" width="24.763" height="23.271" style="fill:transparent;"/><path d="M7.689,17.9l0.848,0l0,0.565l-0.848,0l0,0.848l-0.565,0l0,-0.848l-0.848,0l0,-0.565l0.848,0l0,-0.848l0.565,0l0,0.848Zm5.769,0l0.848,0l0,0.565l-0.848,0l0,0.848l-0.565,0l0,-0.848l-0.847,0l0,-0.565l0.847,0l0,-0.848l0.565,0l0,0.848Zm5.094,0l0.847,0l0,0.565l-0.847,0l0,0.848l-0.566,0l0,-0.848l-0.847,0l0,-0.565l0.847,0l0,-0.848l0.566,0l0,0.848Zm-16.58,0l0.847,0l0,0.565l-0.847,0l0,0.848l-0.566,0l0,-0.848l-0.847,0l0,-0.565l0.847,0l0,-0.848l0.566,0l0,0.848Zm3.015,-2.33l1.321,0l0,0.881l-1.321,0l0,1.321l-0.88,0l0,-1.321l-1.321,0l0,-0.881l1.321,0l0,-1.32l0.88,0l0,1.32Zm5.752,0l1.32,0l0,0.881l-1.32,0l0,1.321l-0.881,0l0,-1.321l-1.32,0l0,-0.881l1.32,0l0,-1.32l0.881,0l0,1.32Zm5.764,0l1.32,0l0,0.881l-1.32,0l0,1.321l-0.881,0l0,-1.321l-1.321,0l0,-0.881l1.321,0l0,-1.32l0.881,0l0,1.32Zm-8.814,-2.896l0.848,0l0,0.566l-0.848,0l0,0.847l-0.565,0l0,-0.847l-0.848,0l0,-0.566l0.848,0l0,-0.847l0.565,0l0,0.847Zm5.769,0l0.848,0l0,0.566l-0.848,0l0,0.847l-0.565,0l0,-0.847l-0.847,0l0,-0.566l0.847,0l0,-0.847l0.565,0l0,0.847Zm5.094,0l0.847,0l0,0.566l-0.847,0l0,0.847l-0.566,0l0,-0.847l-0.847,0l0,-0.566l0.847,0l0,-0.847l0.566,0l0,0.847Zm-16.58,0l0.847,0l0,0.566l-0.847,0l0,0.847l-0.566,0l0,-0.847l-0.847,0l0,-0.566l0.847,0l0,-0.847l0.566,0l0,0.847Zm3.015,-2.91l1.321,0l0,0.88l-1.321,0l0,1.321l-0.88,0l0,-1.321l-1.321,0l0,-0.88l1.321,0l0,-1.321l0.88,0l0,1.321Zm5.752,0l1.32,0l0,0.88l-1.32,0l0,1.321l-0.881,0l0,-1.321l-1.32,0l0,-0.88l1.32,0l0,-1.321l0.881,0l0,1.321Zm5.764,0l1.32,0l0,0.88l-1.32,0l0,1.321l-0.881,0l0,-1.321l-1.321,0l0,-0.88l1.321,0l0,-1.321l0.881,0l0,1.321Zm-8.814,-2.932l0.848,0l0,0.565l-0.848,0l0,0.848l-0.565,0l0,-0.848l-0.848,0l0,-0.565l0.848,0l0,-0.848l0.565,0l0,0.848Zm5.769,0l0.848,0l0,0.565l-0.848,0l0,0.848l-0.565,0l0,-0.848l-0.847,0l0,-0.565l0.847,0l0,-0.848l0.565,0l0,0.848Zm5.094,0l0.847,0l0,0.565l-0.847,0l0,0.848l-0.566,0l0,-0.848l-0.847,0l0,-0.565l0.847,0l0,-0.848l0.566,0l0,0.848Zm-16.58,0l0.847,0l0,0.565l-0.847,0l0,0.848l-0.566,0l0,-0.848l-0.847,0l0,-0.565l0.847,0l0,-0.848l0.566,0l0,0.848Zm3.015,-2.833l1.321,0l0,0.881l-1.321,0l0,1.32l-0.88,0l0,-1.32l-1.321,0l0,-0.881l1.321,0l0,-1.321l0.88,0l0,1.321Zm5.752,2.201l-0.881,0l0,-1.32l-1.32,0l0,-0.881l1.32,0l0,-1.321l0.881,0l0,1.321l1.32,0l0,0.881l-1.32,0l0,1.32Zm5.764,0l-0.881,0l0,-1.32l-1.321,0l0,-0.881l1.321,0l0,-1.321l0.881,0l0,1.321l1.32,0l0,0.881l-1.32,0l0,1.32Zm-8.814,-4.515l0.848,0l0,0.565l-0.848,0l0,0.848l-0.565,0l0,-0.848l-0.848,0l0,-0.565l0.848,0l0,-0.847l0.565,0l0,0.847Zm5.769,0l0.848,0l0,0.565l-0.848,0l0,0.848l-0.565,0l0,-0.848l-0.847,0l0,-0.565l0.847,0l0,-0.847l0.565,0l0,0.847Zm5.094,0l0.847,0l0,0.565l-0.847,0l0,0.848l-0.566,0l0,-0.848l-0.847,0l0,-0.565l0.847,0l0,-0.847l0.566,0l0,0.847Zm-16.58,0l0.847,0l0,0.565l-0.847,0l0,0.848l-0.566,0l0,-0.848l-0.847,0l0,-0.565l0.847,0l0,-0.847l0.566,0l0,0.847Z" style="fill:#fff;"/></svg>'
              ) +
              '")',
            isCompatible: function (e) {
              return e === i.GNoisePattern;
            },
            isInstance: function (e) {
              return e && e instanceof i.GNoisePattern;
            },
            createDefault: function () {
              return new i.GNoisePattern();
            },
          },
          {
            name: i.GLocale.get(
              new i.GLocaleKey("GPatternChooser", "pattern-type.backgroundfill")
            ),
            cssBackgroundImage:
              'url("data:image/svg+xml;base64,' +
              btoa(
                '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="20" viewBox="0 0 5 10"><line x1="-2" y1="1" x2="7" y2="10" stroke="white" stroke-width="2"/><line x1="-2" y1="6" x2="7" y2="15" stroke="white" stroke-width="2"/><line x1="-2" y1="-4" x2="7" y2="5" stroke="white" stroke-width="2"/></svg>'
              ) +
              '")',
            isCompatible: function (e) {
              return e === i.GBackground;
            },
            isInstance: function (e) {
              return e && e instanceof i.GBackground;
            },
            createDefault: function () {
              return new i.GBackground();
            },
          },
        ];
      }),
      (function (e) {
        var t = {
          init: function (n) {
            return (
              (n = e.extend({ asButton: !0, label: "", singleOption: !1 }, n)),
              window.gPatternChooser._updateSettings(n, !0),
              this.each(function () {
                var o = this,
                  a = e(this),
                  r = null;
                n.label &&
                  (r = e("<span />")
                    .addClass("label")
                    .css("margin-left", "5px")
                    .text(n.label));
                var l = n.simplified,
                  c = e("<span />")
                    .addClass("preview")
                    .data("gpatternchooser", { options: n, opacity: 1 })
                    .on(
                      "click",
                      function (i, r) {
                        if (
                          (gDesigner.isTouchEnabled()
                            ? (window.gPatternChooser =
                                window.gPatternChooserTouch)
                            : (window.gPatternChooser =
                                window.gPatternChooserNormal),
                          n.onOpen
                            ? n.onOpen.call(this)
                            : gDesigner.stats("patternchooser_click_open"),
                          i.stopPropagation(),
                          i.preventDefault(),
                          !a.hasClass("g-disabled"))
                        ) {
                          var s = a.data("gpatternchooser");
                          s.options.asButton && a.addClass("g-active");
                          var l = e.extend({}, s.options),
                            c = e.extend(l, {
                              onPattern: function (e, n, i) {
                                t.value.call(o, e),
                                  a.trigger("patternchange", [
                                    e,
                                    null,
                                    n,
                                    !0,
                                    null !== i ? i : null,
                                  ]);
                              },
                              onOpacity: function (e, n) {
                                t.opacity.call(o, e),
                                  a.trigger("patternchange", [
                                    void 0,
                                    e,
                                    n,
                                    !0,
                                  ]);
                              },
                              onClose: function (e, t, n, o) {
                                var i = !1;
                                return (
                                  a.trigger("chooserclose", [
                                    function () {
                                      (i = !0), n && n();
                                    },
                                    o,
                                  ]),
                                  !i &&
                                    (s.options.asButton &&
                                      a.removeClass("g-active"),
                                    !0)
                                );
                              },
                            });
                          window.gPatternChooser.open(a, c),
                            window.gPatternChooser.setOpacity(
                              t.opacity.call(o)
                            ),
                            window.gPatternChooser.setPattern(t.value.call(o)),
                            a.trigger("chooseropen"),
                            null !== r &&
                              window.gPatternChooser.setActiveGradientStopByIdx(
                                r
                              );
                        }
                      }.bind(this)
                    )
                    .gPatternTarget()
                    .gRichTooltip(
                      s.GRichTooltipConfig.from({
                        title: i.GLocale.get(
                          new i.GLocaleKey(
                            "GPatternChooser",
                            "text.color-picker-tooltip-title"
                          )
                        ),
                        description: i.GLocale.get(
                          new i.GLocaleKey(
                            "GPatternChooser",
                            "text.color-picker-tooltip-description"
                          )
                        ),
                        learnMore:
                          "",
                      })
                    );
                if (
                  (n.asButton && c.addClass("g-button"),
                  a
                    .addClass(
                      l ? "g-pattern-chooser-simplified" : "g-pattern-chooser"
                    )
                    .data("gpatternchooser", { options: n, opacity: 1 }),
                  !l && !n.noEyedropper)
                ) {
                  var d = e("<div/>")
                    .addClass("eyedropper")
                    .addClass("eye-drop")
                    .gEyeDropper({ onClick: n.onClickEyedropper })
                    .on("colorchange", function (e, t) {
                      a.trigger("patternchange", [
                        new i.GRGBColor(t),
                        t[3] / 255,
                        !1,
                      ]);
                    })
                    .removeClass("g-button")
                    .gRichTooltip(
                      s.GRichTooltipConfig.from({
                        title: i.GLocale.get(
                          new i.GLocaleKey(
                            "GPatternChooser",
                            "text.eyedropper-tooltip-title"
                          )
                        ),
                        description: i.GLocale.get(
                          new i.GLocaleKey(
                            "GPatternChooser",
                            "text.eyedropper-tooltip-description"
                          )
                        ),
                      })
                    );
                  c.append(d);
                }
                n.noEyedropper && a.addClass("only-picker"),
                  a.append(c).append(r);
              })
            );
          },
          opacity: function (n) {
            var o = e(this),
              i = o.data("gpatternchooser");
            return arguments.length
              ? (i && ((i.opacity = n), t._updateBackground.call(this)), this)
              : i
              ? i.opacity
              : 1;
          },
          value: function (n) {
            var o = e(this);
            return arguments.length
              ? (o.find(".preview").gPatternTarget("value", n),
                o.find(".eye-drop").gEyeDropper("setValue", n),
                t._updateBackground.call(this),
                this)
              : o.find(".preview").gPatternTarget("value");
          },
          setPattern: function (t) {
            var n = e(this);
            return (
              gPatternChooser.isOpenned(n) && gPatternChooser.setPattern(t),
              this
            );
          },
          nullValue: function (n) {
            var o = e(this),
              i = o.data("gpatternchooser");
            return arguments.length
              ? (i && (i.nullValue = n), t._updateBackground.call(this), this)
              : i
              ? i.nullValue
              : null;
          },
          close: function () {
            gPatternChooser.isOpenned(e(this)) && gPatternChooser.close();
          },
          openEyeDropper: function (t, n) {
            e(this).find(".eye-drop").gEyeDropper("setActive", !0, t, n);
          },
          _updateBackground: function () {
            var t = e(this),
              n = t.data("gpatternchooser"),
              o = t.find(".preview").gPatternTarget("value"),
              a = t.find(".preview");
            let r;
            !o && n && n.nullValue && (o = n.nullValue),
              o instanceof i.GTexturePattern
                ? ((r = i.GPattern.asCSSBackground(
                    o,
                    n && "number" == typeof n.opacity ? n.opacity : 1
                  )),
                  a
                    .css("background-image", r)
                    .css("background-repeat", o.getRepeatMode())
                    .css("background-size", "contain"),
                  t.find(".eye-drop").gEyeDropper("setValue", o))
                : o &&
                  "function" == typeof o.asCSSBackground &&
                  ((r = i.GPattern.asCSSBackground(
                    o,
                    n && "number" == typeof n.opacity ? n.opacity : 1
                  )),
                  a.css("background", r),
                  t.find(".eye-drop").gEyeDropper("setValue", r));
          },
          updateSettings: function (t) {
            var n = e(this).data("gpatternchooser");
            return n && n.options && e.extend(n.options, t), this;
          },
        };
        e.fn.gPatternChooser = function (n) {
          return t[n]
            ? t[n].apply(this, Array.prototype.slice.call(arguments, 1))
            : "object" != typeof n && n
            ? void e.error(
                "Method " + n + " does not exist on jQuery.gPatternChooser"
              )
            : t.init.apply(this, arguments);
        };
      })(jQuery),
      (u.prototype._clonePattern = function (e) {
        const t = e.clone();
        return t.setScene(gDesigner.getActiveDocument().getScene()), t;
      }),
      (e.exports = u);
  }