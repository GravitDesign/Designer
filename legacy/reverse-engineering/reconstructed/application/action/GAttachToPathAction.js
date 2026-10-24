/**
 * GAttachToPathAction
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GAttachToPathAction() {}

GObject.inherit(GAttachToPathAction, GAction);

// Prototype methods
GAttachToPathAction.prototype.getId = function () {
        return l.ID;
      }

GAttachToPathAction.prototype.getTitle = function () {
        return l.TITLE;
      }

GAttachToPathAction.prototype.getCategory = function () {
        return a.CATEGORY_MODIFY_PATH;
      }

GAttachToPathAction.prototype.getGroup = function () {
        return "structure/modify";
      }

GAttachToPathAction.prototype.getIcon = function () {
        return gDesigner.isTouchEnabled() ? "gravit-icon-attach-to-path" : null;
      }

GAttachToPathAction.prototype.isEnabled = function () {
        if (!s.prototype.isEnabled.call(this)) return false;
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
      }

GAttachToPathAction.prototype.execute = function () {
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
              ? gDesigner.executeAction(r.ID, undefined, undefined, !0)
              : (u.updateSelection(!1, [e]), u.convertSelectionToPaths());
(s = u.getSelection()[0]);
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
      }

GAttachToPathAction.prototype.toString = function () {
        return "[Object GAttachToPathAction]";
      }


module.exports = GAttachToPathAction;
