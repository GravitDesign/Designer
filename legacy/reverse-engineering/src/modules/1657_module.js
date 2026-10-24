/**
 * Webpack Module #1657
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(53);
    var o = n(1),
      i = (n(15), n(40)),
      a = (n(67), n(238)),
      r = (n(1151), n(857), n(173), n(877), n(44)),
      s = n(1150);
    function l() {
      this.initLayout(),
        this._container.gOverlay({
          releaseOnClose: !1,
          padding: !1,
          clazz: "pattern-chooser-overlay",
          customRight: -250,
        }),
        this.initContextMenu();
    }
    o.GObject.inheritAndMix(l, s),
      (l.prototype._advancedExpanded = !0),
      (l.prototype._longPressTimer = null),
      (l.prototype._islongPress = !1),
      (l.prototype._contextMenu = null),
      (l.prototype._currentLongPressTarget = null),
      (l.prototype._createChoosers = function (e) {
        return $("<div />")
          .addClass("chooser")
          .append(
            $("<button />")
              .attr("data-palette", "colors")
              .append(
                $("<div />")
                  .addClass("mini-font")
                  .text(
                    o.GLocale.get(
                      new o.GLocaleKey("GCommonNames", "text.colors")
                    ).toUpperCase()
                  )
              )
              .on("click", e)
          )
          .append(
            $("<button />")
              .gPro({ feature: "swatches" })
              .attr("data-palette", "swatches")
              .append(
                $("<div />")
                  .addClass("mini-font")
                  .text(
                    o.GLocale.get(
                      new o.GLocaleKey("GPatternChooser", "text.swatches")
                    ).toUpperCase()
                  )
              )
              .on(
                "click",
                i.watchDog.trap(
                  e,
                  null,
                  (e) =>
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
              .append(
                $("<div />")
                  .addClass("mini-font")
                  .text(
                    o.GLocale.get(
                      new o.GLocaleKey("GPatternChooser", "text.in-use")
                    ).toUpperCase()
                  )
              )
              .on("click", e)
          )
          .append(
            $("<button />")
              .attr("data-palette", "mixer")
              .append(
                $("<div />")
                  .addClass("mini-font")
                  .text(
                    o.GLocale.get(
                      new o.GLocaleKey("GPatternChooser", "text.mixer")
                    ).toUpperCase()
                  )
              )
              .on("click", e)
          )
          .appendTo(this._palettes);
      }),
      (l.prototype.initContextMenu = function (e) {
        this._contextMenu = new a(null, "g-pattern-chooser-context-menu");
        var t = (e, t, n) => {
            gDesigner.stats("patternchooser_add_swatch", e);
            var i = new o.GSwatch(t, n),
              a = gDesigner.getSwatches(e);
            if (a) {
              for (var s = 0; s < a.length; ++s)
                if (o.GUtil.equals(i, a[s], !0))
                  return void r.alert(
                    o.GLocale.get(
                      new o.GLocaleKey(
                        "GPatternChooser",
                        "text.equal-swatch-alert"
                      )
                    )
                  );
              a.push(i), gDesigner.setSwatches(e, a);
            }
          },
          n = (e) => {
            var t = this._pattern.clone();
            return (
              (t instanceof o.GRadialGradient ||
                t instanceof o.GLinearGradient ||
                t instanceof o.GAngularGradient) &&
                (t._stops[0].color = e),
              t
            );
          },
          i = (e) => {
            var o = $(this._currentLongPressTarget)
              .closest(".swatch")
              .data("swatch");
            if (o) {
              var i = o.getProperty("_pt"),
                a = o.getProperty("_op");
              e = this._getSwatchScope(e, this._pattern);
              (i = n(i)), t(e, i, a);
            } else
              "INPUT" === this._currentLongPressTarget.nodeName &&
                t(
                  this._getSwatchScope("document", this._pattern),
                  this._pattern,
                  this._opacity
                );
          };
        this._contextMenu
          .createAddItem(
            o.GLocale.get(
              new o.GLocaleKey(
                "GPatternChooser",
                "action.add-to-document-swatches"
              )
            ),
            () => {
              i("document");
            }
          )
          .setIcon("gravit-icon-add-swatches"),
          this._contextMenu
            .createAddItem(
              o.GLocale.get(
                new o.GLocaleKey(
                  "GPatternChooser",
                  "action.add-to-global-swatches"
                )
              ),
              () => {
                i("global");
              }
            )
            .setIcon("gravit-icon-add-swatches");
      }),
      (l.prototype.__getColorModeParams = function () {
        return {
          hexWidth: "25%",
          isTouchEnabled: !0,
          rgbWidth: "12%",
          cymkWidth: "12%",
        };
      }),
      (l.prototype._createPatternEditorFirstRow = function (e, t) {
        return [
          {
            width: "80%",
            padding: !1,
            content: $("<button />")
              .prepend($("<span></span>").addClass("gravit-icon-add-image"))
              .append(
                $("<div />")
                  .addClass("mini-font")
                  .text(
                    o.GLocale.get(
                      new o.GLocaleKey("GPatternChooser", "action.choose-image")
                    ) + "..."
                  )
              )
              .addClass("pattern-choose-image-button")
              .on("click", e),
          },
          {
            width: "20%",
            content: $("<button />")
              .addClass("paste-btn")
              .addClass("g-flat")
              .append(
                $("<span></span>").addClass("gravit-icon-paste-color-choose")
              )
              .on("click", t),
          },
        ];
      }),
      (l.prototype._createPatternEditorMaskRow = function (e) {
        return [
          {
            padding: !1,
            width: "50px",
            content: $("<label />")
              .addClass("g-switch")
              .append(
                $("<input>")
                  .attr("id", "texture-mask-touch")
                  .attr("type", "checkbox")
                  .attr("data-property", "texture_mask")
                  .prop("disabled", !0)
                  .on("change", e)
              )
              .append($("<div />")),
          },
          {
            padding: !1,
            width: "auto",
            content: $("<label></label>")
              .text(
                o.GLocale.get(
                  new o.GLocaleKey(
                    "GPatternChooser",
                    "action.set-transparency-mask"
                  )
                )
              )
              .addClass("set-transparency-mask")
              .attr("for", "texture-mask-touch"),
          },
        ];
      }),
      (l.prototype._createPatternEditorScaleRow = function (e, t, n) {
        return [
          {
            padding: !1,
            width: "120px",
            content: $("<span></span>").text(
              o.GLocale.get(new o.GLocaleKey("GPatternChooser", "text.scale"))
            ),
          },
          {
            width: "auto",
            content: $("<div/>")
              .attr("data-property", "texture_tile")
              .gInputSlider({ min: 10, max: 200 })
              .on("input", e)
              .on("change", t),
          },
          {
            width: "50px",
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
      (l.prototype._createPatternEditorAdvancedRow = function (e) {
        return [
          {
            width: "auto",
            content: $("<div />")
              .addClass("advanced-option")
              .append(
                $(
                  "<b>" +
                    o.GLocale.get(
                      new o.GLocaleKey("GPatternChooser", "text.advanced")
                    ) +
                    " </b>"
                ).addClass("title")
              )
              .append(
                $("<div />")
                  .addClass("gravit-icon-right expand-icon")
                  .attr("id", "expand-icon")
              )
              .on(
                "click",
                function () {
                  gDesigner.stats("patternchooser_click_advanced"),
                    e.slideToggle(),
                    (this._advancedExpanded = !this._advancedExpanded),
                    $("#expand-icon")
                      .removeClass("gravit-icon-right")
                      .removeClass("gravit-icon-down"),
                    $("#expand-icon").addClass(
                      this._advancedExpanded
                        ? "gravit-icon-right"
                        : "gravit-icon-down"
                    );
                }.bind(this)
              ),
          },
        ];
      }),
      (l.prototype.__getCreatePatternEditorParams = function () {
        return {
          isTouchEnabled: !0,
          repeatWidth: "48%",
          ghostWidth: "4%",
          postionWith: "48%",
          sizeWidth: "48%",
          unitWidth: "8%",
        };
      }),
      (l.prototype._createMixerPalette = function (e) {
        for (
          var t = $("<div />")
              .attr("data-container", "tints")
              .addClass("tints")
              .append(
                $("<div/>")
                  .addClass("title")
                  .text(
                    o.GLocale.get(
                      new o.GLocaleKey("GPatternChooser", "text.tints")
                    ).toUpperCase()
                  )
              )
              .appendTo(e),
            n = 1;
          n <= 8;
          n += 1
        )
          this._createPaletteSwatch(o.GRGBColor.WHITE, t, !1, !1);
        var i = $("<div />")
          .attr("data-container", "shades")
          .addClass("shades")
          .append(
            $("<div/>")
              .addClass("title")
              .text(
                o.GLocale.get(
                  new o.GLocaleKey("GPatternChooser", "text.shades")
                ).toUpperCase()
              )
          )
          .appendTo(e);
        for (n = 1; n <= 8; n += 1)
          this._createPaletteSwatch(o.GRGBColor.WHITE, i, !1, !1);
        var a = $("<div />")
          .attr("data-container", "tones")
          .addClass("tones")
          .append(
            $("<div/>")
              .addClass("title")
              .text(
                o.GLocale.get(
                  new o.GLocaleKey("GPatternChooser", "text.tones")
                ).toUpperCase()
              )
          )
          .appendTo(e);
        for (n = 1; n <= 8; n += 1)
          this._createPaletteSwatch(o.GRGBColor.WHITE, a, !1, !1);
        var r = $("<div />")
          .attr("data-container", "mixes")
          .addClass("mixes")
          .append(
            $("<div/>")
              .addClass("title")
              .text(
                o.GLocale.get(
                  new o.GLocaleKey("GPatternChooser", "text.mixes")
                ).toUpperCase()
              )
          )
          .appendTo(e);
        for (n = 1; n <= 8; n += 1)
          this._createPaletteSwatch(o.GRGBColor.WHITE, r, !1, !1);
        this._updateMixerPalette();
      }),
      (l.prototype.__getUpdateMixerPaletteParams = function () {
        return { maxCount: 8 };
      }),
      (l.prototype.__getCreateUsedPaletteParams = function () {
        return { isTouchEnabled: !0, maxCount: 8 };
      }),
      (l.prototype.__getUpdateSwatchesPaletteParams = function () {
        return { isTouchEnabled: !0 };
      }),
      (l.prototype.__getUpdateGradientStopParams = function () {
        return { isTouchEnabled: !0 };
      }),
      (l.prototype.__getCreatePaletteSwatchParamas = function () {
        return { isTouchEnabled: !0 };
      }),
      (l.prototype.__getUpdateOpacityParams = function () {
        return { isTouchEnabled: !0 };
      }),
      (l.prototype.__getUpdateColorParams = function () {
        return { isTouchEnabled: !0 };
      }),
      (s.prototype._relayout = function () {
        let e =
          !(arguments.length > 0 && void 0 !== arguments[0]) || arguments[0];
        this._container.gOverlay("relayout", { preserveTop: e });
      }),
      (e.exports = l);
  }