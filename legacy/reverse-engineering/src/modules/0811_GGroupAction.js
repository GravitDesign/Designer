/**
 * Webpack Module #811
 * Type: class
 * Name: GGroupAction
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
            new o.GLocaleKey("GGroupAction", "tooltip-title")
          ),
          description: o.GLocale.get(
            new o.GLocaleKey("GGroupAction", "tooltip-description")
          ),
          shortcut: c.SHORTCUT,
          learnMore:
            "",
        }),
      };
    }
    o.GObject.inherit(c, l),
      (c.ID = "modify.group"),
      (c.TITLE = new o.GLocaleKey("GGroupAction", "title")),
      (c.SHORTCUT = [i.GKey.Constant.META, "G"]),
      (c.TOOLTIP_CONFIG = null),
      (c.prototype.getId = function () {
        return c.ID;
      }),
      (c.prototype.getTitle = function () {
        return c.TITLE;
      }),
      (c.prototype.getIcon = function () {
        return "gravit-icon-group";
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
          if (t && t.length > 0)
            for (var n = new o.GGroup(), i = t.length - 1; i >= 0; --i) {
              var a = t[i];
              if (
                a.validateInsertion(n) &&
                !a.getParent().isLocked() &&
                n.validateInsertion(a.getParent())
              )
                return !0;
            }
        }
        return !1;
      }),
      (c.prototype.execute = function () {
        var e = gDesigner.getActiveDocument().getEditor(),
          t = o.GNode.order(e.getIndividualSelection().slice());
        e.beginTransaction();
        try {
          for (var n = new o.GGroup(), i = [], r = 0; r < t.length; ++r) {
            (p = t[r]).validateInsertion(n) && i.push(p);
          }
          if (i.length > 0) {
            var s = i[i.length - 1],
              l = s.getParent(),
              c = s.getNext();
            if (!l.isLocked() && n.validateInsertion(l)) {
              l.insertChild(n, c);
              var d,
                u = gDesigner.getActiveDocument().getScene();
              try {
                d = new Set();
                for (r = 0; r < i.length; ++r) d.add(i[r].getParent());
                (0, a.blockChanges)(e, d, u, n);
                for (r = 0; r < i.length; ++r) {
                  var p;
                  (p = i[r]).getParent().removeChild(p), n.appendChild(p);
                }
              } finally {
                (0, a.releaseChanges)(e, d, u, n);
              }
            }
            e.updateSelection(!1, [n]);
          }
        } finally {
          e.commitTransaction(
            o.GLocale.get(new o.GLocaleKey("GGroupAction", "title"))
          );
        }
      }),
      (c.prototype.getTooltipConfig = function (e) {
        return (e && c.TOOLTIP_CONFIG[e]) || null;
      }),
      (c.prototype.toString = function () {
        return "[Object GGroupAction]";
      }),
      (e.exports = c);
  }