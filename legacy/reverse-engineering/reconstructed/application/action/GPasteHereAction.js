/**
 * GPasteHereAction
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GPasteHereAction() {
  // Constructor (reconstructed)
}

// Prototype methods
GPasteHereAction.prototype.execute = function () {
        gDesigner.getPaste().assignCallback(this._paste.bind(this)),
          document.execCommand("paste") ||
            (gDesigner.getPaste().assignCallback(null),
            this._paste(
              o.GNode.deserialize(
                gDesigner.getClipboardContent(o.GNode.MIME_TYPE)
              )
            ));
      }

GPasteHereAction.prototype.setPosition = function (e) {
        this._targetPosition = gDesigner
          .getWindows()
          .getActiveWindow()
          .getView()
          .getViewTransform(
            gDesigner.getActiveDocument().getScene().getActivePage()
          )
          .mapPoint(e);
      }

GPasteHereAction.prototype._paste = function (e, t) {
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
            }),
              a.beginTransaction();
            try {
              var r;
              a.insertElements(n, !t, !0, !0, !0),
                n.forEach((e) => {
                  var t = e.getGeometryBBox();
                  t && (r = r ? r.united(t) : t);
                });
              var s = r ? r.getX() : null,
                l = r ? r.getY() : null,
                c = null;
              if (
                (!this._targetPosition ||
                  null === s ||
                  (o.GMath.isEqualEps(this._targetPosition.getX(), s) &&
                    o.GMath.isEqualEps(this._targetPosition.getY(), l)) ||
                  (c = new o.GTransform(
                    1,
                    0,
                    0,
                    1,
                    this._targetPosition.getX() - s,
                    this._targetPosition.getY() - l
                  )),
                c)
              )
                for (i = 0; i < n.length; ++i) {
                  var d = n[i];
                  d.hasMixin(o.GElement.Transform) && d.transform(c, !0);
                }
            } finally {
              a.commitTransaction(
                o.GLocale.get(new o.GLocaleKey("GPaste", "action.paste"))
              );
            }
          }
        }
      }

GPasteHereAction.prototype.toString = function () {
        return "[Object GPasteHereAction]";
      }

module.exports = GPasteHereAction;
