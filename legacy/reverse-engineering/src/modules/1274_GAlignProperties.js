/**
 * Webpack Module #1274
 * Type: class
 * Name: GAlignProperties
 */

function (e, t, n) {
    "use strict";
    n(193), n(3), n(4), n(13);
    var o = n(53),
      i = n(1),
      a = n(866),
      r = n(867),
      s = n(123),
      l = n(135);
    function c() {
      this._elements = [];
    }
    i.GObject.inherit(c, s),
      (c.prototype._panel = null),
      (c.prototype._document = null),
      (c.prototype._elements = null),
      (c.prototype.isGroup = function (e) {
        return !1;
      }),
      (c.prototype.init = function (e, t) {
        this._panel = e;
        var n = (e) => {
          var t = a.ID + "." + e,
            n = gDesigner.getAction(t);
          return $("<button></button>")
            .attr("data-action", t)
            .on("click", this._executeAction.bind(this))
            .text(i.GLocale.get(n.getTitle()));
        };
        $("<hr/>").appendTo(this._panel),
          $("<div></div>")
            .gPropertyRow({
              columns: [
                {
                  width: "45%",
                  content: n(o.GEditor.ArrangeAlignType.AlignJustifyHorizontal),
                },
                { width: "10%" },
                {
                  width: "45%",
                  content: n(o.GEditor.ArrangeAlignType.AlignJustifyVertical),
                },
              ],
            })
            .appendTo(this._panel),
          $("<div></div>")
            .gPropertyRow({
              columns: [
                {
                  width: "45%",
                  prefix: {
                    label: i.GLocale.get(
                      new i.GLocaleKey("GAlignProperties", "text.space-x")
                    ),
                    width: "50px",
                  },
                  content: $("<input>")
                    .on("keydown", this._spaceEvent.bind(this))
                    .attr({ type: "text", "data-dist": r.Type.Horizontal })
                    .val("1")
                    .gInputBox({ minValue: 1 }),
                },
                { width: "10%" },
                {
                  width: "45%",
                  prefix: {
                    label: i.GLocale.get(
                      new i.GLocaleKey("GAlignProperties", "text.space-y")
                    ),
                    width: "50px",
                  },
                  content: $("<input>")
                    .on("keydown", this._spaceEvent.bind(this))
                    .attr({ type: "text", "data-dist": r.Type.Vertical })
                    .val("1")
                    .gInputBox({ minValue: 1 }),
                },
              ],
            })
            .appendTo(this._panel);
      }),
      (c.prototype._executeAction = function (e) {
        var t = $(e.target).closest("[data-action]").attr("data-action");
        t && gDesigner.executeAction(t, void 0, "alignproperties");
      }),
      (c.prototype._spaceEvent = function (e) {
        if (13 === e.keyCode) {
          var t = $(e.target).closest("input"),
            n = t.attr("data-dist"),
            o = this._document.getScene().stringToPoint(t.gInputBox("value"));
          !isNaN(o) &&
            o > 0 &&
            gDesigner.executeAction(
              r.ID + "." + n,
              [this._elements, null, o],
              "shortcut"
            ),
            this._updateDisplayValues();
        }
      }),
      (c.prototype.isAvailable = function (e) {
        return !0 === e;
      }),
      (c.prototype.update = function (e, t) {
        if (
          (this._document &&
            ((this._document = null),
            gDesigner.removeEventListener(l, this._settingChanged)),
          (this._elements = []),
          e)
        ) {
          for (var n = 0; n < t.length; ++n)
            !t[n].hasMixin(i.GElement.Transform) ||
              t[n] instanceof i.GPage ||
              this._elements.push(t[n]);
          if (this._elements.length >= 2 && this._elements.length === t.length)
            return (
              (this._document = e),
              gDesigner.addEventListener(l, this._settingChanged, this),
              !0
            );
        }
        return !1;
      }),
      (c.prototype._settingChanged = function (e) {
        "decimals_num" === e.key && this._updateDisplayValues();
      }),
      (c.prototype._updateDisplayValues = function () {
        this._panel.find("[data-dist]").each(
          function (e, t) {
            var n = $(t),
              o = parseFloat(n.gInputBox("value"));
            (o = isNaN(o) || o <= 0 || !o ? 1 : o),
              n.gInputBox(
                "value",
                i.GUtil.formatNumber(
                  o,
                  this._document.getScene().getOptimalDecimalsCount()
                )
              );
          }.bind(this)
        );
      }),
      (c.prototype.toString = function () {
        return "[Object GAlignProperties]";
      }),
      (e.exports = c);
  }