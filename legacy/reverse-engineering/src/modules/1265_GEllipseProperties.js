/**
 * Webpack Module #1265
 * Type: class
 * Name: GEllipseProperties
 */

function (e, t, n) {
    "use strict";
    n(57), n(3), n(4), n(13);
    var o = n(1),
      i = n(123);
    n(173);
    function a() {
      this._ellipses = [];
    }
    o.GObject.inherit(a, i),
      (a.prototype._panel = null),
      (a.prototype._document = null),
      (a.prototype._ellipses = null),
      (a.prototype.init = function (e) {
        this._panel = e;
        var t = function (e) {
          var t = this;
          if (0 === e.indexOf("etp-")) {
            var n = "",
              i = parseInt(e.substr("etp-".length));
            switch (i) {
              case o.GEllipse.Type.Pie:
                n = "gravit-icon-circle-pie";
                break;
              case o.GEllipse.Type.Chord:
                n = "gravit-icon-ellipse-chord";
                break;
              case o.GEllipse.Type.Arc:
                n = "gravit-icon-ellipse-arc";
                break;
              default:
                throw new Error("");
            }
            return $("<div></div>")
              .attr("data-property", e)
              .addClass("g-button g-icon")
              .on("click", function () {
                gDesigner.stats("ellipse_change_type", i),
                  t._assignProperty(
                    "etp",
                    i,
                    o.GLocale.get(
                      new o.GLocaleKey(
                        "GEllipseProperties",
                        "action.change-shape"
                      )
                    )
                  ),
                  i === o.GEllipse.Type.Arc && t._setBorderAlignmentCenter();
              })
              .append($("<span></span>").addClass(n));
          }
          if ("sa" === e || "ea" === e)
            return $("<input>")
              .attr("type", "text")
              .attr("data-property", e)
              .on("change", function () {
                gDesigner.stats("ellipse_change_angle");
                var n = o.GLength.parseEquationValue(
                  $(this).gInputBox("value")
                );
                null !== n
                  ? ((n = o.GMath.normalizeAngleRadians(o.GMath.toRadians(n))),
                    t._assignProperty(
                      e,
                      o.GMath.PI2 - n,
                      o.GLocale.get(
                        new o.GLocaleKey(
                          "GEllipseProperties",
                          "action.change-angle"
                        )
                      )
                    ))
                  : t._updateProperties();
              })
              .gInputBox();
          throw new Error("Unknown input property: " + e);
        }.bind(this);
        $("<div></div>")
          .addClass("ellipse-angles-property")
          .gPropertyRow({
            label: o.GLocale.get(
              new o.GLocaleKey("GCommonNames", "text.angles")
            ),
            columns: [
              { width: "50%", content: t("sa") },
              { width: "50%", content: t("ea") },
            ],
          })
          .appendTo(e),
          $("<div></div>")
            .addClass("ellipse-shape-property")
            .gPropertyRow({
              label: o.GLocale.get(
                new o.GLocaleKey("GEllipseProperties", "text.shape")
              ),
              columns: [
                {
                  width: "33.3%",
                  clazz: "shape-type-chooser shape-arc",
                  label: o.GLocale.get(
                    new o.GLocaleKey("GEllipse", "type.arc")
                  ),
                  content: t("etp-" + o.GEllipse.Type.Arc),
                },
                {
                  width: "33.3%",
                  clazz: "shape-type-chooser shape-chord",
                  label: o.GLocale.get(
                    new o.GLocaleKey("GEllipse", "type.chord")
                  ),
                  content: t("etp-" + o.GEllipse.Type.Chord),
                },
                {
                  width: "33.3%",
                  clazz: "shape-type-chooser shape-pie",
                  label: o.GLocale.get(
                    new o.GLocaleKey("GEllipse", "type.pie")
                  ),
                  content: t("etp-" + o.GEllipse.Type.Pie),
                },
              ],
            })
            .appendTo(e);
      }),
      (a.prototype.update = function (e, t) {
        if (
          (this._document &&
            (this._document
              .getScene()
              .removeEventListener(
                o.GNode.AfterPropertiesChangeEvent,
                this._afterPropertiesChange
              ),
            (this._document = null)),
          (this._ellipses = []),
          e)
        ) {
          for (var n = 0; n < t.length; ++n)
            t[n] instanceof o.GEllipse && this._ellipses.push(t[n]);
          if (this._ellipses.length && this._ellipses.length === t.length)
            return (
              (this._document = e),
              this._document
                .getScene()
                .addEventListener(
                  o.GNode.AfterPropertiesChangeEvent,
                  this._afterPropertiesChange,
                  this
                ),
              this._updateProperties(),
              !0
            );
        }
        return !1;
      }),
      (a.prototype._afterPropertiesChange = function (e) {
        !e.temporary &&
          this._ellipses.length > 0 &&
          this._ellipses[0] === e.node &&
          this._updateProperties();
      }),
      (a.prototype._setBorderAlignmentCenter = function () {
        var e,
          t,
          n = ["_ba"],
          i = [o.GStylable.BorderAlignment.Center],
          a = this._document.getEditor();
        a.beginTransaction();
        try {
          for (var r = 0, s = this._ellipses.length; r < s; ++r) {
            e = this._ellipses[r].getPaintLayers().getBorderLayers();
            for (var l = 0, c = e.length; l < c; l++)
              (t = e[l]) instanceof o.GStylable.BorderPaintLayer &&
                t.setProperties(n, i);
          }
        } finally {
          a.commitTransaction(
            o.GLocale.get(
              new o.GLocaleKey("GEllipseProperties", "text.ellipse-to-center")
            )
          );
        }
      }),
      (a.prototype._updateProperties = function () {
        var e = this._ellipses[0];
        this._panel.find('[data-property^="etp"]').each(function (t, n) {
          var o = $(n),
            i = o.attr("data-property").substr("etp-".length);
          o.toggleClass("g-active", e.getProperty("etp").toString() === i);
        }),
          this._panel
            .find('input[data-property="sa"]')
            .val(
              o.GUtil.formatNumber(
                o.GMath.toDegrees(o.GMath.PI2 - e.getProperty("sa")),
                2
              )
            ),
          this._panel
            .find('input[data-property="ea"]')
            .val(
              o.GUtil.formatNumber(
                o.GMath.toDegrees(o.GMath.PI2 - e.getProperty("ea")),
                2
              )
            );
      }),
      (a.prototype._assignProperty = function (e, t, n) {
        this._assignProperties([e], [t], n);
      }),
      (a.prototype._assignProperties = function (e, t, n) {
        var o = this._document.getEditor();
        o.beginTransaction();
        try {
          for (var i = 0; i < this._ellipses.length; ++i)
            this._ellipses[i].setProperties(e, t);
        } finally {
          o.commitTransaction(n);
        }
      }),
      (a.prototype.toString = function () {
        return "[Object GEllipseProperties]";
      }),
      (e.exports = a);
  }