/**
 * Webpack Module #867
 * Type: class
 * Name: GDistributeAction
 */

function (e, t, n) {
    "use strict";
    n(328), n(3);
    var o = n(53),
      i = n(1),
      a = n(67),
      r = n(18),
      s = n(31);
    function l(e) {
      (this._type = e),
        (this._title = new i.GLocaleKey("GDistributeAction", "title." + e)),
        (l.TOOLTIP_CONFIG = {
          [a.TOOLTIP_AREA.SIDEBAR]: {
            [l.Type.Horizontal]: a.GRichTooltipConfig.from({
              title: i.GLocale.get(
                new i.GLocaleKey(
                  "GDistributeAction",
                  "text.horizontal-tooltip-title"
                )
              ),
              description: i.GLocale.get(
                new i.GLocaleKey(
                  "GDistributeAction",
                  "text.horizontal-tooltip-description"
                )
              ),
              learnMore:
                "",
            }),
            [l.Type.Vertical]: a.GRichTooltipConfig.from({
              title: i.GLocale.get(
                new i.GLocaleKey(
                  "GDistributeAction",
                  "text.vertical-tooltip-title"
                )
              ),
              description: i.GLocale.get(
                new i.GLocaleKey(
                  "GDistributeAction",
                  "text.vertical-tooltip-description"
                )
              ),
              learnMore:
                "",
            }),
          },
        });
    }
    i.GObject.inherit(l, s),
      (l.Type = { Horizontal: "horizontal", Vertical: "vertical" }),
      (l.TOOLTIP_CONFIG = null),
      (l.ID = "arrange.distribute"),
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
          case l.Type.Horizontal:
            return '<svg class="align-svg" xmlns="http://www.w3.org/2000/svg" style="isolation:isolate" viewBox="3 2 20 20" width="20" height="20"><rect id="align-area" x="4" y="6" width="4" height="12" fill="#FFF"/><rect id="align-area" x="18" y="8" width="4" height="8" fill="#FFF"/><rect id="align-shape" x="10" y="3" width="2" height="18" fill="#3A98FF"/><rect id="align-shape" x="14" y="3" width="2" height="18" fill="#3A98FF"/></svg>';
          case l.Type.Vertical:
            return '<svg class="align-svg" xmlns="http://www.w3.org/2000/svg" style="isolation:isolate" viewBox="28 2 20 20" width="20" height="20"><rect id="align-area" x="36" y="13" width="4" height="12" transform="rotate(-90 38 19)" fill="#FFF"/><rect id="align-area" x="36" y="1" width="4" height="8" transform="rotate(-90 38 5)" fill="#FFF"/><rect id="align-shape" x="37" y="5" width="2" height="18" transform="rotate(-90 38 14)" fill="#3A98FF"/><rect id="align-shape" x="37" y="1" width="2" height="18" transform="rotate(-90 38 10)" fill="#3A98FF"/></svg>';
          default:
            return null;
        }
      }),
      (l.prototype.getCategory = function () {
        return r.CATEGORY_MODIFY_ALIGN;
      }),
      (l.prototype.getGroup = function () {
        return "arrange/align-distribute";
      }),
      (l.prototype.getShortcut = function () {
        return null;
      }),
      (l.prototype.isEnabled = function (e, t, n) {
        return (
          !!(e =
            e ||
            (gDesigner.getActiveDocument()
              ? gDesigner
                  .getActiveDocument()
                  .getEditor()
                  .getIndividualSelection()
              : null)) &&
          (t ? e.length > 1 : n > 0 ? e.length >= 2 : e.length > 2)
        );
      }),
      (l.prototype.execute = function (e, t, n) {
        var a = gDesigner.getActiveDocument(),
          r = a.getScene();
        e || (e = a.getEditor().getSelection());
        var s = (e = a.getEditor().filterIndividualElements(e));
        e = [];
        for (let t = 0; t < s.length; ++t) {
          var c = s[t];
          if (c.hasMixin(i.GElement.Transform)) {
            var d = c.getGeometryBBox();
            if (!d || d.getWidth() + d.getHeight() === 0) continue;
            e.push({ elbbox: d, element: c });
          }
        }
        if (!t)
          for (let n = 0; n < e.length; ++n)
            t = t ? t.united(e[n].elbbox) : e[n].elbbox;
        if (t && !t.isEmpty())
          if (this._type === l.Type.Horizontal) {
            e.sort(function (e, t) {
              return (
                e.elbbox.getX() +
                e.elbbox.getWidth() / 2 -
                t.elbbox.getX() -
                t.elbbox.getWidth() / 2
              );
            });
            let a = null;
            if (!n)
              if (e.length > 1) {
                let o = 0;
                for (let t = 0; t < e.length; ++t) o += e[t].elbbox.getWidth();
                o <= t.getWidth()
                  ? (n = (t.getWidth() - o) / (e.length - 1))
                  : (a =
                      (t.getWidth() -
                        e[0].elbbox.getWidth() / 2 -
                        e[e.length - 1].elbbox.getWidth() / 2) /
                      (e.length - 1));
              } else n = 0;
            o.GEditor.tryRunTransaction(
              r,
              function () {
                var o = t.getX();
                if (null === a)
                  for (let t = 0; t < e.length; ++t)
                    o !== e[t].elbbox.getX() &&
                      e[t].element.transform(
                        new i.GTransform(1, 0, 0, 1, o - e[t].elbbox.getX(), 0),
                        !0
                      ),
                      (o += e[t].elbbox.getWidth() + n);
                else {
                  var r = o + e[0].elbbox.getWidth() / 2;
                  for (let t = 0; t < e.length; ++t) {
                    var s = r + a * t - e[t].elbbox.getWidth() / 2;
                    s !== e[t].elbbox.getX() &&
                      e[t].element.transform(
                        new i.GTransform(1, 0, 0, 1, s - e[t].elbbox.getX(), 0),
                        !0
                      );
                  }
                }
              }.bind(this),
              i.GLocale.get(this.getTitle())
            );
          } else if (this._type === l.Type.Vertical) {
            e.sort(function (e, t) {
              return (
                e.elbbox.getY() +
                e.elbbox.getHeight() / 2 -
                (t.elbbox.getY() + t.elbbox.getHeight() / 2)
              );
            });
            let a = null;
            if (!n)
              if (e.length > 1) {
                let o = 0;
                for (let t = 0; t < e.length; ++t) o += e[t].elbbox.getHeight();
                o <= t.getHeight()
                  ? (n = (t.getHeight() - o) / (e.length - 1))
                  : (a =
                      (t.getHeight() -
                        e[0].elbbox.getHeight() / 2 -
                        e[e.length - 1].elbbox.getHeight() / 2) /
                      (e.length - 1));
              } else n = 0;
            o.GEditor.tryRunTransaction(
              r,
              function () {
                var o = t.getY();
                if (null === a)
                  for (let t = 0; t < e.length; ++t)
                    o !== e[t].elbbox.getY() &&
                      e[t].element.transform(
                        new i.GTransform(1, 0, 0, 1, 0, o - e[t].elbbox.getY()),
                        !0
                      ),
                      (o += e[t].elbbox.getHeight() + n);
                else {
                  var r = o + e[0].elbbox.getHeight() / 2;
                  for (let t = 0; t < e.length; ++t) {
                    var s = r + a * t - e[t].elbbox.getHeight() / 2;
                    s !== e[t].elbbox.getX() &&
                      e[t].element.transform(
                        new i.GTransform(1, 0, 0, 1, 0, s - e[t].elbbox.getY()),
                        !0
                      );
                  }
                }
              }.bind(this),
              i.GLocale.get(this.getTitle())
            );
          }
      }),
      (l.prototype.getTooltipConfig = function (e) {
        return (
          (e && l.TOOLTIP_CONFIG[e] && l.TOOLTIP_CONFIG[e][this._type]) || null
        );
      }),
      (l.prototype.toString = function () {
        return "[Object GDistributeAction]";
      }),
      (e.exports = l);
  }