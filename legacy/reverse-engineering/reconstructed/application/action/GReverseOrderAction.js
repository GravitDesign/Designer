/**
 * GReverseOrderAction
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GReverseOrderAction() {}

GObject.inherit(GReverseOrderAction, GAction);

// Prototype methods
GReverseOrderAction.prototype.getId = function () {
        return r.ID;
      }

GReverseOrderAction.prototype.getTitle = function () {
        return r.TITLE;
      }

GReverseOrderAction.prototype.getCategory = function () {
        return i.CATEGORY_MODIFY_PATH;
      }

GReverseOrderAction.prototype.getGroup = function () {
        return "structure/path";
      }

GReverseOrderAction.prototype.isEnabled = function () {
        if (!a.prototype.isEnabled.call(this)) return false;
        var e = gDesigner.getActiveDocument()
            ? gDesigner.getActiveDocument().getEditor().getSelection()
            : null,
          t = false;
        if (e)
          for (var n = 0; !t && n < e.length; ++n)
            e[n] instanceof o.GPath && (t = true);
        return t;
      }

GReverseOrderAction.prototype.execute = function () {
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
      }

GReverseOrderAction.prototype.toString = function () {
        return "[Object GReverseOrderAction]";
      }
