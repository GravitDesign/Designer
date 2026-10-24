/**
 * Webpack Module #1176
 * Type: class
 * Name: GAttachToPathAction
 */

function (e, t, n) {
    "use strict";
    n(3);
    var o = n(53),
      i = n(1),
      a = n(18),
      r = n(873),
      s = n(106);
    function l() {}
    i.GObject.inherit(l, s),
      (l.ID = "modify.attachToPath"),
      (l.TITLE = new i.GLocaleKey("GAttachToPathAction", "title")),
      (l.prototype.getId = function () {
        return l.ID;
      }),
      (l.prototype.getTitle = function () {
        return l.TITLE;
      }),
      (l.prototype.getCategory = function () {
        return a.CATEGORY_MODIFY_PATH;
      }),
      (l.prototype.getGroup = function () {
        return "structure/modify";
      }),
      (l.prototype.getIcon = function () {
        return gDesigner.isTouchEnabled() ? "gravit-icon-attach-to-path" : null;
      }),
      (l.prototype.isEnabled = function () {
        if (!s.prototype.isEnabled.call(this)) return !1;
        var e = gDesigner.getActiveDocument()
            ? gDesigner.getActiveDocument().getEditor().getSelection()
            : null,
          t = [],
          n = null;
        if (e)
          for (var a = 0; a < e.length; ++a)
            if (e[a] instanceof i.GText && !e[a].hasPathAttached()) {
              var r = o.GElementEditor.getEditor(e[a]);
              r && !r.isInlineEdit() && t.push(e[a]);
            } else
              !e[a].hasMixin(i.GVertexSource) ||
                e[a] instanceof i.GPathsGraph ||
                (n = e[a]);
        return !(!t.length || !n);
      }),
      (l.prototype.execute = function () {
        var e,
          t = gDesigner.getActiveDocument(),
          n = t ? t.getScene() : null,
          a = (u = t ? t.getEditor() : null)
            ? u.getIndividualSelection()
            : null,
          s = null,
          l = [];
        if (a)
          for (var c = 0; c < a.length; ++c)
            if (!s && a[c] instanceof i.GPathBase) s = a[c];
            else if (a[c] instanceof i.GText && !a[c].hasPathAttached()) {
              var d = o.GElementEditor.getEditor(a[c]);
              d && !d.isInlineEdit() && l.push(a[c]);
            } else
              e ||
                !a[c].hasMixin(i.GVertexSource) ||
                a[c] instanceof i.GPathsGraph ||
                (e = a[c]);
        try {
          if ((u.beginTransaction(), !s)) {
            var u = gDesigner.getActiveDocument().getEditor();
            e instanceof i.GCompoundPath
              ? gDesigner.executeAction(r.ID, void 0, void 0, !0)
              : (u.updateSelection(!1, [e]), u.convertSelectionToPaths()),
              (s = u.getSelection()[0]),
              (a = a.concat()).splice(a.indexOf(e), 1),
              u.updateSelection(!0, a);
          }
          n &&
            l.map(function (e) {
              n.link(e, s);
            });
        } finally {
          u.commitTransaction(i.GLocale.get(this.getTitle()));
        }
      }),
      (l.prototype.toString = function () {
        return "[Object GAttachToPathAction]";
      }),
      (e.exports = l);
  }