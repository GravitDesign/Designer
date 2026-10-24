/**
 * Webpack Module #1270
 * Type: class
 * Name: GPolygonProperties
 */

function (e, t, n) {
    "use strict";
    n(57), n(3), n(4), n(13);
    var o = n(1),
      i = n(67),
      a = n(123),
      r = (n(173), n(135));
    function s() {
      this._polygons = [];
    }
    o.GObject.inherit(s, a),
      (s.prototype._panel = null),
      (s.prototype._advancedPanel = null),
      (s.prototype._document = null),
      (s.prototype._polygons = null),
      (s.prototype.init = function (e, t) {
        this._panel = e;
        var n = this,
          a = function (e) {
            if ("ir" === e || "or" === e)
              return $("<input>")
                .addClass("radius-input-" + e)
                .attr("type", "text")
                .attr("data-property", e)
                .on("change", function () {
                  gDesigner.stats("polygonproperties_change_radius");
                  var t = n._document.getScene().stringToPoint($(this).val());
                  null !== t && "number" == typeof t && t >= 0
                    ? n._assignProperty(
                        e,
                        t,
                        o.GLocale.get(
                          new o.GLocaleKey(
                            "GPolygonProperties",
                            "action.change-radius"
                          )
                        )
                      )
                    : n._updateProperties();
                })
                .gInputBox();
            if ("ia" === e || "oa" === e)
              return $("<input>")
                .addClass("angle-input-" + e)
                .attr("type", "text")
                .attr("data-property", e)
                .on("change", function () {
                  gDesigner.stats("polygonproperties_change_angle");
                  var t = o.GLength.parseEquationValue($(this).val());
                  null !== t
                    ? ((t = o.GMath.normalizeAngleRadians(
                        o.GMath.toRadians(t)
                      )),
                      n._assignProperty(
                        e,
                        o.GMath.PI2 - t,
                        o.GLocale.get(
                          new o.GLocaleKey(
                            "GPolygonProperties",
                            "action.change-angle"
                          )
                        )
                      ))
                    : n._updateProperties();
                })
                .gInputBox({ fixedIncrement: !0 });
            if ("ict" === e || "oct" === e)
              return $("<button></button>")
                .addClass("g-flat")
                .attr("data-property", e)
                .gCornerTypePicker()
                .on("cornertypechange", function (t, i) {
                  n._assignProperty(
                    e,
                    i,
                    o.GLocale.get(
                      new o.GLocaleKey(
                        "GPolygonProperties",
                        "action.change-corner-type"
                      )
                    )
                  );
                });
            if ("icr" === e || "ocr" === e)
              return $("<input>")
                .attr("type", "text")
                .attr("data-property", e)
                .on("change", function (t) {
                  gDesigner.stats("polygonproperties_change_corner-radius");
                  var i = n._document.getScene().stringToPoint($(this).val());
                  null !== i && "number" == typeof i && i >= 0
                    ? n._assignProperty(
                        e,
                        i < 0 ? 0 : i,
                        o.GLocale.get(
                          new o.GLocaleKey(
                            "GPolygonProperties",
                            "action.change-corner-radius"
                          )
                        )
                      )
                    : n._updateProperties();
                })
                .gInputBox();
            if ("corners-type" !== e) {
              if ("corners-radius-slider" === e)
                return $("<div/>")
                  .attr("data-property", "corners-radius-slider")
                  .gInputSlider({
                    min: 0,
                    max: 100,
                    richTooltipConfig: i.GRichTooltipConfig.from({
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
                    }),
                  })
                  .on("mousedown", function () {
                    n._document.getEditor().hideSelection(),
                      $(document).one("mouseup", function () {
                        n._document.getEditor().resetHideSelection();
                      });
                  })
                  .on("input", function () {
                    var e = n._assignCornersRadius(
                      parseInt($(this).gInputSlider("value")) / 100,
                      !0
                    );
                    n._panel
                      .find('[data-property="corners-radius"]')
                      .val(
                        n._document
                          .getScene()
                          .pointToString(
                            e,
                            n._document.getScene().getOptimalDecimalsCount()
                          )
                      );
                  })
                  .on("change", function () {
                    gDesigner.stats("polygonproperties_change_radius"),
                      n._assignCornersRadius(
                        parseInt($(this).gInputSlider("value")) / 100,
                        !1
                      );
                  });
              if ("corners-radius-input" === e)
                return $("<input>")
                  .attr("type", "text")
                  .attr("data-property", "corners-radius")
                  .addClass("corner-radius")
                  .on("change", function () {
                    gDesigner.stats("polygonproperties_change_corners-radius");
                    var e = n._document
                      .getScene()
                      .stringToPoint($(this).gInputBox("value"));
                    null !== e && "number" == typeof e && e >= 0
                      ? n._assignCornersRadius(e, !1, !0)
                      : n._updateProperties();
                  })
                  .gInputBox({ minValue: 0, incrementValue: 1 });
              throw new Error("Unknown input property: " + e);
            }
          };
        $("<div></div>")
          .gPropertyRow({
            label: o.GLocale.get(
              new o.GLocaleKey("GPolygonProperties", "text.points")
            ),
            columns: [
              {
                width: "auto",
                clazz: "point-slider-wrapper",
                content: $("<div/>")
                  .attr("data-property", "pts")
                  .gInputSlider({ min: 3, max: 25 })
                  .on("input", function () {
                    var e = $(this).gInputSlider("value");
                    n._assignPoints(parseInt(e), !0),
                      n._panel
                        .find('input[type="text"][data-property="pts"]')
                        .val(e);
                  })
                  .on("change", function (e) {
                    gDesigner.stats(
                      "polygonproperties_change_number-of-points"
                    ),
                      n._assignPoints(
                        parseInt($(this).gInputSlider("value")),
                        !1
                      );
                  }),
              },
              {
                width: "40px",
                content: $("<input>")
                  .attr("type", "text")
                  .attr("data-property", "pts")
                  .on("change", function (e) {
                    gDesigner.stats(
                      "polygonproperties_change_number-of-points"
                    ),
                      n._assignPoints(
                        o.GLength.parseEquationValue(
                          $(this).gInputBox("value")
                        ),
                        !1
                      );
                  })
                  .gInputBox({ minValue: 3 }),
              },
            ],
          })
          .appendTo(this._panel),
          $("<div></div>")
            .attr("data-plain-edges", "false")
            .gPropertyRow({
              label: o.GLocale.get(
                new o.GLocaleKey("GCommonNames", "text.size")
              ),
              columns: [
                {
                  width: "auto",
                  clazz: "size-slider-wrapper",
                  content: $("<div/>")
                    .attr("data-property", "size")
                    .gInputSlider({ min: 0, max: 100 })
                    .on("input", function () {
                      var e = parseInt($(this).gInputSlider("value"));
                      n._assignSize(e / 100, !0),
                        n._panel
                          .find('[type="text"][data-property="size"]')
                          .gInputBox("value", o.GUtil.formatNumber(e, 0));
                    })
                    .on("change", function () {
                      gDesigner.stats("polygonproperties_change_plain-edges"),
                        n._assignSize(
                          parseInt($(this).gInputSlider("value")) / 100,
                          !1
                        );
                    }),
                },
                {
                  width: "40px",
                  content: $("<input>")
                    .attr("type", "text")
                    .attr("data-property", "size")
                    .on("change", function () {
                      gDesigner.stats("polygonproperties_change_plain-edges"),
                        n._assignSize(
                          o.GLength.parseEquationValue(
                            $(this).gInputBox("value")
                          ) / 100,
                          !1
                        );
                    })
                    .gInputBox({ minValue: 0, maxValue: 100, postfix: "%" }),
                },
              ],
            })
            .appendTo(this._panel),
          $("<hr/>").appendTo(this._panel),
          $("<div></div>")
            .gPropertyRow({
              label: o.GLocale.get(
                new o.GLocaleKey("GCommonNames", "text.corner")
              ),
              columns: [
                {
                  width: "auto",
                  clazz: "corners-radius-slider-wrapper",
                  content: a("corners-radius-slider"),
                },
                { clazz: "corners-radius-no-padding" },
                {
                  clazz: "corners-radius-input-wrapper",
                  content: a("corners-radius-input"),
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
                        gDesigner.stats(
                          "polygonproperties_click_advanced-corners"
                        ),
                          this._advancedPanel.gOverlay(
                            "open",
                            $(e.target).closest(".g-button")
                          ),
                          gDesigner.isTouchEnabled()
                            ? (this._advancedPanel
                                .find(".edges-checkbox")
                                .gCheckboxSlider(),
                              this._advancedPanel
                                .find(".csc-checkbox")
                                .gCheckboxSlider())
                            : (this._advancedPanel
                                .find(".edges-checkbox")
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
            .appendTo(this._panel),
          (this._advancedPanel = $("<div></div>")
            .addClass("advanced-panel-wrapper")
            .gOverlay({ releaseOnClose: !1, clazz: "advanced-overlay" })),
          $("<div></div>")
            .gPropertyRow({
              columns: [
                {
                  width: "100%",
                  content: $("<div/>")
                    .css("margin-bottom", "10px")
                    .attr("data-property", "corners-type")
                    .addClass("corner-type")
                    .gCornerTypePicker({ notOverlay: !0 })
                    .on("cornertypechange", function (e, t) {
                      n._assignProperties(
                        ["ict", "oct"],
                        [t, t],
                        o.GLocale.get(
                          new o.GLocaleKey(
                            "GPolygonProperties",
                            "action.change-corner-type"
                          )
                        )
                      );
                    }),
                },
              ],
            })
            .appendTo(this._advancedPanel),
          $("<div></div>")
            .addClass("g-checkbox-label-wrapper")
            .gPropertyRow({
              columns: [
                {
                  width: "100%",
                  content: $("<label></label>")
                    .addClass("g-checkbox-label")
                    .append(
                      $("<input>")
                        .addClass("edges-checkbox")
                        .attr("type", "checkbox")
                        .attr("data-property", "edges")
                        .on("change", function () {
                          gDesigner.stats(
                            "polygonproperties_toggle_plain-edges",
                            $(this).is(":checked") ? "enabled" : "disabled"
                          ),
                            n._assignEdges($(this).is(":checked")),
                            n._updateProperties();
                        })
                    )
                    .append(
                      $(
                        "<span>" +
                          o.GLocale.get(
                            new o.GLocaleKey(
                              "GPolygonProperties",
                              "text.plain-edges"
                            )
                          ) +
                          "</span>"
                      )
                    ),
                },
              ],
            })
            .appendTo(this._advancedPanel),
          $("<div></div>")
            .addClass("g-checkbox-label-wrapper")
            .gPropertyRow({
              columns: [
                {
                  width: "100%",
                  content: $("<label></label>")
                    .addClass("g-checkbox-label")
                    .append(
                      $("<input>")
                        .addClass("csc-checkbox")
                        .attr("type", "checkbox")
                        .attr("data-property", "csc")
                        .on(
                          "change",
                          function (e) {
                            gDesigner.stats(
                              "polygonproperties_toggle_autoscale-corners",
                              $(e.target).is(":checked")
                                ? "enabled"
                                : "disabled"
                            ),
                              this._assignProperty(
                                "csc",
                                $(e.target).is(":checked")
                              );
                          }.bind(this)
                        )
                    )
                    .append(
                      $(
                        "<span>" +
                          o.GLocale.get(
                            new o.GLocaleKey(
                              "GCommonNames",
                              "text.autoscale-corners"
                            )
                          ) +
                          "</span>"
                      )
                    ),
                },
              ],
            })
            .appendTo(this._advancedPanel),
          $("<div></div>")
            .addClass("corner-row-wrapper")
            .gPropertyRow({
              label: o.GLocale.get(
                new o.GLocaleKey("GPolygonProperties", "text.corners")
              ),
              columns: [
                {
                  width: "50%",
                  content: $("<div></div>")
                    .addClass("corner-wrapper")
                    .append(a("ocr"))
                    .append(a("oct")),
                  label: o.GLocale.get(
                    new o.GLocaleKey("GCommonNames", "text.outside")
                  ),
                },
                {
                  width: "50%",
                  content: $("<div></div>")
                    .addClass("corner-wrapper")
                    .append(a("icr"))
                    .append(a("ict")),
                  label: o.GLocale.get(
                    new o.GLocaleKey("GCommonNames", "text.inside")
                  ),
                },
              ],
            })
            .appendTo(this._advancedPanel),
          $("<div></div>")
            .addClass("radius-row-wrapper")
            .gPropertyRow({
              label: o.GLocale.get(
                new o.GLocaleKey("GCommonNames", "text.radius")
              ),
              columns: [
                {
                  width: "50%",
                  content: a("or"),
                  label: o.GLocale.get(
                    new o.GLocaleKey("GCommonNames", "text.outside")
                  ),
                },
                {
                  width: "50%",
                  content: a("ir"),
                  label: o.GLocale.get(
                    new o.GLocaleKey("GCommonNames", "text.inside")
                  ),
                },
              ],
            })
            .appendTo(this._advancedPanel),
          $("<div></div>")
            .addClass("angles-row-wrapper")
            .gPropertyRow({
              label: o.GLocale.get(
                new o.GLocaleKey("GCommonNames", "text.angles")
              ),
              columns: [
                {
                  width: "50%",
                  content: a("oa"),
                  label: o.GLocale.get(
                    new o.GLocaleKey("GCommonNames", "text.outside")
                  ),
                },
                {
                  width: "50%",
                  content: a("ia"),
                  label: o.GLocale.get(
                    new o.GLocaleKey("GCommonNames", "text.inside")
                  ),
                },
              ],
            })
            .appendTo(this._advancedPanel);
      }),
      (s.prototype.update = function (e, t) {
        if (
          (this._document &&
            (this._document
              .getScene()
              .removeEventListener(
                o.GNode.AfterPropertiesChangeEvent,
                this._afterPropertiesChange
              ),
            gDesigner.removeEventListener(r, this._settingChanged),
            (this._document = null)),
          (this._polygons = []),
          e)
        ) {
          for (var n = 0; n < t.length; ++n)
            t[n] instanceof o.GPolygon && this._polygons.push(t[n]);
          if (this._polygons.length && this._polygons.length === t.length)
            return (
              (this._document = e),
              this._document
                .getScene()
                .addEventListener(
                  o.GNode.AfterPropertiesChangeEvent,
                  this._afterPropertiesChange,
                  this
                ),
              gDesigner.addEventListener(r, this._settingChanged, this),
              this._updateProperties(!0),
              !0
            );
        }
        return !1;
      }),
      (s.prototype._afterPropertiesChange = function (e) {
        !e.temporary &&
          this._polygons.length > 0 &&
          this._polygons[0] === e.node &&
          this._updateProperties();
      }),
      (s.prototype._settingChanged = function (e) {
        "decimals_num" === e.key && this._updateProperties();
      }),
      (s.prototype._updateProperties = function (e) {
        var t = this._polygons[0],
          n = t.getProperty("or"),
          i = t.getProperty("ir"),
          a = t.getProperty("pts"),
          r = (i / n) * 100,
          s = t.isPlainEdges(),
          l = t.getProperty("ocr");
        this._panel
          .find('.g-input-slider[data-property="pts"]')
          .gInputSlider("value", a),
          this._panel
            .find('[type="text"][data-property="pts"]')
            .gInputBox("value", a),
          this._panel
            .find('.g-input-slider[data-property="size"]')
            .gInputSlider("value", Math.round(r)),
          this._panel
            .find('[type="text"][data-property="size"]')
            .gInputBox("value", o.GUtil.formatNumber(r, 0)),
          this._advancedPanel
            .find('[data-property="corners-type"]')
            .gCornerTypePicker("value", t.getProperty("oct"));
        var c = t.getPointsMinDistance();
        s || (c /= 2), (l = Math.min(l, c));
        var d = c > 0 ? (l / c) * 100 : 0;
        this._panel
          .find('[data-property="corners-radius-slider"]')
          .gInputSlider("value", Math.round(d)),
          this._panel
            .find('[data-property="corners-radius"]')
            .val(
              this._document
                .getScene()
                .pointToString(
                  t.getProperty("ocr"),
                  this._document.getScene().getOptimalDecimalsCount()
                )
            ),
          e && s
            ? this._advancedPanel
                .find('input[data-property="edges"]')
                .prop("checked", !0)
            : s ||
              this._advancedPanel
                .find('input[data-property="edges"]')
                .prop("checked", !1),
          this._advancedPanel
            .find('input[data-property="csc"]')
            .prop("checked", !!t.getProperty("csc")),
          this._advancedPanel
            .find('button[data-property="oct"]')
            .gCornerTypePicker("value", t.getProperty("oct")),
          this._advancedPanel
            .find('button[data-property="ict"]')
            .gCornerTypePicker("value", t.getProperty("ict")),
          this._advancedPanel
            .find('input[data-property="ocr"]')
            .val(
              this._document
                .getScene()
                .pointToString(
                  t.getProperty("ocr"),
                  this._document.getScene().getOptimalDecimalsCount()
                )
            ),
          this._advancedPanel
            .find('input[data-property="icr"]')
            .val(
              this._document
                .getScene()
                .pointToString(
                  t.getProperty("icr"),
                  this._document.getScene().getOptimalDecimalsCount()
                )
            ),
          this._advancedPanel
            .find('input[data-property="or"]')
            .val(
              this._document
                .getScene()
                .pointToString(
                  t.getProperty("or"),
                  this._document.getScene().getOptimalDecimalsCount()
                )
            ),
          this._advancedPanel
            .find('input[data-property="ir"]')
            .val(
              this._document
                .getScene()
                .pointToString(
                  t.getProperty("ir"),
                  this._document.getScene().getOptimalDecimalsCount()
                )
            ),
          this._advancedPanel
            .find('input[data-property="oa"]')
            .val(
              o.GUtil.formatNumber(
                o.GMath.toDegrees(o.GMath.PI2 - t.getProperty("oa")),
                2
              )
            ),
          this._advancedPanel
            .find('input[data-property="ia"]')
            .val(
              o.GUtil.formatNumber(
                o.GMath.toDegrees(o.GMath.PI2 - t.getProperty("ia")),
                2
              )
            ),
          this._panel
            .find('[data-plain-edges="false"]')
            .css(
              "display",
              this._advancedPanel
                .find('input[data-property="edges"]')
                .prop("checked")
                ? "none"
                : ""
            );
      }),
      (s.prototype._assignCornersRadius = function (e, t, n) {
        t || this._document.getEditor().beginTransaction();
        var i = 0;
        try {
          for (var a = 0; a < this._polygons.length; ++a) {
            var r = this._polygons[a];
            if (r.isVisible()) {
              var s = e;
              if (!n) s = e * r.getPointsMinDistance();
              r.isPlainEdges()
                ? r.setProperties(["ocr"], [s], !1, !1, t)
                : (n || (s /= 2),
                  r.setProperties(["ocr", "icr"], [s, s], !1, !1, t)),
                0 === a && (i = s);
            }
          }
        } finally {
          t ||
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
      (s.prototype._assignProperty = function (e, t, n) {
        this._assignProperties([e], [t], n);
      }),
      (s.prototype._assignProperties = function (e, t, n) {
        var o = this._document.getEditor();
        o.beginTransaction();
        try {
          for (var i = 0; i < this._polygons.length; ++i)
            this._polygons[i].setProperties(e, t);
        } finally {
          o.commitTransaction(n);
        }
      }),
      (s.prototype._assignSize = function (e, t) {
        t || this._document.getEditor().beginTransaction();
        try {
          for (var n = 0; n < this._polygons.length; ++n) {
            var i = this._polygons[n],
              a = i.getProperty("or") * e;
            i.setProperty("ir", a, !1, !1, t);
          }
        } finally {
          t ||
            this._document
              .getEditor()
              .commitTransaction(
                o.GLocale.get(
                  new o.GLocaleKey(
                    "GPolygonProperties",
                    "action.change-polygon-size"
                  )
                )
              );
        }
      }),
      (s.prototype._assignPoints = function (e, t) {
        t || this._document.getEditor().beginTransaction();
        try {
          for (var n = 0; n < this._polygons.length; ++n) {
            var i = this._polygons[n],
              a = i.isPlainEdges(),
              r = Math.PI / e,
              s = o.GMath.normalizeAngleRadians(i.getProperty("oa") + r);
            if (a) {
              var l = i.getProperty("or") * Math.cos(r);
              i.setProperties(["pts", "ia", "ir"], [e, s, l], !1, !1, t);
            } else i.setProperties(["pts", "ia"], [e, s], !1, !1, t);
          }
        } finally {
          t ||
            this._document
              .getEditor()
              .commitTransaction(
                o.GLocale.get(
                  new o.GLocaleKey(
                    "GPolygonProperties",
                    "action.change-polygon-points"
                  )
                )
              );
        }
      }),
      (s.prototype._assignEdges = function (e, t) {
        if (e) {
          t || this._document.getEditor().beginTransaction();
          try {
            for (var n = 0; n < this._polygons.length; ++n) {
              var i = this._polygons[n],
                a = i.getProperty("or"),
                r = i.getProperty("pts"),
                s = i.getProperty("oa"),
                l = Math.PI / r,
                c = s + l,
                d = a * Math.cos(l);
              i.setProperties(["ir", "ia"], [d, c], !1, !1, t);
            }
          } finally {
            t ||
              this._document
                .getEditor()
                .commitTransaction(
                  o.GLocale.get(
                    new o.GLocaleKey(
                      "GPolygonProperties",
                      "action.change-polygon-size"
                    )
                  )
                );
          }
        }
      }),
      (s.prototype.toString = function () {
        return "[Object GPolygonProperties]";
      }),
      (e.exports = s);
  }