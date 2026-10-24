/**
 * Webpack Module #1602
 * Type: class
 * Name: GNewClipboardAction
 */

function (e, t, n) {
    "use strict";
    n(3), n(4), n(41);
    n(53);
    var o = n(1),
      i = n(15),
      a = n(18),
      r = n(163),
      s = (n(449), n(31));
    function l() {}
    o.GObject.inherit(l, s),
      (l.ID = "file.new.clipboard"),
      (l.TITLE = new o.GLocaleKey("GNewClipboardAction", "title")),
      (l.prototype.getId = function () {
        return l.ID;
      }),
      (l.prototype.getTitle = function () {
        return l.TITLE;
      }),
      (l.prototype.getCategory = function () {
        return a.CATEGORY_FILE;
      }),
      (l.prototype.getGroup = function () {
        return "document";
      }),
      (l.prototype.getShortcut = function () {
        return [
          i.GKey.Constant.SHIFT,
          i.GKey.Constant.CONTROL,
          i.GKey.Constant.OPTION,
          "N",
        ];
      }),
      (l.prototype.isEnabled = function () {
        return (
          !!gDesigner.getApplicationManager().isCopyPasteEnabled() &&
          !!gDesigner.getActiveDocument() &&
          !!gDesigner.getClipboardContent(o.GNode.MIME_TYPE)
        );
      }),
      (l.prototype.execute = function () {
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
      }),
      (l.prototype._getBBox = function (e) {
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
      }),
      (l.prototype.toString = function () {
        return "[Object GNewClipboardAction]";
      }),
      (e.exports = l);
  }