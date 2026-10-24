/**
 * Webpack Module #1654
 * Type: class
 * Name: GFrameProperties
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
          this._panel.addClass("frame-property-panel"),
          $("<div></div>")
            .attr("major-item-only", !0)
            .addClass("item-frame")
            .gPropertyRow({
              columns: [
                {
                  width: "auto",
                  content: $("<label></label>")
                    .addClass("g-checkbox-label")
                    .append(
                      $("<input>")
                        .addClass("frm-checkbox")
                        .attr("type", "checkbox")
                        .attr("data-item-property", "frm")
                        .on(
                          "change",
                          function (e) {
                            var t = $(e.target).is(":checked");
                            gDesigner.stats(
                              "frameproperties_toggle_frame",
                              t ? "enable" : "disable"
                            ),
                              this._assignProperty(
                                "frm",
                                t,
                                t
                                  ? o.GLocale.get(
                                      new o.GLocaleKey(
                                        "GFrameProperties",
                                        "text.switch-frame"
                                      )
                                    )
                                  : o.GLocale.get(
                                      new o.GLocaleKey(
                                        "GFrameProperties",
                                        "text.frame-off"
                                      )
                                    )
                              );
                          }.bind(this)
                        )
                    )
                    .append(
                      $("<span></span>").text(
                        o.GLocale.get(
                          new o.GLocaleKey("GFrameProperties", "text.frame")
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
          for (var n = 0; n < t.length; ++n) {
            t[n] instanceof o.GLayer && this._items.push(t[n]);
          }
          if (this._items.length && this._items.length === t.length)
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
          ? this._panel.find(".frm-checkbox").gCheckboxSlider()
          : this._panel.find(".frm-checkbox").gCheckboxSlider("unmount");
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
        this._panel.find("[major-item-only]").css("display", ""),
          this._panel
            .find('input[data-item-property="frm"]')
            .prop("disabled", !1)
            .prop("checked", !!e.getProperty("frm"));
      }),
      (r.prototype._assignProperty = function (e, t, n) {
        if ("frm" == e) {
          var o = this._document.getEditor();
          o.beginTransaction();
          try {
            for (var i = 0; i < this._items.length; ++i) {
              var a = this._items[i];
              a.setFrame && a.setFrame(t);
            }
          } finally {
            o.commitTransaction(n);
          }
        }
      }),
      (r.prototype.toString = function () {
        return "[Object GFrameProperties]";
      }),
      (e.exports = r);
  }