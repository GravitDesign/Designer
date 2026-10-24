/**
     * Action for pasting clipboard contents into selection
     * @class GPasteInsideAction
     * @extends GAction
     * @constructor
     */

function GPasteInsideAction() {
  // Constructor (reconstructed)
}

// Prototype methods
/**
     * @override
     */
GPasteInsideAction.prototype.execute = function () {
        gDesigner.getPaste().assignCallback(this._paste.bind(this)),
          (!gDesigner.isTouchDevice() && document.execCommand("paste")) ||
            (gDesigner.getPaste().assignCallback(null),
            this._paste(
              o.GNode.deserialize(
                gDesigner.getClipboardContent(o.GNode.MIME_TYPE)
              )
            ));
      }

GPasteInsideAction.prototype._paste = function (e, t) {
        if (e && e.length > 0) {
          for (var n = [], i = 0; i < e.length; ++i)
            e[i] instanceof o.GElement && n.push(e[i]);
          if (
            (n = gDesigner
              .getActiveDocument()
              .filterUnrestrictedCommercialFileElements(n)).length > 0
          ) {
            var a = gDesigner.getActiveDocument().getEditor(),
              r = [...a.getSelection()];
            n.forEach((e) => {
              e instanceof o.GText &&
                !e.getProperty("content") &&
                (a.insertElements([e], !1, !0, !0),
                e.getParent().removeChild(e));
            }),
              a.beginTransaction();
            try {
              for (i = 0; i < r.length; ++i) {
                var s = r[i];
                if (s.hasMixin(o.GNode.Container) && !s.isLocked()) {
                  for (var l = [], c = 0; c < n.length; ++c)
                    n[c].validateInsertion(s) && l.push(n[c].clone());
                  a.insertElements(l, !t, !0, !1, !0, s);
                  var d = s instanceof o.GElement ? s.getGeometryBBox() : null;
                  if (d) {
                    var u = d.getX(),
                      p = d.getY(),
                      g = null;
                    l.forEach((e) => {
                      var t = e.getGeometryBBox();
                      t && (g = g ? g.united(t) : t);
                    });
                    var h = g ? g.getX() : null,
                      f = g ? g.getY() : null,
                      m = null;
                    if (
                      (null === u ||
                        null === h ||
                        (o.GMath.isEqualEps(u, h) &&
                          o.GMath.isEqualEps(p, f)) ||
                        (m = new o.GTransform(1, 0, 0, 1, u - h, p - f)),
                      m)
                    )
                      for (c = 0; c < l.length; ++c) {
                        var y = l[c];
                        y.hasMixin(o.GElement.Transform) && y.transform(m, !0);
                      }
                  }
                }
              }
            } finally {
              a.commitTransaction(o.GLocale.get(this.getTitle()));
            }
          }
        }
      }

/** @override */
GPasteInsideAction.prototype.toString = function () {
        return "[Object GPasteInsideAction]";
      }

module.exports = GPasteInsideAction;
