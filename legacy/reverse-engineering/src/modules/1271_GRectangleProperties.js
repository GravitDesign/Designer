/**
 * Webpack Module #1271
 * Type: class
 * Name: GRectangleProperties
 */

function (e, t, n) {
    "use strict";
    n(57), n(3), n(4), n(13);
    var o = n(1),
      i = n(53),
      a = n(67),
      r = n(123),
      s = (n(173), n(135));
    function l() {
      this._rectangles = [];
    }
    o.GObject.inherit(l, r),
      (l.prototype._panel = null),
      (l.prototype._advancedPanel = null),
      (l.prototype._document = null),
      (l.prototype._rectangles = null),
      (l.prototype.isGroup = function (e) {
        return !0;
      }),
      (l.prototype.init = function (e, t) {
        this._panel = e;
        var n = this,
          r = function (e) {
            if ("uf" === e)
              return $("<input>")
                .addClass("uf-checkbox")
                .attr("type", "checkbox")
                .attr("data-property", e)
                .on("change", function () {
                  gDesigner.stats(
                    "rectangleproperties_toggle_uniform",
                    $(this).is(":checked") ? "enabled" : "disabled"
                  ),
                    n._assignProperty(e, $(this).is(":checked")),
                    n._updateProperties();
                });
            if ("csc" === e)
              return $("<input>")
                .addClass("csc-checkbox")
                .attr("type", "checkbox")
                .attr("data-property", e)
                .on("change", function () {
                  gDesigner.stats(
                    "rectangleproperties_toggle_scale-corners",
                    $(this).is(":checked") ? "enabled" : "disabled"
                  ),
                    n._assignProperty(e, $(this).is(":checked"));
                });
            if (
              "tl_sx" === e ||
              "tl_sy" === e ||
              "tr_sx" === e ||
              "tr_sy" === e ||
              "bl_sx" === e ||
              "bl_sy" === e ||
              "br_sx" === e ||
              "br_sy" === e
            ) {
              var t = "";
              return (
                ("tl_sy" !== e &&
                  "tr_sy" !== e &&
                  "bl_sy" !== e &&
                  "br_sy" !== e) ||
                  (t = "sy-input"),
                $("<input>")
                  .addClass("corner-input")
                  .addClass(t)
                  .attr("type", "text")
                  .attr("data-property", e)
                  .on("change", function () {
                    gDesigner.stats(
                      "rectangleproperties_scale_individual-corners"
                    );
                    var t = n._document.getScene().stringToPoint($(this).val());
                    null !== t && "number" == typeof t && t >= 0
                      ? n._assignProperty(e, t)
                      : n._updateProperties();
                  })
                  .gInputBox()
              );
            }
            if (
              "tl_ct" === e ||
              "tr_ct" === e ||
              "bl_ct" === e ||
              "br_ct" === e
            ) {
              var r = 0,
                s = "right";
              return (
                "tl_ct" === e
                  ? ((r = 270), (s = "left"))
                  : "bl_ct" === e
                  ? ((r = 180), (s = "left"))
                  : "br_ct" === e && (r = 90),
                $("<button></button>")
                  .addClass("g-flat")
                  .addClass(s)
                  .attr("data-property", e)
                  .css("width", "32px")
                  .gCornerTypePicker({ rotate: r })
                  .on("cornertypechange", function (t, o) {
                    n._assignProperty(e, o);
                  })
              );
            }
            if (
              "tl_uf" === e ||
              "tr_uf" === e ||
              "bl_uf" === e ||
              "br_uf" === e
            ) {
              var l = "uf-right";
              return (
                ("tl_uf" !== e && "bl_uf" !== e) || (l = "uf-left"),
                $("<button></button>")
                  .addClass("g-flat")
                  .addClass("uf-btn")
                  .addClass(l)
                  .attr("data-property", e)
                  .on("click", function () {
                    gDesigner.stats(
                      "rectangleproperties_toggle_individual-uniform-corners"
                    ),
                      n._assignProperty(e, !$(this).hasClass("g-active")),
                      n._updateProperties();
                  })
                  .append($("<span></span>").addClass("gravit-icon-lock"))
              );
            }
            if ("corners-type" !== e) {
              if ("corners-radius-slider" === e)
                return $("<div/>")
                  .attr("data-property", "corners-radius")
                  .gInputSlider({
                    min: 0,
                    max: 100,
                    richTooltipConfig: a.GRichTooltipConfig.from({
                      title: o.GLocale.get(
                        new o.GLocaleKey(
                          "GCommonNames",
                          "text.corner-radius-slider-tooltip-title"
                        )
                      ),
                      description: o.GLocale.get(
                        new o.GLocaleKey(
                          "GCommonNames",
                          "text.corner-radius-slider-tooltip-description"
                        )
                      ),
                      learnMore:
                        "",
                    }),
                  })
                  .on("mousedown", function () {
                    n._document.getEditor().hideSelection(),
                      $(document).one("mouseup", function () {
                        n._document.getEditor().resetHideSelection();
                      });
                  })
                  .on("input", function () {
                    var e = n._assignCorners(
                        parseInt($(this).gInputSlider("value")) / 100,
                        void 0,
                        !0
                      ),
                      t = n._document.getScene().getProperty("ut"),
                      a =
                        (t == o.GLength.Unit.PX || t == o.GLength.Unit.PT) &&
                        i.GGuides.options.guides &&
                        i.GGuides.options.guides.indexOf(
                          i.GFullPixelsGuide.ID
                        ) >= 0
                          ? 0
                          : n._document.getScene().getOptimalDecimalsCount();
                    n._panel
                      .find('[type="text"][data-property="corners-radius"]')
                      .val(n._document.getScene().pointToString(e, a));
                  })
                  .on("change", function () {
                    gDesigner.stats("rectangleproperties_input_corners-radius"),
                      n._assignCorners(
                        parseInt($(this).gInputSlider("value")) / 100,
                        void 0,
                        !1
                      );
                  });
              if ("corners-radius-input" === e)
                return $("<input>")
                  .attr("type", "text")
                  .attr("data-property", "corners-radius")
                  .addClass("corner-radius")
                  .on("change", function () {
                    gDesigner.stats("rectangleproperties_slide_corners-radius");
                    var e = n._document
                      .getScene()
                      .stringToPoint($(this).gInputBox("value"));
                    null !== e && "number" == typeof e && e >= 0
                      ? n._assignProperties(["uf", "tl_sx"], [!0, e])
                      : n._updateProperties();
                  })
                  .gInputBox({ minValue: 0 });
              throw new Error("Unknown input property: " + e);
            }
          }.bind(this),
          s = o.GLocale.get(
            new o.GLocaleKey(
              "GRectangleProperties",
              "text.uniform-corner-smoothness"
            )
          ),
          l = o.GLocale.get(
            new o.GLocaleKey(
              "GRectangleProperties",
              "text.horizontal-corner-smoothness"
            )
          ),
          c = o.GLocale.get(
            new o.GLocaleKey(
              "GRectangleProperties",
              "text.vertical-corner-smoothness"
            )
          ),
          d = o.GLocale.get(
            new o.GLocaleKey("GRectangleProperties", "text.corner-type")
          );
        (this._advancedPanel = $("<div></div>")
          .addClass("advanced-panel-wrapper")
          .addClass("rectangle-properties")
          .gOverlay({ releaseOnClose: !1, clazz: "advanced-overlay" })
          .append(
            $("<div/>")
              .css("margin-bottom", "10px")
              .attr("data-property", "corners-type")
              .addClass("corner-type")
              .gCornerTypePicker({ notOverlay: !0 })
              .on("cornertypechange", function (e, t) {
                n._assignCorners(void 0, t);
              })
          )
          .append(
            $("<label></label>")
              .addClass("g-checkbox-label")
              .append(r("csc"))
              .append(
                $("<span></span>").text(
                  o.GLocale.get(
                    new o.GLocaleKey("GCommonNames", "text.autoscale-corners")
                  )
                )
              )
          )
          .append(
            $("<label></label>")
              .addClass("g-checkbox-label")
              .append(r("uf"))
              .append(
                $("<span></span>").text(
                  o.GLocale.get(
                    new o.GLocaleKey(
                      "GRectangleProperties",
                      "text.uniform-corners"
                    )
                  )
                )
              )
          )
          .append(
            $("<div></div>")
              .addClass("corners-panel")
              .append(
                $("<div></div>")
                  .addClass("corners-item-row with-padding")
                  .append(r("tl_ct").attr("data-title", s))
                  .append(r("tl_sx").attr("data-title", l))
                  .append(r("tr_sx").attr("data-title", l))
                  .append(r("tr_ct").attr("data-title", s))
              )
              .append(
                $("<div></div>")
                  .addClass("corners-item-row with-padding")
                  .append(r("tl_sy").attr("data-title", c))
                  .append(r("tl_uf").attr("data-title", d))
                  .append(r("tr_uf").attr("data-title", d))
                  .append(r("tr_sy").attr("data-title", c))
              )
              .append(
                $("<div></div>")
                  .addClass("corners-item-row with-padding")
                  .append(r("bl_sy").attr("data-title", c))
                  .append(r("bl_uf").attr("data-title", d))
                  .append(r("br_uf").attr("data-title", d))
                  .append(r("br_sy").attr("data-title", c))
              )
              .append(
                $("<div></div>")
                  .addClass("corners-item-row with-padding")
                  .append(r("bl_ct").attr("data-title", s))
                  .append(r("bl_sx").attr("data-title", l))
                  .append(r("br_sx").attr("data-title", l))
                  .append(r("br_ct").attr("data-title", s))
              )
          )),
          $("<div></div>")
            .gPropertyRow({
              label: o.GLocale.get(
                new o.GLocaleKey("GCommonNames", "text.corner")
              ),
              columns: [
                {
                  width: "auto",
                  clazz: "corners-radius-slider-wrapper",
                  content: r("corners-radius-slider"),
                },
                { clazz: "corners-radius-no-padding" },
                {
                  clazz: "corners-radius-input-wrapper",
                  content: r("corners-radius-input"),
                },
                { width: "3px" },
                {
                  clazz: "advanced-settings-col",
                  content: $("<div></div>")
                    .attr(
                      "data-title",
                      o.GLocale.get(
                        new o.GLocaleKey(
                          "GCommonNames",
                          "text.advanced-settings"
                        )
                      )
                    )
                    .addClass("g-button g-icon g-advanced-setting")
                    .css({ display: "flex", justifyContent: "center" })
                    .append(
                      $("<span></span>")
                        .addClass("gravit-icon-settings")
                        .css({ alignSelf: "center", lineHeight: "19px" })
                    )
                    .on(
                      "click",
                      function (e) {
                        gDesigner.stats("rectangleproperties_open_advanced"),
                          this._advancedPanel.gOverlay(
                            "open",
                            $(e.target).closest(".g-button")
                          ),
                          gDesigner.isTouchEnabled()
                            ? (this._advancedPanel
                                .find(".uf-checkbox")
                                .gCheckboxSlider(),
                              this._advancedPanel
                                .find(".csc-checkbox")
                                .gCheckboxSlider())
                            : (this._advancedPanel
                                .find(".uf-checkbox")
                                .gCheckboxSlider("unmount"),
                              this._advancedPanel
                                .find(".csc-checkbox")
                                .gCheckboxSlider("unmount"));
                        var t = $('div[data-property="corners-type"]');
                        t.gCornerTypePicker(
                          "update",
                          t.gCornerTypePicker("value")
                        );
                      }.bind(this)
                    ),
                },
              ],
            })
            .addClass("corner-radius")
            .appendTo(this._panel);
      }),
      (l.prototype.update = function (e, t) {
        if (
          (this._document &&
            (this._document
              .getScene()
              .removeEventListener(
                o.GNode.AfterPropertiesChangeEvent,
                this._afterPropertiesChange
              ),
            gDesigner.removeEventListener(s, this._settingChanged),
            (this._document = null)),
          (this._rectangles = []),
          e)
        ) {
          for (var n = 0; n < t.length; ++n)
            t[n] instanceof o.GRectangle && this._rectangles.push(t[n]);
          if (this._rectangles.length && this._rectangles.length === t.length)
            return (
              (this._document = e),
              this._document
                .getScene()
                .addEventListener(
                  o.GNode.AfterPropertiesChangeEvent,
                  this._afterPropertiesChange,
                  this
                ),
              gDesigner.addEventListener(s, this._settingChanged, this),
              this._updateProperties(),
              !0
            );
        }
        return !1;
      }),
      (l.prototype._afterPropertiesChange = function (e) {
        !e.temporary &&
          this._rectangles.length > 0 &&
          this._rectangles[0] === e.node &&
          this._updateProperties();
      }),
      (l.prototype._settingChanged = function (e) {
        "decimals_num" === e.key && this._updateProperties();
      }),
      (l.prototype._updateProperties = function () {
        var e = this._rectangles[0],
          t = e.getProperty("tl_sx"),
          n = e.getGeometryBBox(),
          a = this._panel.find(
            '.g-input-slider[data-property="corners-radius"]'
          ),
          r = this._panel.find(
            'input[type="text"][data-property="corners-radius"]'
          ),
          s = this._advancedPanel.find('[data-property="corners-type"]'),
          l = null === n;
        if (
          (a.prop("disabled", l),
          r.prop("disabled", l),
          this._panel.find("button").prop("disabled", l),
          l)
        )
          s.addClass("g-disabled");
        else {
          s.removeClass("g-disabled");
          var c = (t / (e.getPointsMinDistance() / 2)) * 100,
            d = this._document.getScene().getProperty("ut"),
            u =
              (d == o.GLength.Unit.PX || d == o.GLength.Unit.PT) &&
              i.GGuides.options.guides &&
              i.GGuides.options.guides.indexOf(i.GFullPixelsGuide.ID) >= 0
                ? 0
                : this._document.getScene().getOptimalDecimalsCount();
          a.gInputSlider("value", Math.round(c)),
            r.gInputBox("value", this._document.getScene().pointToString(t, u)),
            s.gCornerTypePicker("value", e.getProperty("tl_ct")),
            this._advancedPanel
              .find('input[data-property="csc"]')
              .prop("disabled", l || e instanceof o.GImage)
              .prop("checked", !!e.getProperty("csc"));
          var p = e.getProperty("uf");
          if (
            (this._advancedPanel
              .find('input[data-property="uf"]')
              .prop("checked", p),
            p)
          )
            this._advancedPanel.find(".corners-panel").css("display", "none");
          else
            this._advancedPanel.find(".corners-panel").css("display", ""),
              function (t) {
                for (var n = 0; n < t.length; ++n) {
                  var o = t[n],
                    i = this._advancedPanel.find(
                      'button[data-property="' + o + '_uf"]'
                    ),
                    a = this._advancedPanel.find(
                      'input[data-property="' + o + '_sx"]'
                    ),
                    r = this._advancedPanel.find(
                      'input[data-property="' + o + '_sy"]'
                    ),
                    s = this._advancedPanel.find(
                      'button[data-property="' + o + '_ct"]'
                    );
                  a.val(
                    this._document
                      .getScene()
                      .pointToString(e.getProperty(o + "_sx"), u)
                  ),
                    r.val(
                      this._document
                        .getScene()
                        .pointToString(e.getProperty(o + "_sy"), u)
                    ),
                    e.getProperty(o + "_uf")
                      ? (i.addClass("g-active"), r.prop("disabled", !0))
                      : (i.removeClass("g-active"), r.prop("disabled", !1)),
                    i.prop("disabled", p),
                    s.gCornerTypePicker("value", e.getProperty(o + "_ct"));
                }
              }.bind(this)(["tl", "tr", "bl", "br"]);
        }
      }),
      (l.prototype._assignCorners = function (e, t, n) {
        n || this._document.getEditor().beginTransaction();
        var i = 0;
        try {
          for (var a = 0; a < this._rectangles.length; ++a)
            if (this._rectangles[a].isVisible()) {
              var r = this._rectangles[a].getProperty("tl_sx"),
                s = this._rectangles[a].getProperty("tl_ct");
              if (
                (0 === r &&
                  "string" == typeof t &&
                  "number" != typeof e &&
                  (e = 0.25),
                "number" == typeof e)
              ) {
                this._rectangles[a].getGeometryBBox();
                r = e * (this._rectangles[a].getPointsMinDistance() / 2);
              }
              "string" == typeof t && (s = t),
                0 === a && (i = r),
                this._rectangles[a].setProperties(
                  ["uf", "tl_sx", "tl_ct"],
                  [!0, r, s],
                  !1,
                  !1,
                  n
                );
            }
        } finally {
          n ||
            this._document
              .getEditor()
              .commitTransaction(
                o.GLocale.get(
                  new o.GLocaleKey("GCommonNames", "action.change-corners")
                )
              );
        }
        return i;
      }),
      (l.prototype._assignProperty = function (e, t) {
        this._assignProperties([e], [t]);
      }),
      (l.prototype._assignProperties = function (e, t) {
        var n = this._document.getEditor();
        n.beginTransaction();
        try {
          for (var i = 0; i < this._rectangles.length; ++i)
            this._rectangles[i].setProperties(e, t);
        } finally {
          n.commitTransaction(
            o.GLocale.get(
              new o.GLocaleKey(
                "GRectangleProperties",
                "action.modify-rectangle-properties"
              )
            )
          );
        }
      }),
      (l.prototype.toString = function () {
        return "[Object GRectangleProperties]";
      }),
      (e.exports = l);
  }