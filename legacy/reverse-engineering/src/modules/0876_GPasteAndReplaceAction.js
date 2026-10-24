/**
 * Webpack Module #876
 * Type: class
 * Name: GPasteAndReplaceAction
 */

function (e, t, n) {
    "use strict";
    n(3), n(4), n(41), n(32), n(38), n(33);
    var o = n(1),
      i = n(15);
    const a = n(18),
      r = n(106);
    function s() {}
    o.GObject.inherit(s, r),
      (s.ID = "edit.paste.replace"),
      (s.TITLE = new o.GLocaleKey("GPasteAndReplaceAction", "title")),
      (s.prototype.getId = function () {
        return s.ID;
      }),
      (s.prototype.getTitle = function () {
        return s.TITLE;
      }),
      (s.prototype.getIcon = function () {
        return gDesigner.isTouchEnabled()
          ? "gravit-icon-paste-and-replace"
          : null;
      }),
      (s.prototype.getCategory = function () {
        return a.CATEGORY_EDIT_PASTE;
      }),
      (s.prototype.getGroup = function () {
        return "ccp/paste";
      }),
      (s.prototype.getShortcut = function () {
        return [i.GKey.Constant.OPTION, i.GKey.Constant.COMMAND, "V"];
      }),
      (s.prototype.isEnabled = function () {
        if (!r.prototype.isEnabled.call(this)) return !1;
        const e = gDesigner.getActiveDocument(),
          t = e && e.getEditor(),
          n = t && t.getSelection();
        if (n && n.length > 0) {
          if (document.queryCommandSupported("paste")) return !0;
          const e = gDesigner.getClipboardMimeTypes();
          if (e && e.indexOf(o.GNode.MIME_TYPE) >= 0) return !0;
        }
        return !1;
      }),
      (s.prototype.execute = function () {
        gDesigner.getPaste().assignCallback(this._paste.bind(this)),
          (!gDesigner.isTouchDevice() && document.execCommand("paste")) ||
            (gDesigner.getPaste().assignCallback(null),
            this._paste(
              o.GNode.deserialize(
                gDesigner.getClipboardContent(o.GNode.MIME_TYPE)
              )
            ));
      }),
      (s.prototype._paste = function (e) {
        if (e && e.length > 0) {
          const t = gDesigner.getActiveDocument();
          if (!t) return;
          const n = t && t.getEditor();
          if (!n || !n.hasSelection()) return;
          const i = t.filterUnrestrictedCommercialFileElements(
            e.filter((e) => e instanceof o.GElement)
          );
          if (i.length > 0) {
            n.beginTransaction();
            try {
              let e = [];
              const t = n.getSelection().slice();
              this._fixTexts(i),
                t.forEach((t) => {
                  const n = this._replace(t, i);
                  n && n.length > 0 && (e = e.concat(n));
                }),
                n.insertElements(e, !0, !0, !1, !0);
            } finally {
              n.commitTransaction(o.GLocale.get(this.getTitle()));
            }
          }
        }
      }),
      (s.prototype._fixTexts = function (e) {
        const t = gDesigner.getActiveDocument(),
          n = t && t.getEditor();
        n &&
          e.forEach((e) => {
            e.accept((t) => {
              if (t instanceof o.GText)
                return (
                  n.insertElements([e], !0, !0, !1),
                  e.getParent().removeChild(e),
                  !1
                );
            });
          });
      }),
      (s.prototype._replace = function (e, t) {
        const n = this._getBoundingBox(t);
        if (!n) return;
        const i = e.getGeometryBBox(),
          a = new o.GTransform(
            1,
            0,
            0,
            1,
            i.getX() - n.getX(),
            i.getY() - n.getY()
          ),
          r = this._clone(t);
        return (
          r.forEach((e) => {
            e.hasMixin(o.GElement.Transform) && e.transform(a, !0);
          }),
          e.getParent().removeChild(e),
          r
        );
      }),
      (s.prototype._clone = function (e) {
        return e.map((e) => e.clone());
      }),
      (s.prototype._getBoundingBox = function (e) {
        let t;
        return (
          e.forEach((e) => {
            const n = e.getGeometryBBox();
            n && !n.isEmpty() && (t = t ? t.united(n) : n);
          }),
          t
        );
      }),
      (s.prototype.toString = function () {
        return "[Object GPasteAndReplaceAction]";
      }),
      (e.exports = s);
  }