/**
 * Webpack Module #1315
 * Type: class
 * Name: GDuplicateAction
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
      (s.ID = "edit.duplicate"),
      (s.TITLE = new o.GLocaleKey("GDuplicateAction", "title")),
      (s.prototype.getId = function () {
        return s.ID;
      }),
      (s.prototype.getTitle = function () {
        return s.TITLE;
      }),
      (s.prototype.getCategory = function () {
        return a.CATEGORY_EDIT;
      }),
      (s.prototype.getGroup = function () {
        return "ccp";
      }),
      (s.prototype.getShortcut = function () {
        return [i.GKey.Constant.META, "D"];
      }),
      (s.prototype.getIcon = function () {
        return gDesigner.isTouchEnabled() ? "gravit-icon-duplicate" : null;
      }),
      (s.prototype.getAdditionalShortcuts = function () {
        return [[i.GKey.Constant.SHIFT, i.GKey.Constant.META, "D"]];
      }),
      (s.prototype.isEnabled = function () {
        if (!r.prototype.isEnabled.call(this)) return !1;
        var e = gDesigner.getActiveDocument();
        return e && null != e.getEditor().getSelection();
      }),
      (s.prototype.execute = function () {
        var e = gDesigner.getActiveDocument().getEditor();
        e.beginTransaction();
        try {
          e.cloneSelection(!1, !0);
        } finally {
          e.commitTransaction(o.GLocale.get(this.getTitle()));
        }
      }),
      (s.prototype.toString = function () {
        return "[Object GDuplicateAction]";
      }),
      (e.exports = s);
  }