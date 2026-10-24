/**
 * Webpack Module #1652
 * Type: class
 * Name: GSwapPaintLayersAction
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    n(19), n(4), n(13), n(32), n(38), n(33), n(26);
    var i = n(1),
      a = n(15),
      r = o(n(31)),
      s = o(n(18));
    class l extends r.default {
      getId() {
        return l.ID;
      }
      getTitle() {
        return l.TITLE;
      }
      getCategory() {
        return s.default.CATEGORY_MODIFY;
      }
      isVisible() {
        return !1;
      }
      getShortcut() {
        return [a.GKey.Constant.X];
      }
      isEnabled() {
        const e = gDesigner.getActiveDocument(),
          t = e && e.getEditor(),
          n = t && t.getSelection();
        return !!(n && n.find((e) => e.hasMixin(i.GStylable)));
      }
      execute() {
        const e = gDesigner.getActiveDocument(),
          t = e && e.getEditor(),
          n = t && t.getSelection();
        if (n) {
          t.beginTransaction();
          try {
            n.forEach((e) => {
              if (e.hasMixin(i.GStylable)) {
                const t = e.getPaintLayers();
                if (t) {
                  const n = this._createPaintLayers(l.Type.Border, t),
                    o = this._createPaintLayers(l.Type.Fill, t);
                  n.forEach((t) => {
                    this._setBorderAlignment(e, t);
                  }),
                    t.clearLayers(),
                    n.concat(o).forEach((e) => {
                      t.appendChild(e);
                    });
                }
              }
            });
          } finally {
            t.commitTransaction(i.GLocale.get(this.getTitle()));
          }
        }
      }
      _createPaintLayers(e, t) {
        const n = ["_pt", "_op", "_vs", "_bl"];
        switch (e) {
          case l.Type.Fill:
            return t.getBorderLayers().map((e) => {
              const t = e.getProperties(n);
              return new i.GStylable.FillPaintLayer(...t);
            });
          case l.Type.Border:
            return t.getFillLayers().map((e) => {
              const t = e.getProperties(n);
              return new i.GStylable.BorderPaintLayer(...t);
            });
          default:
            throw Error("Not specified type given");
        }
      }
      _setBorderAlignment(e, t) {
        e instanceof i.GText
          ? t.setProperty("_ba", i.GStylable.BorderAlignment.Outside)
          : e instanceof i.GShape
          ? e instanceof i.GEllipse && e.$etp === i.GEllipse.Type.Arc
            ? t.setProperty("_ba", i.GStylable.BorderAlignment.Center)
            : t.setProperty("_ba", i.GStylable.BorderAlignment.Inside)
          : e instanceof i.GPath &&
            !e.$closed &&
            t.setProperty("_ba", i.GStylable.BorderAlignment.Center);
      }
      toString() {
        return "[Object GSwapPaintLayersAction]";
      }
    }
    (l.ID = "modify.swap-paint-layers"),
      (l.TITLE = new i.GLocaleKey("GSwapPaintLayersAction", "title")),
      (l.Type = { Fill: "fill", Border: "border" }),
      (e.exports = l);
  }