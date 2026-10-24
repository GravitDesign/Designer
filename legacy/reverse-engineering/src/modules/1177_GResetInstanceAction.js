/**
 * Webpack Module #1177
 * Type: class
 * Name: GResetInstanceAction
 */

function (e, t, n) {
    "use strict";
    n(3);
    var o = n(1),
      i = (n(15), n(18)),
      a = n(106);
    function r() {}
    o.GObject.inherit(r, a),
      (r.ID = "modify.resetinstance"),
      (r.TITLE = new o.GLocaleKey("GResetInstanceAction", "title")),
      (r.prototype.getId = function () {
        return r.ID;
      }),
      (r.prototype.getTitle = function () {
        return r.TITLE;
      }),
      (r.prototype.getCategory = function () {
        return i.CATEGORY_MODIFY_SYMBOL;
      }),
      (r.prototype.getGroup = function () {
        return "structure/modify";
      }),
      (r.prototype.getIcon = function () {
        return gDesigner.isTouchEnabled() ? "gravit-icon-reset-instance" : null;
      }),
      (r.prototype.isEnabled = function () {
        if (!a.prototype.isEnabled.call(this)) return !1;
        var e = gDesigner.getActiveDocument();
        if (e) {
          var t = e.getEditor().getIndividualSelection();
          if (t && t.length)
            for (var n = t.length - 1; n >= 0; --n) {
              var i = t[n];
              if (!i.isLocked()) {
                if (i instanceof o.GSymbol && !i.isLocked() && !i.inSync())
                  return !0;
                var r = null;
                if (
                  (r = i.findParent(function (e) {
                    return e instanceof o.GSymbol;
                  })) &&
                  !r.inSync(i, !0)
                )
                  return !0;
              }
            }
        }
        return !1;
      }),
      (r.prototype.execute = function () {
        var e = gDesigner.getActiveDocument().getEditor(),
          t = o.GNode.order(e.getIndividualSelection().slice());
        e.beginTransaction();
        try {
          for (var n = 0; n < t.length; ++n) {
            var i = t[n];
            if (
              (i instanceof o.GSymbol &&
                !i.isLocked() &&
                !i.inSync() &&
                i.synchronize(),
              !(i instanceof o.GSymbol))
            ) {
              var a = null;
              (a = i.findParent(function (e) {
                return e instanceof o.GSymbol;
              })) &&
                (a.inSync(i, !0) || a.synchronize(i));
            }
          }
        } finally {
          e.commitTransaction(o.GLocale.get(r.TITLE));
        }
      }),
      (r.prototype.toString = function () {
        return "[Object GResetInstanceAction]";
      }),
      (e.exports = r);
  }