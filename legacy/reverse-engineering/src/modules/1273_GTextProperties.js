/**
 * Webpack Module #1273
 * Type: class
 * Name: GTextProperties
 */

function (e, t, n) {
    "use strict";
    n(58),
      n(19),
      n(168),
      n(328),
      n(96),
      n(193),
      n(57),
      n(8),
      n(20),
      n(3),
      n(71),
      n(247),
      n(134),
      n(4),
      n(322),
      n(41),
      n(13),
      n(32),
      n(38),
      n(169),
      n(97),
      n(33),
      n(26);
    var o = n(53),
      i = n(1),
      a = n(15),
      r = n(40),
      s = n(67),
      l = n(123),
      c = n(255),
      d = n(590),
      u = n(135),
      p = n(44);
    const g = n(148),
      { toCapitalize: h } = n(40),
      { LISTS_FEATURE: f } = n(10);
    var m = "#2635#";
    const y = {
      None: {
        get label() {
          return i.GLocale.get(
            new i.GLocaleKey("GTextProperties", "text.marker-none")
          );
        },
        value: "none",
      },
      Bullet: {
        get label() {
          return i.GLocale.get(
            new i.GLocaleKey("GTextProperties", "text.marker-bulleted")
          );
        },
        value: "bulleted",
        types: [
          { icon: "gravit-icon-bullets-1", value: i.GText.Markers.Bullet },
          { icon: "gravit-icon-bullets-2", value: i.GText.Markers.Check },
          { icon: "gravit-icon-bullets-3", value: i.GText.Markers.Square },
        ],
      },
      Number: {
        get label() {
          return i.GLocale.get(
            new i.GLocaleKey("GTextProperties", "text.marker-numbered")
          );
        },
        value: "numbered",
        types: [
          { icon: "gravit-icon-numbers-1", value: i.GText.Markers.RomanDot },
          {
            icon: "gravit-icon-numbers-2",
            value: i.GText.Markers.RomanBracket,
          },
          { icon: "gravit-icon-numbers-3", value: i.GText.Markers.Number },
        ],
      },
    };
    function v() {
      (this._text = []), (this._weightsAvailable = []);
    }
    i.GObject.inherit(v, l),
      (v.prototype._panel = null),
      (v.prototype._document = null),
      (v.prototype._text = null),
      (v.prototype._ownChange = !1),
      (v.prototype._chooserElem = null),
      (v.prototype._openingInlineEditor = !1),
      (v.prototype._weightsAvailable = null),
      (v.prototype._advancedSettings = null),
      (v.prototype._listTypeSettings = null),
      (v.prototype._advancedSettingsButton = null),
      (v.prototype._scriptBlock = null),
      (v.prototype._sizingBlock = null),
      (v.prototype._autoScrollBlock = null),
      (v.prototype.init = function (e, t) {
        (this._panel = e.addClass("text-properties-panel")),
          (this._advancedSettings = this._getAdvancedSettingsOverlayDiv()),
          (this._listTypeSettings = $("<div></div>")
            .addClass("list-type-settings")
            .append(
              $("<div></div>")
                .addClass("list-type-options")
                .append(
                  Object.values(y).map((e) => {
                    let { label: t, value: n, types: o } = e;
                    return $("<div></div>")
                      .addClass("list-type-group")
                      .attr("value", n)
                      .append(
                        $("<div/>")
                          .addClass("list-type-group-header")
                          .append($("<span/>").addClass("gravit-icon-check"))
                          .append($("<span/>").text(t))
                      )
                      .on("click", o ? null : () => this._assignMarker(null))
                      .append(
                        $("<div/>")
                          .addClass("list-type-group-container")
                          .append(
                            o
                              ? o.map((e) => {
                                  let { value: t, icon: n } = e;
                                  return $("<div></div>")
                                    .addClass("list-type-option")
                                    .attr("value", t)
                                    .append($("<div/>").addClass(n))
                                    .on("click", (e) => {
                                      const t = $(e.target)
                                        .closest(".list-type-option")
                                        .attr("value");
                                      gDesigner.stats(
                                        "textproperties_change_list-type",
                                        t
                                      ),
                                        this._assignMarker(t);
                                    });
                                })
                              : ""
                          )
                      );
                  })
                )
            )
            .gOverlay({
              releaseOnClose: !1,
              clazz: "list-type-settings-overlay",
            }));
        var n = function (e) {
          var t = this;
          if ("_pm" === e)
            return $("<div></div>")
              .attr("data-property", e)
              .addClass("g-select")
              .append($("<span/>"))
              .on(
                "click",
                r.watchDog.trap(
                  (e) => {
                    this._listTypeSettings.gOverlay("open", $(e.target));
                  },
                  null,
                  (t) =>
                    gDesigner.stats(
                      "textproperties_nonprotriespro_advanced-settings",
                      e
                    )
                )
              );
          if (0 === e.indexOf("typography")) {
            const n = e.substr("typography-".length);
            return $("<button></button>")
              .addClass("g-button")
              .addClass("typography-button")
              .attr("data-property", e)
              .on(
                "click",
                r.watchDog.trap(
                  (e) => {
                    gDesigner.stats("textproperties_change_typography", n),
                      t._toggleFormatting(n);
                  },
                  null,
                  (t) =>
                    gDesigner.stats(
                      "textproperties_nonprotriespro_advanced-settings",
                      e
                    )
                )
              )
              .append(
                $("<span></span>").addClass(
                  "gravit-icon-text-typography-".concat(n)
                )
              );
          }
          if (0 === e.indexOf("_ttsc")) {
            const n = e.substr("_ttsc-".length);
            return $("<button></button>")
              .addClass("g-button")
              .addClass("script-button")
              .attr("data-property", e)
              .on(
                "click",
                r.watchDog.trap(
                  (e) => {
                    gDesigner.stats("textproperties_change_typography", n),
                      t._assignProperty(
                        "_ttsc",
                        $(e.target).closest("button").hasClass("g-active")
                          ? null
                          : n
                      );
                  },
                  null,
                  (t) =>
                    gDesigner.stats(
                      "textproperties_nonprotriespro_advanced-settings",
                      e
                    )
                )
              )
              .append(
                $("<span></span>").addClass(
                  "gravit-icon-text-typography-".concat(n, "script")
                )
              );
          }
          if ("_tlsc" === e) {
            var n = $("<select></select>").attr("data-property", "_tlsc");
            return (
              n.append(
                $("<option></option>")
                  .attr("value", "auto")
                  .text(
                    i.GLocale.get(
                      new i.GLocaleKey("GTextProperties", "text.auto")
                    )
                  )
              ),
              n.on("change", function (e) {
                gDesigner.stats(
                  "textproperties_change_language-script",
                  $(e.target).val()
                ),
                  t._assignProperty("_tlsc", $(e.target).val());
              }),
              n
            );
          }
          if ("_tv" === e)
            return $("<select />")
              .attr("data-property", "_tv")
              .on(
                "change",
                r.watchDog.trap(
                  (e) => {
                    var n = $(e.target).text();
                    gDesigner.stats("textproperties_change_variation", n),
                      t._assignProperty("_tv", $(e.target).val());
                  },
                  null,
                  (t) =>
                    gDesigner.stats(
                      "textproperties_nonprotriespro_advanced-settings",
                      e
                    )
                )
              );
          if (0 === e.indexOf("_ttrf-")) {
            var a = "",
              s = e.substr("_ttrf-".length);
            switch (s) {
              case i.GStylable.TextTransformation.Uppercase:
                a = "gravit-icon-text-transform-uppercase";
                break;
              case i.GStylable.TextTransformation.Lowercase:
                a = "gravit-icon-text-transform-lowercase";
                break;
              case i.GStylable.TextTransformation.Capitalize:
                a = "gravit-icon-text-transform-capitalize";
                break;
              case i.GStylable.TextTransformation.SmallCaps:
                a = "gravit-icon-text-transform-smallcaps";
            }
            var l = Object.keys(i.GStylable.TextTransformation).find(
              (e) => i.GStylable.TextTransformation[e] === s
            );
            return $("<button></button>")
              .addClass("g-button")
              .addClass("transformation-button")
              .attr("data-property", e)
              .on(
                "click",
                r.watchDog.trap(
                  (e) => {
                    gDesigner.stats(
                      "textproperties_change_transformation",
                      l ? l.toLowerCase() : ""
                    ),
                      t._assignProperty(
                        "_ttrf",
                        $(e.target).closest("button").hasClass("g-active")
                          ? null
                          : s
                      );
                  },
                  null,
                  (t) =>
                    gDesigner.stats(
                      "textproperties_nonprotriespro_advanced-settings",
                      e
                    )
                )
              )
              .append($("<span></span>").addClass(a));
          }
          if (0 === e.indexOf("va-")) {
            a = "";
            switch ((d = e.substr("va-".length))) {
              case i.GText.VerticalAlign.Top:
                a = "gravit-icon-text-align-top";
                break;
              case i.GText.VerticalAlign.Middle:
                a = "gravit-icon-text-align-middle";
                break;
              case i.GText.VerticalAlign.Bottom:
                a = "gravit-icon-text-align-bottom";
            }
            return $("<button></button>")
              .addClass("g-button")
              .addClass("vertical-align")
              .attr("data-property", e)
              .on("click", function () {
                gDesigner.stats(
                  "textproperties_change_vertical-align",
                  d === i.GText.VerticalAlign.Top
                    ? "top"
                    : i.GText.VerticalAlign.Middle
                    ? "middle"
                    : "bottom"
                ),
                  t._assignProperty(
                    "va",
                    $(this).hasClass("g-active") ? null : d
                  );
              })
              .append($("<span></span>").addClass(a));
          }
          if (0 === e.indexOf("_pal-")) {
            var d;
            a = "";
            switch ((d = e.substr("_pal-".length))) {
              case i.GStylable.ParagraphAlignment.Left:
                a = "gravit-icon-text-align-left";
                break;
              case i.GStylable.ParagraphAlignment.Center:
                a = "gravit-icon-text-align-center";
                break;
              case i.GStylable.ParagraphAlignment.Right:
                a = "gravit-icon-text-align-right";
                break;
              case i.GStylable.ParagraphAlignment.Justify:
                a = "gravit-icon-text-justify";
            }
            return $("<button></button>")
              .addClass("g-button")
              .addClass("alignment-button")
              .attr("data-property", e)
              .on("click", function () {
                gDesigner.stats(
                  "textproperties_change_paragraph-align",
                  d === i.GStylable.ParagraphAlignment.Left
                    ? "left"
                    : d === i.GStylable.ParagraphAlignment.Right
                    ? "right"
                    : d === i.GStylable.ParagraphAlignment.Justify
                    ? "justify"
                    : d === i.GStylable.ParagraphAlignment.Center
                    ? "center"
                    : "unkn"
                ),
                  t._assignProperty(
                    "_pal",
                    $(this).hasClass("g-active") ? null : d
                  );
              })
              .append($("<span></span>").addClass(a));
          }
          if ("aw" === e || "ah" === e)
            return $("<div></div>")
              .attr("data-property", e)
              .append(
                $("<button></button>")
                  .addClass("sizing-button-auto")
                  .addClass("g-group-start g-button")
                  .on("click", () => {
                    gDesigner.stats(
                      "textproperties_change_auto-widthheight",
                      "auto"
                    ),
                      t._assignProperty(e, !0);
                  })
                  .text(
                    i.GLocale.get(
                      new i.GLocaleKey("GTextProperties", "text.auto")
                    )
                  )
              )
              .append(
                $("<button></button>")
                  .addClass("sizing-button-fixed")
                  .addClass("g-group-end g-button")
                  .on("click", () => {
                    gDesigner.stats(
                      "textproperties_change_auto-widthheight",
                      "fixed"
                    ),
                      t._assignProperty(e, !1);
                  })
                  .text(
                    i.GLocale.get(
                      new i.GLocaleKey("GTextProperties", "text.fix")
                    )
                  )
              );
          if ("_fc" === e)
            return $("<div></div>")
              .prop("disabled", !0)
              .attr("data-property", "_fc")
              .attr("id", "text-color")
              .gPatternChooser({ types: [i.GColor], hasOpacity: !1 })
              .on("chooseropen", function () {
                t._document.getEditor().hideSelection(),
                  (t._chooserElem = $(this));
              })
              .on("chooserclose", function (e, n, o) {
                t._document && t._document.getEditor().resetHideSelection(),
                  (t._chooserElem = null);
              })
              .on(
                "patternchange",
                function (e, n, i, a, r) {
                  for (var s = [], l = 0; l < this._text.length; l++) {
                    var c = o.GElementEditor.getEditor(this._text[l]);
                    s.push(c || this._text[l]);
                  }
                  var d = null;
                  r && (d = { chooserOn: !0, textPattern: !0 });
                  var u = this._getProperty("_fc", s);
                  u || (u = this._getFontColor(s)),
                    t._assignProperty("_fc", n, a, d);
                }.bind(this)
              );
          if ("_tff" === e)
            return $("<input/>")
              .addClass("g-select")
              .attr("data-property", e)
              .attr("type", "button")
              .gFontsButton({
                closeCallback: function () {
                  t._document &&
                    t._document.getActiveWindow().getView().focus();
                },
                assignFontCallback: function (e) {
                  t._assignFont(e);
                },
              });
          if ("_tfi" === e)
            return $("<div></div>").append(
              $("<input>")
                .attr("type", "text")
                .attr("data-property", e)
                .addClass("g-select")
                .addClass("text-size")
                .on("change", function () {
                  gDesigner.stats("textproperties_change_size");
                  var n = $(this).gUnitBox("value"),
                    o = n ? n.toUnit(i.GLength.Unit.PT) : null;
                  null === o || ("number" == typeof o && o >= 0)
                    ? t._assignProperty(e, o)
                    : t._updateProperties();
                })
                .gUnitBox({ source: "text" })
            );
          if ("_tws" === e || "_tcs" === e)
            return $("<input>")
              .attr("type", "text")
              .attr("data-property", e)
              .on("change", function () {
                "_tws" === e
                  ? gDesigner.stats("textproperties_change_wordspacing")
                  : gDesigner.stats("textproperties_change_charspacing");
                var n = t._document;
                if (n) {
                  var o = n.getScene().stringToPoint($(this).val());
                  null === o || "number" == typeof o
                    ? t._assignProperty(e, o)
                    : t._updateProperties();
                }
              })
              .gInputBox();
          if ("style" === e)
            return $("<select></select>")
              .attr("data-property", e)
              .on("change", function () {
                gDesigner.stats("textproperties_choose_fontstyle");
                var e = $(this).val() || null;
                if (e) {
                  var n = gDesigner
                      .getWorkspace()
                      .getFontManager()
                      .getDefaultFont(),
                    o = e.split(m);
                  o[0] = parseInt(o[0]) || 400;
                  var i = [o[0], o[1]],
                    a = ["_tfw", "_tfs"];
                  o[2] &&
                    o[2].length &&
                    o[2] !== n.getFamily() &&
                    (a.push("_tff"), i.push(o[2])),
                    t._assignProperties(a, i);
                }
                t._document.getActiveWindow().getView().focus();
              });
          if (0 !== e.indexOf("tpth")) {
            if ("_plh" === e)
              return $("<div>")
                .addClass("text-line-height")
                .append(
                  $("<input>")
                    .attr("type", "text")
                    .attr("data-property", e)
                    .addClass("value")
                    .on("change", function () {
                      gDesigner.stats("textproperties_change_line-height");
                      var n = $(this).val(),
                        o = t._document.getScene(),
                        a = t._panel
                          .find('button[data-property="_plh_unit"]')
                          .text();
                      if ("%" !== a) {
                        let e = i.GLength.parseEquation(n, o.getProperty("ut"));
                        e && (n = e.toUnit(i.GLength.Unit.PX));
                      } else n = i.GUtil.parseNumber(n);
                      null === n || n > 0 || ("%" !== a && 0 === n)
                        ? ("number" == typeof n &&
                            ("%" === a ? (n /= 100) : (n = String(n))),
                          t._assignProperty(e, n))
                        : t._updateProperties();
                    })
                    .gInputBox()
                )
                .append(
                  $("<button>")
                    .addClass("g-flat")
                    .attr("data-property", "_plh_unit")
                    .addClass("text-unit")
                    .text("%")
                    .on("click", function () {
                      gDesigner.stats("textproperties_change_size");
                      var n = $(this).text(),
                        a = t._document.getScene(),
                        r = t._panel.find('input[data-property="_plh"]').val(),
                        s = t._document.getEditor();
                      if ("%" !== n) {
                        let e = i.GLength.parseEquation(r, a.getProperty("ut"));
                        e && (r = e.toUnit(i.GLength.Unit.PX));
                      } else r = i.GUtil.parseNumber(r);
                      if (null !== r && "%" === n) {
                        var l = a.getProperty("ut") || "px";
                        if (($(this).text(l), "number" == typeof r))
                          try {
                            s.beginTransaction();
                            for (var c = 0; c < t._text.length; c++) {
                              var d =
                                  o.GElementEditor.getEditor(t._text[c]) ||
                                  t._text[c],
                                u = (
                                  ((r / 100) *
                                    (p = t._getProperty("_tfi", [d]) || 20) *
                                    4) /
                                  3
                                ).toString();
                              d.setProperties([e], [u]);
                            }
                          } finally {
                            s.commitTransaction(
                              i.GLocale.get(
                                new i.GLocaleKey(
                                  "GTextProperties",
                                  "action.modify-text-properties"
                                )
                              )
                            );
                          }
                      } else if (
                        null !== r &&
                        ($(this).text("%"), "number" == typeof r)
                      )
                        try {
                          s.beginTransaction();
                          for (c = 0; c < t._text.length; c++) {
                            d =
                              o.GElementEditor.getEditor(t._text[c]) ||
                              t._text[c];
                            var p = t._getProperty("_tfi", [d]) || 20;
                            u =
                              Math.round(
                                100 * Math.max(r / ((4 * p) / 3), 0.01)
                              ) / 100;
                            d.setProperties([e], [u]);
                          }
                        } finally {
                          s.commitTransaction(
                            i.GLocale.get(
                              new i.GLocaleKey(
                                "GTextProperties",
                                "action.modify-text-properties"
                              )
                            )
                          );
                        }
                    })
                );
            if ("fontSet" === e)
              return $("<input/>")
                .attr("type", "checkbox")
                .attr("data-property", e)
                .on("change", function (e) {
                  gDesigner.stats("textproperties_change_set-of-fonts");
                  var t = $(this).prop("checked");
                  gDesigner.setSetting("font-set", t);
                  var n = gContainer.getSystemFontsProvider();
                  t ? c.enableProviders([n]) : c.disableProviders([n]);
                });
            if ("sc" === e)
              return $("<label></label>")
                .append(
                  $("<input>")
                    .addClass("auto-scale-checkbox")
                    .attr("type", "checkbox")
                    .attr("data-property", e)
                    .on(
                      "change",
                      function (e) {
                        gDesigner.stats("textproperties_scale_content"),
                          t._assignProperty("sc", $(e.target).is(":checked"));
                      }.bind(this)
                    )
                )
                .append(
                  $("<span></span>").text(
                    i.GLocale.get(
                      new i.GLocaleKey("GTextProperties", "text.scale-content")
                    )
                  )
                );
            if (0 === e.indexOf("decoration-")) {
              var u = e.substr("decoration-".length);
              return $("<button></button>")
                .addClass("g-button")
                .addClass("decoration-buttons")
                .attr("data-property", e)
                .attr(
                  "data-title",
                  h(
                    i.GLocale.get(
                      new i.GLocaleKey(
                        "GTextProperties",
                        "text.decoration-".concat(u)
                      )
                    )
                  )
                )
                .on("click", function () {
                  gDesigner.stats("textproperties_change_decoration", u),
                    t._toggleFormatting(u);
                })
                .append(
                  $("<span></span>").addClass(
                    "gravit-icon-text-decoration-".concat(u)
                  )
                );
            }
            if ("_pas" === e)
              return $("<div></div>")
                .addClass("text-paragraph-spacing")
                .append(
                  $("<input>")
                    .attr("type", "text")
                    .addClass("value")
                    .attr("data-property", e)
                    .on(
                      "click",
                      r.watchDog.trap(null, null, (t) => {
                        t.stopPropagation(),
                          t.preventDefault(),
                          gDesigner.stats(
                            "textproperties_nonprotriespro_advanced-settings",
                            e
                          );
                      })
                    )
                    .on(
                      "change",
                      r.watchDog.trap(
                        (n) => {
                          const o = t._document;
                          if (!o) return;
                          gDesigner.stats(
                            "textproperties_change_paragraph-spacing"
                          );
                          const a = t._advancedSettings
                            .find('button[data-property="_pas_unit"]')
                            .text();
                          let r = null;
                          if ("%" !== a) {
                            let e = i.GLength.parseEquation(
                              $(n.target).closest("input").val(),
                              o.getScene().getProperty("ut")
                            );
                            e && (r = e.toUnit(i.GLength.Unit.PX));
                          } else
                            r = i.GUtil.parseNumber(
                              $(n.target).closest("input").val()
                            );
                          null === r || ("number" == typeof r && r >= 0)
                            ? ("number" == typeof r &&
                                ("%" === a ? (r /= 100) : (r = String(r))),
                              t._assignProperty(e, r))
                            : t._updateProperties();
                        },
                        null,
                        (t) =>
                          gDesigner.stats(
                            "textproperties_nonprotriespro_advanced-settings",
                            e
                          )
                      )
                    )
                    .gInputBox({ minValue: 0, allowEmptyValue: !1 })
                )
                .append(
                  $("<button>")
                    .addClass("g-flat")
                    .addClass("unit")
                    .attr("data-property", "_pas_unit")
                    .text("px")
                    .on(
                      "click",
                      r.watchDog.trap(
                        (e) => {
                          const n = t._document;
                          if (!n) return;
                          const a = n.getScene(),
                            r = $(e.target).text(),
                            s = "%" === r ? a.getProperty("ut") || "px" : "%";
                          gDesigner.stats(
                            "textproperties_change_paragraph-spacing-unit",
                            s
                          ),
                            $(e.target).text(s);
                          let l = null;
                          if ("%" !== r) {
                            let e = i.GLength.parseEquation(
                              t._advancedSettings
                                .find('input[data-property="_pas"]')
                                .val(),
                              a.getProperty("ut")
                            );
                            e && (l = e.toUnit(i.GLength.Unit.PX));
                          } else
                            l = i.GUtil.parseNumber(
                              t._advancedSettings
                                .find('input[data-property="_pas"]')
                                .val()
                            );
                          if (!isNaN(l)) {
                            const e = t._text.map(
                                (e) => o.GElementEditor.getEditor(e) || e
                              ),
                              n = t._getProperty("_tfi", e) || 20;
                            let i;
                            (i =
                              "%" === s
                                ? Math.round(
                                    100 * parseFloat(l / ((4 * n) / 3))
                                  ) / 100
                                : String(((l / 100) * n * 4) / 3)),
                              t._assignProperties(["_pas"], [i]);
                          }
                        },
                        null,
                        (t) =>
                          gDesigner.stats(
                            "textproperties_nonprotriespro_advanced-settings",
                            e
                          )
                      )
                    )
                );
            if ("_pai" === e)
              return $("<input>")
                .attr("type", "text")
                .attr("data-property", e)
                .on(
                  "click",
                  r.watchDog.trap(null, null, (t) => {
                    t.stopPropagation(),
                      t.preventDefault(),
                      gDesigner.stats(
                        "textproperties_nonprotriespro_advanced-settings",
                        e
                      );
                  })
                )
                .on(
                  "change",
                  r.watchDog.trap(
                    (n) => {
                      const o = t._document;
                      if (!o) return;
                      gDesigner.stats("textproperties_change_paragraph-indent");
                      const i = o
                        .getScene()
                        .stringToPoint($(n.target).closest("input").val());
                      null === i || ("number" == typeof i && i >= 0)
                        ? t._assignProperty(e, i)
                        : t._updateProperties();
                    },
                    null,
                    (t) =>
                      gDesigner.stats(
                        "textproperties_nonprotriespro_advanced-settings",
                        e
                      )
                  )
                )
                .gInputBox({ minValue: 0, allowEmptyValue: !1 });
            if ("dir" === e)
              return $("<select></select>")
                .attr("data-property", "dir")
                .append(
                  $("<option></option>")
                    .attr("value", i.GTLDirectionTextTransformer.LTR)
                    .text(
                      i.GLocale.get(
                        new i.GLocaleKey(
                          "GTextProperties",
                          "text.orientation-ltr"
                        )
                      )
                    )
                )
                .append(
                  $("<option></option>")
                    .attr("value", i.GTLDirectionTextTransformer.RTL)
                    .text(
                      i.GLocale.get(
                        new i.GLocaleKey(
                          "GTextProperties",
                          "text.orientation-rtl"
                        )
                      )
                    )
                )
                .append(
                  $("<option></option>")
                    .attr("value", i.GTLDirectionTextTransformer.TTB)
                    .text(
                      i.GLocale.get(
                        new i.GLocaleKey(
                          "GTextProperties",
                          "text.orientation-ttb"
                        )
                      )
                    )
                )
                .on("change", function (e) {
                  var n = "";
                  switch (parseInt($(e.target).val())) {
                    case i.GTLDirectionTextTransformer.LTR:
                      n = "ltr";
                      break;
                    case i.GTLDirectionTextTransformer.RTL:
                      n = "rtl";
                      break;
                    case i.GTLDirectionTextTransformer.TTB:
                      n = "ttb";
                      break;
                    case i.GTLDirectionTextTransformer.BTT:
                      n = "btt";
                  }
                  gDesigner.stats("textproperties_change_orientation", n),
                    t._assignProperty("dir", parseInt($(e.target).val()));
                });
            if ("_tlocl" === e) return this._createLanguageSelector();
            if ("_tstyls" === e) return this._createStylisticSetSelector();
            throw new Error("Unknown input property: " + e);
          }
          return "tpthd" === e
            ? $("<label></label>")
                .addClass("g-switch")
                .append(
                  $("<input>")
                    .attr("type", "checkbox")
                    .attr("data-property", e)
                    .on("change", function () {
                      gDesigner.stats(
                        "textproperties_change_path-attachment",
                        "direction"
                      ),
                        t._assignProperty(
                          e,
                          $(this).is(":checked")
                            ? i.GTLPathTextTransformer.DIRECTION_OUTWARDS
                            : i.GTLPathTextTransformer.DIRECTION_INWARDS
                        );
                    })
                )
                .append($("<div></div>"))
            : "tpths" === e
            ? $("<label></label>")
                .addClass("g-switch")
                .append(
                  $("<input>")
                    .attr("type", "checkbox")
                    .attr("data-property", e)
                    .on("change", function () {
                      gDesigner.stats(
                        "textproperties_change_path-attachment",
                        "insideoutside"
                      ),
                        t._assignProperty(
                          e,
                          $(this).is(":checked")
                            ? i.GTLPathTextTransformer.OUTSIDE
                            : i.GTLPathTextTransformer.INSIDE
                        );
                    })
                )
                .append($("<div></div>"))
            : "tptho" === e
            ? $("<input>")
                .attr("type", "text")
                .attr("data-property", e)
                .on("change", function () {
                  gDesigner.stats(
                    "textproperties_change_path-attachment",
                    "offset"
                  );
                  var n = t._document.getScene().stringToPoint($(this).val());
                  null === n || "number" == typeof n
                    ? t._assignProperty(e, n)
                    : t._updateProperties();
                })
                .gInputBox()
            : void 0;
        }.bind(this);
        $("<div></div>")
          .addClass("typography-properties")
          .gPropertyRow({
            label: i.GLocale.get(
              new i.GLocaleKey("GTextProperties", "text.typography")
            ),
            columns: [
              {
                width: "100%",
                label: i.GLocale.get(
                  new i.GLocaleKey("GTextProperties", "text.typography")
                ),
                content: $("<div></div>")
                  .addClass("typography")
                  .append(
                    n("_ttsc-" + i.GStylable.TypographyScript.Subscript)
                      .addClass("g-group-start")
                      .attr(
                        "data-title",
                        i.GLocale.get(
                          new i.GLocaleKey(
                            "GTextProperties",
                            "text.typography-subscript"
                          )
                        )
                      )
                  )
                  .append(
                    n("_ttsc-" + i.GStylable.TypographyScript.Superscript)
                      .addClass("g-group-end")
                      .attr(
                        "data-title",
                        i.GLocale.get(
                          new i.GLocaleKey(
                            "GTextProperties",
                            "text.typography-superscript"
                          )
                        )
                      )
                  )
                  .append(
                    n("typography-ligatures").attr(
                      "data-title",
                      i.GLocale.get(
                        new i.GLocaleKey(
                          "GTextProperties",
                          "text.typography-ligatures"
                        )
                      )
                    )
                  )
                  .append(
                    n("typography-fractions").attr(
                      "data-title",
                      i.GLocale.get(
                        new i.GLocaleKey(
                          "GTextProperties",
                          "text.typography-fractions"
                        )
                      )
                    )
                  ),
              },
            ],
          })
          .appendTo(this._advancedSettings),
          $("<div></div>")
            .addClass("transform-properties")
            .gPropertyRow({
              label: i.GLocale.get(
                new i.GLocaleKey("GTextProperties", "text.transform")
              ),
              columns: [
                {
                  width: "100%",
                  label: i.GLocale.get(
                    new i.GLocaleKey("GTextProperties", "text.transform")
                  ),
                  content: $("<div></div>")
                    .append(
                      n("_ttrf-" + i.GStylable.TextTransformation.Uppercase)
                        .addClass("g-group-start")
                        .attr(
                          "data-title",
                          i.GLocale.get(
                            new i.GLocaleKey(
                              "GTextProperties",
                              "text.transform-uppercase"
                            )
                          )
                        )
                    )
                    .append(
                      n("_ttrf-" + i.GStylable.TextTransformation.Capitalize)
                        .addClass("g-group-element")
                        .attr(
                          "data-title",
                          i.GLocale.get(
                            new i.GLocaleKey(
                              "GTextProperties",
                              "text.transform-capitalize"
                            )
                          )
                        )
                    )
                    .append(
                      n("_ttrf-" + i.GStylable.TextTransformation.Lowercase)
                        .addClass("g-group-element")
                        .attr(
                          "data-title",
                          i.GLocale.get(
                            new i.GLocaleKey(
                              "GTextProperties",
                              "text.transform-lowercase"
                            )
                          )
                        )
                    )
                    .append(
                      n("_ttrf-" + i.GStylable.TextTransformation.SmallCaps)
                        .addClass("g-group-end")
                        .attr(
                          "data-title",
                          i.GLocale.get(
                            new i.GLocaleKey(
                              "GTextProperties",
                              "text.transform-smallcaps"
                            )
                          )
                        )
                    ),
                },
              ],
            })
            .appendTo(this._advancedSettings),
          f &&
            ($("<div></div>")
              .addClass("list-type-properties")
              .gPropertyRow({
                label: i.GLocale.get(
                  new i.GLocaleKey("GTextProperties", "text.list-type")
                ),
                columns: [
                  {
                    width: "100%",
                    label: i.GLocale.get(
                      new i.GLocaleKey("GTextProperties", "text.list-type")
                    ),
                    content: n("_pm"),
                  },
                ],
              })
              .appendTo(this._advancedSettings),
            $("<hr/>").appendTo(this._advancedSettings)),
          $("<div></div>")
            .addClass("paragraph-properties")
            .gPropertyRow({
              label: i.GLocale.get(
                new i.GLocaleKey("GTextProperties", "text.paragraph")
              ),
              columns: [
                {
                  width: "50%",
                  label: i.GLocale.get(
                    new i.GLocaleKey("GTextProperties", "text.paragraph-indent")
                  ),
                  content: n("_pai"),
                },
                {
                  width: "50%",
                  label: i.GLocale.get(
                    new i.GLocaleKey(
                      "GTextProperties",
                      "text.paragraph-spacing"
                    )
                  ),
                  content: n("_pas"),
                },
              ],
            })
            .appendTo(this._advancedSettings),
          $("<hr/>").appendTo(this._advancedSettings),
          $("<div></div>")
            .addClass("language-properties")
            .gPropertyRow({
              label: i.GLocale.get(
                new i.GLocaleKey("GTextProperties", "text.language")
              ),
              columns: [{ width: "100%", content: n("_tlocl") }],
            })
            .appendTo(this._advancedSettings),
          $("<hr/>").appendTo(this._advancedSettings),
          $("<div></div>")
            .addClass("stylistic-set-properties")
            .gPropertyRow({
              label: i.GLocale.get(
                new i.GLocaleKey("GTextProperties", "text.stylisticset")
              ),
              columns: [{ width: "100%", content: n("_tstyls") }],
            })
            .appendTo(this._advancedSettings),
          (this._advancedSettingsButton =
            this._getAdvancedSettingsButton().appendTo(t));
        var a = $("<div/>").addClass("color-font").appendTo(e);
        $("<div></div>")
          .addClass("font-color-properties")
          .gPropertyRow({
            columns: [
              { clazz: "color-picker-button", padding: !1, content: n("_fc") },
              { width: "auto", content: n("_tff") },
            ],
          })
          .appendTo(a),
          $("<div></div>")
            .addClass("font-style-properties")
            .gPropertyRow({
              columns: [
                {
                  clazz: "color-title-label",
                  content: $(
                    "<span>".concat(
                      i.GLocale.get(
                        new i.GLocaleKey("GTextProperties", "text.color")
                      ),
                      "</span>"
                    )
                  ).addClass("color-title"),
                },
                {
                  width: "auto",
                  content: n("style"),
                  label: i.GLocale.get(
                    new i.GLocaleKey("GTextProperties", "text.weight")
                  ),
                },
                {
                  width: "25%",
                  content: n("_tfi"),
                  label: i.GLocale.get(
                    new i.GLocaleKey("GTextProperties", "text.size")
                  ),
                },
              ],
            })
            .appendTo(a),
          $("<hr/>").appendTo(e),
          $("<div></div>")
            .addClass("decoration-properties")
            .gPropertyRow({
              label: i.GLocale.get(
                new i.GLocaleKey("GTextProperties", "text.decoration")
              ),
              columns: [
                { width: "25%", content: n("decoration-bold") },
                { width: "25%", content: n("decoration-italic") },
                { width: "25%", content: n("decoration-underline") },
                { width: "25%", content: n("decoration-strikeout") },
              ],
            })
            .appendTo(e),
          $("<hr/>").appendTo(e),
          $("<div></div>")
            .addClass("alignment-properties")
            .gPropertyRow({
              label: i.GLocale.get(
                new i.GLocaleKey("GTextProperties", "text.alignment")
              ),
              columns: [
                {
                  width: "100%",
                  content: $("<div></div>")
                    .append(
                      n("_pal-" + i.GStylable.ParagraphAlignment.Left)
                        .addClass("g-group-start")
                        .attr(
                          "data-title",
                          i.GLocale.get(
                            new i.GLocaleKey("GAlignAction", "title.align-left")
                          )
                        )
                    )
                    .append(
                      n("_pal-" + i.GStylable.ParagraphAlignment.Center)
                        .addClass("g-group-element")
                        .attr(
                          "data-title",
                          i.GLocale.get(
                            new i.GLocaleKey(
                              "GAlignAction",
                              "title.align-center"
                            )
                          )
                        )
                    )
                    .append(
                      n("_pal-" + i.GStylable.ParagraphAlignment.Right)
                        .addClass("g-group-element")
                        .attr(
                          "data-title",
                          i.GLocale.get(
                            new i.GLocaleKey(
                              "GAlignAction",
                              "title.align-right"
                            )
                          )
                        )
                    )
                    .append(
                      n("_pal-" + i.GStylable.ParagraphAlignment.Justify)
                        .addClass("g-group-end")
                        .attr(
                          "data-title",
                          i.GLocale.get(
                            new i.GLocaleKey(
                              "GTextProperties",
                              "action.justify"
                            )
                          )
                        )
                    ),
                },
              ],
            })
            .appendTo(e),
          $("<div></div>")
            .addClass("vertical-properties")
            .gPropertyRow({
              label: i.GLocale.get(
                new i.GLocaleKey("GTextProperties", "text.vertical")
              ),
              columns: [
                {
                  width: "auto",
                  content: $("<div></div>")
                    .append(
                      n("va-" + i.GText.VerticalAlign.Top)
                        .addClass("g-group-start")
                        .attr(
                          "data-title",
                          i.GLocale.get(
                            new i.GLocaleKey("GAlignAction", "title.align-top")
                          )
                        )
                    )
                    .append(
                      n("va-" + i.GText.VerticalAlign.Middle)
                        .addClass("g-group-element")
                        .attr(
                          "data-title",
                          i.GLocale.get(
                            new i.GLocaleKey(
                              "GAlignAction",
                              "title.align-middle"
                            )
                          )
                        )
                    )
                    .append(
                      n("va-" + i.GText.VerticalAlign.Bottom)
                        .addClass("g-group-end")
                        .attr(
                          "data-title",
                          i.GLocale.get(
                            new i.GLocaleKey(
                              "GAlignAction",
                              "title.align-bottom"
                            )
                          )
                        )
                    ),
                },
              ],
            })
            .appendTo(e),
          $("<div></div>")
            .addClass("spacing-properties")
            .gPropertyRow({
              label: i.GLocale.get(
                new i.GLocaleKey("GTextProperties", "text.spacing")
              ),
              columns: [
                {
                  label: i.GLocale.get(
                    new i.GLocaleKey("GTextProperties", "text.char")
                  ),
                  width: "30%",
                  content: n("_tcs"),
                },
                {
                  label: i.GLocale.get(
                    new i.GLocaleKey("GTextProperties", "text.word")
                  ),
                  width: "30%",
                  content: n("_tws"),
                },
                {
                  label: i.GLocale.get(
                    new i.GLocaleKey("GTextProperties", "text.line")
                  ),
                  width: "40%",
                  content: n("_plh"),
                },
              ],
            })
            .appendTo(e),
          $("<hr/>").appendTo(e),
          (this._sizingBlock = $("<div></div>")
            .addClass("sizing-properties")
            .gPropertyRow({
              label: i.GLocale.get(
                new i.GLocaleKey("GTextProperties", "text.sizing")
              ),
              columns: [
                {
                  width: "50%",
                  content: n("aw"),
                  label: i.GLocale.get(
                    new i.GLocaleKey("GCommonNames", "text.width")
                  ),
                },
                {
                  width: "50%",
                  content: n("ah"),
                  label: i.GLocale.get(
                    new i.GLocaleKey("GCommonNames", "text.height")
                  ),
                },
              ],
            })
            .appendTo(e)),
          (this._scriptBlock = $("<div></div>")
            .gPropertyRow({
              label: i.GLocale.get(
                new i.GLocaleKey("GTextProperties", "text.script")
              ),
              columns: [
                { width: "50%", content: n("dir") },
                { width: "50%", content: n("_tlsc") },
              ],
            })
            .appendTo(this._panel)),
          (this._autoScrollBlock = $("<div></div>")
            .addClass("auto-scale-font")
            .attr("major-item-only", !0)
            .gPropertyRow({ columns: [{ width: "auto", content: n("sc") }] })
            .appendTo(this._panel)),
          $("<div></div>")
            .gPropertyRow({
              label: i.GLocale.get(
                new i.GLocaleKey("GTextProperties", "text.on-path")
              ),
              columns: [
                {
                  width: "30%",
                  content: n("tpths"),
                  label: i.GLocale.get(
                    new i.GLocaleKey("GCommonNames", "text.outside")
                  ),
                },
                {
                  width: "30%",
                  content: n("tpthd"),
                  label: i.GLocale.get(
                    new i.GLocaleKey("GTextProperties", "text.reverse")
                  ),
                },
                {
                  width: "40%",
                  content: n("tptho"),
                  label: i.GLocale.get(
                    new i.GLocaleKey("GTextProperties", "text.distance")
                  ),
                },
              ],
            })
            .appendTo(e),
          e.find("button").each(function (e, t) {
            $(t).attr("tabindex", -1);
          }),
          this._reInitLayout(),
          gDesigner.addEventListener(u, this._touchChanged, this);
      }),
      (v.prototype._createLanguageSelector = function () {
        return $("<select/>")
          .attr("data-property", "_tlocl")
          .gPro()
          .on("mousedown", r.watchDog.trap())
          .on(
            "change",
            r.watchDog.trap((e) => {
              const t = $(e.target).closest("select").val();
              this._assignProperties(["_tlocl"], [t || null]),
                gDesigner.stats("textproperties_change_language");
            })
          );
      }),
      (v.prototype._createStylisticSetSelector = function () {
        return $("<select/>")
          .attr("data-property", "_tstyls")
          .gPro()
          .on("mousedown", r.watchDog.trap())
          .on(
            "change",
            r.watchDog.trap((e) => {
              const t = $(e.target).closest("select").val();
              this._assignProperties(["_tstyls"], [t || null]),
                gDesigner.stats("textproperties_change_stylistic-set");
            })
          );
      }),
      (v.prototype.openEyeDropper = function (e, t) {
        this._panel
          .find('[data-property="_fc"]')
          .gPatternChooser("openEyeDropper", e, t);
      }),
      (v.prototype._getAdvancedSettingsOverlayDiv = function () {
        return $("<div></div>").gOverlay({
          releaseOnClose: !1,
          clazz: gDesigner.isEnabledProFeatures()
            ? "g-overlay-advanced-setting"
            : "dialog-expired-pro g-overlay-advanced-setting",
        });
      }),
      (v.prototype._getAdvancedSettingsButton = function () {
        var e = gDesigner.getLicense();
        return $("<button></button>")
          .attr("data-action", "text-settings")
          .attr(
            "data-title",
            i.GLocale.get(
              new i.GLocaleKey("GTextProperties", "text.advanced-text-settings")
            )
          )
          .append($("<span></span>").addClass("gravit-icon-settings"))
          .on("click", (e) => {
            gDesigner.stats("textproperties_open_advanced-settings"),
              this._advancedSettings.gOverlay(
                "open",
                $(e.target).closest("button")
              );
          })
          .gPro()
          .gRichTooltip(
            s.GRichTooltipConfig.from({
              title: i.GLocale.get(
                new i.GLocaleKey(
                  "GTextProperties",
                  "text.advanced-properties-icon-tooltip-title"
                )
              ),
              description: i.GLocale.get(
                new i.GLocaleKey(
                  "GTextProperties",
                  "text.advanced-properties-icon-tooltip-description"
                )
              ),
              isPro:
                !gDesigner.isEnabledProFeatures() ||
                !(e.isPro() && !e.isExpired()),
              learnMore:
                "",
            })
          );
      }),
      (v.prototype.update = function (e, t, n) {
        if (this._ownChange) return !0;
        if (
          (this._chooserElem && this._chooserElem.gPatternChooser("close"),
          this._document &&
            (this._document
              .getScene()
              .removeEventListener(
                i.GNode.AfterPropertiesChangeEvent,
                this._afterPropertiesChange
              ),
            this._document
              .getEditor()
              .removeEventListener(
                o.GEditor.InlineEditorEvent,
                this._inlineEditorEvent
              ),
            this._document
              .getEditor()
              .removeEventListener(
                o.GEditor.HotkeyEvent,
                this._hotKeyEvent,
                this
              ),
            gDesigner.removeEventListener(u, this._settingChanged),
            (this._document = null)),
          (this._text = []),
          e)
        ) {
          for (var a = !1, r = 0; r < t.length; ++r)
            t[r] instanceof i.GText
              ? this._text.push(t[r])
              : t[r] instanceof i.GStyle &&
                t[r].getProperty("_sdf") === i.GObject.getTypeId(i.GText) &&
                (this._text.push(t[r]), (a = !0));
          if ((this._text.length && this._text.length === t.length) || a)
            return (
              (this._document = e),
              this._document
                .getScene()
                .addEventListener(
                  i.GNode.AfterPropertiesChangeEvent,
                  this._afterPropertiesChange,
                  this
                ),
              this._document
                .getEditor()
                .addEventListener(
                  o.GEditor.InlineEditorEvent,
                  this._inlineEditorEvent,
                  this
                ),
              this._document
                .getEditor()
                .addEventListener(
                  o.GEditor.HotkeyEvent,
                  this._hotKeyEvent,
                  this
                ),
              gDesigner.addEventListener(u, this._settingChanged, this),
              this._updateProperties(n),
              this._advancedSettingsButton.css("display", ""),
              !0
            );
        }
        return this._advancedSettingsButton.css("display", "none"), !1;
      }),
      (v.prototype._settingChanged = function (e) {
        if ("font-set" === e.key) {
          var t = this._panel.find('input[data-property="fontSet"]');
          t.length &&
            t.prop("checked") !== !!e.newValue &&
            t.prop("checked", !!e.newValue);
        } else "decimals_num" === e.key && this._updateProperties();
      }),
      (v.prototype._touchChanged = function (e) {
        "touch" === e.key && this._reInitLayout();
      }),
      (v.prototype._reInitLayout = function () {
        gDesigner.isTouchEnabled()
          ? (this._autoScrollBlock.insertAfter(this._sizingBlock),
            this._autoScrollBlock
              .find(".auto-scale-checkbox")
              .gCheckboxSlider())
          : (this._autoScrollBlock.insertAfter(this._scriptBlock),
            this._autoScrollBlock
              .find(".auto-scale-checkbox")
              .gCheckboxSlider("unmount"));
      }),
      (v.prototype._afterPropertiesChange = function (e) {
        const t = this._text.length > 0 && this._text[this._text.length - 1];
        !e.temporary &&
          t &&
          (t === e.node ||
            t instanceof i.GStyle ||
            (t instanceof i.GText && t.getContent() === e.node)) &&
          (this._updateProperties(),
          t instanceof i.GText &&
            t.hasEmbeddedFonts() &&
            this._document.getEditor().closeInlineEditor());
      }),
      (v.prototype._hotKeyEvent = function (e) {
        const t = { B: "bold", I: "italic", U: "underline", S: "strikeout" },
          [n, o, ...i] = e.keys;
        !n ||
          n !== a.GKey.Constant.CONTROL ||
          !(o in t) ||
          (i && i.length) ||
          gDesigner.stats("textproperties_hotkey_change-decoration", t[o]);
      }),
      (v.prototype._inlineEditorEvent = function (e) {
        switch (e.type) {
          case o.GEditor.InlineEditorEvent.Type.AfterOpen:
          case o.GEditor.InlineEditorEvent.Type.AfterClose:
          case o.GEditor.InlineEditorEvent.Type.SelectionChanged:
            this._updateProperties();
            break;
          case o.GEditor.InlineEditorEvent.Type.TryOpen:
            this._tryOpenInlineEditor();
            break;
          case o.GEditor.InlineEditorEvent.Type.BeforeClose:
          case o.GEditor.InlineEditorEvent.Type.TextEdited:
            this._tryModifyingInitialFont(
              e.type,
              e.data && e.data.wasModifiedBefore
            );
        }
      }),
      (v.prototype._tryModifyingInitialFont = function (e, t) {
        if (this._document && this._text && 1 === this._text.length) {
          var n = this._text[0];
          if (!n.getProperty("_we")) {
            var a = n instanceof i.GText && n.getTLCore();
            if (
              a &&
              ((e === o.GEditor.InlineEditorEvent.Type.BeforeClose &&
                a.getWasEdited()) ||
                (e === o.GEditor.InlineEditorEvent.Type.TextEdited && !t))
            ) {
              var r = a.getDocumentRange().plainText(),
                s = c.getProviderInstance(d).getDefaultFamilyForString(r),
                l =
                  gDesigner.getWorkspace() &&
                  gDesigner.getWorkspace().getFontManager() &&
                  gDesigner.getWorkspace().getFontManager().getDefaultFont() &&
                  gDesigner
                    .getWorkspace()
                    .getFontManager()
                    .getDefaultFont()
                    .getFamily();
              if (s && l && l !== s) {
                var u = i.GOpenTypeFont.getDirectionForString(r);
                u !== i.GTLDirectionTextTransformer.LTR
                  ? n.setProperties(["_tff", "dir"], [s, u])
                  : n.setProperty("_tff", s);
              }
            }
          }
        }
      }),
      (v.prototype._tryOpenInlineEditor = function () {
        if (
          this._document &&
          this._text &&
          1 === this._text.length &&
          !this._openingInlineEditor
        ) {
          var e = this._text[0];
          e.isFakeText() &&
            p.confirm(
              i.GLocale.get(new i.GLocaleKey("GTextProperties", "text.edit")),
              (t) => {
                if (t) {
                  o.GEditor.tryRunTransaction(
                    e,
                    () => {
                      e.replaceFonts(
                        gDesigner
                          .getWorkspace()
                          .getFontManager()
                          .getDefaultFont(),
                        e.hasEmbeddedFonts()
                      );
                    },
                    "Replace fonts"
                  ),
                    (this._openingInlineEditor = !0);
                  try {
                    this._document
                      .getEditor()
                      .openInlineEditor(
                        e,
                        this._document.getActiveWindow().getView()
                      );
                  } finally {
                    this._openingInlineEditor = !1;
                  }
                }
              },
              i.GLocale.get(new i.GLocaleKey("GLocale", "no")),
              i.GLocale.get(new i.GLocaleKey("GLocale", "yes"))
            );
        }
      }),
      (v.prototype._intersectArrays = function (e, t) {
        return null === e
          ? t
          : null === t
          ? e
          : e.filter(function (e) {
              return -1 !== t.indexOf(e);
            });
      }),
      (v.prototype._getFormatting = function (e, t) {
        const n = t.length;
        if (0 === n) return null;
        const a = function (t) {
          let n;
          if (
            (t instanceof o.GTextEditor
              ? (n = t.getElement())
              : t instanceof i.GText && (n = t),
            n)
          ) {
            const t = n.getTLCore();
            if (t) {
              let i;
              const a = o.GElementEditor.getEditor(n);
              if (
                ((i =
                  a && a.isInlineEdit()
                    ? t.selectedRange()
                    : t.getDocumentRange()),
                i)
              )
                return i.getFormatting()[e];
            }
          }
          return null;
        };
        let r = a(t[0]);
        for (let e = 1; e < n; e++) if (a(t[e]) !== r) return null;
        return r;
      }),
      (v.prototype._getProperty = function (e, t, n) {
        var o = t.length;
        if (0 == o) return null;
        for (var i = t[0].getProperty(e), a = 1; a < o; a++)
          if (t[a].getProperty(e) !== i) return null;
        return i || !isNaN(i) ? i : 3 === arguments.length ? n : i;
      }),
      (v.prototype._getFontColor = function (e) {
        var t = e[0] instanceof o.GElementEditor ? e[0].getElement() : e[0];
        if (!(t && t instanceof i.GText)) return null;
        var n = t.getTLCore().getRichContent();
        return n && n.length
          ? t._getGravitValue("fontColor", n[0].fontColor)
          : null;
      }),
      (v.prototype._updateProperties = async function (e) {
        var t,
          n = (ye = gDesigner.getWorkspace().getFontManager()).getDefaultFont(),
          a = null,
          r = null;
        if (!n) return;
        t = [];
        for (var s = 0; s < this._text.length; s++) {
          var l = o.GElementEditor.getEditor(this._text[s]);
          t.push(l || this._text[s]);
        }
        var c = this._panel.find('input[data-property="fontSet"]');
        c.length && c.prop("checked", gDesigner.getSetting("font-set"), !1);
        var d = this._getFormatting("underline", t) || null,
          u = this._getFormatting("strikeout", t) || null,
          p = this._getFormatting("fractions", t) || !1,
          h = this._getFormatting("listMarker", t) || null,
          f = this._getProperty(
            "_pai",
            t,
            i.GStylable.PropertySetInfo.P.geometryProperties._pai
          ),
          v = this._getProperty(
            "_pas",
            t,
            i.GStylable.PropertySetInfo.P.geometryProperties._pas
          ),
          _ = (this._getProperty("_tv", t), this._getProperty("_tlsc", t)),
          b = this._getProperty("_ttsc", t),
          w = this._getProperty("_ttrf", t) || null,
          C = this._getProperty("_tfw", t) || "",
          x = this._getProperty("_tfs", t) || "",
          S = this._getProperty("aw", t) || !1,
          E = this._getProperty("ah", t) || !1,
          A = this._getProperty("sc", t) || !1,
          T = this._getProperty("va", t) || "",
          G = this._getProperty("_tfi", t),
          P = this._getProperty("_fc", t),
          D = this._getProperty("_tws", t),
          L = this._getProperty("_tcs", t),
          I = (this._getProperty("_fop", t), this._getProperty("_pal", t)),
          k = this._getProperty("_plh", t),
          O = this._getProperty("tpthd", t),
          F = this._getProperty("tpths", t),
          R = this._getProperty("tptho", t),
          M = this._getProperty("dir", t),
          N = this._getProperty("_tlocl", t),
          B = this._getProperty("_tstyls", t),
          U = this._getFormatting("ligatures", t);
        (U = "auto" === U ? !L : !!U), P || (P = this._getFontColor(t));
        var j = this._document && this._document.getEditor(),
          K =
            j &&
            j.isInlineEditing() &&
            j.getCurrentInlineEditorNode() instanceof i.GText,
          V = t.every(function (e) {
            return e.hasPathAttached && e.hasPathAttached();
          });
        this._advancedSettings
          .find('[data-property^="_ttsc"]')
          .each(function (e, t) {
            var n = $(t),
              o = n.attr("data-property").substr("_ttsc-".length);
            n.toggleClass("g-active", b === o);
          }),
          this._advancedSettings
            .find('[data-property^="_ttrf"]')
            .each(function (e, t) {
              var n = $(t),
                o = n.attr("data-property").substr("_ttrf-".length);
              n.toggleClass("g-active", w === o);
            }),
          this._advancedSettings
            .find('[data-property="_pai"]')
            .gInputBox(
              "value",
              null !== f
                ? this._document
                    .getScene()
                    .pointToString(
                      f,
                      this._document.getScene().getOptimalDecimalsCount()
                    )
                : ""
            );
        const H = this._advancedSettings.find(
          'button[data-property="_pas_unit"]'
        );
        if ("number" == typeof v)
          H.text("%"),
            this._advancedSettings
              .find('[data-property="_pas"]')
              .val(
                i.GUtil.formatNumber(
                  100 * v,
                  this._document.getScene().getOptimalDecimalsCount()
                )
              );
        else if ("string" == typeof v) {
          const e = this._document.getScene();
          H.text(e.getProperty("ut") || "px"),
            this._advancedSettings
              .find('[data-property="_pas"]')
              .val(e.pointToString(v, e.getOptimalDecimalsCount()));
        } else this._advancedSettings.find('[data-property="_pas"]').val("");
        var W = T || i.GText.VerticalAlign.Top,
          z = this._panel.find('button[data-property^="va"]');
        z.each(function (e, t) {
          var n = $(t);
          n.prop("disabled", K || V).toggleClass(
            "g-active",
            n.attr("data-property") === "va-" + W
          );
        }),
          z
            .closest(".g-property-row")
            .css("display", V || E || K ? "none" : ""),
          this._panel.find('[data-property="ah"] button').each((e, t) => {
            var n = $(t);
            n.prop("disabled", K).toggleClass(
              "g-active",
              n.is(":first-child") === E
            );
          });
        var q = this._panel.find('[data-property="aw"] button');
        q.each((e, t) => {
          var n = $(t);
          n.prop("disabled", K).toggleClass(
            "g-active",
            n.is(":first-child") === S
          );
        });
        var Y = this._panel.find('select[data-property="dir"]');
        Y.prop("disabled", K),
          K || Y.val(M),
          this._panel.find('[data-property="sc"]').prop("checked", A),
          q.closest(".g-property-row").css("display", V ? "none" : ""),
          this._panel
            .find('input[data-property="tpthd"]')
            .prop("checked", O === i.GTLPathTextTransformer.DIRECTION_OUTWARDS),
          this._panel
            .find('input[data-property="tpths"]')
            .prop("checked", F === i.GTLPathTextTransformer.OUTSIDE),
          this._panel
            .find('input[data-property="tptho"]')
            .val(R)
            .closest(".g-property-row")
            .css("display", V ? "" : "none");
        var X = function () {
            setTimeout(this._updateProperties.bind(this), 1);
          }.bind(this),
          Q = this._panel.find('input[data-property="_tff"]'),
          J = Q.gFontsButton("getFontList"),
          Z = null,
          ee = !0,
          te = !0;
        let ne, oe;
        for (s = 0; s < t.length; s++) {
          const e = t[s];
          let a;
          if (
            ((a =
              e instanceof o.GTextEditor
                ? e.getFonts()
                : [e.getProperty("_tff")]),
            1 == t.length)
          ) {
            var ie = e instanceof o.GTextEditor ? e.getElement() : e;
            if (ie instanceof i.GText) {
              var ae = ie.hasFontsToResolve();
              if (ae && ae.length && ie.isFakeText()) {
                var re = ae[0].getFamily();
                re && (Z = re);
              }
            }
          }
          for (var se = 0; se < a.length; se++) {
            let e,
              t = a[se];
            if (
              (t
                ? t === n.getFamily()
                  ? (e = t)
                  : ((e = J.gFontsPanel("fontDisplayName", t, X)),
                    void 0 === e && ((X = null), (e = t)))
                : ((t = ""), (e = t)),
              void 0 === ne)
            )
              ne = e;
            else if (ne !== e) {
              (ne = ""), (ee = !1), (te = !1);
              break;
            }
            void 0 === oe ? (oe = t) : oe !== t && ((te = !1), (oe = ""));
          }
        }
        for (s = 0; s < t.length; s++) {
          var le = null,
            ce = null;
          let e;
          e =
            t[s] instanceof o.GTextEditor
              ? t[s].getFonts()
              : [t[s].getProperty("_tff") || n.getFamily()];
          for (se = 0; se < e.length; se++) {
            var de = e[se];
            let t;
            de === n.getFamily()
              ? ((le = ye.getDefaultFontWeights()),
                (le = i.GUtil.unique(le)),
                (ce = le.map(function (e) {
                  return {
                    weight: e,
                    styles: ye
                      .getDefaultFontStyles()
                      .map((e) => e + m + (ee ? n.getFamily() : "") + m),
                  };
                })))
              : J &&
                (void 0 ===
                  (le = await J.gFontsPanel("weightsForFont", de, X)) &&
                  (X = null),
                (le = le || []),
                (le = i.GUtil.unique(le)),
                (ce = le.map(function (e) {
                  for (
                    var t = J.gFontsPanel("stylesForWeight", e, de),
                      n = J.gFontsPanel("subfamiliesForWeight", e, de),
                      o = 0;
                    o < n.length;
                    o++
                  )
                    t[o] =
                      t[o] +
                      m +
                      (ee ? n[o].realName : "") +
                      m +
                      (n[o].subFamily || "");
                  return { weight: e, styles: t };
                }))),
              (a = i.GUtil.unique(this._intersectArrays(a, le))),
              r
                ? ((t = r),
                  (t = t.filter((e) => {
                    if (a.indexOf(e.weight) >= 0) {
                      var t = ce.find((t) => t.weight === e.weight);
                      if (!t) return !1;
                      var n = [];
                      if (
                        ((e.styles = e.styles.filter((e) => {
                          var o = e.split(m)[0];
                          if (o && o.length) {
                            var i = t.styles.find((e) => {
                              if (e.startsWith(o)) return !0;
                            });
                            if (i)
                              return i !== e
                                ? (n.push(o + m + m), !0)
                                : (n.push(e), !0);
                          }
                        })),
                        (e.styles = n),
                        e.styles.length)
                      )
                        return !0;
                    }
                    return !1;
                  })))
                : (t = ce.filter((e) => a.indexOf(e.weight) >= 0)),
              (r = t);
          }
        }
        Z ? Q.val(Z) : Q.val(ne),
          Q[0] === document.activeElement && Q[0].select(),
          this._panel
            .find('input[data-property="_tfi"]')
            .gUnitBox({
              unit:
                this._document &&
                this._document.getScene().$ut === i.GLength.Unit.PX
                  ? i.GLength.Unit.PX
                  : i.GLength.Unit.PT,
              list: [6, 7, 8, 9, 10, 11, 12, 14, 18, 21, 24, 36, 48, 60, 72],
              source: "text",
            })
            .gUnitBox(
              "value",
              null !== G ? new i.GLength(G, i.GLength.Unit.PT) : null
            ),
          this._panel.find('[data-property="_fc"]').gPatternChooser("value", P);
        var ue = this._panel.find('select[data-property="style"]');
        ue.empty(),
          (r && r.length) ||
            (r = [{ weight: 400, styles: [i.GFont.Style.Normal] }]),
          (a && a.length) || (a = [400]);
        for (s = 100; s <= 900; s += 100)
          if (a.indexOf(s) >= 0) {
            for (var pe = null, ge = 0; ge < r.length; ge++)
              if (r[ge].weight === s) {
                pe = r[ge].styles;
                break;
              }
            for (ge = 0; pe && ge < pe.length; ge++) {
              let e;
              var he = pe[ge].split(m);
              (e =
                he[0] === i.GFont.Style.Italic
                  ? i.GLocale.get(i.GFont.WeightNameItalic[s])
                  : i.GLocale.get(i.GFont.WeightName[s])),
                he[2] &&
                  he[2].length &&
                  0 != e.indexOf(he[2]) &&
                  (e = he[2] + " " + e);
              var fe = s.toString() + m + he[0] + m + (he[1] || "");
              $("<option></option>").attr("value", fe).text(e).appendTo(ue);
            }
          }
        this._advancedSettings
          .find(
            '[data-property="_ttrf-'.concat(
              i.GStylable.TextTransformation.SmallCaps,
              '"]'
            )
          )
          .prop("disabled", !1),
          this._advancedSettings
            .find('[data-property="typography-fractions"]')
            .prop("disabled", !1),
          this._advancedSettings
            .find('[data-property="typography-ligatures"]')
            .toggleClass("g-active", !0 === U),
          this._advancedSettings
            .find('[data-property="typography-fractions"]')
            .toggleClass("g-active", !0 === p);
        var me = this._panel.find('select[data-property="_tlsc"]');
        me.empty(),
          me.append(
            $("<option></option>")
              .attr("value", "auto")
              .text(
                i.GLocale.get(new i.GLocaleKey("GTextProperties", "text.auto"))
              )
          );
        var ye,
          ve = (ye = gDesigner.getWorkspace().getFontManager()).getFont(
            (te && t[0] && t[0].getProperty("_tff")) || n.getFamily(),
            x,
            C
          );
        if (ve.isResolved()) {
          ve.hasFeature(i.GFont.Features.SmallCaps) ||
            this._advancedSettings
              .find(
                '[data-property="_ttrf-'.concat(
                  i.GStylable.TextTransformation.SmallCaps,
                  '"]'
                )
              )
              .prop("disabled", !0);
          var _e = ve.getAvailableScripts();
          for (s = 0; s < _e.length; s++) {
            var be = _e[s];
            if (be) {
              var we = be.toLowerCase().split("");
              (we[0] = we[0].toUpperCase()),
                (be = we.join("")),
                me.append(
                  $("<option></option>")
                    .attr("value", _e[s])
                    .text(
                      i.GLocale.get(
                        new i.GLocaleKey(
                          "GTextProperties",
                          "text.".concat(be.toLowerCase())
                        ),
                        be
                      )
                    )
                );
            }
          }
        }
        [
          ...new Set(
            t
              .map((e) => {
                let t = [],
                  n = e.getProperty("_tff"),
                  a = e.getProperty("_tfs"),
                  r = e.getProperty("_tfw");
                if (e instanceof o.GTextEditor && !n) {
                  const o = e.getElement().getContent();
                  if (o) {
                    const s = i.GText.PropertyMapping._tff,
                      l = i.GText.PropertyMapping._tfs,
                      c = i.GText.PropertyMapping._tfw;
                    t = o
                      .map(
                        (t) => (
                          (n = e.getElement()._getGravitValue(s, t[s])),
                          (a = e.getElement()._getGravitValue(l, t[l])),
                          (r = e.getElement()._getGravitValue(c, t[c])),
                          n && a && r ? ye.getFont(n, a, r, !1) : null
                        )
                      )
                      .filter((e) => !!e);
                  }
                } else n && a && r && (t = [ye.getFont(n, a, r, !1)]);
                return t;
              })
              .reduce((e, t) => e.concat(t), [])
          ),
        ].every(
          (e) => e && e.isResolved() && e.hasFeature(i.GFont.Features.Fractions)
        ) ||
          this._advancedSettings
            .find('[data-property="typography-fractions"]')
            .prop("disabled", !0),
          me.val(_);
        let Ce = ue.val();
        (ue.val(
          C +
            m +
            x +
            m +
            (te ? (t[0] || n).getProperty("_tff") || n.getFamily() : "")
        ),
        ue.val()) ||
          (this._text.some(
            (e) =>
              e instanceof i.GText &&
              (g.multipleValues ===
                e.getTLCore().getDocumentRange().getFormatting()[
                  i.GText.PropertyMapping._tfw
                ] ||
                g.multipleValues ===
                  e.getTLCore().getDocumentRange().getFormatting()[
                    i.GText.PropertyMapping._tfs
                  ])
          )
            ? ($("<option></option>")
                .attr("value", "mixed")
                .text(
                  i.GLocale.get(
                    new i.GLocaleKey("GTextProperties", "text.mixed")
                  )
                )
                .appendTo(ue),
              ue.val("mixed"))
            : ue.val(Ce));
        let xe = a.indexOf(i.GFont.Weight.Bold) >= 0;
        (C && parseInt(C) === i.GFont.Weight.Bold) ||
          (x &&
            x === i.GFont.Style.Italic &&
            (xe = r.some((e) => {
              let { weight: t, styles: n } = e;
              return (
                t === i.GFont.Weight.Bold &&
                n.some((e) => 0 === e.indexOf(i.GFont.Style.Italic))
              );
            }))),
          this._panel
            .find('[data-property="decoration-bold"]')
            .toggleClass(
              "g-active",
              xe && !!C && parseInt(C) === i.GFont.Weight.Bold
            )
            .prop("disabled", !xe);
        const Se = r.some((e) => {
          let { weight: t, styles: n } = e;
          return (
            t === parseInt(C || i.GFont.Weight.Regular) &&
            n.some((e) => 0 === e.indexOf(i.GFont.Style.Italic))
          );
        });
        this._panel
          .find('[data-property="decoration-italic"]')
          .toggleClass("g-active", Se && !!x && x === i.GFont.Style.Italic)
          .prop("disabled", !Se),
          this._panel
            .find('[data-property="decoration-underline"]')
            .toggleClass("g-active", 1 == d),
          this._panel
            .find('[data-property="decoration-strikeout"]')
            .toggleClass("g-active", 1 == u),
          this._panel
            .find('input[data-property="_tws"]')
            .val(
              null !== D
                ? this._document
                    .getScene()
                    .pointToString(
                      D,
                      this._document.getScene().getOptimalDecimalsCount()
                    )
                : "0"
            ),
          this._panel
            .find('input[data-property="_tcs"]')
            .val(
              null !== L
                ? this._document
                    .getScene()
                    .pointToString(
                      L,
                      this._document.getScene().getOptimalDecimalsCount()
                    )
                : "0"
            );
        var Ee = I || i.GStylable.ParagraphAlignment.Left,
          Ae = this._panel.find('button[data-property^="_pal"]');
        Ae.each(function (e, t) {
          var n = $(t);
          n.toggleClass("g-active", n.attr("data-property") === "_pal-" + Ee);
        }),
          Ae.closest(".g-property-row").css("display", V ? "none" : "");
        var Te = k,
          Ge = this._panel.find('button[data-property="_plh_unit"]');
        if ("number" == typeof Te)
          Ge.text("%"),
            this._panel
              .find('input[data-property="_plh"]')
              .val(i.GUtil.formatNumber(100 * Te));
        else if ("string" == typeof Te || Te instanceof String) {
          const e = this._document.getScene();
          var Pe = e.getProperty("ut");
          Ge.text(Pe || "px"),
            this._panel
              .find('input[data-property="_plh"]')
              .val(e.pointToString(k, e.getOptimalDecimalsCount()));
        } else this._panel.find('input[data-property="_plh"]').val("");
        if (
          (e &&
            (e.evtType == o.GEditor.ModifiedEvent.Type.Undo ||
              e.evtType == o.GEditor.ModifiedEvent.Type.Redo) &&
            e.chooserOn &&
            e.textPattern &&
            this._panel
              .find('[data-property="_fc"]')
              .find(".preview")
              .trigger("click"),
          (this._weightsAvailable = a),
          this._listTypeSettings
            .find(".list-type-group.g-selected")
            .removeClass("g-selected"),
          this._listTypeSettings
            .find(".list-type-option.g-selected")
            .removeClass("g-selected"),
          this._advancedSettings.find('[data-property="_pm"] > span').text(""),
          "string" == typeof h)
        ) {
          const e = Object.values(y).find((e) => {
            let { types: t = [] } = e;
            return t.find((e) => {
              let { value: t } = e;
              return t === h;
            });
          });
          e &&
            this._advancedSettings
              .find('[data-property="_pm"] > span')
              .text(e.label),
            this._listTypeSettings
              .find('.list-type-option[value="'.concat(h, '"]'))
              .addClass("g-selected")
              .closest(".list-type-group")
              .addClass("g-selected");
        } else
          null == h &&
            (this._advancedSettings
              .find('[data-property="_pm"] > span')
              .text(y.None.label),
            this._listTypeSettings
              .find('.list-type-group[value="'.concat(y.None.value, '"]'))
              .addClass("g-selected"));
        this._updateLanguageSelector(ve, _, N),
          this._updateStylisticSetSelector(ve, _, B);
      }),
      (v.prototype._updateLanguageSelector = function (e, t, n) {
        const o = this._advancedSettings
          .find('select[data-property="_tlocl"]')
          .empty()
          .attr("disabled", !0)
          .addClass("g-disabled");
        if (!e.isResolved() || !e.hasFeature(i.GFont.Features.LocalizedForm))
          return;
        let a = null;
        t &&
          "auto" !== t &&
          (a = i.GOpenTypeFont.scriptNameToOpenTypeScriptTagString(t));
        const r = e.getAvailableLanguageSystemTags(a);
        if (r && 0 !== r.length)
          if (
            (o.attr("disabled", !1).removeClass("g-disabled"),
            o.append(
              $("<option/>")
                .attr("value", "")
                .text(
                  i.GLocale.get(
                    new i.GLocaleKey("GCommonNames", "text.default")
                  )
                )
            ),
            o.append(
              r
                .map((e) => {
                  const t =
                    i.GOpenTypeFont.openTypeLanguageSystemTagStringToBCP47(e);
                  return {
                    name: i.GLocale.get(
                      new i.GLocaleKey(
                        "GBCP47LanguageTags",
                        "text.lang.".concat(t)
                      )
                    ),
                    tag: e,
                  };
                })
                .sort((e, t) => e.name.localeCompare(t.name))
                .map((e) => {
                  let { name: t, tag: n } = e;
                  return $("<option/>").attr("value", n).text(t);
                })
            ),
            n)
          )
            o.val(n);
          else {
            this._hasMultipleLanguages() &&
              (o.append(
                $("<option/>")
                  .attr("value", "mixed")
                  .attr("hidden", !0)
                  .attr("disabled", !0)
                  .text(
                    i.GLocale.get(
                      new i.GLocaleKey("GTextProperties", "text.mixed")
                    )
                  )
              ),
              o.val("mixed"));
          }
      }),
      (v.prototype._updateStylisticSetSelector = function (e, t, n) {
        const o = this._advancedSettings
          .find('select[data-property="_tstyls"]')
          .empty()
          .attr("disabled", !0)
          .addClass("g-disabled");
        if (!e.isResolved() || !e.hasFeature(i.GFont.Features.StylisticSet))
          return;
        let a = null;
        t &&
          "auto" !== t &&
          (a = i.GOpenTypeFont.scriptNameToOpenTypeScriptTagString(t));
        const r = e.getAvailableStylisticSets(a);
        if (r && 0 !== r.length)
          if (
            (o.attr("disabled", !1).removeClass("g-disabled"),
            o.append(
              $("<option/>")
                .attr("value", "")
                .text(
                  i.GLocale.get(new i.GLocaleKey("GCommonNames", "text.none"))
                )
            ),
            o.append(
              r.map((e) =>
                $("<option/>").attr("value", e).text(e.toUpperCase())
              )
            ),
            n)
          )
            o.val(n);
          else {
            this._hasMultipleStylisticSets() &&
              (o.append(
                $("<option/>")
                  .attr("value", "mixed")
                  .attr("hidden", !0)
                  .attr("disabled", !0)
                  .text(
                    i.GLocale.get(
                      new i.GLocaleKey("GTextProperties", "text.mixed")
                    )
                  )
              ),
              o.val("mixed"));
          }
      }),
      (v.prototype._hasMultipleLanguages = function () {
        return this._hasMultipleValues(i.GText.PropertyMapping._tlocl);
      }),
      (v.prototype._hasMultipleStylisticSets = function () {
        return this._hasMultipleValues(i.GText.PropertyMapping._tstyls);
      }),
      (v.prototype._hasMultipleValues = function (e) {
        return this._text.some((t) => {
          if (t instanceof i.GText) {
            const n = t.getTLCore().getDocumentRange().getFormatting()[e];
            return g.multipleValues === n;
          }
        });
      }),
      (v.prototype._correctStyleAndWeight = async function (e, t, n) {
        var o = null,
          a = null,
          r = gDesigner.getWorkspace().getFontManager(),
          s = r.getDefaultFont(),
          l = this._panel
            .find('input[data-property="_tff"]')
            .gFontsButton("getFontList"),
          c = !1;
        if (
          (e === s.getFamily()
            ? (a =
                (o = r.getDefaultFontWeights()) &&
                o.map(function (e) {
                  return { weight: e, styles: r.getDefaultFontStyles() };
                }))
            : l &&
              (a =
                (o = await l.gFontsPanel(
                  "weightsForFont",
                  e,
                  function () {
                    console.warn("textproperties: Unexpected callback");
                  },
                  !0
                )) &&
                o.map(function (t) {
                  return {
                    weight: t,
                    styles: l.gFontsPanel(
                      "stylesForWeight",
                      t,
                      e,
                      function () {
                        console.warn("textproperties: Unexpected callback");
                      },
                      !0
                    ),
                  };
                })),
          o && o.indexOf(n[0]) < 0)
        ) {
          for (var d = 0, u = 0; u < o.length; u++)
            Math.abs(n[0] - o[u]) < Math.abs(n[0] - o[d]) && (d = u);
          (n[0] = o[d]), (c = !0);
        }
        var p =
          (a || []).filter(function (e) {
            if (e.weight === n[0]) return !0;
          }) || [];
        return (
          p.length &&
            p[0].styles.indexOf(t[0]) < 0 &&
            (t[0] === i.GFont.Style.Normal && p[0].styles.length
              ? (t[0] = i.GFont.Style.Italic)
              : (t[0] = i.GFont.Style.Normal),
            (c = !0)),
          c
        );
      }),
      (v.prototype._toggleFormatting = function (e) {
        if (this._text && this._text.length) {
          const n = this._text.map((e) => o.GElementEditor.getEditor(e) || e),
            a = this._getFormatting("underline", n) || null,
            r = this._getFormatting("strikeout", n) || null;
          var t = this._getFormatting("ligatures", n);
          const s = {
              underline: a,
              strikeout: r,
              ligatures: (t =
                "auto" === t ? !this._getProperty("_tcs", n) : !!t),
              fractions: this._getFormatting("fractions", n),
            },
            l = this._getProperty("_tfw", n) || "",
            c = this._getProperty("_tfs", n) || "";
          if ("bold" === e) {
            let e;
            parseInt(l) === i.GFont.Weight.Bold
              ? ((e =
                  this._weightsAvailable.indexOf(i.GFont.Weight.Regular) >= 0
                    ? i.GFont.Weight.Regular
                    : Math.min.apply(null, this._weightsAvailable)),
                (e = e || i.GFont.Style.Regular))
              : (e = i.GFont.Weight.Bold),
              this._assignProperties(["_tfw"], [e]);
          } else if ("italic" === e)
            this._assignProperties(
              ["_tfs"],
              [
                c === i.GFont.Style.Italic
                  ? i.GFont.Style.Normal
                  : i.GFont.Style.Italic,
              ]
            );
          else {
            const t = this._document.getEditor();
            try {
              t.beginTransaction(),
                this._text.forEach((t) => {
                  if (
                    (t instanceof o.GTextEditor && (t = t.getElement()),
                    t instanceof i.GText)
                  ) {
                    const n = t.getTLCore();
                    if (n) {
                      let i;
                      const a = o.GElementEditor.getEditor(t);
                      (i =
                        a && a.isInlineEdit()
                          ? n.selectedRange()
                          : n.getDocumentRange()),
                        i && i.setFormatting(e, 1 != s[e]);
                    }
                  }
                });
            } finally {
              t.commitTransaction(
                i.GLocale.get(
                  new i.GLocaleKey(
                    "GTextProperties",
                    "action.modify-text-properties"
                  )
                )
              );
            }
          }
          this._updateProperties();
        }
      }),
      (v.prototype._assignFont = async function (e) {
        if (
          gDesigner
            .getWorkspace()
            .getFontManager()
            .getDefaultFont()
            .getFamily() !== e
        ) {
          var t = this._panel
            .find('input[data-property="_tff"]')
            .gFontsButton("getFontList");
          if (
            void 0 ===
            (await t.gFontsPanel("weightsForFont", e, () => {
              this._assignFontMain(e);
            }))
          )
            return;
        }
        this._assignFontMain(e);
      }),
      (v.prototype._assignMarker = function (e) {
        if (!this._document) return;
        const t = this._document.getEditor();
        (this._ownChange = !0), t.beginTransaction();
        try {
          this._text.forEach((t) => {
            if (
              (t instanceof o.GTextEditor && (t = t.getElement()),
              t instanceof i.GText)
            ) {
              const n = t.getTLCore();
              if (n) {
                let i;
                const a = o.GElementEditor.getEditor(t);
                (i =
                  a && a.isInlineEdit()
                    ? n.selectedRange()
                    : n.getDocumentRange()),
                  i && i.toggleList(e);
              }
            }
          });
        } finally {
          t.commitTransaction(
            i.GLocale.get(
              new i.GLocaleKey(
                "GTextProperties",
                "action.modify-text-properties"
              )
            )
          ),
            (this._ownChange = !1);
        }
      }),
      (v.prototype._assignFontMain = async function (e) {
        var t,
          n,
          a = gDesigner.getWorkspace().getFontManager();
        a.getDefaultFont();
        if (this._document) {
          var r = this._document.getEditor();
          if (this._text.length) {
            r.beginTransaction();
            try {
              for (var s = 0; s < this._text.length; ++s) {
                var l = o.GElementEditor.getEditor(this._text[s]);
                if (
                  this._text[s] instanceof i.GText &&
                  this._text[s].isFakeText()
                ) {
                  var c = this._text[s].getContent(),
                    d = {};
                  c &&
                    c.forEach((t) => {
                      d[t.fontFamily] = e;
                    });
                  var u = this._text[s].getProperty("_tff");
                  (d[u] = e), this._text[s].replaceFonts(d, !0);
                } else {
                  var p = l || this._text[s],
                    g = ["_tff"],
                    h = [e],
                    f =
                      this._text[s] instanceof i.GText &&
                      this._text[s].getTLCore();
                  if (f) {
                    let o;
                    o =
                      l && l.isInlineEdit()
                        ? f.selectedRange()
                        : f.getDocumentRange();
                    for (
                      var m = o.save(),
                        y = i.GText.PropertyMapping._tfs,
                        v = i.GText.PropertyMapping._tfw,
                        _ = (i.GText.PropertyMapping._tff, !1),
                        b = !1,
                        w = 0;
                      w < m.length;
                      w++
                    ) {
                      var C =
                          "italic" === m[w][y]
                            ? i.GFont.Style.Italic
                            : i.GFont.Style.Normal,
                        x = ~~m[w][v];
                      if (
                        ((t = [C]),
                        (n = [x]),
                        await this._correctStyleAndWeight(e, t, n))
                      ) {
                        var S = g.indexOf("_tfs"),
                          E = g.indexOf("_tfw");
                        if (C !== t[0]) {
                          if (
                            (S < 0 &&
                              ((S = g.length), g.push("_tfs"), h.push("")),
                            b)
                          ) {
                            (h[E] = n[0]), (h[S] = t[0]);
                            break;
                          }
                          (h[S] = t[0]), (_ = !0);
                        }
                        if (x !== n[0]) {
                          if (
                            (E < 0 &&
                              ((E = g.length), g.push("_tfw"), h.push("")),
                            _)
                          ) {
                            (h[S] = t[0]), (h[E] = n[0]);
                            break;
                          }
                          (h[E] = n[0]), (b = !0);
                        }
                      }
                    }
                  } else {
                    if (
                      ((t = [p.getProperty("_tfs") || i.GFont.Style.Normal]),
                      (n = [p.getProperty("_tfw") || i.GFont.Weight.Regular]),
                      await this._correctStyleAndWeight(e, t, n),
                      !a.getFont(e, t[0], n[0]))
                    )
                      continue;
                    Array.prototype.push.apply(g, ["_tfs", "_tfw"]),
                      Array.prototype.push.apply(h, [t[0], n[0]]);
                  }
                  p.setProperties(g, h);
                }
                if (l) {
                  var A = l.getDefaultStyle();
                  A && A.assignStyleFrom(this._text[s]);
                }
                this._text[s] instanceof i.GStyle && this._updateProperties();
              }
            } finally {
              r.commitTransaction(
                i.GLocale.get(
                  new i.GLocaleKey(
                    "GTextProperties",
                    "action.modify-text-properties"
                  )
                )
              );
            }
          }
        }
      }),
      (v.prototype._assignProperty = function (e, t, n, o) {
        this._assignProperties([e], [t], n, o);
      }),
      (v.prototype._assignProperties = function (e, t, n, a) {
        if (this._document) {
          var r = this._document.getEditor();
          n || ((this._ownChange = !0), r.beginTransaction());
          try {
            for (var s = 0; s < this._text.length; ++s) {
              (l = o.GElementEditor.getEditor(this._text[s]))
                ? l.setProperties(e, t, n)
                : this._text[s].setProperties(e, t, !1, !1, n);
            }
          } finally {
            n ||
              (r.commitTransaction(
                i.GLocale.get(
                  new i.GLocaleKey(
                    "GTextProperties",
                    "action.modify-text-properties"
                  )
                ),
                a || null
              ),
              (this._ownChange = !1));
          }
          if (e.includes("sc"))
            for (s = 0; s < this._text.length; ++s) {
              var l;
              (l = o.GElementEditor.getEditor(this._text[s])) &&
                l.requestInvalidation();
            }
        }
      }),
      (v.prototype.toString = function () {
        return "[Object GTextProperties]";
      }),
      (e.exports = v);
  }