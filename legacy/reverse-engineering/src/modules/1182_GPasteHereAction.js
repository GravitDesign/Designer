/**
 * Webpack Module #1182
 * Type: class
 * Name: GPasteHereAction
 */

function (e, t, n) {
    "use strict";
    n(3), n(4), n(32), n(33);
    var o = n(1),
      i = (n(15), n(18), n(31));
    n(1313);
    function a() {
      this._targetPosition = null;
    }
    o.GObject.inherit(a, i),
      (a.ID = "edit.paste.here"),
      (a.TITLE = new o.GLocaleKey("GPasteHereAction", "title")),
      (a.prototype._targetPosition = null),
      (a.prototype.getId = function () {
        return a.ID;
      }),
      (a.prototype.getTitle = function () {
        return a.TITLE;
      }),
      (a.prototype.getIcon = function () {
        return null;
      }),
      (a.prototype.getCategory = function () {
        return null;
      }),
      (a.prototype.getGroup = function () {
        return null;
      }),
      (a.prototype.getIcon = function () {
        return gDesigner.isTouchEnabled() ? "gravit-icon-paste-here" : null;
      }),
      (a.prototype.getShortcut = function () {
        return null;
      }),
      (a.prototype.isAvailable = function (e) {
        return !!e && "context.menu" == e;
      }),
      (a.prototype.isEnabled = function () {
        if (document.queryCommandSupported("paste")) return !0;
        var e = gDesigner.getClipboardMimeTypes();
        return (
          !!(e && e.indexOf(o.GNode.MIME_TYPE) >= 0) &&
          !!gDesigner.getActiveDocument()
        );
      }),
      (a.prototype.execute = function () {
        gDesigner.getPaste().assignCallback(this._paste.bind(this)),
          document.execCommand("paste") ||
            (gDesigner.getPaste().assignCallback(null),
            this._paste(
              o.GNode.deserialize(
                gDesigner.getClipboardContent(o.GNode.MIME_TYPE)
              )
            ));
      }),
      (a.prototype.setPosition = function (e) {
        this._targetPosition = gDesigner
          .getWindows()
          .getActiveWindow()
          .getView()
          .getViewTransform(
            gDesigner.getActiveDocument().getScene().getActivePage()
          )
          .mapPoint(e);
      }),
      (a.prototype._paste = function (e, t) {
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
      }),
      (a.prototype.toString = function () {
        return "[Object GPasteHereAction]";
      }),
      (e.exports = a);
  }