/**
 * Webpack Module #1320
 * Type: class
 * Name: GConvertToRawPathAction
 */

function (e, t, n) {
    "use strict";
    n(19), n(3), n(26);
    var o = n(1),
      i = n(15),
      a = n(40),
      r = n(18),
      s = n(106);
    function l() {}
    o.GObject.inherit(l, s),
      (l.ID = "modify.converttorawpath"),
      (l.TITLE = new o.GLocaleKey("GConvertToRawPathAction", "title")),
      (l.prototype.getId = function () {
        return l.ID;
      }),
      (l.prototype.getTitle = function () {
        return l.TITLE;
      }),
      (l.prototype.getCategory = function () {
        return r.CATEGORY_MODIFY_PATH;
      }),
      (l.prototype.getGroup = function () {
        return "structure/modify";
      }),
      (l.prototype.getIcon = function () {
        return gDesigner.isTouchEnabled()
          ? "gravit-icon-convert-to-raw-path"
          : null;
      }),
      (l.prototype.getShortcut = function () {
        return [i.GKey.Constant.META, i.GKey.Constant.SHIFT, "R"];
      }),
      (l.prototype._isValidElement = function (e) {
        if (e instanceof o.GPath || e instanceof o.GCompoundPath) {
          var t = [];
          if (e instanceof o.GCompoundPath)
            for (
              var n = e.getPaths().getFirstChild();
              null !== n;
              n = n.getNext()
            )
              t.push(n);
          else t = [e];
          for (var i = 0; i < t.length; i++)
            for (var a = t[i].getAnchorPoints().getFirstChild(); a; ) {
              if (o.GPathBase.isCornerType(a.getProperty("tp"))) return !0;
              a = a.getNext();
            }
          return !1;
        }
        return !(
          !e.hasMixin(o.GVertexSource) ||
          e instanceof o.GImage ||
          e instanceof o.GPathsGraph
        );
      }),
      (l.prototype.isEnabled = function () {
        if (!s.prototype.isEnabled.call(this)) return !1;
        var e = gDesigner.getActiveDocument();
        if (e) {
          var t = e.getEditor().getSelection();
          if (t)
            for (var n = 0; n < t.length; ++n)
              if (this._isValidElement(t[n])) return !0;
        }
        return !1;
      }),
      (l.prototype.execute = function () {
        var e,
          t = gDesigner.getActiveDocument(),
          n = t ? t.getEditor() : null,
          i = n ? n.getIndividualSelection() : null,
          r = [],
          s = new Set();
        if (i)
          for (var l = 0; l < i.length; ++l) {
            var c = i[l];
            this._isValidElement(c) && (r.push(c), s.add(c.getParent()));
          }
        n.beginTransaction();
        try {
          try {
            (0, a.blockChanges)(n, s), (e = []);
            for (l = 0; l < r.length; ++l) {
              var d = r[l],
                u = d.getParent(),
                p = d.getNext(),
                g = o.GPathUtil.createPathFromVertexSource(d);
              g &&
                (o.GElement.prototype.assignFrom.call(g, d),
                u.insertChild(g, p),
                e.push(g)),
                u.removeChild(d);
            }
          } finally {
            (0, a.releaseChanges)(n, s), e.length && n.updateSelection(!1, e);
          }
        } finally {
          n.commitTransaction(o.GLocale.get(this.getTitle()));
        }
      }),
      (l.prototype.toString = function () {
        return "[Object GConvertToRawPathAction]";
      }),
      (e.exports = l);
  }