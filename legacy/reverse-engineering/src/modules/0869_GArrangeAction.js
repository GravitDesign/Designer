/**
 * Webpack Module #869
 * Type: class
 * Name: GArrangeAction
 */

function (e, t, n) {
    "use strict";
    n(3);
    var o = n(53),
      i = n(1),
      a = n(15),
      r = n(10),
      s = n(67),
      l = n(18),
      c = n(31);
    function d(e) {
      (this._type = e),
        (this._title = new i.GLocaleKey("GArrangeAction", "title." + e)),
        (d.TOOLTIP_CONFIG = {
          [s.TOOLTIP_AREA.TOOLBAR]: {
            [o.GEditor.ArrangeOrderType.BringForward]:
              s.GRichTooltipConfig.from({
                title: i.GLocale.get(
                  new i.GLocaleKey(
                    "GArrangeAction",
                    "bring-forward-tooltip-title"
                  )
                ),
                description: i.GLocale.get(
                  new i.GLocaleKey(
                    "GArrangeAction",
                    "bring-forward-tooltip-description"
                  )
                ),
                shortcut: d.SHORTCUT[o.GEditor.ArrangeOrderType.BringForward],
                video: r.gApi.getRichTooltipVideoURL("Bring_Forward.mp4"),
                learnMore:
                  "",
              }),
            [o.GEditor.ArrangeOrderType.SendBackward]:
              s.GRichTooltipConfig.from({
                title: i.GLocale.get(
                  new i.GLocaleKey(
                    "GArrangeAction",
                    "send-backward-tooltip-title"
                  )
                ),
                description: i.GLocale.get(
                  new i.GLocaleKey(
                    "GArrangeAction",
                    "send-backward-tooltip-description"
                  )
                ),
                shortcut: d.SHORTCUT[o.GEditor.ArrangeOrderType.SendBackward],
                video: r.gApi.getRichTooltipVideoURL("Send_Backward.mp4"),
                learnMore:
                  "",
              }),
          },
        });
    }
    i.GObject.inherit(d, c),
      (d.SHORTCUT = {
        [o.GEditor.ArrangeOrderType.SendToFront]: [
          a.GKey.Constant.SHIFT,
          a.GKey.Constant.META,
          a.GKey.Constant.UP,
        ],
        [o.GEditor.ArrangeOrderType.BringForward]: [
          a.GKey.Constant.META,
          a.GKey.Constant.UP,
        ],
        [o.GEditor.ArrangeOrderType.SendBackward]: [
          a.GKey.Constant.META,
          a.GKey.Constant.DOWN,
        ],
        [o.GEditor.ArrangeOrderType.SendToBack]: [
          a.GKey.Constant.SHIFT,
          a.GKey.Constant.META,
          a.GKey.Constant.DOWN,
        ],
      }),
      (d.TOOLTIP_CONFIG = null),
      (d.ID = "arrange.order"),
      (d.prototype._type = null),
      (d.prototype._title = null),
      (d.prototype.getId = function () {
        return d.ID + "." + this._type;
      }),
      (d.prototype.getTitle = function () {
        return this._title;
      }),
      (d.prototype.getCategory = function () {
        return l.CATEGORY_MODIFY_ARRANGE;
      }),
      (d.prototype.getGroup = function () {
        return "arrange/arrange";
      }),
      (d.prototype.getShortcut = function () {
        return d.SHORTCUT[this._type] || null;
      }),
      (d.prototype.isEnabled = function (e) {
        return (
          (e =
            e ||
            (gDesigner.getActiveDocument()
              ? gDesigner
                  .getActiveDocument()
                  .getEditor()
                  .getIndividualSelection()
              : null)) && e.length > 0
        );
      }),
      (d.prototype.execute = function (e) {
        gDesigner
          .getActiveDocument()
          .getEditor()
          .arrangeOrder(this._type, e, !1);
      }),
      (d.prototype.getTooltipConfig = function (e) {
        return (
          (e && d.TOOLTIP_CONFIG[e] && d.TOOLTIP_CONFIG[e][this._type]) || null
        );
      }),
      (d.prototype.toString = function () {
        return "[Object GArrangeAction]";
      }),
      (e.exports = d);
  }