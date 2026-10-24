/**
     * Action for pasting clipboard contents onto the positions relative to the active page top left
     * @class GPasteInPlaceAction
     * @extends GPasteAction
     * @constructor
     */

function GPasteInPlaceAction() {
  // Constructor (reconstructed)
}

// Prototype methods
GPasteInPlaceAction.prototype.isEnabled = function () {
        if (!s.prototype.isEnabled.call(this)) return false;
        var e = gDesigner.getActiveDocument();
        if (e && e.getEditor().getSelection()) {
          if (document.queryCommandSupported("paste")) return true;
          var t = gDesigner.getClipboardMimeTypes();
          if (t && t.indexOf(o.GNode.MIME_TYPE) >= 0)
            return !!gDesigner.getActiveDocument();
        }
        return false;
      }

/**
     * @override
     */
    GPasteInPlaceAction.prototype.getId = function () {
        return GPasteInPlaceAction.ID;
    };

    /**
     * @override
     */
    GPasteInPlaceAction.prototype.getTitle = function () {
        return GPasteInPlaceAction.TITLE;
    };

    /**
     * @override
     */
GPasteInPlaceAction.prototype.execute = function () {
        gDesigner.getPaste().assignCallback(this._paste.bind(this)),
          (!gDesigner.isTouchDevice() && document.execCommand("paste")) ||
            (gDesigner.getPaste().assignCallback(null),
            this._paste(
              o.GNode.deserialize(
                gDesigner.getClipboardContent(o.GNode.MIME_TYPE)
              )
            ));
      }

GPasteInPlaceAction.prototype._paste = function (e, t) {
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
      }

/** @override */
GPasteInPlaceAction.prototype.toString = function () {
        return "[Object GPasteInPlaceAction]";
      }

module.exports = GPasteInPlaceAction;
