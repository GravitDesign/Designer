/**
 * GNewClipboardAction
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GNewClipboardAction() {}

GObject.inherit(GNewClipboardAction, GAction);

// Prototype methods
GNewClipboardAction.prototype.getId = function () {
        return l.ID;
      }

GNewClipboardAction.prototype.getTitle = function () {
        return l.TITLE;
      }

GNewClipboardAction.prototype.getCategory = function () {
        return a.CATEGORY_FILE;
      }

GNewClipboardAction.prototype.getGroup = function () {
        return "document";
      }

GNewClipboardAction.prototype.getShortcut = function () {
        return [
          i.GKey.Constant.SHIFT,
          i.GKey.Constant.CONTROL,
          i.GKey.Constant.OPTION,
          "N",
        ];
      }

GNewClipboardAction.prototype.isEnabled = function () {
        return (
          !!gDesigner.getApplicationManager().isCopyPasteEnabled() &&
          !!gDesigner.getActiveDocument() &&
          !!gDesigner.getClipboardContent(o.GNode.MIME_TYPE)
        );
      }

GNewClipboardAction.prototype.execute = function () {
        var e = o.GNode.deserialize(
          gDesigner.getClipboardContent(o.GNode.MIME_TYPE)
        );
        if (e && e.length > 0) {
          var t = e.filter(function (e) {
            return e instanceof o.GItem || e instanceof o.GLayer;
          });
          if (t.length > 0) {
            var n = gDesigner.createScene();
            n
              .getActivePage()
              .setProperties(["bck", "w", "h"], [o.GRGBColor.WHITE, 0, 0]),
              gDesigner.addDocument(new r(n));
            var i = gDesigner.getActiveDocument().getEditor();
            i.beginTransaction();
            try {
              i.insertElements(t, !0, !0, !0);
            } finally {
              i.commitTransaction("Paste"),
                gDesigner.setClipboardContent(o.GNode.MIME_TYPE, null);
            }
            gDesigner.getActiveDocument().getActiveWindow().centerAndZoom();
          }
        }
      }

GNewClipboardAction.prototype._getBBox = function (e) {
        var t = null;
        return (
          o.GUtil.each(e, function (e, n) {
            var i = n.getPaintBBox();
            i &&
              i.getWidth() + i.getHeight() > 0 &&
              (t = t
                ? t.united(i)
                : new o.GRect(i.getX(), i.getY(), i.getWidth(), i.getHeight()));
          }),
          t
        );
      }

GNewClipboardAction.prototype.toString = function () {
        return "[Object GNewClipboardAction]";
      }
