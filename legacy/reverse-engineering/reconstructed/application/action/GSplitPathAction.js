/**
 * GSplitPathAction
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GSplitPathAction() {}

GObject.inherit(GSplitPathAction, GAction);

// Prototype methods
GSplitPathAction.prototype.getId = function () {
        return s.ID;
      }

GSplitPathAction.prototype.getTitle = function () {
        return s.TITLE;
      }

GSplitPathAction.prototype.getCategory = function () {
        return a.CATEGORY_MODIFY_PATH;
      }

GSplitPathAction.prototype.getGroup = function () {
        return "structure/path";
      }

GSplitPathAction.prototype.getShortcut = function () {
        return [i.GKey.Constant.SHIFT, i.GKey.Constant.META, "J"];
      }

GSplitPathAction.prototype.getIcon = function () {
        return gDesigner.isTouchEnabled() ? "gravit-icon-split-path" : null;
      }

GSplitPathAction.prototype.isEnabled = function () {
        var e = gDesigner.getActiveDocument();
        if (e) {
          var t = e.getEditor().getSelection();
          if (t)
            for (var n = 0; n < t.length; ++n)
              if (t[n] instanceof o.GCompoundPath) return true;
        }
        return false;
      }

GSplitPathAction.prototype.execute = function () {
        if (!r.prototype.isEnabled.call(this)) return false;
        var e = gDesigner.getActiveDocument().getEditor(),
          t = e.getSelection().slice();
        if (t && t.length) {
          e.beginTransaction();
          try {
            for (var n = [], i = 0; i < t.length; ++i) {
              var a = t[i];
              if (a instanceof o.GCompoundPath) {
                var s = new o.GRectangle();
                o.GElement.prototype.assignFrom.call(s, a);
                var l = e.splitCompoundPath(a);
                if (l && l.length)
                  for (var c = 0; c < l.length; ++c) {
                    var d = l[c];
                    o.GElement.prototype.assignFrom.call(d, s), n.push(d);
                  }
              }
            }
            n.length && e.updateSelection(!1, n);
          } finally {
            e.commitTransaction(o.GLocale.get(this.getTitle()));
          }
        }
      }

GSplitPathAction.prototype.toString = function () {
        return "[Object GSplitPathAction]";
      }




module.exports = GSplitPathAction;
