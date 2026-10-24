/**
 * GConnectLinesAction
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GConnectLinesAction() {}

GObject.inherit(GConnectLinesAction, GAction);

// Prototype methods
GConnectLinesAction.prototype.getId = function () {
        return s.ID;
      }

GConnectLinesAction.prototype.getTitle = function () {
        return s.TITLE;
      }

GConnectLinesAction.prototype.getCategory = function () {
        return a.CATEGORY_MODIFY_PATH;
      }

GConnectLinesAction.prototype.getGroup = function () {
        return "structure/path";
      }

GConnectLinesAction.prototype.isEnabled = function () {
        if (!r.prototype.isEnabled.call(this)) return false;
        var e = gDesigner.getActiveDocument()
          ? gDesigner.getActiveDocument().getEditor().getSelection()
          : null;
        if (e)
          for (var t = 0; t < e.length; ++t)
            if (e[t] instanceof o.GPath) return true;
        return false;
      }

GConnectLinesAction.prototype.execute = function () {
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
                    r.removeChild(c);
(u = (u = c.getProperty("trf"))
                      ? p
                        ? u.multiplied(p)
                        : u
                      : p);
(h = h.concat(c.getAnchorPoints().serialize(u)));
                d.removeFlag(o.GNode.Flag.Selected),
                  r.removeChild(d);
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
      }

GConnectLinesAction.prototype.toString = function () {
        return "[Object GConnectLinesAction]";
      }


module.exports = GConnectLinesAction;
