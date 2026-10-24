/**
 * Webpack Module #1269
 * Type: class
 * Name: GPathProperties
 */

function (e, t, n) {
    "use strict";
    n(3), n(4), n(13), n(32), n(33);
    var o = n(1),
      i = n(53),
      a = n(357),
      r = n(67),
      s = n(123),
      l = (n(173), n(135));
    function c() {
      this._pathes = [];
    }
    o.GObject.inherit(c, s),
      (c.prototype._panel = null),
      (c.prototype._document = null),
      (c.prototype._pathes = null),
      (c.prototype._points = null),
      (c.prototype.init = function (e, t) {
        this._panel = e;
        const n = (e) => {
          const t = this._getTargetNodeType($(e.target));
          this.assignNodeType(t);
        };
        var i = function (e) {
          var t = this;
          if ("x" === e || "y" === e)
            return $("<div/>")
              .append(
                $("<input>")
                  .attr("type", "text")
                  .attr("data-point-property", e)
                  .on("change", function (n) {
                    var o = t._document.getScene().stringToPoint($(this).val());
                    "x" === e
                      ? gDesigner.stats("pathproperties_modify_x")
                      : gDesigner.stats("pathproperties_modify_y"),
                      null !== o && "number" == typeof o
                        ? t._assignPointProperty(e, o)
                        : t._updatePointProperties();
                  })
                  .gInputBox()
              )
              .gInputLabel({ label: e });
          if ("tp" === e)
            return $("<select></select>")
              .attr("data-point-property", e)
              .append(
                $("<option></option>")
                  .attr("value", "-")
                  .text(
                    o.GLocale.get(
                      new o.GLocaleKey("GPathProperties", "text.straight")
                    )
                  )
              )
              .append(
                $("<option></option>")
                  .attr("value", o.GPathBase.AnchorPoint.Type.Mirror)
                  .text(
                    o.GLocale.get(
                      new o.GLocaleKey("GPathBase", "anchor-point.mirror")
                    )
                  )
              )
              .append(
                $("<option></option>")
                  .attr("value", o.GPathBase.AnchorPoint.Type.Asymmetric)
                  .text(
                    o.GLocale.get(
                      new o.GLocaleKey("GPathBase", "anchor-point.asymmetric")
                    )
                  )
              )
              .append(
                $("<option></option>")
                  .attr("value", o.GPathBase.AnchorPoint.Type.Symmetric)
                  .text(
                    o.GLocale.get(
                      new o.GLocaleKey("GPathBase", "anchor-point.symmetric")
                    )
                  )
              )
              .append(
                $("<option></option>")
                  .attr("value", o.GPathBase.AnchorPoint.Type.Connector)
                  .text(
                    o.GLocale.get(
                      new o.GLocaleKey("GPathBase", "anchor-point.connector")
                    )
                  )
              )
              .on("change", function (e) {
                n(e);
              });
          if ("ctp" === e)
            return $("<span></span>")
              .addClass("clickable")
              .addClass("g-button")
              .addClass("corner-type")
              .attr("data-point-property", e)
              .gCornerTypePicker()
              .on("cornertypechange", function (e, n) {
                t._assignPointProperty("tp", n);
              });
          if ("cu" === e)
            return $("<button></button>")
              .addClass("g-flat")
              .attr("data-point-property", e)
              .on("click", function () {
                gDesigner.stats("pathproperties_modify_uniform"),
                  t._assignPointProperty(e, !$(this).hasClass("g-active")),
                  t._updatePointProperties();
              })
              .append(
                $("<span></span>")
                  .addClass("gravit-icon-lock")
                  .css("font-size", "10px")
              );
          if ("cl-slider" === e)
            return $("<div/>")
              .attr("data-point-property", "cl")
              .gInputSlider({
                min: 0,
                max: 100,
                richTooltipConfig: r.GRichTooltipConfig.from({
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
                t._document.getEditor().hideSelection(),
                  $(document).one("mouseup", function () {
                    t._document.getEditor().resetHideSelection();
                  });
              })
              .on("input", function () {
                for (
                  var e = t._document
                      .getScene()
                      .stringToPoint($(this).gInputSlider("value")),
                    n = 0;
                  n < t._points.length;
                  ++n
                )
                  t._points[n].setProperty("cl", e, !1, !1, !0);
                t._panel
                  .find('[type="text"][data-point-property="cl"]')
                  .gInputBox(
                    "value",
                    t._document
                      .getScene()
                      .pointToString(
                        e,
                        t._document.getScene().getOptimalDecimalsCount()
                      )
                  );
              })
              .on("change", function () {
                var e = t._document
                  .getScene()
                  .stringToPoint($(this).gInputSlider("value"));
                gDesigner.stats("pathproperties_modify_corner"),
                  t._assignPointProperty("cl", e);
              });
          if ("cl-input" === e)
            return $("<input>")
              .attr("type", "text")
              .attr("data-point-property", "cl")
              .addClass("corner-radius")
              .on("change", function () {
                var e = t._document.getScene().stringToPoint($(this).val());
                null !== e && "number" == typeof e && e >= 0
                  ? (gDesigner.stats("pathproperties_modify_corner"),
                    t._assignPointProperty("cl", e))
                  : t._updatePointProperties();
              })
              .gInputBox({ minValue: 0 });
          throw new Error("Unknown input property: " + e);
        }.bind(this);
        $("<div></div>")
          .attr("path-only", !0)
          .gPropertyRow({
            columns: [
              {
                width: "40%",
                content: $("<label></label>")
                  .addClass("g-checkbox-label")
                  .append(
                    $("<input>")
                      .addClass("closed-checkbox")
                      .attr("type", "checkbox")
                      .attr("data-path-property", "closed")
                      .on(
                        "change",
                        function (e) {
                          $(e.target).is(":checked") ||
                            this._setBorderAlignmentCenter(),
                            gDesigner.stats("pathproperties_modify_closed"),
                            this._assignPathProperty(
                              "closed",
                              $(e.target).is(":checked")
                            );
                        }.bind(this)
                      )
                  )
                  .append(
                    $("<span></span>").text(
                      o.GLocale.get(
                        new o.GLocaleKey("GPathProperties", "text.closed")
                      )
                    )
                  ),
              },
              {
                width: "60%",
                content: $("<label></label>")
                  .addClass("g-checkbox-label")
                  .append(
                    $("<input>")
                      .addClass("csc-checkbox")
                      .attr("type", "checkbox")
                      .attr("data-path-property", "csc")
                      .on(
                        "change",
                        function (e) {
                          gDesigner.stats("pathproperties_modify_autoscale"),
                            this._assignPathProperty(
                              "csc",
                              $(e.target).is(":checked")
                            );
                        }.bind(this)
                      )
                  )
                  .append(
                    $("<span></span>").text(
                      o.GLocale.get(
                        new o.GLocaleKey(
                          "GCommonNames",
                          "text.autoscale-corners"
                        )
                      )
                    )
                  ),
              },
            ],
          })
          .appendTo(this._panel),
          $("<div></div>")
            .addClass("position-row")
            .attr("point-only", !0)
            .gPropertyRow({
              label: o.GLocale.get(
                new o.GLocaleKey("GCommonNames", "text.position")
              ),
              columns: [
                { width: "32%", content: i("x") },
                { width: "32%", content: i("y") },
                { width: "auto", content: i("tp") },
              ],
            })
            .appendTo(e),
          $("<div></div>")
            .addClass(a.PATHPROPERTIES.PATH_JOIN_CLASS)
            .addClass("joint-row")
            .attr("point-only", !0)
            .gPropertyRow({
              label: o.GLocale.get(
                new o.GLocaleKey("GPathProperties", "text.joint")
              ),
              columns: [
                {
                  width: "25%",
                  padding: !1,
                  content: $("<button></button>")
                    .addClass("g-button")
                    .css({
                      borderRadius: "0px",
                      borderTopLeftRadius: "3px",
                      borderBottomLeftRadius: "3px",
                    })
                    .attr("data-node-type", "-")
                    .attr(
                      "data-title",
                      o.GLocale.get(
                        new o.GLocaleKey("GPathProperties", "text.straight")
                      )
                    )
                    .append(
                      $("<span></span>").addClass("gravit-icon-node-straight")
                    )
                    .on("click", n),
                },
                {
                  width: "25%",
                  padding: !1,
                  content: $("<button></button>")
                    .addClass("g-button")
                    .css({ borderRadius: "0px" })
                    .attr("data-node-type", o.GPathBase.AnchorPoint.Type.Mirror)
                    .attr(
                      "data-title",
                      o.GLocale.get(
                        new o.GLocaleKey("GPathBase", "anchor-point.mirror")
                      )
                    )
                    .append(
                      $("<span></span>").addClass("gravit-icon-node-mirrored")
                    )
                    .on("click", n),
                },
                {
                  width: "25%",
                  padding: !1,
                  content: $("<button></button>")
                    .addClass("g-button")
                    .css({ borderRadius: "0px" })
                    .attr(
                      "data-node-type",
                      o.GPathBase.AnchorPoint.Type.Asymmetric
                    )
                    .attr(
                      "data-title",
                      o.GLocale.get(
                        new o.GLocaleKey("GPathBase", "anchor-point.asymmetric")
                      )
                    )
                    .append(
                      $("<span></span>").addClass(
                        "gravit-icon-node-disconnected"
                      )
                    )
                    .on("click", n),
                },
                {
                  width: "25%",
                  padding: !1,
                  content: $("<button></button>")
                    .addClass("g-button")
                    .css({
                      borderRadius: "0px",
                      borderTopRightRadius: "3px",
                      borderBottomRightRadius: "3px",
                    })
                    .attr(
                      "data-node-type",
                      o.GPathBase.AnchorPoint.Type.Symmetric
                    )
                    .attr(
                      "data-title",
                      o.GLocale.get(
                        new o.GLocaleKey("GPathBase", "anchor-point.symmetric")
                      )
                    )
                    .append(
                      $("<span></span>").addClass("gravit-icon-node-assymetric")
                    )
                    .on("click", n),
                },
              ],
            })
            .addClass("joint")
            .appendTo(this._panel),
          $("<hr/>").attr("point-only", !0).attr("corner-only", !0).appendTo(e),
          $("<div></div>")
            .attr("point-only", !0)
            .attr("corner-only", !0)
            .addClass("path-corner-chooser")
            .gPropertyRow({
              label: o.GLocale.get(
                new o.GLocaleKey("GCommonNames", "text.corner")
              ),
              columns: [
                { width: "auto", content: i("cl-slider") },
                { clazz: "corners-radius-no-padding" },
                { width: "35px", content: i("cl-input") },
                { width: "3x" },
                { width: "40px", content: i("ctp") },
              ],
            })
            .addClass("corner-radius")
            .appendTo(this._panel);
      }),
      (c.prototype.update = function (e, t) {
        if (
          (gDesigner.isTouchEnabled()
            ? (this._panel.find(".closed-checkbox").gCheckboxSlider(),
              this._panel.find(".csc-checkbox").gCheckboxSlider())
            : (this._panel.find(".closed-checkbox").gCheckboxSlider("unmount"),
              this._panel.find(".csc-checkbox").gCheckboxSlider("unmount")),
          this._document &&
            (this._document
              .getScene()
              .removeEventListener(
                o.GNode.AfterPropertiesChangeEvent,
                this._afterPropertiesChange
              ),
            this._document
              .getScene()
              .removeEventListener(
                o.GElement.AfterFlagChangeEvent,
                this._afterFlagChange
              ),
            this._document
              .getEditor()
              .removeEventListener(
                i.GEditor.EdGeometryChangeEvent,
                this._edGeometryChange,
                this
              ),
            gDesigner.removeEventListener(l, this._settingChanged),
            (this._document = null)),
          (this._pathes = []),
          (this._points = []),
          e)
        ) {
          for (var n = 0; n < t.length; ++n)
            if (t[n] instanceof o.GPath || t[n] instanceof o.GCompoundPath) {
              var a = t[n];
              this._pathes.push(a);
              var r = function (e) {
                for (
                  var t = e.getAnchorPoints().getFirstChild();
                  null !== t;
                  t = t.getNext()
                )
                  t.hasFlag(o.GNode.Flag.Selected) &&
                    (this._points.push(t),
                    1 == this._points.legth && (this._mainPath = e));
              }.bind(this);
              if (a instanceof o.GPath) r(a);
              else
                for (
                  var s = a.getPaths().getFirstChild();
                  null !== s;
                  s = s.getNext()
                )
                  r(s);
            }
          if (this._pathes.length && this._pathes.length === t.length)
            return (
              (this._document = e),
              this._document
                .getScene()
                .addEventListener(
                  o.GNode.AfterPropertiesChangeEvent,
                  this._afterPropertiesChange,
                  this
                ),
              this._document
                .getScene()
                .addEventListener(
                  o.GElement.AfterFlagChangeEvent,
                  this._afterFlagChange,
                  this
                ),
              this._document
                .getEditor()
                .addEventListener(
                  i.GEditor.EdGeometryChangeEvent,
                  this._edGeometryChange,
                  this
                ),
              gDesigner.addEventListener(l, this._settingChanged, this),
              this._updatePathProperties(),
              this._updatePointProperties(),
              !0
            );
        }
        return !1;
      }),
      (c.prototype._getTargetNodeType = function (e) {
        return e.is("select")
          ? e.val()
          : e.closest("[data-node-type]").attr("data-node-type");
      }),
      (c.prototype._getStatsNodeType = function (e) {
        switch (e) {
          case o.GPathBase.AnchorPoint.Type.Mirror:
            return "Mirror";
          case o.GPathBase.AnchorPoint.Type.Asymmetric:
            return "Asymmetric";
          case o.GPathBase.AnchorPoint.Type.Symmetric:
            return "Symmetric";
          case o.GPathBase.AnchorPoint.Type.Connector:
            return "Connector";
          default:
            return "Straight";
        }
      }),
      (c.prototype.assignNodeType = function () {
        let e =
          arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : "-";
        gDesigner.stats(
          "pathproperties_assign_nodetype",
          this._getStatsNodeType(e)
        );
        const t = this._document,
          n = t && t.getEditor();
        if (n) {
          n.beginTransaction();
          try {
            let t = null,
              i = null;
            "-" === e &&
              ((t = ["tp", "hlx", "hly", "hrx", "hry", "ah"]),
              (i = [
                o.GPathBase.CornerType.Rounded,
                null,
                null,
                null,
                null,
                !1,
              ])),
              this._points.forEach((n) => {
                if (
                  "-" !== e &&
                  ((t = ["ah", "tp"]),
                  (i = [!1, e]),
                  null === n.getProperty("hlx") &&
                    null === n.getProperty("hrx"))
                ) {
                  const a = n.getParent().getPreviousPoint(n),
                    r = a ? a.getProperty("hrx") : null,
                    s = n.getParent().getNextPoint(n),
                    l = s ? s.getProperty("hlx") : null;
                  if (
                    e != o.GPathBase.AnchorPoint.Type.Asymmetric ||
                    null !== r ||
                    null !== l
                  )
                    i[0] = !0;
                  else {
                    const e = n.getProperty("x"),
                      r = n.getProperty("y");
                    if (
                      a &&
                      a.getProperty("tp") !=
                        o.GPathBase.AnchorPoint.Type.Connector
                    ) {
                      const n = a.getProperty("x"),
                        s = a.getProperty("y");
                      if (
                        !o.GMath.isEqualEps(e, n) ||
                        !o.GMath.isEqualEps(r, s)
                      ) {
                        const a =
                            e + (n - e) * o.GPathBase.AnchorPoint.HANDLE_COEFF,
                          l =
                            r + (s - r) * o.GPathBase.AnchorPoint.HANDLE_COEFF;
                        t.push("hlx"), t.push("hly"), i.push(a), i.push(l);
                      }
                    }
                    if (
                      s &&
                      s.getProperty("tp") !=
                        o.GPathBase.AnchorPoint.Type.Connector
                    ) {
                      const n = s.getProperty("x"),
                        a = s.getProperty("y");
                      if (
                        !o.GMath.isEqualEps(e, n) ||
                        !o.GMath.isEqualEps(r, a)
                      ) {
                        const s =
                            e + (n - e) * o.GPathBase.AnchorPoint.HANDLE_COEFF,
                          l =
                            r + (a - r) * o.GPathBase.AnchorPoint.HANDLE_COEFF;
                        t.push("hrx"), t.push("hry"), i.push(s), i.push(l);
                      }
                    }
                  }
                }
                n.setProperties(t, i);
                let a = n.getProperty("tp");
                const r = n.getProperty("ah");
                a == o.GPathBase.AnchorPoint.Type.Mirror &&
                  r &&
                  n.setProperty("ah", !1);
              });
          } finally {
            n.commitTransaction(
              o.GLocale.get(
                new o.GLocaleKey(
                  "GPathProperties",
                  "action.modify-path-node-type"
                )
              )
            );
          }
        }
      }),
      (c.prototype._afterPropertiesChange = function (e) {
        e.temporary ||
          (this._pathes.length > 0 &&
            this._pathes[0] === e.node &&
            this._updatePathProperties(),
          this._points.length > 0 &&
            this._points[0] === e.node &&
            this._updatePointProperties());
      }),
      (c.prototype._afterFlagChange = function (e) {
        if (
          e.flag === o.GNode.Flag.Selected &&
          e.node instanceof o.GPathBase.AnchorPoint
        ) {
          var t = e.node.getParent() ? e.node.getParent().getParent() : null,
            n =
              t && t.getParent() && t.getParent().getParent()
                ? t.getParent().getParent()
                : null;
          ((t && this._pathes.indexOf(t) >= 0) ||
            (n && this._pathes.indexOf(n) >= 0)) &&
            (e.set
              ? this._points.push(e.node)
              : this._points.splice(this._points.indexOf(e.node), 1),
            this._updatePathProperties(),
            this._updatePointProperties());
        }
      }),
      (c.prototype._edGeometryChange = function (e) {
        this._updatePointProperties();
      }),
      (c.prototype._updatePathProperties = function () {
        if (this._points.length)
          this._panel.find("[path-only]").css("display", "none");
        else {
          this._panel.find("[path-only]").css("display", "");
          var e = this._pathes[0];
          e instanceof o.GPath
            ? (this._panel
                .find('input[data-path-property="closed"]')
                .prop("disabled", !1)
                .prop("checked", e.getProperty("closed")),
              this._panel
                .find('input[data-path-property="csc"]')
                .prop("disabled", !1)
                .prop("checked", !!e.getProperty("csc")))
            : (this._panel
                .find('input[data-path-property="closed"]')
                .prop("disabled", !0)
                .prop("checked", !1),
              this._panel
                .find('input[data-path-property="csc"]')
                .prop("disabled", !1)
                .prop("checked", !!e.getProperty("csc")));
        }
      }),
      (c.prototype._settingChanged = function (e) {
        "decimals_num" === e.key && this._updatePointProperties();
      }),
      (c.prototype._updatePointProperties = function () {
        var e = this._points.length > 0 ? this._points[0] : null;
        if (e) {
          this._panel.find("[point-only]").css("display", "");
          var t = this._getPointCoord(e);
          this._panel
            .find('input[data-point-property="x"]')
            .val(
              this._document
                .getScene()
                .pointToString(
                  t.getX(),
                  this._document.getScene().getOptimalDecimalsCount()
                )
            ),
            this._panel
              .find('input[data-point-property="y"]')
              .val(
                this._document
                  .getScene()
                  .pointToString(
                    t.getY(),
                    this._document.getScene().getOptimalDecimalsCount()
                  )
              );
          var n = !0,
            i = e.getProperty("tp");
          for (var a in o.GPathBase.AnchorPoint.Type)
            if (o.GPathBase.AnchorPoint.Type[a] === i) {
              n = !1;
              break;
            }
          var r = n ? "-" : i;
          this._panel.find('select[data-point-property="tp"]').val(r),
            this._panel.find("[data-node-type]").each(function (e, t) {
              var n = $(t);
              n.toggleClass("g-active", n.attr("data-node-type") === r);
            }),
            this._panel.find("[corner-only]").css("display", n ? "" : "none"),
            this._panel
              .find('[data-point-property="ctp"]')
              .css("display", n ? "" : "none")
              .gCornerTypePicker(
                "value",
                n ? i : o.GPathBase.CornerType.Rounded
              ),
            this._panel
              .find('div[data-point-property="cl"]')
              .prop("disabled", !n)
              .gInputSlider(
                "value",
                this._document
                  .getScene()
                  .pointToString(
                    e.getProperty("cl"),
                    this._document.getScene().getOptimalDecimalsCount()
                  )
              ),
            this._panel
              .find('input[data-point-property="cl"]')
              .prop("disabled", !n)
              .val(
                this._document
                  .getScene()
                  .pointToString(
                    e.getProperty("cl"),
                    this._document.getScene().getOptimalDecimalsCount()
                  )
              ),
            this._panel
              .find('input[data-point-property="cr"]')
              .prop("disabled", !n || e.getProperty("cu"))
              .val(
                this._document
                  .getScene()
                  .pointToString(
                    e.getProperty("cr"),
                    this._document.getScene().getOptimalDecimalsCount()
                  )
              ),
            this._panel
              .find('button[data-point-property="cu"]')
              .prop("disabled", !n)
              .toggleClass("g-active", !!e.getProperty("cu"));
        } else this._panel.find("[point-only]").css("display", "none");
      }),
      (c.prototype._getPointCoord = function (e) {
        var t,
          n,
          a = e.getPath();
        a && (t = i.GElementEditor.getEditor(a))
          ? (t.getPaintElement() != a && (e = t.getPathPointPreview(e)),
            (n = t.getPointCoord(e)))
          : (n = new o.GPoint(e.getProperty("x"), e.getProperty("y")));
        return n;
      }),
      (c.prototype._transformPoint = function (e, t, n) {
        t && (n = t.mapPoint(n));
        var o = e.getPath(),
          a = i.GElementEditor.getEditor(o);
        a
          ? a.movePoint(e, n)
          : e.setProperties(["x", "y"], [n.getX(), n.getY()]);
      }),
      (c.prototype._assignPathProperty = function (e, t) {
        this._assignPathProperties([e], [t]);
      }),
      (c.prototype._assignPathProperties = function (e, t) {
        var n = this._document.getEditor();
        n.beginTransaction();
        try {
          for (var i = 0; i < this._pathes.length; ++i)
            this._pathes[i].setProperties(e, t);
        } finally {
          n.commitTransaction(
            o.GLocale.get(
              new o.GLocaleKey(
                "GPathProperties",
                "action.modify-path-properties"
              )
            )
          );
        }
      }),
      (c.prototype._setBorderAlignmentCenter = function () {
        var e,
          t,
          n = ["_ba"],
          i = [o.GStylable.BorderAlignment.Center],
          a = this._document.getEditor();
        a.beginTransaction();
        try {
          for (var r = 0, s = this._pathes.length; r < s; ++r) {
            e = this._pathes[r].getPaintLayers().getBorderLayers();
            for (var l = 0, c = e.length; l < c; l++)
              (t = e[l]) instanceof o.GStylable.BorderPaintLayer &&
                t.setProperties(n, i);
          }
        } finally {
          a.commitTransaction(
            o.GLocale.get(
              new o.GLocaleKey(
                "GPathProperties",
                "action.modify-path-properties"
              )
            )
          );
        }
      }),
      (c.prototype._assignPointProperty = function (e, t) {
        var n = this._document.getEditor();
        n.beginTransaction();
        try {
          for (var i = 0; i < this._points.length; ++i) {
            var a = this._points[i];
            if ("x" === e) {
              var r = this._getPointCoord(a),
                s = new o.GTransform(1, 0, 0, 1, t - r.getX(), 0);
              this._transformPoint(a, s, r);
            } else if ("y" === e) {
              (r = this._getPointCoord(a)),
                (s = new o.GTransform(1, 0, 0, 1, 0, t - r.getY()));
              this._transformPoint(a, s, r);
            } else a.setProperties([e], [t]);
          }
        } finally {
          n.commitTransaction(
            o.GLocale.get(
              new o.GLocaleKey(
                "GPathProperties",
                "action.modify-point-properties"
              )
            )
          );
        }
      }),
      (c.prototype._assignPointProperties = function (e, t) {
        gDesigner.stats("pathproperties_modify_point-properties");
        var n = this._document.getEditor();
        n.beginTransaction();
        try {
          for (var i = 0; i < this._points.length; ++i)
            this._points[i].setProperties(e, t);
        } finally {
          n.commitTransaction(
            o.GLocale.get(
              new o.GLocaleKey(
                "GPathProperties",
                "action.modify-point-properties"
              )
            )
          );
        }
      }),
      (c.prototype.toString = function () {
        return "[Object GPathProperties]";
      }),
      (e.exports = c);
  }