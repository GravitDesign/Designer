/**
 * Webpack Module #870
 * Type: class
 * Name: GSplitAction
 */

function (e, t, n) {
    "use strict";
    n(19), n(3), n(26);
    var o = n(1),
      i = n(15),
      a = n(40),
      r = n(67),
      s = n(18),
      l = n(106);
    function c() {
      c.TOOLTIP_CONFIG = {
        [r.TOOLTIP_AREA.TOOLBAR]: r.GRichTooltipConfig.from({
          title: o.GLocale.get(
            new o.GLocaleKey("GSplitAction", "tooltip-title")
          ),
          description: o.GLocale.get(
            new o.GLocaleKey("GSplitAction", "tooltip-description")
          ),
          shortcut: c.SHORTCUT,
          learnMore:
            "",
        }),
      };
    }
    o.GObject.inherit(c, l),
      (c.ID = "modify.split"),
      (c.TITLE = new o.GLocaleKey("GSplitAction", "title")),
      (c.SHORTCUT = [i.GKey.Constant.SHIFT, i.GKey.Constant.META, "G"]),
      (c.TOOLTIP_CONFIG = null),
      (c.prototype.getId = function () {
        return c.ID;
      }),
      (c.prototype.getTitle = function () {
        return c.TITLE;
      }),
      (c.prototype.getIcon = function () {
        return "gravit-icon-ungroup";
      }),
      (c.prototype.getCategory = function () {
        return s.CATEGORY_MODIFY;
      }),
      (c.prototype.getGroup = function () {
        return "structure-group";
      }),
      (c.prototype.getShortcut = function () {
        return c.SHORTCUT;
      }),
      (c.prototype.isEnabled = function () {
        if (!l.prototype.isEnabled.call(this)) return !1;
        var e = gDesigner.getActiveDocument();
        if (e) {
          var t = e.getEditor().getIndividualSelection();
          if (t)
            for (var n = 0; n < t.length; ++n) {
              var i = t[n];
              if (
                i instanceof o.GGroup ||
                i instanceof o.GCompoundShape ||
                (i instanceof o.GSymbol && !i.getMasterSymbol()) ||
                (i instanceof o.GShape && null !== i.getFirstChild())
              )
                return !0;
            }
        }
        return !1;
      }),
      (c.prototype.execute = function () {
        var e = gDesigner.getActiveDocument().getEditor(),
          t = e.getIndividualSelection().slice();
        e.beginTransaction();
        try {
          var n,
            i,
            r = [],
            s = gDesigner.getActiveDocument().getScene();
          e.clearSelection();
          try {
            i = new Set();
            for (var l = 0; l < t.length; ++l)
              (((n = t[l]) instanceof o.GShape && null !== n.getFirstChild()) ||
                n instanceof o.GGroup ||
                n instanceof o.GCompoundShape ||
                (n instanceof o.GSymbol && !n.getMasterSymbol())) &&
                i.add(n.getParent());
            (0, a.blockChanges)(e, i, s);
            for (l = 0; l < t.length; ++l)
              if (
                (n = t[l]) instanceof o.GGroup ||
                n instanceof o.GCompoundShape ||
                (n instanceof o.GSymbol && !n.getMasterSymbol())
              ) {
                var d = n.getParent(),
                  u = n.getChildren();
                try {
                  n.beginUpdate();
                  for (var p = 0; p < u.length; ++p) {
                    var g = u[p];
                    n.removeChild(g), d.insertChild(g, n), r.push(g);
                  }
                } finally {
                  n.endUpdate();
                }
                d.removeChild(n);
              } else if (n instanceof o.GShape && null !== n.getFirstChild()) {
                (d = n.getParent()), (u = n.getChildren());
                try {
                  n.beginUpdate();
                  for (p = u.length - 1; p >= 0; --p) {
                    g = u[p];
                    n.removeChild(g), d.insertChild(g, n.getNext()), r.push(g);
                  }
                } finally {
                  n.endUpdate();
                }
                r.push(n);
              } else r.push(n);
          } finally {
            (0, a.releaseChanges)(e, i, s);
          }
          r.length > 0 && e.updateSelection(!1, r);
        } finally {
          e.commitTransaction(o.GLocale.get(c.TITLE));
        }
      }),
      (c.prototype.getTooltipConfig = function (e) {
        return (e && c.TOOLTIP_CONFIG[e]) || null;
      }),
      (c.prototype.toString = function () {
        return "[Object GSplitAction]";
      }),
      (e.exports = c);
  }