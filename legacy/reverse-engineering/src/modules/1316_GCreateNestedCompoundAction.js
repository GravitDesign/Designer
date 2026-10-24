/**
 * Webpack Module #1316
 * Type: class
 * Name: GCreateNestedCompoundAction
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
      (l.ID = "modify.createnestedcompound"),
      (l.TITLE = new o.GLocaleKey("GCreateNestedCompoundAction", "title")),
      (l.prototype.getId = function () {
        return l.ID;
      }),
      (l.prototype.getTitle = function () {
        return l.TITLE;
      }),
      (l.prototype.getCategory = function () {
        return r.CATEGORY_MODIFY;
      }),
      (l.prototype.getGroup = function () {
        return "structure-boolean";
      }),
      (l.prototype.getShortcut = function () {
        return [i.GKey.Constant.META, i.GKey.Constant.ALT_LEFT, "M"];
      }),
      (l.prototype.getIcon = function () {
        return gDesigner.isTouchEnabled() ? "gravit-icon-nested-compound" : "";
      }),
      (l.prototype.isEnabled = function () {
        if (!s.prototype.isEnabled.call(this)) return !1;
        var e = gDesigner.getActiveDocument();
        if (e) {
          var t = e.getEditor().getSelection(),
            n = 0;
          if (t && t.length)
            for (var i = 0; i < t.length; ++i) {
              if ((t[i] instanceof o.GCompoundShape && n++, n >= 2)) return !0;
            }
        }
        return !1;
      }),
      (l.prototype.execute = function () {
        var e = gDesigner.getActiveDocument().getEditor(),
          t = o.GNode.order(e.getIndividualSelection().slice());
        e.beginTransaction();
        try {
          for (var n, i = [], r = new Set(), s = 0; s < t.length; ++s) {
            (l = t[s]) instanceof o.GCompoundShape &&
              (n ? (i.push(l), r.add(l.getParent())) : (n = l));
          }
          if (i.length > 0) {
            try {
              (0, a.blockChanges)(e, r, null, n);
              for (s = 0; s < i.length; ++s) {
                var l;
                (l = i[s]).getParent().removeChild(l), n.appendChild(l);
              }
            } finally {
              (0, a.releaseChanges)(e, r, null, n);
            }
            e.updateSelection(!1, [n]);
          }
        } finally {
          e.commitTransaction("Create nested compound");
        }
      }),
      (l.prototype.toString = function () {
        return "[Object GCreateNestedCompoundAction]";
      }),
      (e.exports = l);
  }