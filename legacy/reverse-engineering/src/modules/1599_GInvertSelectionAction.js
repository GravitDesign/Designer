/**
 * Webpack Module #1599
 * Type: class
 * Name: GInvertSelectionAction
 */

function (e, t, n) {
    "use strict";
    n(3);
    var o = n(1),
      i = n(15),
      a = n(18),
      r = n(31);
    function s() {}
    o.GObject.inherit(s, r),
      (s.ID = "edit.invert-selection"),
      (s.TITLE = new o.GLocaleKey("GInvertSelectionAction", "title")),
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
        return "select";
      }),
      (s.prototype.getShortcut = function () {
        return [i.GKey.Constant.SHIFT, i.GKey.Constant.META, "I"];
      }),
      (s.prototype.isEnabled = function () {
        return !!gDesigner.getActiveDocument();
      }),
      (s.prototype.execute = function () {
        var e = gDesigner.getActiveDocument(),
          t = e.getScene(),
          n = t.getActivePage(),
          i = gDesigner
            .getActiveDocument()
            .getActiveWindow()
            .getView()
            .getViewConfiguration().multiPageView,
          a = [];
        t.accept(function (e) {
          if (
            e instanceof o.GItem &&
            !e.hasMixin(o.GAnnotation) &&
            !(e.getParent() instanceof o.GItem) &&
            !e.hasFlag(o.GNode.Flag.Selected) &&
            (e.getPage() === n || i) &&
            !e.isLocked()
          ) {
            var t =
                !e.getProperty("vis") ||
                e.findParent(function (e) {
                  return e instanceof o.GBlock && !e.getProperty("vis");
                }),
              r = e.getProperty("plkt"),
              s =
                r & o.GBlock.ProgramLck.NoEdit &&
                r & o.GBlock.ProgramLck.NoSizeChanges &&
                r & o.GBlock.ProgramLck.NoMove &&
                r & o.GBlock.ProgramLck.NoDelete;
            t || s || a.push(e);
          }
        }),
          e.getEditor().updateSelection(!1, a);
      }),
      (s.prototype.toString = function () {
        return "[Object GInvertSelectionAction]";
      }),
      (e.exports = s);
  }