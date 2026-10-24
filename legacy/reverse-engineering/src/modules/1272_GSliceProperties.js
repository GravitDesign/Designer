/**
 * Webpack Module #1272
 * Type: class
 * Name: GSliceProperties
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    n(3), n(4), n(13);
    var i = n(1),
      a = n(53),
      r = o(n(340)),
      s = n(123),
      l = (n(173), n(135));
    function c() {
      this._slices = [];
    }
    i.GObject.inherit(c, s),
      (c.prototype._panel = null),
      (c.prototype._document = null),
      (c.prototype._slices = null),
      (c.prototype._ownChange = !1),
      (c.prototype._chooserElem = null),
      (c.prototype.init = function (e, t) {
        (this._panel = e),
          this._panel.addClass("slice-property-panel"),
          this.setTouchTools([r.default.APPEARANCE_TOUCH_TOOL]);
        var n = function (e) {
          var t = this;
          if ("x" === e || "y" === e || "w" === e || "h" === e)
            return $("<input>")
              .addClass(e + "-input")
              .attr("type", "text")
              .attr("data-property", e)
              .on(
                "change",
                function (n) {
                  gDesigner.stats("sliceproperties_change_size"),
                    t._assignProperty(
                      e,
                      t._document
                        .getScene()
                        .stringToPoint($(n.target).gInputBox("value"))
                    );
                }.bind(t)
              )
              .gInputBox({ minValue: "w" === e || "h" === e ? 1e-10 : null });
          if ("cls" === e)
            return $("<button></button>")
              .attr("data-property", e)
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
                function (n, o, i, a, r) {
                  var s = null;
                  r && (s = { chooserOn: !0, slicePattern: !0 }),
                    t._assignProperty(e, o, a, s);
                }.bind(t)
              );
          if ("cls-check" === e)
            return $("<label></label>")
              .addClass("g-checkbox-label")
              .append(
                $("<input>")
                  .addClass("cls-check-checkbox")
                  .attr("type", "checkbox")
                  .attr("data-property", e)
                  .on(
                    "change",
                    function (e) {
                      gDesigner.stats("sliceproperties_change_background"),
                        t._assignProperty(
                          "cls",
                          $(e.target).is(":checked") ? i.GRGBColor.WHITE : null
                        );
                    }.bind(t)
                  )
              )
              .append(
                $(
                  "<span>" +
                    i.GLocale.get(
                      new i.GLocaleKey("GCommonNames", "text.background-color")
                    ) +
                    "</span>"
                )
              );
          if ("trm" === e)
            return $("<label></label>")
              .addClass("g-checkbox-label")
              .append(
                $("<input>")
                  .addClass("trm-checkbox")
                  .attr("type", "checkbox")
                  .attr("data-property", e)
                  .on(
                    "change",
                    function (n) {
                      gDesigner.stats("sliceproperties_trim_transparent"),
                        t._assignProperty(e, $(n.target).is(":checked"));
                    }.bind(t)
                  )
              )
              .append(
                $(
                  "<span>" +
                    i.GLocale.get(
                      new i.GLocaleKey(
                        "GSliceProperties",
                        "text.trim-transparent-pixels"
                      )
                    ) +
                    "</span>"
                )
              );
          throw new Error("Unknown input property: " + e);
        }.bind(this);
        $("<div></div>")
          .addClass("slice-position-left-row")
          .gPropertyRow({
            label: i.GLocale.get(new i.GLocaleKey("GCommonNames", "text.left")),
            columns: [{ width: "44%", content: n("x") }],
          })
          .appendTo(e),
          $("<div></div>")
            .addClass("slice-position-top-row")
            .gPropertyRow({
              label: i.GLocale.get(
                new i.GLocaleKey("GCommonNames", "text.top")
              ),
              columns: [{ width: "44%", content: n("y") }],
            })
            .appendTo(e),
          $("<div></div>")
            .addClass("slice-size-width-row")
            .gPropertyRow({
              label: i.GLocale.get(
                new i.GLocaleKey("GCommonNames", "text.width")
              ),
              columns: [{ width: "44%", content: n("w") }],
            })
            .appendTo(e),
          $("<div></div>")
            .addClass("slice-size-height-row")
            .gPropertyRow({
              label: i.GLocale.get(
                new i.GLocaleKey("GCommonNames", "text.height")
              ),
              columns: [{ width: "44%", content: n("h") }],
            })
            .appendTo(e),
          $("<div></div>")
            .addClass("slice-trm-row")
            .gPropertyRow({ columns: [{ width: "100%", content: n("trm") }] })
            .appendTo(e),
          $("<div></div>")
            .addClass("slice-bg-row")
            .gPropertyRow({
              columns: [
                { width: "80%", content: n("cls-check") },
                { width: "20%", content: n("cls") },
              ],
            })
            .appendTo(e);
      }),
      (c.prototype.update = function (e, t, n) {
        if ((this._updateUI(), this._ownChange)) return !0;
        if (
          (this._chooserElem && this._chooserElem.gPatternChooser("close"),
          this._document &&
            (this._document
              .getScene()
              .removeEventListener(
                i.GNode.AfterPropertiesChangeEvent,
                this._afterPropertiesChange,
                this
              ),
            gDesigner.removeEventListener(l, this._settingChanged),
            (this._document = null)),
          (this._slices = []),
          e)
        ) {
          for (var o = 0; o < t.length; ++o)
            t[o] instanceof i.GSlice && this._slices.push(t[o]);
          if (this._slices.length && this._slices.length === t.length)
            return (
              (this._document = e),
              this._document
                .getScene()
                .addEventListener(
                  i.GNode.AfterPropertiesChangeEvent,
                  this._afterPropertiesChange,
                  this
                ),
              gDesigner.addEventListener(l, this._settingChanged, this),
              this._updateProperties(n),
              !0
            );
        }
        return !1;
      }),
      (c.prototype._updateUI = function () {
        let e = (e) => {
            e.prev().remove();
          },
          t = (e, t) => {
            e.prev().length ||
              $("<span/>").addClass("g-input-label").text(t).insertBefore(e);
          },
          n = this._panel.find(".slice-position-left-row .property-label span"),
          o = this._panel.find(".slice-size-width-row .property-label span"),
          a = this._panel.find(".x-input"),
          r = this._panel.find(".y-input"),
          s = this._panel.find(".w-input"),
          l = this._panel.find(".h-input");
        gDesigner.isTouchEnabled()
          ? (this._panel.find(".trm-checkbox").gCheckboxSlider(),
            this._panel.find(".cls-check-checkbox").gCheckboxSlider(),
            n.text(
              i.GLocale.get(new i.GLocaleKey("GCommonNames", "text.position"))
            ),
            o.text(
              i.GLocale.get(new i.GLocaleKey("GCommonNames", "text.size"))
            ),
            t(a, "x"),
            t(r, "y"),
            t(s, "w"),
            t(l, "h"))
          : (this._panel.find(".trm-checkbox").gCheckboxSlider("unmount"),
            this._panel.find(".cls-check-checkbox").gCheckboxSlider("unmount"),
            n.text(
              i.GLocale.get(new i.GLocaleKey("GCommonNames", "text.left"))
            ),
            o.text(
              i.GLocale.get(new i.GLocaleKey("GCommonNames", "text.width"))
            ),
            e(a),
            e(r),
            e(s),
            e(l));
      }),
      (c.prototype._afterPropertiesChange = function (e) {
        !e.temporary &&
          this._slices.length > 0 &&
          this._slices[0] === e.node &&
          this._updateProperties();
      }),
      (c.prototype._settingChanged = function (e) {
        "decimals_num" === e.key && this._updateProperties(),
          "touch" === e.key && this._updateUI();
      }),
      (c.prototype._updateProperties = function (e) {
        var t = this._document.getScene(),
          n = this._slices[0],
          o = function (e) {
            var o = this._panel.find('input[data-property="' + e + '"]');
            this._slices.length > 1
              ? o.gInputBox("value", null).prop("disabled", !0)
              : o
                  .gInputBox(
                    "value",
                    t.pointToString(
                      n.getProperty(e),
                      t.getOptimalDecimalsCount()
                    )
                  )
                  .prop("disabled", !1);
          }.bind(this);
        o("x"), o("y"), o("w"), o("h");
        var i = n.getProperty("cls");
        this._panel.find('[data-property="cls-check"]').prop("checked", !!i),
          this._panel
            .find('[data-property="cls"]')
            .prop("disabled", !i)
            .gPatternChooser("value", n.getProperty("cls")),
          this._panel
            .find('input[data-property="trm"]')
            .prop("checked", n.getProperty("trm")),
          e &&
            (e.evtType == a.GEditor.ModifiedEvent.Type.Undo ||
              e.evtType == a.GEditor.ModifiedEvent.Type.Redo) &&
            e.chooserOn &&
            e.slicePattern &&
            this._panel
              .find('[data-property="cls"]')
              .find(".preview")
              .trigger("click");
      }),
      (c.prototype._assignProperty = function (e, t, n, o) {
        this._assignProperties([e], [t], n, o);
      }),
      (c.prototype._assignProperties = function (e, t, n, o) {
        if (n)
          for (var a = 0; a < this._slices.length; ++a)
            this._slices[a].setProperties(e, t, !0);
        else {
          this._ownChange = !0;
          var r = this._document.getEditor();
          r.beginTransaction();
          try {
            for (a = 0; a < this._slices.length; ++a)
              this._slices[a].setProperties(e, t);
          } finally {
            r.commitTransaction(
              i.GLocale.get(
                new i.GLocaleKey(
                  "GSliceProperties",
                  "action.modify-slice-properties"
                )
              ),
              o || null
            ),
              (this._ownChange = !1);
          }
        }
      }),
      (c.prototype.toString = function () {
        return "[Object GSliceProperties]";
      }),
      (e.exports = c);
  }