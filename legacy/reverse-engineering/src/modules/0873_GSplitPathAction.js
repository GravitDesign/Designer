/**
 * Webpack Module #873
 * Type: class
 * Name: GSplitPathAction
 */

function (e, t, n) {
    "use strict";
    n(3);
    var o = n(1),
      i = n(15),
      a = n(18),
      r = n(106);
    function s() {}
    o.GObject.inherit(s, r),
      (s.ID = "modify.split-path"),
      (s.TITLE = new o.GLocaleKey("GSplitPathAction", "title")),
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
      (s.prototype.getShortcut = function () {
        return [i.GKey.Constant.SHIFT, i.GKey.Constant.META, "J"];
      }),
      (s.prototype.getIcon = function () {
        return gDesigner.isTouchEnabled() ? "gravit-icon-split-path" : null;
      }),
      (s.prototype.isEnabled = function () {
        var e = gDesigner.getActiveDocument();
        if (e) {
          var t = e.getEditor().getSelection();
          if (t)
            for (var n = 0; n < t.length; ++n)
              if (t[n] instanceof o.GCompoundPath) return !0;
        }
        return !1;
      }),
      (s.prototype.execute = function () {
        if (!r.prototype.isEnabled.call(this)) return !1;
        var e = gDesigner.getActiveDocument().getEditor(),
          t = e.getSelection().slice();
        if (t && t.length) {
          e.beginTransaction();
          try {
            for (var n = [], i = 0; i < t.length; ++i) {
              var a = t[i];
              if (a instanceof o.GCompoundPath) {
                var s = new o.GRectangle();
                o.GElement.prototype.assignFrom.call(s, a);
                var l = e.splitCompoundPath(a);
                if (l && l.length)
                  for (var c = 0; c < l.length; ++c) {
                    var d = l[c];
                    o.GElement.prototype.assignFrom.call(d, s), n.push(d);
                  }
              }
            }
            n.length && e.updateSelection(!1, n);
          } finally {
            e.commitTransaction(o.GLocale.get(this.getTitle()));
          }
        }
      }),
      (s.prototype.toString = function () {
        return "[Object GSplitPathAction]";
      }),
      (e.exports = s);
  }