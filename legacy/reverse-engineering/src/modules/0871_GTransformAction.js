/**
 * Webpack Module #871
 * Type: class
 * Name: GTransformAction
 */

function (e, t, n) {
    "use strict";
    n(3), n(4), n(41);
    var o = n(53),
      i = n(1),
      a = n(67),
      r = n(18),
      s = n(31);
    function l(e) {
      (this._type = e),
        (this._title = new i.GLocaleKey("GTransformAction", "title." + e)),
        (l.TOOLTIP_CONFIG = {
          [a.TOOLTIP_AREA.TOOLBAR]: {
            [l.Type.Rotate45Left]: null,
            [l.Type.Rotate90Left]: a.GRichTooltipConfig.from({
              title: i.GLocale.get(
                new i.GLocaleKey(
                  "GTransformAction",
                  "rotate-90-left-tooltip-title"
                )
              ),
              description: i.GLocale.get(
                new i.GLocaleKey(
                  "GTransformAction",
                  "rotate-90-left-tooltip-description"
                )
              ),
              learnMore:
                "",
            }),
            [l.Type.Rotate180Left]: null,
            [l.Type.Rotate45Right]: null,
            [l.Type.Rotate90Right]: a.GRichTooltipConfig.from({
              title: i.GLocale.get(
                new i.GLocaleKey(
                  "GTransformAction",
                  "rotate-90-right-tooltip-title"
                )
              ),
              description: i.GLocale.get(
                new i.GLocaleKey(
                  "GTransformAction",
                  "rotate-90-right-tooltip-description"
                )
              ),
              learnMore:
                "",
            }),
            [l.Type.Rotate180Right]: null,
            [l.Type.FlipVertical]: a.GRichTooltipConfig.from({
              title: i.GLocale.get(
                new i.GLocaleKey(
                  "GTransformAction",
                  "flip-vertical-tooltip-title"
                )
              ),
              description: i.GLocale.get(
                new i.GLocaleKey(
                  "GTransformAction",
                  "flip-vertical-tooltip-description"
                )
              ),
              learnMore:
                "",
            }),
            [l.Type.FlipHorizontal]: a.GRichTooltipConfig.from({
              title: i.GLocale.get(
                new i.GLocaleKey(
                  "GTransformAction",
                  "flip-horizontal-tooltip-title"
                )
              ),
              description: i.GLocale.get(
                new i.GLocaleKey(
                  "GTransformAction",
                  "flip-horizontal-tooltip-description"
                )
              ),
              learnMore:
                "",
            }),
          },
        });
    }
    i.GObject.inherit(l, s),
      (l.Type = {
        Rotate45Left: "rotate-45-left",
        Rotate90Left: "rotate-90-left",
        Rotate180Left: "rotate-180-left",
        Rotate45Right: "rotate-45-right",
        Rotate90Right: "rotate-90-right",
        Rotate180Right: "rotate-180-right",
        FlipVertical: "flip-vertical",
        FlipHorizontal: "flip-horizontal",
      }),
      (l.TOOLTIP_CONFIG = null),
      (l.ID = "arrange.transform"),
      (l.prototype._type = null),
      (l.prototype._title = null),
      (l.prototype.getId = function () {
        return l.ID + "." + this._type;
      }),
      (l.prototype.getTitle = function () {
        return this._title;
      }),
      (l.prototype.getIcon = function () {
        switch (this._type) {
          case l.Type.Rotate90Left:
          case l.Type.Rotate90Right:
            return "gravit-icon-rotate";
          case l.Type.FlipVertical:
            return "gravit-icon-flip-vertical";
          case l.Type.FlipHorizontal:
            return "gravit-icon-flip-horizontal";
          default:
            return null;
        }
      }),
      (l.prototype.getCategory = function () {
        return r.CATEGORY_MODIFY_TRANSFORM;
      }),
      (l.prototype.getGroup = function () {
        var e = "";
        switch (this._type) {
          case l.Type.Rotate45Left:
          case l.Type.Rotate90Left:
          case l.Type.Rotate180Left:
            e = "rotate-left";
            break;
          case l.Type.Rotate45Right:
          case l.Type.Rotate90Right:
          case l.Type.Rotate180Right:
            e = "rotate-right";
            break;
          case l.Type.FlipVertical:
          case l.Type.FlipHorizontal:
            e = "flip";
        }
        return "arrange/transform-" + e;
      }),
      (l.prototype.getShortcut = function () {
        return null;
      }),
      (l.prototype.isEnabled = function (e) {
        let t =
          e ||
          (gDesigner.getActiveDocument()
            ? gDesigner.getActiveDocument().getEditor().getSelection()
            : null) ||
          [];
        return (
          (t = t.filter((e) => {
            var t = o.GElementEditor.getEditor(e);
            return (
              t &&
              (t.hasFlag(o.GBoxEditor.Flag.RotateCorners) ||
                t.hasFlag(o.GBoxEditor.Flag.RotateHandle))
            );
          })),
          t.length > 0
        );
      }),
      (l.prototype.execute = function (e) {
        var t = gDesigner.getActiveDocument(),
          n = t.getScene();
        e || (e = t.getEditor().getSelection()),
          (e = (e = t.getEditor().filterIndividualElements(e)).filter((e) => {
            var t = o.GElementEditor.getEditor(e);
            return (
              t &&
              (t.hasFlag(o.GBoxEditor.Flag.RotateCorners) ||
                t.hasFlag(o.GBoxEditor.Flag.RotateHandle))
            );
          }));
        var a = o.GEditor.getGroupGeometryBBox(e);
        a &&
          o.GEditor.tryRunTransaction(
            n,
            function () {
              for (var t = 0; t < e.length; ++t) {
                var n = e[t];
                if (n.hasMixin(i.GElement.Transform) && a) {
                  var o = a.getSide(i.GRect.Side.CENTER),
                    r = 0,
                    s = 1,
                    c = 1;
                  switch (this._type) {
                    case l.Type.Rotate45Left:
                      r = -45;
                      break;
                    case l.Type.Rotate90Left:
                      r = -90;
                      break;
                    case l.Type.Rotate180Left:
                      r = -180;
                      break;
                    case l.Type.Rotate45Right:
                      r = 45;
                      break;
                    case l.Type.Rotate90Right:
                      r = 90;
                      break;
                    case l.Type.Rotate180Right:
                      r = 180;
                      break;
                    case l.Type.FlipVertical:
                      c = -1;
                      break;
                    case l.Type.FlipHorizontal:
                      s = -1;
                  }
                  var d = new i.GTransform()
                    .translated(-o.getX(), -o.getY())
                    .scaled(s, c)
                    .rotated(i.GMath.toRadians(r))
                    .translated(o.getX(), o.getY());
                  n.transform(d, !0);
                }
              }
            }.bind(this),
            i.GLocale.get(this.getTitle())
          );
      }),
      (l.prototype.getTooltipConfig = function (e) {
        return (
          (e && l.TOOLTIP_CONFIG[e] && l.TOOLTIP_CONFIG[e][this._type]) || null
        );
      }),
      (l.prototype.toString = function () {
        return "[Object GTransformAction]";
      }),
      (e.exports = l);
  }