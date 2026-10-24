/**
 * Webpack Module #1184
 * Type: class
 * Name: GPasteInsideAction
 */

function (e, t, n) {
    "use strict";
    n(19), n(3), n(4), n(32), n(33), n(26);
    var o = n(1),
      i = n(15),
      a = (n(53), n(18)),
      r = n(106);
    function s() {}
    o.GObject.inherit(s, r),
      (s.ID = "edit.paste.inside"),
      (s.TITLE = new o.GLocaleKey("GPasteInsideAction", "title")),
      (s.prototype.getId = function () {
        return s.ID;
      }),
      (s.prototype.getTitle = function () {
        return s.TITLE;
      }),
      (s.prototype.getCategory = function () {
        return a.CATEGORY_EDIT_PASTE;
      }),
      (s.prototype.getGroup = function () {
        return "ccp/paste";
      }),
      (s.prototype.getIcon = function () {
        return gDesigner.isTouchEnabled() ? "gravit-icon-paste-inside" : null;
      }),
      (s.prototype.getShortcut = function () {
        return [
          i.GKey.Constant.OPTION,
          i.GKey.Constant.SHIFT,
          i.GKey.Constant.META,
          "V",
        ];
      }),
      (s.prototype.isEnabled = function () {
        if (!r.prototype.isEnabled.call(this)) return !1;
        var e = gDesigner.getActiveDocument();
        if (e) {
          var t = e.getEditor().getSelection();
          if (t) {
            if (document.queryCommandSupported("paste")) return !0;
            var n = gDesigner.getClipboardMimeTypes();
            if (n && n.indexOf(o.GNode.MIME_TYPE) >= 0)
              for (var i = 0; i < t.length; ++i)
                if (t[i].hasMixin(o.GNode.Container)) return !0;
          }
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
      (s.prototype._paste = function (e, t) {
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
      }),
      (s.prototype.toString = function () {
        return "[Object GPasteInsideAction]";
      }),
      (e.exports = s);
  }