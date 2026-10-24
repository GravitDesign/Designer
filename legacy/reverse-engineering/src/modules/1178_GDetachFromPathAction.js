/**
 * Webpack Module #1178
 * Type: class
 * Name: GDetachFromPathAction
 */

function (e, t, n) {
    "use strict";
    n(3);
    var o = n(1),
      i = n(18),
      a = n(106);
    function r() {}
    o.GObject.inherit(r, a),
      (r.ID = "modify.detachFromPath"),
      (r.TITLE = new o.GLocaleKey("GDetachFromPathAction", "title")),
      (r.prototype.getId = function () {
        return r.ID;
      }),
      (r.prototype.getTitle = function () {
        return r.TITLE;
      }),
      (r.prototype.getCategory = function () {
        return i.CATEGORY_MODIFY_PATH;
      }),
      (r.prototype.getGroup = function () {
        return "structure/modify";
      }),
      (r.prototype.getIcon = function () {
        return gDesigner.isTouchEnabled()
          ? "gravit-icon-detach-from-path"
          : null;
      }),
      (r.prototype.isEnabled = function () {
        if (!a.prototype.isEnabled.call(this)) return !1;
        var e = gDesigner.getActiveDocument()
          ? gDesigner.getActiveDocument().getEditor().getSelection()
          : null;
        if (e)
          for (var t = 0; t < e.length; ++t)
            if (e[t] instanceof o.GText && e[t].hasPathAttached()) return !0;
        return !1;
      }),
      (r.prototype.execute = function () {
        var e = gDesigner.getActiveDocument(),
          t = e ? e.getEditor() : null,
          n = t ? t.getIndividualSelection() : null,
          i = [];
        if (n)
          for (var a = 0; a < n.length; ++a)
            n[a] instanceof o.GText && n[a].hasPathAttached() && i.push(n[a]);
        t.beginTransaction();
        try {
          var r = e.getScene();
          i.forEach(function (e) {
            r.visitLinks(e, function (t) {
              t instanceof o.GPathBase && r.unlink(e, t);
            });
          });
        } finally {
          t.commitTransaction(o.GLocale.get(this.getTitle()));
        }
      }),
      (r.prototype.toString = function () {
        return "[Object GDetachFromPathAction]";
      }),
      (e.exports = r);
  }