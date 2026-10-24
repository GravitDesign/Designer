/**
 * Webpack Module #1183
 * Type: class
 * Name: GPasteInPlaceAction
 */

function (e, t, n) {
    "use strict";
    n(3), n(4), n(32), n(33);
    var o = n(1),
      i = n(15),
      a = n(18),
      r = n(31),
      s = n(106);
    function l() {}
    o.GObject.inherit(l, r),
      (l.ID = "edit.paste.in-place"),
      (l.TITLE = new o.GLocaleKey("GPasteInPlaceAction", "title")),
      (l.prototype.getId = function () {
        return l.ID;
      }),
      (l.prototype.getTitle = function () {
        return l.TITLE;
      }),
      (l.prototype.getCategory = function () {
        return a.CATEGORY_EDIT_PASTE;
      }),
      (l.prototype.getGroup = function () {
        return "ccp/paste";
      }),
      (l.prototype.getShortcut = function () {
        return [i.GKey.Constant.SHIFT, i.GKey.Constant.META, "V"];
      }),
      (l.prototype.isEnabled = function () {
        if (!s.prototype.isEnabled.call(this)) return !1;
        var e = gDesigner.getActiveDocument();
        if (e && e.getEditor().getSelection()) {
          if (document.queryCommandSupported("paste")) return !0;
          var t = gDesigner.getClipboardMimeTypes();
          if (t && t.indexOf(o.GNode.MIME_TYPE) >= 0)
            return !!gDesigner.getActiveDocument();
        }
        return !1;
      }),
      (l.prototype.execute = function () {
        gDesigner.getPaste().assignCallback(this._paste.bind(this)),
          (!gDesigner.isTouchDevice() && document.execCommand("paste")) ||
            (gDesigner.getPaste().assignCallback(null),
            this._paste(
              o.GNode.deserialize(
                gDesigner.getClipboardContent(o.GNode.MIME_TYPE)
              )
            ));
      }),
      (l.prototype._paste = function (e, t) {
        if (e && e.length > 0) {
          for (var n = [], i = 0; i < e.length; ++i)
            e[i] instanceof o.GElement && n.push(e[i]);
          if (
            (n = gDesigner
              .getActiveDocument()
              .filterUnrestrictedCommercialFileElements(n)).length > 0
          ) {
            var a = gDesigner.getActiveDocument().getEditor();
            n.forEach((e) => {
              e instanceof o.GText &&
                !e.getProperty("content") &&
                (a.insertElements([e], !1, !0, !0),
                e.getParent().removeChild(e));
            });
            var r = null,
              s = null,
              l = a.getSelectionBBox(!0);
            l && ((r = l.getX()), (s = l.getY())), a.beginTransaction();
            try {
              a.insertElements(n, !t, !0, !0, !0);
              var c = null;
              n.forEach((e) => {
                var t = e.getGeometryBBox();
                t && (c = c ? c.united(t) : t);
              });
              var d = c ? c.getX() : null,
                u = c ? c.getY() : null,
                p = null;
              if (
                (null === r ||
                  null === d ||
                  (o.GMath.isEqualEps(r, d) && o.GMath.isEqualEps(s, u)) ||
                  (p = new o.GTransform(1, 0, 0, 1, r - d, s - u)),
                p)
              )
                for (i = 0; i < n.length; ++i) {
                  var g = n[i];
                  g.hasMixin(o.GElement.Transform) && g.transform(p, !0);
                }
            } finally {
              a.commitTransaction(o.GLocale.get(this.getTitle()));
            }
          }
        }
      }),
      (l.prototype.toString = function () {
        return "[Object GPasteInPlaceAction]";
      }),
      (e.exports = l);
  }