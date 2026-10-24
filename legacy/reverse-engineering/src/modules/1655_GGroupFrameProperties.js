/**
 * Webpack Module #1655
 * Type: class
 * Name: GGroupFrameProperties
 */

function (e, t, n) {
    "use strict";
    n(3), n(4), n(13);
    var o = n(1),
      i = n(123);
    function a() {
      this._items = [];
    }
    o.GObject.inherit(a, i),
      (a.prototype._panel = null),
      (a.prototype._document = null),
      (a.prototype._items = null),
      (a.prototype.init = function (e) {
        (this._panel = e),
          this._panel.addClass("group-frame-property-panel"),
          $("<div></div>")
            .addClass("group-frame-row")
            .attr("major-item-only", !0)
            .gPropertyRow({
              columns: [
                {
                  width: "auto",
                  content: $("<select></select>")
                    .attr("data-item-property", "frm")
                    .on(
                      "change",
                      function (e) {
                        var t = "1" == $(e.target).val();
                        gDesigner.stats(
                          "groupframeproperties_toggle_frame",
                          t ? "enable" : "disable"
                        ),
                          this._assignProperty(
                            "frm",
                            t,
                            t
                              ? o.GLocale.get(
                                  new o.GLocaleKey(
                                    "GGroupFrameProperties",
                                    "text.switch-frame"
                                  )
                                )
                              : o.GLocale.get(
                                  new o.GLocaleKey(
                                    "GGroupFrameProperties",
                                    "text.switch-group"
                                  )
                                )
                          );
                      }.bind(this)
                    )
                    .append(
                      $("<option></option>")
                        .attr("value", "0")
                        .text(
                          o.GLocale.get(
                            new o.GLocaleKey(
                              "GGroupFrameProperties",
                              "text.group"
                            )
                          )
                        )
                    )
                    .append(
                      $("<option></option>")
                        .attr("value", "1")
                        .text(
                          o.GLocale.get(
                            new o.GLocaleKey(
                              "GGroupFrameProperties",
                              "text.frame"
                            )
                          )
                        )
                    ),
                },
              ],
            })
            .appendTo(this._panel);
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
          (this._items = []),
          e)
        ) {
          for (var n = 0; n < t.length; ++n) {
            t[n] instanceof o.GGroup && this._items.push(t[n]);
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
      (a.prototype._afterPropertiesChange = function (e) {
        !e.temporary &&
          this._items.length > 0 &&
          this._items[0] === e.node &&
          this._updateProperties();
      }),
      (a.prototype._updateProperties = function () {
        var e = this._items[0];
        this._panel.find("[major-item-only]").css("display", ""),
          this._panel
            .find('[data-item-property="frm"]')
            .prop("disabled", !1)
            .prop("value", e.getProperty("frm") ? "1" : "0");
      }),
      (a.prototype._assignProperty = function (e, t, n) {
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
      (a.prototype.toString = function () {
        return "[Object GGroupFrameProperties]";
      }),
      (e.exports = a);
  }