/**
 * Webpack Module #875
 * Type: class
 * Name: GPasteStyleAction
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
      (s.ID = "edit.paste.style"),
      (s.TITLE = new o.GLocaleKey("GPasteStyleAction", "title")),
      (s.prototype.getId = function () {
        return s.ID;
      }),
      (s.prototype.getTitle = function () {
        return s.TITLE;
      }),
      (s.prototype.getCategory = function () {
        return a.CATEGORY_EDIT_PASTE;
      }),
      (s.prototype.getGroup = function () {
        return "ccp/paste";
      }),
      (s.prototype.getIcon = function () {
        return gDesigner.isTouchEnabled() ? "gravit-icon-paste-style" : null;
      }),
      (s.prototype.getShortcut = function () {
        return [i.GKey.Constant.F4];
      }),
      (s.prototype.isEnabled = function () {
        if (!r.prototype.isEnabled.call(this)) return !1;
        var e = gDesigner.getClipboardMimeTypes();
        if (e && e.indexOf(o.GNode.MIME_TYPE) >= 0) {
          var t = gDesigner.getActiveDocument();
          if (t) {
            var n = t.getEditor().getIndividualSelection();
            if (n)
              for (var i = 0; i < n.length; ++i)
                if (n[i].hasMixin(o.GStylable)) return !0;
          }
        }
        return !1;
      }),
      (s.prototype.execute = function () {
        var e = o.GNode.deserialize(
          gDesigner.getClipboardContent(o.GNode.MIME_TYPE)
        );
        if (
          (e = gDesigner
            .getActiveDocument()
            .filterUnrestrictedCommercialFileElements(e)) &&
          e.length > 0
        ) {
          for (var t = null, n = 0; n < e.length; ++n)
            if (e[n].hasMixin(o.GStylable)) {
              t = e[n];
              break;
            }
          if (!t) return;
          var i = gDesigner.getActiveDocument().getEditor(),
            a = i.getIndividualSelection();
          t instanceof o.GText &&
            gDesigner
              .getActiveDocument()
              .getScene()
              .getActivePage()
              .appendChild(t),
            i.beginTransaction();
          try {
            for (n = 0; n < a.length; ++n) {
              var r = a[n];
              r.hasMixin(o.GStylable) && r.assignStyleFrom(t);
            }
          } finally {
            i.commitTransaction(o.GLocale.get(this.getTitle())),
              t instanceof o.GText &&
                gDesigner
                  .getActiveDocument()
                  .getScene()
                  .getActivePage()
                  .removeChild(t);
          }
        }
      }),
      (s.prototype.toString = function () {
        return "[Object GPasteStyleAction]";
      }),
      (e.exports = s);
  }