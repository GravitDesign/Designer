/**
 * Webpack Module #1611
 * Type: class
 * Name: GReverseOrderAction
 */

function (e, t, n) {
    "use strict";
    n(3);
    var o = n(1),
      i = n(18),
      a = n(106);
    function r() {}
    o.GObject.inherit(r, a),
      (r.ID = "modify.reverse-order"),
      (r.TITLE = new o.GLocaleKey("GReverseOrderAction", "title")),
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
        return "structure/path";
      }),
      (r.prototype.isEnabled = function () {
        if (!a.prototype.isEnabled.call(this)) return !1;
        var e = gDesigner.getActiveDocument()
            ? gDesigner.getActiveDocument().getEditor().getSelection()
            : null,
          t = !1;
        if (e)
          for (var n = 0; !t && n < e.length; ++n)
            e[n] instanceof o.GPath && (t = !0);
        return t;
      }),
      (r.prototype.execute = function () {
        var e = gDesigner.getActiveDocument(),
          t = e ? e.getEditor() : null,
          n = t ? t.getSelection() : null,
          i = [];
        if (n)
          for (var a = 0; a < n.length; ++a) {
            var r = n[a];
            r instanceof o.GPath && i.push(r);
          }
        if (i.length) {
          t.beginTransaction();
          try {
            for (a = 0; a < i.length; ++a) i[a].reverseOrder();
          } finally {
            t.commitTransaction(o.GLocale.get(this.getTitle()));
          }
        }
      }),
      (r.prototype.toString = function () {
        return "[Object GReverseOrderAction]";
      }),
      (e.exports = r);
  }