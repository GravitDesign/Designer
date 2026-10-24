/**
 * Webpack Module #1660
 * Type: class
 * Name: GTransformProperties
 */

function (e, t, n) {
    "use strict";
    n(865), n(193), n(57), n(3), n(4), n(13);
    var o = n(53),
      i = n(1),
      a = n(67),
      r = n(123),
      s = (n(173), n(135));
    n(1162);
    function l() {
      this._elements = [];
    }
    i.GObject.inherit(l, r),
      (l.prototype._panel = null),
      (l.prototype._copiesAndApply = null),
      (l.prototype._copiesAndApplyTouch = null),
      (l.prototype._document = null),
      (l.prototype._elements = null),
      (l.prototype.isGroup = function (e) {
        return !1;
      }),
      (l.prototype._scaleKeepRatio = !1),
      (l.prototype._preserveScaleX = 100),
      (l.prototype._preserveScaleY = 100),
      (l.prototype.init = function (e, t) {
        t.addClass("advanced-transform-toolbar"),
          (this._panel = e.addClass("advanced-transform-properties"));
        var n = this;
        (this._advancedTransformPanel = $("<div></div>")
          .css("width", "180px")
          .gOverlay({
            releaseOnClose: !1,
            clazz: "g-overlay-advanced-transform",
          })),
          $("<div></div>")
            .gPropertyRow({
              columns: [
                {
                  width: "auto",
                  content: $("<label></label>")
                    .append(
                      $("<input />")
                        .attr("type", "checkbox")
                        .attr("data-property", "_bs")
                        .prop("checked", !0)
                        .on("change", function () {
                          gDesigner.stats(
                            "transformproperties_toggle_autoscale-borders",
                            $(this).prop("checked") ? "enabled" : "disabled"
                          ),
                            n._setBorderScale($(this).prop("checked"));
                        })
                    )
                    .append(
                      $("<span></span>").text(
                        i.GLocale.get(
                          new i.GLocaleKey(
                            "GBorderPaintLayerProperties",
                            "text.autoscale-borders"
                          )
                        )
                      )
                    ),
                },
              ],
            })
            .appendTo(this._advancedTransformPanel),
          $("<div></div>")
            .gPropertyRow({
              columns: [
                {
                  width: "auto",
                  content: $("<label></label>")
                    .append(
                      $("<input />")
                        .attr("type", "checkbox")
                        .attr("data-property", "esc")
                        .prop("checked", !0)
                        .on("change", function () {
                          gDesigner.stats(
                            "transformproperties_toggle_autoscale-corners",
                            $(this).prop("checked") ? "enabled" : "disabled"
                          ),
                            n._setCornersScale($(this).prop("checked"));
                        })
                    )
                    .append(
                      $("<span></span>").text(
                        i.GLocale.get(
                          new i.GLocaleKey(
                            "GCommonNames",
                            "text.autoscale-corners"
                          )
                        )
                      )
                    ),
                },
              ],
            })
            .appendTo(this._advancedTransformPanel),
          $("<label></label>")
            .text(
              i.GLocale.get(new i.GLocaleKey("GTransformProperties", "title"))
            )
            .appendTo(t),
          $("<button></button>")
            .attr("data-action", "stroke-settings")
            .attr(
              "data-title",
              i.GLocale.get(
                new i.GLocaleKey(
                  "GTransformProperties",
                  "text.advanced-transform-settings"
                )
              )
            )
            .append($("<span></span>").addClass("gravit-icon-settings"))
            .on(
              "click",
              function (e) {
                gDesigner.stats("transformproperties_open_advanced"),
                  this._advancedTransformPanel.gOverlay(
                    "open",
                    $(e.target).closest("button")
                  );
              }.bind(this)
            )
            .appendTo(t);
        const o = a.GRichTooltipConfig.from({
            title: i.GLocale.get(
              new i.GLocaleKey(
                "GTransformProperties",
                "text.move-tooltip-title"
              )
            ),
            description: i.GLocale.get(
              new i.GLocaleKey(
                "GTransformProperties",
                "text.move-tooltip-description"
              )
            ),
            middle: !1,
            learnMore:
              "",
          }),
          r = a.GRichTooltipConfig.from({
            title: i.GLocale.get(
              new i.GLocaleKey(
                "GTransformProperties",
                "text.scale-tooltip-title"
              )
            ),
            description: i.GLocale.get(
              new i.GLocaleKey(
                "GTransformProperties",
                "text.scale-tooltip-description"
              )
            ),
            middle: !1,
            learnMore:
              "",
          }),
          s = a.GRichTooltipConfig.from({
            title: i.GLocale.get(
              new i.GLocaleKey(
                "GTransformProperties",
                "text.rotate-tooltip-title"
              )
            ),
            description: i.GLocale.get(
              new i.GLocaleKey(
                "GTransformProperties",
                "text.rotate-tooltip-description"
              )
            ),
            middle: !1,
            learnMore:
              "",
          }),
          l = a.GRichTooltipConfig.from({
            title: i.GLocale.get(
              new i.GLocaleKey(
                "GTransformProperties",
                "text.rotate-axis-tooltip-title"
              )
            ),
            description: i.GLocale.get(
              new i.GLocaleKey(
                "GTransformProperties",
                "text.rotate-axis-tooltip-description"
              )
            ),
            middle: !1,
            learnMore:
              "",
          }),
          c = a.GRichTooltipConfig.from({
            title: i.GLocale.get(
              new i.GLocaleKey(
                "GTransformProperties",
                "text.skew-tooltip-title"
              )
            ),
            description: i.GLocale.get(
              new i.GLocaleKey(
                "GTransformProperties",
                "text.skew-tooltip-description"
              )
            ),
            middle: !1,
            learnMore:
              "",
          }),
          d = a.GRichTooltipConfig.from({
            title: i.GLocale.get(
              new i.GLocaleKey(
                "GTransformProperties",
                "text.copies-tooltip-title"
              )
            ),
            description: i.GLocale.get(
              new i.GLocaleKey(
                "GTransformProperties",
                "text.copies-tooltip-description"
              )
            ),
            middle: !1,
            learnMore:
              "",
          }),
          u = a.GRichTooltipConfig.from({
            title: i.GLocale.get(
              new i.GLocaleKey(
                "GTransformProperties",
                "text.transdorm-origin-tooltip-title"
              )
            ),
            description: i.GLocale.get(
              new i.GLocaleKey(
                "GTransformProperties",
                "text.transdorm-origin-tooltip-description"
              )
            ),
            learnMore:
              "",
          });
        $("<div></div>")
          .gPropertyRow({
            label: i.GLocale.get(
              new i.GLocaleKey("GCommonNames", "action.move")
            ),
            columns: [
              {
                width: "44%",
                content: $("<div/>")
                  .append(
                    $("<input/>")
                      .on("keydown", this._confirmEvent.bind(this))
                      .on("change", (e) =>
                        gDesigner.stats("transformproperties_change_move-x")
                      )
                      .attr({ type: "text", "data-property": "move-x" })
                      .gInputBox()
                      .gInputBox("value", "0")
                  )
                  .gInputLabel({ label: "x" })
                  .gRichTooltip(o),
              },
              { width: "12%" },
              {
                width: "44%",
                content: $("<div/>")
                  .append(
                    $("<input/>")
                      .on("keydown", this._confirmEvent.bind(this))
                      .on("change", (e) =>
                        gDesigner.stats("transformproperties_change_move-y")
                      )
                      .attr({ type: "text", "data-property": "move-y" })
                      .gInputBox()
                      .gInputBox("value", "0")
                  )
                  .gInputLabel({ label: "y" })
                  .gRichTooltip(o),
              },
            ],
          })
          .appendTo(this._panel),
          $("<div></div>")
            .gPropertyRow({
              label: i.GLocale.get(
                new i.GLocaleKey("GTransformProperties", "text.scale")
              ),
              columns: [
                {
                  width: "44%",
                  content: $("<div/>")
                    .append(
                      $("<input/>")
                        .attr({ type: "text", "data-property": "scale-x" })
                        .on("change", (e) => {
                          gDesigner.stats("transformproperties_change_scale-x");
                          var t =
                            parseFloat($(e.target).gInputBox("value")) || 100;
                          if (this._scaleKeepRatio) {
                            var n = t / this._preserveScaleX,
                              o = this._panel.find('[data-property="scale-y"]'),
                              i = parseFloat(o.gInputBox("value")) || 100;
                            (i *= n),
                              o.gInputBox("value", parseFloat(i).toFixed(1));
                          }
                          this._preserveScaleX = t;
                        })
                        .gInputBox({ postfix: "%" })
                        .gInputBox("value", "100")
                    )
                    .gInputLabel({
                      label: i.GLocale.get(
                        new i.GLocaleKey("GCommonNames", "property-w"),
                        "w"
                      ),
                    })
                    .gRichTooltip(r),
                },
                {
                  width: "12%",
                  content: $("<span></span>")
                    .addClass("gravit-icon-unlinked transform-scale-link")
                    .css("text-align", "center")
                    .css("cursor", "pointer")
                    .on("click", function (e) {
                      var t = $(this);
                      "yes" === t.attr("data-ratio")
                        ? (t
                            .attr("data-ratio", "no")
                            .attr(
                              "class",
                              "gravit-icon-unlinked transform-scale-link"
                            ),
                          (n._scaleKeepRatio = !1))
                        : (t
                            .attr("data-ratio", "yes")
                            .attr(
                              "class",
                              "gravit-icon-linked transform-scale-link"
                            ),
                          (n._scaleKeepRatio = !0));
                    })
                    .attr(
                      "data-title",
                      i.GLocale.get(
                        new i.GLocaleKey(
                          "GDimensionProperties",
                          "action.keep-ratio"
                        )
                      )
                    )
                    .attr("data-ratio", "no"),
                },
                {
                  width: "44%",
                  content: $("<div/>")
                    .append(
                      $("<input/>")
                        .attr({ type: "text", "data-property": "scale-y" })
                        .on("change", (e) => {
                          gDesigner.stats("transformproperties_change_scale-y");
                          var t =
                            parseFloat($(e.target).gInputBox("value")) || 100;
                          if (this._scaleKeepRatio) {
                            var n = t / this._preserveScaleY,
                              o = this._panel.find('[data-property="scale-x"]'),
                              i = parseFloat(o.gInputBox("value")) || 100;
                            (i *= n),
                              o.gInputBox("value", parseFloat(i).toFixed(1));
                          }
                          this._preserveScaleY = t;
                        })
                        .gInputBox({ postfix: "%" })
                        .gInputBox("value", "100")
                    )
                    .gInputLabel({
                      label: i.GLocale.get(
                        new i.GLocaleKey("GCommonNames", "property-h"),
                        "h"
                      ),
                    })
                    .gRichTooltip(r),
                },
              ],
            })
            .appendTo(this._panel),
          $("<div></div>")
            .gPropertyRow({
              label: i.GLocale.get(
                new i.GLocaleKey("GCommonNames", "action.rotate")
              ),
              columns: [
                {
                  width: "44%",
                  content: $("<div/>")
                    .append(
                      $("<input/>")
                        .attr({ type: "text", "data-property": "rotate" })
                        .on("change", (e) =>
                          gDesigner.stats(
                            "transformproperties_change_rotate-up"
                          )
                        )
                        .gInputBox({ postfix: "°" })
                        .gInputBox("value", "0")
                    )
                    .gInputLabel({ label: "&#x2191;" })
                    .gRichTooltip(s),
                },
                { width: "12%" },
                {
                  width: "44%",
                  content: $("<div/>")
                    .append(
                      $("<input/>")
                        .attr({ type: "text", "data-property": "reflect" })
                        .on("change", (e) =>
                          gDesigner.stats(
                            "transformproperties_change_rotate-down"
                          )
                        )
                        .gInputBox({ postfix: "°" })
                        .gInputBox("value", "0")
                    )
                    .gInputLabel({ label: "&#x2193;" })
                    .gRichTooltip(l),
                },
              ],
            })
            .appendTo(this._panel),
          $("<div></div>")
            .gPropertyRow({
              label: i.GLocale.get(
                new i.GLocaleKey("GTransformProperties", "text.skew")
              ),
              columns: [
                {
                  width: "44%",
                  content: $("<div/>")
                    .append(
                      $("<input/>")
                        .attr({ type: "text", "data-property": "skew-x" })
                        .on("change", (e) =>
                          gDesigner.stats("transformproperties_change_skew-x")
                        )
                        .gInputBox({ postfix: "°" })
                        .gInputBox("value", "0")
                    )
                    .gInputLabel({ label: "X" })
                    .gRichTooltip(c),
                },
                { width: "12%" },
                {
                  width: "44%",
                  content: $("<div/>")
                    .append(
                      $("<input/>")
                        .attr({ type: "text", "data-property": "skew-y" })
                        .on("change", (e) =>
                          gDesigner.stats("transformproperties_change_skew-y")
                        )
                        .gInputBox({ postfix: "°" })
                        .gInputBox("value", "0")
                    )
                    .gInputLabel({ label: "Y" })
                    .gRichTooltip(c),
                },
              ],
            })
            .appendTo(this._panel),
          $("<hr/>").appendTo(this._panel),
          (this._copiesAndApply = $("<div/>")
            .addClass("copies-apply")
            .appendTo(this._panel)),
          (this._copiesAndApplyTouch = $("<div/>")
            .addClass("copies-apply-touch")
            .appendTo(this._panel));
        ((e) => {
          $("<div></div>")
            .gPropertyRow({
              label: i.GLocale.get(
                new i.GLocaleKey("GTransformProperties", "text.copies")
              ),
              columns: [
                {
                  width: "44%",
                  content: $("<input/>")
                    .on("change", (e) =>
                      gDesigner.stats("transformproperties_change_copies")
                    )
                    .attr({ type: "text", "data-property": "copies" })
                    .gInputBox()
                    .gInputBox("value", "0")
                    .gRichTooltip(d),
                },
                { width: "12%" },
                {
                  width: "44%",
                  html: $("<div/>")
                    .css("width", "100%")
                    .css("display", "flex")
                    .css("justify-content", "center")
                    .append(
                      $("<div></div>")
                        .attr("data-property", "pivot")
                        .css("align-self", "center")
                        .gPivot()
                        .gPivot("value", i.GRect.Side.CENTER)
                    )
                    .gRichTooltip(u),
                },
              ],
            })
            .appendTo(e),
            $("<div></div>")
              .gPropertyRow({
                label: "",
                columns: [
                  {
                    width: "100%",
                    content: $("<button></button>")
                      .text(
                        i.GLocale.get(
                          new i.GLocaleKey("GCommonNames", "action.apply")
                        )
                      )
                      .addClass("transform-button")
                      .css("margin-top", "5px")
                      .on("click", this._applyTransformation.bind(this)),
                  },
                ],
              })
              .appendTo(e);
        })(this._copiesAndApply),
          ((e) => {
            var t = $("<div/>").addClass("left");
            $("<div></div>")
              .gPropertyRow({
                label: i.GLocale.get(
                  new i.GLocaleKey("GTransformProperties", "text.copies")
                ),
                columns: [
                  {
                    width: "100px",
                    content: $("<input/>")
                      .on("change", (e) =>
                        gDesigner.stats("transformproperties_change_copies")
                      )
                      .attr({ type: "text", "data-property": "copies" })
                      .gInputBox()
                      .gInputBox("value", "0")
                      .gRichTooltip(d),
                  },
                ],
              })
              .appendTo(t),
              $("<div></div>")
                .addClass("transform-apply")
                .gPropertyRow({
                  columns: [
                    {
                      width: "100%",
                      content: $("<button></button>")
                        .text(
                          i.GLocale.get(
                            new i.GLocaleKey(
                              "GDimensionProperties",
                              "text.transform-apply"
                            )
                          )
                        )
                        .addClass("transform-button")
                        .on("click", this._applyTransformation.bind(this)),
                    },
                  ],
                })
                .appendTo(t),
              t.appendTo(e),
              $("<div></div>")
                .addClass("right")
                .append(
                  $("<div/>")
                    .attr("data-property", "pivot")
                    .gPivot()
                    .gPivot("value", i.GRect.Side.CENTER)
                )
                .appendTo(e);
          })(this._copiesAndApplyTouch);
      }),
      (l.prototype.isAvailable = function (e) {
        return !0 === e;
      }),
      (l.prototype._enableTouchModal = function (e) {
        e
          ? (this._copiesAndApplyTouch.css("display", "block"),
            this._copiesAndApply.css("display", "none"))
          : (this._copiesAndApplyTouch.css("display", "none"),
            this._copiesAndApply.css("display", "block"));
      }),
      (l.prototype.update = function (e, t) {
        if (
          (this._document &&
            (gDesigner.removeEventListener(s, this._settingChanged),
            (this._document = null)),
          this._enableTouchModal(gDesigner.isTouchEnabled()),
          (this._elements = []),
          e)
        ) {
          for (var n = 0; n < t.length; ++n)
            !t[n].hasMixin(i.GElement.Transform) ||
              t[n] instanceof i.GPage ||
              this._elements.push(t[n]);
          if (this._elements.length && this._elements.length === t.length)
            return (
              (this._document = e),
              gDesigner.addEventListener(s, this._settingChanged, this),
              this._setBorderScale(this._getOwnBorderScale()),
              this._setCornersScale(this._getOwnCornersScale()),
              !0
            );
        }
        return !1;
      }),
      (l.prototype._confirmEvent = function (e) {
        13 === e.keyCode && this._updateDisplayValues();
      }),
      (l.prototype._settingChanged = function (e) {
        "decimals_num" === e.key && this._updateDisplayValues();
      }),
      (l.prototype._updateDisplayValues = function () {
        this._document.getScene();
        var e = this._panel.find('[data-property="move-x"]'),
          t = parseFloat(e.gInputBox("value"));
        (t = isNaN(t) || t <= 0 || !t ? 0 : t),
          e.gInputBox(
            "value",
            i.GUtil.formatNumber(
              t,
              this._document.getScene().getOptimalDecimalsCount()
            )
          ),
          (e = this._panel.find('[data-property="move-y"]')),
          (t = parseFloat(e.gInputBox("value"))),
          (t = isNaN(t) || t <= 0 || !t ? 0 : t),
          e.gInputBox(
            "value",
            i.GUtil.formatNumber(
              t,
              this._document.getScene().getOptimalDecimalsCount()
            )
          );
      }),
      (l.prototype._applyTransformation = function () {
        gDesigner.stats("transformproperties_apply_transformation");
        var e = this._document.getScene(),
          t = gDesigner.isTouchEnabled()
            ? this._copiesAndApplyTouch
            : this._copiesAndApply,
          n = parseInt(t.find('[data-property="copies"]').gInputBox("value")),
          a = t.find('[data-property="pivot"]').gPivot("value"),
          r =
            e.stringToPoint(
              this._panel.find('[data-property="move-x"]').gInputBox("value")
            ) || 0,
          s =
            e.stringToPoint(
              this._panel.find('[data-property="move-y"]').gInputBox("value")
            ) || 0,
          l =
            parseFloat(
              this._panel.find('[data-property="scale-x"]').gInputBox("value")
            ) / 100 || 1,
          c =
            parseFloat(
              this._panel.find('[data-property="scale-y"]').gInputBox("value")
            ) / 100 || 1,
          d =
            i.GMath.toRadians(
              parseFloat(
                this._panel.find('[data-property="rotate"]').gInputBox("value")
              )
            ) || 0,
          u =
            i.GMath.toRadians(
              parseFloat(
                this._panel.find('[data-property="skew-x"]').gInputBox("value")
              )
            ) || 0,
          p =
            i.GMath.toRadians(
              parseFloat(
                this._panel.find('[data-property="skew-y"]').gInputBox("value")
              )
            ) || 0,
          g =
            parseFloat(
              parseFloat(
                this._panel.find('[data-property="reflect"]').gInputBox("value")
              )
            ) || 0;
        g = 0 !== g ? i.GMath.toRadians(-g) : g;
        var h = function (e, t) {
          var n = o.GElementEditor.openEditor(e);
          n
            ? (n._setTransform(t), n.applyTransform(e, !0, null, null))
            : e.transform(e, !0);
        };
        function f(e, t, n) {
          t.beginUpdate();
          try {
            if (
              ((r || s) && h(t, new i.GTransform(1, 0, 0, 1, r * e, s * e)),
              (1 === l && 1 === c) ||
                h(
                  t,
                  new i.GTransform()
                    .translated(-n.getX(), -n.getY())
                    .scaled(l + (l - 1) * (e - 1), c + (c - 1) * (e - 1))
                    .translated(n.getX(), n.getY())
                ),
              0 !== d &&
                h(
                  t,
                  new i.GTransform()
                    .translated(-n.getX(), -n.getY())
                    .rotated(d * e)
                    .translated(n.getX(), n.getY())
                ),
              (0 !== u || 0 !== p) &&
                u > -i.GMath.PIHALF &&
                p > -i.GMath.PIHALF &&
                u < i.GMath.PIHALF &&
                p < i.GMath.PIHALF &&
                h(
                  t,
                  new i.GTransform()
                    .translated(-n.getX(), -n.getY())
                    .skewed(u * e, p * e)
                    .translated(n.getX(), n.getY())
                ),
              0 !== g)
            ) {
              var o = Math.cos(g),
                a = Math.sin(g);
              e % 2 &&
                h(
                  t,
                  new i.GTransform()
                    .translated(-n.getX(), -n.getY())
                    .multiplied(new i.GTransform(o, -a, a, o, 0, 0))
                    .multiplied(new i.GTransform(1, 0, 0, -1, 0, 0))
                    .multiplied(new i.GTransform(o, a, -a, o, 0, 0))
                    .translated(n.getX(), n.getY())
                );
            }
          } finally {
            t.endUpdate();
          }
        }
        o.GEditor.tryRunTransaction(
          e,
          function () {
            for (
              var e = [], t = null, o = null, r = 0;
              r < this._elements.length;
              ++r
            ) {
              var s = this._elements[r];
              a && (o = s.getGeometryBBox()) && (t = t ? t.united(o) : o);
              var l = [s];
              if (n > 0)
                for (
                  var c = s.getParent(),
                    d = s.getNext() ? s.getNext() : null,
                    u = 0;
                  u < n;
                  ++u
                ) {
                  var p = s.clone();
                  c.insertChild(p, d),
                    u == n - 1 &&
                      (p.setFlag(i.GNode.Flag.Selected),
                      s.removeFlag(i.GNode.Flag.Selected)),
                    l.push(p);
                }
              e.push(l);
            }
            var g = null;
            if ((t && !t.isEmpty() && (g = t.getSide(a)), g))
              for (r = 0; r < e.length; ++r) {
                if ((l = e[r]).length > 1)
                  for (var h = 0; h < l.length; ++h) f(h, l[h], g);
                else 1 == l.length && f(1, l[0], g);
              }
          }.bind(this),
          i.GLocale.get(
            new i.GLocaleKey(
              "GTransformProperties",
              "action.apply-transformation"
            )
          )
        );
      }),
      (l.prototype._getOwnBorderScale = function () {
        return this._advancedTransformPanel
          .find('[data-property="_bs"]')
          .prop("checked");
      }),
      (l.prototype._setBorderScale = function (e) {
        this._document &&
          this._document
            .getScene()
            .setBorderScale(
              e &&
                (void 0 === o.GEditorOptions.scaleBorderWidth ||
                  o.GEditorOptions.scaleBorderWidth)
            );
      }),
      (l.prototype._getOwnCornersScale = function () {
        return this._advancedTransformPanel
          .find('[data-property="esc"]')
          .prop("checked");
      }),
      (l.prototype._setCornersScale = function (e) {
        this._document &&
          this._document
            .getScene()
            .setCornersScale(
              e &&
                (void 0 === o.GEditorOptions.scaleCorners ||
                  o.GEditorOptions.scaleCorners)
            );
      }),
      (l.prototype.toString = function () {
        return "[Object GTransformProperties]";
      }),
      (e.exports = l);
  }