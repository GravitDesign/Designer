/**
 * GCreateNestedCompoundAction
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GCreateNestedCompoundAction() {}

GObject.inherit(GCreateNestedCompoundAction, GAction);

// Prototype methods
GCreateNestedCompoundAction.prototype.getId = function () {
        return l.ID;
      }

GCreateNestedCompoundAction.prototype.getTitle = function () {
        return l.TITLE;
      }

GCreateNestedCompoundAction.prototype.getCategory = function () {
        return r.CATEGORY_MODIFY;
      }

GCreateNestedCompoundAction.prototype.getGroup = function () {
        return "structure-boolean";
      }

GCreateNestedCompoundAction.prototype.getShortcut = function () {
        return [i.GKey.Constant.META, i.GKey.Constant.ALT_LEFT, "M"];
      }

GCreateNestedCompoundAction.prototype.getIcon = function () {
        return gDesigner.isTouchEnabled() ? "gravit-icon-nested-compound" : "";
      }

GCreateNestedCompoundAction.prototype.isEnabled = function () {
        if (!s.prototype.isEnabled.call(this)) return false;
        var e = gDesigner.getActiveDocument();
        if (e) {
          var t = e.getEditor().getSelection(),
            n = 0;
          if (t && t.length)
            for (var i = 0; i < t.length; ++i) {
              if ((t[i] instanceof o.GCompoundShape && n++, n >= 2)) return true;
            }
        }
        return false;
      }

GCreateNestedCompoundAction.prototype.execute = function () {
        var e = gDesigner.getActiveDocument().getEditor(),
          t = o.GNode.order(e.getIndividualSelection().slice());
        e.beginTransaction();
        try {
          for (var n, i = [], r = new Set(), s = 0; s < t.length; ++s) {
            (l = t[s]) instanceof o.GCompoundShape &&
              (n ? (i.push(l), r.add(l.getParent())) : (n = l));
          }
          if (i.length > 0) {
            try {
              (0, a.blockChanges)(e, r, null, n);
              for (s = 0; s < i.length; ++s) {
                var l;
                (l = i[s]).getParent().removeChild(l), n.appendChild(l);
              }
            } finally {
              (0, a.releaseChanges)(e, r, null, n);
            }
            e.updateSelection(!1, [n]);
          }
        } finally {
          e.commitTransaction("Create nested compound");
        }
      }

GCreateNestedCompoundAction.prototype.toString = function () {
        return "[Object GCreateNestedCompoundAction]";
      }


module.exports = GCreateNestedCompoundAction;
