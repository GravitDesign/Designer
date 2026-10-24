/**
 * Webpack Module #1179
 * Type: class
 * Name: GJoinPathsAction
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
      (s.ID = "modify.join-paths"),
      (s.TITLE = new o.GLocaleKey("GJoinPathsAction", "title")),
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
      (s.prototype.getIcon = function () {
        return gDesigner.isTouchEnabled() ? "gravit-icon-join-paths" : null;
      }),
      (s.prototype.getShortcut = function () {
        return [i.GKey.Constant.META, "J"];
      }),
      (s.prototype.isEnabled = function () {
        if (!r.prototype.isEnabled.call(this)) return !1;
        var e = gDesigner.getActiveDocument();
        if (e) {
          var t = e.getEditor().getSelection();
          if (t && t.length > 1)
            for (var n = 0, i = 0; i < t.length; ++i)
              if (
                !(t[i] instanceof o.GImage) &&
                ((t[i] instanceof o.GPathBase ||
                  t[i].hasMixin(o.GVertexSource)) &&
                  n++,
                2 === n)
              )
                return !0;
        }
        return !1;
      }),
      (s.prototype.execute = function () {
        var e = gDesigner.getActiveDocument().getEditor(),
          t = e.getSelection();
        if (t && t.length) {
          e.beginTransaction();
          try {
            var n = new o.GRectangle();
            o.GElement.prototype.assignFrom.call(n, t[0]),
              e.convertSelectionToPaths(!0);
            var i = e.joinPaths();
            i &&
              (o.GElement.prototype.assignFrom.call(i, n),
              e.updateSelection(!1, [i]));
          } finally {
            e.commitTransaction(o.GLocale.get(this.getTitle()));
          }
        }
      }),
      (s.prototype.toString = function () {
        return "[Object GJoinPathsAction]";
      }),
      (e.exports = s);
  }