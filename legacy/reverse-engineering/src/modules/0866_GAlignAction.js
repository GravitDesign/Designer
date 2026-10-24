/**
 * Webpack Module #866
 * Type: class
 * Name: GAlignAction
 */

function (e, t, n) {
    "use strict";
    n(3);
    var o = n(53),
      i = n(1),
      a = n(15),
      r = n(67),
      s = n(18),
      l = n(31);
    function c(e) {
      (this._type = e),
        (this._title = new i.GLocaleKey("GAlignAction", "title." + e)),
        (c.TOOLTIP_CONFIG = {
          [r.TOOLTIP_AREA.SIDEBAR]: {
            [o.GEditor.ArrangeAlignType.AlignLeft]: r.GRichTooltipConfig.from({
              title: i.GLocale.get(
                new i.GLocaleKey(
                  "GAlignAction",
                  "text.align-left-tooltip-title"
                )
              ),
              description: i.GLocale.get(
                new i.GLocaleKey(
                  "GAlignAction",
                  "text.align-left-tooltip-description"
                )
              ),
              learnMore:
                "",
            }),
            [o.GEditor.ArrangeAlignType.AlignCenter]: r.GRichTooltipConfig.from(
              {
                title: i.GLocale.get(
                  new i.GLocaleKey(
                    "GAlignAction",
                    "text.align-center-tooltip-title"
                  )
                ),
                description: i.GLocale.get(
                  new i.GLocaleKey(
                    "GAlignAction",
                    "text.align-center-tooltip-description"
                  )
                ),
                learnMore:
                  "",
              }
            ),
            [o.GEditor.ArrangeAlignType.AlignRight]: r.GRichTooltipConfig.from({
              title: i.GLocale.get(
                new i.GLocaleKey(
                  "GAlignAction",
                  "text.align-right-tooltip-title"
                )
              ),
              description: i.GLocale.get(
                new i.GLocaleKey(
                  "GAlignAction",
                  "text.align-right-tooltip-description"
                )
              ),
              learnMore:
                "",
            }),
            [o.GEditor.ArrangeAlignType.AlignTop]: r.GRichTooltipConfig.from({
              title: i.GLocale.get(
                new i.GLocaleKey("GAlignAction", "text.align-top-tooltip-title")
              ),
              description: i.GLocale.get(
                new i.GLocaleKey(
                  "GAlignAction",
                  "text.align-top-tooltip-description"
                )
              ),
              learnMore:
                "",
            }),
            [o.GEditor.ArrangeAlignType.AlignMiddle]: r.GRichTooltipConfig.from(
              {
                title: i.GLocale.get(
                  new i.GLocaleKey(
                    "GAlignAction",
                    "text.align-middle-tooltip-title"
                  )
                ),
                description: i.GLocale.get(
                  new i.GLocaleKey(
                    "GAlignAction",
                    "text.align-middle-tooltip-description"
                  )
                ),
                learnMore:
                  "",
              }
            ),
            [o.GEditor.ArrangeAlignType.AlignBottom]: r.GRichTooltipConfig.from(
              {
                title: i.GLocale.get(
                  new i.GLocaleKey(
                    "GAlignAction",
                    "text.align-bottom-tooltip-title"
                  )
                ),
                description: i.GLocale.get(
                  new i.GLocaleKey(
                    "GAlignAction",
                    "text.align-bottom-tooltip-description"
                  )
                ),
                learnMore:
                  "",
              }
            ),
          },
        });
    }
    i.GObject.inherit(c, l),
      (c.ID = "arrange.align"),
      (c.TOOLTIP_CONFIG = null),
      (c.prototype._type = null),
      (c.prototype._title = null),
      (c.prototype.getId = function () {
        return c.ID + "." + this._type;
      }),
      (c.prototype.getTitle = function () {
        return this._title;
      }),
      (c.prototype.getCategory = function () {
        return s.CATEGORY_MODIFY_ALIGN;
      }),
      (c.prototype.getGroup = function () {
        var e = "";
        switch (this._type) {
          case o.GEditor.ArrangeAlignType.AlignLeft:
          case o.GEditor.ArrangeAlignType.AlignCenter:
          case o.GEditor.ArrangeAlignType.AlignRight:
            e = "horizontal";
            break;
          case o.GEditor.ArrangeAlignType.AlignTop:
          case o.GEditor.ArrangeAlignType.AlignMiddle:
          case o.GEditor.ArrangeAlignType.AlignBottom:
            e = "vertical";
            break;
          case o.GEditor.ArrangeAlignType.AlignJustifyHorizontal:
          case o.GEditor.ArrangeAlignType.AlignJustifyVertical:
            e = "justify";
        }
        return "arrange/align-" + e;
      }),
      (c.prototype.getShortcut = function () {
        const e = [a.GKey.Constant.OPTION];
        switch (this._type) {
          case o.GEditor.ArrangeAlignType.AlignLeft:
            return e.concat("A");
          case o.GEditor.ArrangeAlignType.AlignCenter:
            return e.concat("H");
          case o.GEditor.ArrangeAlignType.AlignRight:
            return e.concat("D");
          case o.GEditor.ArrangeAlignType.AlignTop:
            return e.concat("W");
          case o.GEditor.ArrangeAlignType.AlignMiddle:
            return e.concat("V");
          case o.GEditor.ArrangeAlignType.AlignBottom:
            return e.concat("S");
          default:
            return null;
        }
      }),
      (c.prototype.isEnabled = function (e, t, n) {
        var o = gDesigner.getActiveDocument()
          ? gDesigner.getActiveDocument().getEditor()
          : null;
        return !(
          !(e = e || (o ? o.getIndividualSelection() : null)) || !e.length
        );
      }),
      (c.prototype.execute = function (e, t, n) {
        var i = gDesigner.getActiveDocument()
          ? gDesigner.getActiveDocument().getEditor()
          : null;
        if (
          ((e = e || (i ? i.getIndividualSelection() : null)),
          i && e && 1 === e.length && !n)
        ) {
          var a = o.GElementEditor.getEditor(e[0]);
          if (!a || !a.isAlignPartsAllowed())
            if (i.getScene().isFixedSized())
              n = i.getScene().getActivePage().getGeometryBBox();
            else n = i.getScene().getPaintBBox();
        }
        gDesigner
          .getActiveDocument()
          .getEditor()
          .arrangeAlign(this._type, e, t, n);
      }),
      (c.prototype._isAlignOnlyCategory = function () {
        switch (this._type) {
          case o.GEditor.ArrangeAlignType.AlignLeft:
          case o.GEditor.ArrangeAlignType.AlignCenter:
          case o.GEditor.ArrangeAlignType.AlignRight:
          case o.GEditor.ArrangeAlignType.AlignTop:
          case o.GEditor.ArrangeAlignType.AlignMiddle:
          case o.GEditor.ArrangeAlignType.AlignBottom:
            return !0;
          default:
            return !1;
        }
      }),
      (c.prototype.getTooltipConfig = function (e) {
        return (
          (e && c.TOOLTIP_CONFIG[e] && c.TOOLTIP_CONFIG[e][this._type]) || null
        );
      }),
      (c.prototype.toString = function () {
        return "[Object GAlignAction]";
      }),
      (e.exports = c);
  }