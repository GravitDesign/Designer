/**
 * Webpack Module #1656
 * Type: class
 * Name: GItemProperties
 */

function (e, t, n) {
    "use strict";
    n(3), n(4), n(13);
    var o = n(1),
      i = n(123);
    const a = n(135);
    function r() {
      this._items = [];
    }
    o.GObject.inherit(r, i),
      (r.prototype._panel = null),
      (r.prototype._document = null),
      (r.prototype._items = null),
      (r.prototype.init = function (e) {
        (this._panel = e),
          this._panel.addClass("item-property-panel"),
          $("<div></div>")
            .attr("major-item-only", !0)
            .gPropertyRow({
              columns: [
                {
                  width: "auto",
                  content: $("<label></label>")
                    .addClass("g-checkbox-label")
                    .append(
                      $("<input>")
                        .addClass("clk-checkbox")
                        .attr("type", "checkbox")
                        .attr("data-item-property", "clk")
                        .on(
                          "change",
                          function (e) {
                            gDesigner.stats("itemproperties_click_through"),
                              this._assignProperty(
                                "clk",
                                $(e.target).is(":checked")
                              );
                          }.bind(this)
                        )
                    )
                    .append(
                      $("<span></span>")
                        .text(
                          o.GLocale.get(
                            new o.GLocaleKey(
                              "GItemProperties",
                              "text.click-through"
                            )
                          )
                        )
                        .addClass("clickElement")
                    ),
                },
              ],
            })
            .appendTo(this._panel),
          $("<div></div>")
            .attr("major-shape-only", !0)
            .gPropertyRow({
              columns: [
                {
                  width: "auto",
                  content: $("<label></label>")
                    .addClass("g-checkbox-label")
                    .append(
                      $("<input>")
                        .addClass("scc-checkbox")
                        .attr("type", "checkbox")
                        .attr("data-item-property", "scc")
                        .on(
                          "change",
                          function (e) {
                            gDesigner.stats(
                              "itemproperties_toggle_scale-with-content",
                              $(e.target).is(":checked") ? "enable" : "disable"
                            ),
                              this._assignProperty(
                                "scc",
                                $(e.target).is(":checked")
                              );
                          }.bind(this)
                        )
                    )
                    .append(
                      $("<span></span>").text(
                        o.GLocale.get(
                          new o.GLocaleKey(
                            "GItemProperties",
                            "text.scale-with-content"
                          )
                        )
                      )
                    ),
                },
              ],
            })
            .appendTo(this._panel);
      }),
      (r.prototype.update = function (e, t) {
        if (
          (this._updateUI(),
          this._document &&
            (gDesigner.removeEventListener(a, this._settingChanged, this),
            this._document
              .getScene()
              .removeEventListener(
                o.GNode.AfterPropertiesChangeEvent,
                this._afterPropertiesChange
              ),
            (this._document = null)),
          (this._items = []),
          e)
        ) {
          gDesigner.addEventListener(a, this._settingChanged, this);
          for (var n = 0; n < t.length; ++n)
            t[n] instanceof o.GItem && this._items.push(t[n]);
          if (
            this._items.length &&
            this._items.length === t.length &&
            this._hasChildItem(this._items[0])
          )
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
      (r.prototype._updateUI = function () {
        gDesigner.isTouchEnabled()
          ? (this._panel.find(".clk-checkbox").gCheckboxSlider(),
            this._panel.find(".scc-checkbox").gCheckboxSlider())
          : (this._panel.find(".clk-checkbox").gCheckboxSlider("unmount"),
            this._panel.find(".scc-checkbox").gCheckboxSlider("unmount"));
      }),
      (r.prototype._settingChanged = function (e) {
        "touch" === e.key && this._updateUI();
      }),
      (r.prototype._afterPropertiesChange = function (e) {
        !e.temporary &&
          this._items.length > 0 &&
          this._items[0] === e.node &&
          this._updateProperties();
      }),
      (r.prototype._updateProperties = function () {
        var e = this._items[0];
        this._hasChildItem(e)
          ? (this._panel.find("[major-item-only]").css("display", ""),
            this._panel
              .find('input[data-item-property="clk"]')
              .prop("disabled", !1)
              .prop("checked", e.getProperty("clk")),
            e instanceof o.GShape &&
            !(e instanceof o.GImage && e.getProperty("dblMode"))
              ? (this._panel.find("[major-shape-only]").css("display", ""),
                this._panel
                  .find("[major-item-only]")
                  .addClass("item-click-through"),
                this._panel
                  .find("[major-shape-only]")
                  .addClass("shape-scale-with-content"),
                this._panel
                  .find('input[data-item-property="scc"]')
                  .prop("checked", e.getProperty("scc")))
              : (this._panel.find("[major-shape-only]").css("display", "none"),
                this._panel
                  .find("[major-item-only]")
                  .removeClass("item-click-through"),
                this._panel
                  .find("[major-shape-only]")
                  .removeClass("shape-scale-with-content")))
          : (this._panel.find("[major-item-only]").css("display", "none"),
            this._panel.find("[major-shape-only]").css("display", "none"),
            this._panel
              .find("[major-item-only]")
              .removeClass("item-click-through"),
            this._panel
              .find("[major-shape-only]")
              .removeClass("shape-scale-with-content"));
      }),
      (r.prototype._assignProperty = function (e, t, n) {
        if ("clk" == e || "scc" == e) {
          var i = this._document.getEditor();
          i.beginTransaction();
          try {
            for (var a = 0; a < this._items.length; ++a) {
              var r = this._items[a];
              this._hasChildItem(r) &&
                ("clk" == e || r instanceof o.GShape) &&
                this._items[a].setProperties([e], [t]);
            }
          } finally {
            i.commitTransaction(n);
          }
        }
      }),
      (r.prototype._hasChildItem = function (e) {
        return (
          !!e.hasMixin(o.GNode.Container) &&
          !e.acceptChildren(
            function (e) {
              return !(e instanceof o.GItem);
            },
            !1,
            !1
          )
        );
      }),
      (r.prototype.toString = function () {
        return "[Object GItemProperties]";
      }),
      (e.exports = r);
  }