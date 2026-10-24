/**
 * GExportProperties
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GExportProperties() {
  // Constructor (reconstructed)
}

// Prototype methods
GExportProperties.prototype._settingChanged = function (e) {
        "touch" === e.key && this._updateProperties();
      }

GExportProperties.prototype._updateExport = function (e, t, n) {
        var i = this._document.getEditor();
        i.beginTransaction();
        try {
          for (var a = 0; a < this._elements.length; ++a) {
            var r = this._elements[a],
              s = r.getProperty(u.EXPORT_PROPERTY_NAME, !0);
            !s ||
              e >= s.length ||
              (((s = s.slice())[e] = $.extend({}, s[e])),
              (s[e][t] = n),
              r.setProperty(u.EXPORT_PROPERTY_NAME, s, !0));
          }
        } finally {
          i.commitTransaction(
            o.GLocale.get(
              new o.GLocaleKey("GExportProperties", "action.update-setting")
            )
          );
        }
      }

GExportProperties.prototype._removeExport = function (e) {
        var t = this._document.getEditor();
        t.beginTransaction();
        try {
          for (var n = 0; n < this._elements.length; ++n) {
            var i = this._elements[n],
              a = i.getProperty(u.EXPORT_PROPERTY_NAME, !0);
            !a ||
              e >= a.length ||
              ((a = a.slice()).splice(e, 1),
              i.setProperty(u.EXPORT_PROPERTY_NAME, a, !0));
          }
        } finally {
          t.commitTransaction(
            o.GLocale.get(
              new o.GLocaleKey("GExportProperties", "action.remove")
            )
          );
        }
      }

GExportProperties.prototype._afterPropertiesChange = function (e) {
        !e.temporary &&
          this._elements.length &&
          this._elements[0] === e.node &&
          e.properties.indexOf(u.EXPORT_PROPERTY_NAME) >= 0 &&
          this._updateProperties();
      }

GExportProperties.prototype._updateProperties = function () {
        var e = [],
          t = gDesigner.isTouchEnabled(),
          n = t ? "40%" : "30%",
          i = t ? "25%" : "35%",
          a = t ? "25%" : "30%",
          r = t ? "12%" : "5%";
        if (this._elements)
          for (let t = 0; t < this._elements.length; ++t) {
            var l =
              this._elements[t].getProperty(u.EXPORT_PROPERTY_NAME, !0, []) ||
              [];
            if (l)
              for (var c = 0; c < l.length; ++c)
                c < e.length ? (e[c].diff = true) : e.push($.extend({}, l[c]));
          }
        this._panel.empty().css("margin", e.length ? "" : "0"),
          this._toolbar
            .toggleClass("empty-list", 0 === e.length)
            .find("label:first-child")
            .text(
              0 === e.length
                ? o.GLocale.get(
                    new o.GLocaleKey(
                      "GExportProperties",
                      "text.make-exportable"
                    )
                  )
                : o.GLocale.get(new o.GLocaleKey("GCommonNames", "text.export"))
            ),
          this._exportButton.css("display", e.length ? "" : "none");
        for (let l = 0; l < e.length; ++l) {
          var d = l + 1 === e.length,
            p = e[l];
          $("<div></div>")
            .data("index", l)
            .gPropertyRow({
              clazz: "export-properties-row",
              columns: [
                {
                  width: n,
                  label: d
                    ? o.GLocale.get(
                        new o.GLocaleKey("GCommonNames", "text.size")
                      )
                    : null,
                  content: $("<div></div>")
                    .append(
                      $("<input/>")
                        .attr("type", "text")
                        .css("margin", "0")
                        .css("width", "70%")
                        .val(p.sz)
                        .on(
                          "change",
                          function (e) {
                            gDesigner.stats(
                              "exportproperties_change_size-dropdown"
                            );
                            var t = $(e.target);
                            this._updateExport(
                              $(e.target)
                                .closest(".g-property-row")
                                .data("index"),
                              "sz",
                              t.val()
                            );
                          }.bind(this)
                        )
                    )
                    .append(
                      $("<button></button>")
                        .addClass("g-flat")
                        .css("width", "30%")
                        .append(
                          $('<span class="gravit-icon-down"></span>').css(
                            "font-size",
                            "12px"
                          )
                        )
                        .on(
                          "click",
                          function (e) {
                            gDesigner.stats(
                              "exportproperties_click_change-size"
                            ),
                              this._sizeMenu.open(
                                e.target,
                                s.Position.Left_Top,
                                s.Position.Right_Bottom,
                                function (t) {
                                  $(e.target)
                                    .closest("div")
                                    .find("input")
                                    .val(t.getCaption())
                                    .trigger("change")
                                    .focus()
                                    .select();
                                }
                              );
                          }.bind(this)
                        )
                    ),
                },
                {
                  width: i,
                  label: d
                    ? o.GLocale.get(
                        new o.GLocaleKey("GExportProperties", "text.suffix")
                      )
                    : null,
                  content: $("<input/>")
                    .attr("type", "text")
                    .val(p.diff ? null : p.sf)
                    .attr(
                      "placeholder",
                      p.diff
                        ? o.GLocale.get(
                            new o.GLocaleKey(
                              "GExportProperties",
                              "text.multiple"
                            )
                          )
                        : o.GLocale.get(
                            new o.GLocaleKey("GCommonNames", "text.none")
                          )
                    )
                    .on(
                      "change",
                      function (e) {
                        gDesigner.stats("exportproperties_toggle_multiple");
                        var t = $(e.target);
                        this._updateExport(
                          $(e.target).closest(".g-property-row").data("index"),
                          "sf",
                          t.val()
                        );
                      }.bind(this)
                    ),
                },
                {
                  width: a,
                  label: d
                    ? o.GLocale.get(
                        new o.GLocaleKey("GExportProperties", "text.format")
                      )
                    : null,
                  content: $("<select></select>")
                    .append(
                      $("<option></option>").attr("value", "png").text("PNG")
                    )
                    .append(
                      $("<option></option>").attr("value", "jpg").text("JPEG")
                    )
                    .append(
                      $("<option></option>").attr("value", "svg").text("SVG")
                    )
                    .append(
                      $("<option></option>").attr("value", "pdf").text("PDF")
                    )
                    .val(p.fm)
                    .on(
                      "change",
                      function (e) {
                        gDesigner.stats("exportproperties_format_dropdown");
                        var t = $(e.target);
                        this._updateExport(
                          $(e.target).closest(".g-property-row").data("index"),
                          "fm",
                          t.val()
                        );
                      }.bind(this)
                    ),
                },
                {
                  width: r,
                  content: $("<button></button>")
                    .addClass(t ? "g-flat gravit-icon-close" : "g-flat")
                    .html(t ? "" : "&#x2715;")
                    .on(
                      "click",
                      function (e) {
                        gDesigner.stats("exportproperties_click_removeitem"),
                          this._removeExport(
                            $(e.target).closest(".g-property-row").data("index")
                          );
                      }.bind(this)
                    ),
                },
              ],
            })
            .appendTo(this._panel);
        }
      }

GExportProperties.prototype.toString = function () {
        return "[Object GExportProperties]";
      }

module.exports = GExportProperties;
