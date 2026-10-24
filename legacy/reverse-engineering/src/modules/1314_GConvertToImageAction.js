/**
 * Webpack Module #1314
 * Type: class
 * Name: GConvertToImageAction
 */

function (e, t, n) {
    "use strict";
    n(19), n(3), n(26);
    var o = n(1),
      i = n(15),
      a = n(40),
      r = n(18),
      s = n(106);
    n(811);
    function l() {}
    o.GObject.inherit(l, s),
      (l.USE_DPI = !0),
      (l.ID = "modify.path2bmp"),
      (l.TITLE = new o.GLocaleKey("GConvertToImageAction", "title")),
      (l.prototype.getId = function () {
        return l.ID;
      }),
      (l.prototype.getTitle = function () {
        return l.TITLE;
      }),
      (l.prototype.getIcon = function () {
        return gDesigner.isTouchEnabled() ? "gravit-icon-flatten" : "";
      }),
      (l.prototype.getCategory = function () {
        return r.CATEGORY_MODIFY;
      }),
      (l.prototype.getGroup = function () {
        return "structure-bitmap";
      }),
      (l.prototype.getShortcut = function () {
        return [i.GKey.Constant.F7];
      }),
      (l.prototype.isEnabled = function () {
        if (!s.prototype.isEnabled.call(this)) return !1;
        var e = gDesigner.getActiveDocument()
          ? gDesigner.getActiveDocument().getEditor().getSelection()
          : null;
        if (e)
          for (var t = 0; t < e.length; ++t)
            if (
              e[t] instanceof o.GElement &&
              e[t].getPaintBBox() &&
              !e[t].getPaintBBox().isEmpty()
            )
              return !0;
        return !1;
      }),
      (l.prototype.execute = function () {
        var e = gDesigner.getActiveDocument(),
          t = e ? e.getEditor() : null,
          n = t ? o.GNode.order(t.getIndividualSelection().slice()) : null,
          i = [];
        if (n)
          for (var a = 0; a < n.length; ++a)
            n[a] instanceof o.GElement &&
              n[a].getPaintBBox() &&
              !n[a].getPaintBBox().isEmpty() &&
              i.push(n[a]);
        if (i.length) {
          t.beginTransaction(), t.clearSelection();
          try {
            var r = this._groupStuff(i);
            if (r) {
              var s = r.getParent(),
                l = r.getNext(),
                c = this._convertToImage(r);
              c &&
                (s.insertChild(c, l),
                s.removeChild(r),
                t.updateSelection(!1, [c]));
            }
          } finally {
            t.commitTransaction(o.GLocale.get(this.getTitle()));
          }
        }
      }),
      (l.prototype._groupStuff = function (e) {
        if (e && 1 === e.length) return e[0];
        for (
          var t = gDesigner.getActiveDocument(),
            n = t ? t.getEditor() : null,
            i = new o.GGroup(),
            r = [],
            s = 0;
          s < e.length;
          ++s
        ) {
          (g = e[s]).validateInsertion(i) && r.push(g);
        }
        if (r.length > 0) {
          var l,
            c = r[r.length - 1],
            d = c.getParent(),
            u = c.getNext();
          if (!d.isLocked() && i.validateInsertion(d)) {
            d.insertChild(i, u);
            var p = gDesigner.getActiveDocument().getScene();
            try {
              l = new Set();
              for (s = 0; s < r.length; ++s) l.add(r[s].getParent());
              (0, a.blockChanges)(n, l, p, i);
              for (s = 0; s < r.length; ++s) {
                var g;
                (g = r[s]).getParent().removeChild(g), i.appendChild(g);
              }
            } finally {
              (0, a.releaseChanges)(n, l, p, i);
            }
          }
        }
        return i;
      }),
      (l.prototype._convertToImage = function (e) {
        var t, n;
        e instanceof o.GImage ||
          (t = o.GPaintCanvas.getScreenDPI() * o.GLength.DPI),
          e instanceof o.GElement && (n = e.getScene()),
          e instanceof o.GImage ||
            (t = Math.max(
              t || o.GLength.DPI,
              (n && n.getProperty("dpi")) || o.GLength.DPI
            ));
        var i = e.toBitmap(null, null, null, null, null, t),
          a = new o.GImage(),
          r = 1;
        e instanceof o.GImage || (r /= t / o.GLength.DPI);
        var s = e.getPaintBBox().getSide(o.GRect.Side.TOP_LEFT),
          l = new o.GTransform().scaled(r, r).translated(s.getX(), s.getY());
        return (
          a.setProperties(
            ["iw", "ih", "url", "trf", "itrf"],
            [
              i.getWidth(),
              i.getHeight(),
              i.toImageDataUrl(o.GBitmap.ImageType.PNG),
              l,
              l,
            ]
          ),
          a
        );
      }),
      (l.prototype.toString = function () {
        return "[Object GConvertToImageAction]";
      }),
      (e.exports = l);
  }