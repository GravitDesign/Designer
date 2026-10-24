/**
 * Webpack Module #1319
 * Type: class
 * Name: GSplitLineAction
 */

function (e, t, n) {
    "use strict";
    n(19), n(3), n(26);
    var o = n(53),
      i = n(1),
      a = n(40),
      r = n(18),
      s = n(106);
    function l() {}
    i.GObject.inherit(l, s),
      (l.ID = "modify.split-line"),
      (l.TITLE = new i.GLocaleKey("GSplitLineAction", "title")),
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
        return "structure/path";
      }),
      (l.prototype.getIcon = function () {
        return gDesigner.isTouchEnabled() ? "gravit-icon-break-curve" : null;
      }),
      (l.prototype.isEnabled = function () {
        if (!s.prototype.isEnabled.call(this)) return !1;
        var e = gDesigner.getActiveDocument()
            ? gDesigner.getActiveDocument().getEditor().getSelection()
            : null,
          t = !1;
        if (e)
          for (var n = 0; !t && n < e.length; ++n)
            e[n] instanceof i.GPath && (t = this._isPathSplittable(e[n]));
        return t;
      }),
      (l.prototype.execute = function () {
        var e = gDesigner.getActiveDocument(),
          t = e ? e.getEditor() : null,
          n = t ? t.getSelection() : null,
          o = [];
        if (n)
          for (var r = 0; r < n.length; ++r) {
            var s = n[r];
            s instanceof i.GPath && this._isPathSplittable(s) && o.push(s);
          }
        if (o.length) {
          t.beginTransaction();
          try {
            var l,
              c = [];
            l = new Set();
            for (r = 0; r < o.length; ++r) l.add(o[r].getParent());
            try {
              (0, a.blockChanges)(t, l);
              for (r = 0; r < o.length; ++r) {
                var d,
                  u = o[r],
                  p = u.getParent(),
                  g = u.getNext(),
                  h = u.getAnchorPoints(),
                  f = !1;
                if (u.getProperty("closed"))
                  for (
                    d = h.getFirstChild();
                    null !== d && !d.hasFlag(i.GNode.Flag.Selected);
                    d = d.getNext()
                  );
                else
                  (d = h.getFirstChild()).hasFlag(i.GNode.Flag.Selected) ||
                    (f = !0);
                var m = d,
                  y = m,
                  v = m ? m.getNext() || m.getPrevious() : null,
                  _ = !1;
                for (
                  u.getProperty("closed") && (_ = !0);
                  null !== m &&
                  (m.hasFlag(i.GNode.Flag.Selected) || f) &&
                  null !== v;

                ) {
                  var b,
                    w = new i.GPath(),
                    C = w.getAnchorPoints();
                  if (
                    ((f = !1),
                    w.assignFrom(u),
                    p.insertChild(w, g),
                    c.push(w),
                    (d = h.getNextPoint(m)),
                    _)
                  )
                    (b = new i.GPathBase.AnchorPoint()).deserialize(
                      m.serialize()
                    ),
                      (m = b),
                      (_ = !1);
                  else h.removeChild(m);
                  for (
                    C.appendChild(m);
                    null !== d &&
                    !d.hasFlag(i.GNode.Flag.Selected) &&
                    h.getFirstChild();

                  )
                    (v = h.getNextPoint(d)),
                      h.removeChild(d),
                      C.appendChild(d),
                      (d = v);
                  if (
                    null !== d &&
                    d.hasFlag(i.GNode.Flag.Selected) &&
                    h.getFirstChild()
                  )
                    (b = new i.GPathBase.AnchorPoint()).deserialize(
                      d.serialize()
                    ),
                      C.appendChild(b),
                      (v = (m = d) === y ? null : h.getNextPoint(d));
                  else v = null;
                  w.isLine() &&
                    (w.getPaintLayers().getBorderLayers(!0).length ||
                      (u.getPaintLayers().getFillLayers(!0).length
                        ? w
                            .getPaintLayers()
                            .appendChild(
                              new i.GStylable.BorderPaintLayer(
                                i.GRGBColor.BLACK
                              )
                            )
                        : w
                            .getPaintLayers()
                            .appendChild(
                              u.getPaintLayers().getFillLayers(!0)[0]
                            )));
                }
                p.removeChild(u);
              }
            } finally {
              (0, a.releaseChanges)(t, l),
                c.length && t.updateSelection(!1, c.slice(-1));
            }
          } finally {
            t.commitTransaction(i.GLocale.get(this.getTitle()));
          }
        }
      }),
      (l.prototype._isPathSplittable = function (e) {
        var t = !1,
          n = o.GElementEditor.getEditor(e),
          i = n ? n.getPartSelection() : null;
        if (i && i.length)
          for (var a = 0; !t && a < i.length; ++a)
            i[a].type == o.GPathEditor.PartType.Point &&
              (e.getProperty("closed") ||
                (i[a].point != e.getAnchorPoints().getFirstChild() &&
                  i[a].point != e.getAnchorPoints().getLastChild())) &&
              (t = !0);
        return t;
      }),
      (l.prototype.toString = function () {
        return "[Object GSplitLineAction]";
      }),
      (e.exports = l);
  }