/**
 * Webpack Module #1181
 * Type: class
 * Name: GMaskWithShapeAction
 */

function (e, t, n) {
    "use strict";
    n(3);
    var o = n(1),
      i = n(15),
      a = n(18),
      r = n(106),
      s = n(809);
    function l() {}
    o.GObject.inherit(l, r),
      (l.ID = "modify.mask-with-shape"),
      (l.TITLE = new o.GLocaleKey("GMaskWithShapeAction", "title")),
      (l.prototype.getId = function () {
        return l.ID;
      }),
      (l.prototype.getTitle = function () {
        return l.TITLE;
      }),
      (l.prototype.getCategory = function () {
        return a.CATEGORY_MODIFY;
      }),
      (l.prototype.getGroup = function () {
        return "structure-group";
      }),
      (l.prototype.getShortcut = function () {
        return [i.GKey.Constant.META, i.GKey.Constant.SHIFT, "M"];
      }),
      (l.prototype.getIcon = function () {
        return gDesigner.isTouchEnabled() ? "gravit-icon-mask-with-shape" : "";
      }),
      (l.prototype.isEnabled = function () {
        return s.prototype.isEnabled.call(this);
      }),
      (l.prototype.execute = function () {
        var e = gDesigner.getActiveDocument().getEditor();
        e.beginTransaction();
        try {
          if (
            (s.prototype.execute.call(this, !0, !0),
            e.getSelection().length > 0)
          ) {
            var t = e.getSelection()[0];
            t.setProperty(
              "name",
              o.GLocale.get(
                new o.GLocaleKey("GMaskWithShapeAction", "text.mask")
              )
            );
            var n = t.getPaintLayers();
            if (n) {
              for (
                var i = (function (e) {
                    e: for (
                      var t = e.getFirstChild();
                      null !== t;
                      t = t.getNext()
                    )
                      if (
                        t instanceof o.GStylable.FillPaintLayer &&
                        t.getProperty("_pt") instanceof o.GLinearGradient
                      ) {
                        var n = t.getProperty("_pt");
                        n;
                        t: for (var i = 0; i < n.getStops().length; ++i) {
                          var a = n.getStops()[i].color.toScreenCSS();
                          if ("#FFFFFF" !== a && "#000000" !== a) {
                            n = null;
                            break t;
                          }
                        }
                        if (n) break e;
                      }
                    return n;
                  })(n),
                  a = [],
                  r = n.getFirstChild();
                null !== r;
                r = r.getNext()
              )
                r instanceof o.GStylable.FillPaintLayer && a.push(r);
              for (var l = 0; l < a.length; ++l) n.removeChild(a[l]);
              if (
                (n.insertChild(
                  new o.GStylable.FillPaintLayer(o.GRGBColor.WHITE)
                ),
                i)
              ) {
                i = i.clone();
                for (l = 0; l < i.getStops().length; ++l) {
                  var c = i.getStops()[l];
                  "#FFFFFF" === c.color.toScreenCSS() && (c.opacity = 0);
                }
                var d = new o.GOverlayEffect();
                t.getEffects().appendChild(d),
                  d.setProperties(["alm", "opc", "pat"], [!0, 1, i]);
              }
            }
          }
        } finally {
          e.commitTransaction(o.GLocale.get(this.getTitle()));
        }
      }),
      (l.prototype.toString = function () {
        return "[Object GMaskWithShapeAction]";
      }),
      (e.exports = l);
  }