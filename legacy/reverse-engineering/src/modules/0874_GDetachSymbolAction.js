/**
 * Webpack Module #874
 * Type: class
 * Name: GDetachSymbolAction
 */

function (e, t, n) {
    "use strict";
    n(20), n(3), n(34);
    var o = n(1),
      i = n(15),
      a = n(18),
      r = n(106);
    function s() {}
    o.GObject.inherit(s, r),
      (s.ID = "modify.detachsymbol"),
      (s.TITLE = new o.GLocaleKey("GDetachSymbolAction", "title")),
      (s.prototype.getId = function () {
        return s.ID;
      }),
      (s.prototype.getTitle = function () {
        return s.TITLE;
      }),
      (s.prototype.getCategory = function () {
        return a.CATEGORY_MODIFY_SYMBOL;
      }),
      (s.prototype.getGroup = function () {
        return "structure/modify";
      }),
      (s.prototype.getIcon = function () {
        return gDesigner.isTouchEnabled() ? "gravit-icon-detach-symbol" : null;
      }),
      (s.prototype.getShortcut = function () {
        return [
          i.GKey.Constant.SHIFT,
          i.GKey.Constant.META,
          i.GKey.Constant.F8,
        ];
      }),
      (s.prototype.isEnabled = function () {
        if (!r.prototype.isEnabled.call(this)) return !1;
        var e = gDesigner.getActiveDocument();
        if (e) {
          var t = e.getEditor().getIndividualSelection();
          if (t && t.length)
            for (var n = t.length - 1; n >= 0; --n) {
              var i = t[n];
              if (
                i instanceof o.GSymbol &&
                !i.isMaster() &&
                i.getMasterSymbol()
              )
                return !0;
            }
        }
        return !1;
      }),
      (s.prototype.execute = function () {
        var e = gDesigner.getActiveDocument().getEditor(),
          t = o.GNode.order(e.getIndividualSelection().slice());
        if (t.length && t[0].getScene()) {
          e.beginTransaction();
          try {
            for (var n = 0, i = 0; i < t.length; ++i) {
              var a = t[i];
              a instanceof o.GSymbol && a.detach() && n++;
            }
          } finally {
            e.commitTransaction(
              o.GLocale.get(
                new o.GLocaleKey("GDetachSymbolAction", "text.number-detached")
              ).replace("%number", n > 1 ? "s" : "")
            );
          }
        }
      }),
      (s.prototype.toString = function () {
        return "[Object GDetachSymbolAction]";
      }),
      (e.exports = s);
  }