/**
 * Webpack Module #1597
 * Type: class
 * Name: GConnectLinesAction
 */

function (e, t, n) {
    "use strict";
    n(3);
    var o = n(1),
      i = n(40),
      a = n(18),
      r = n(106);
    function s() {}
    o.GObject.inherit(s, r),
      (s.ID = "modify.connect-lines"),
      (s.TITLE = new o.GLocaleKey("GConnectLinesAction", "title")),
      (s.prototype.getId = function () {
        return s.ID;
      }),
      (s.prototype.getTitle = function () {
        return s.TITLE;
      }),
      (s.prototype.getCategory = function () {
        return a.CATEGORY_MODIFY_PATH;
      }),
      (s.prototype.getGroup = function () {
        return "structure/path";
      }),
      (s.prototype.isEnabled = function () {
        if (!r.prototype.isEnabled.call(this)) return !1;
        var e = gDesigner.getActiveDocument()
          ? gDesigner.getActiveDocument().getEditor().getSelection()
          : null;
        if (e)
          for (var t = 0; t < e.length; ++t)
            if (e[t] instanceof o.GPath) return !0;
        return !1;
      }),
      (s.prototype.execute = function () {
        var e = gDesigner.getActiveDocument(),
          t = e ? e.getEditor() : null,
          n = t ? t.getSelection() : null,
          a = [],
          r = null;
        if (n)
          for (var s = 0; s < n.length; ++s) {
            var l = n[s];
            l instanceof o.GPath &&
              (r
                ? r === l.getParent() && a.push(l)
                : (r = l.getParent()) && a.push(l));
          }
        if (a.length) {
          t.beginTransaction();
          try {
            if (1 == a.length) a[0].setProperty("closed", !0);
            else
              try {
                (0, i.blockChanges)(t, null, null, r);
                var c,
                  d = (a = o.GNode.order(a))[a.length - 1],
                  u = d.getProperty("trf"),
                  p = u ? u.inverted() : null,
                  g = d.getNext(),
                  h = [];
                for (s = 0; s < a.length - 1; ++s)
                  (c = a[s]).removeFlag(o.GNode.Flag.Selected),
                    c.setProperty("closed", !1),
                    r.removeChild(c),
                    (u = (u = c.getProperty("trf"))
                      ? p
                        ? u.multiplied(p)
                        : u
                      : p),
                    (h = h.concat(c.getAnchorPoints().serialize(u)));
                d.removeFlag(o.GNode.Flag.Selected),
                  r.removeChild(d),
                  (h = h.concat(d.getAnchorPoints().serialize()));
                var f = new o.GPath();
                f.getAnchorPoints().deserialize(h),
                  f.assignFrom(d),
                  r.insertChild(f, g);
              } finally {
                (0, i.releaseChanges)(t, null, null, r),
                  t.updateSelection(!1, [f]);
              }
          } finally {
            t.commitTransaction(o.GLocale.get(this.getTitle()));
          }
        }
      }),
      (s.prototype.toString = function () {
        return "[Object GConnectLinesAction]";
      }),
      (e.exports = s);
  }