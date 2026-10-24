/**
 * Webpack Module #1332
 * Type: class
 * Name: GDeleteAction
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    n(3), n(4), n(41);
    var i = n(1),
      a = n(53),
      r = n(15),
      s = n(10),
      l = n(40),
      c = o(n(44)),
      d = n(567),
      u = n(18),
      p = n(31);
    const g = n(358),
      h = n(607);
    function f() {}
    i.GObject.inherit(f, p),
      (f.ID = "edit.delete"),
      (f.TITLE = new i.GLocaleKey("GDeleteAction", "title")),
      (f.prototype._isConfirmWindowDisplaying = !1),
      (f.prototype.getId = function () {
        return f.ID;
      }),
      (f.prototype.getTitle = function () {
        return f.TITLE;
      }),
      (f.prototype.getCategory = function () {
        return u.CATEGORY_EDIT;
      }),
      (f.prototype.getGroup = function () {
        return "ccp";
      }),
      (f.prototype.getShortcut = function () {
        return [r.GKey.Constant.REMOVE];
      }),
      (f.prototype.getAdditionalShortcuts = function () {
        var e = [];
        return (
          i.GSystem.operatingSystem === i.GSystem.OperatingSystem.OSX_IOS
            ? e.push([r.GKey.Constant.DELETE])
            : e.push([r.GKey.Constant.BACKSPACE]),
          e
        );
      }),
      (f.prototype.isEnabled = function () {
        var e = gDesigner.getActiveDocument();
        if (this._isConfirmWindowDisplaying) return !1;
        if (e) {
          var t = e.getEditor().getSelection();
          if (t)
            for (var n = 0; n < t.length; ++n)
              if (t[n] instanceof i.GItem || t[n] instanceof i.GLayer)
                return !0;
        }
        return !1;
      }),
      (f.prototype.execute = function () {
        var e = gDesigner.getActiveDocument(),
          t = e.getEditor(),
          n = e.getActiveStylesList(),
          o = gDesigner.getMouseOverContext();
        if (
          s.HAS_ANNOTATIONS &&
          gDesigner.getRightSidebars().getActiveSidebar() === d.ID
        ) {
          var r = t.getSelection().filter((e) => g.canDeleteAnnotation(e));
          r.length &&
            (this._setIsConfirmWindowDisplaying(!0),
            c.default.confirm(
              i.GLocale.get(
                new i.GLocaleKey("GAnnotationPanel", "text.confirm-remove")
              ),
              (e) => {
                e &&
                  gDesigner.getActiveDocument() &&
                  gDesigner.getActiveDocument().getEditor() === t &&
                  g.removeAnnotations(
                    r,
                    r[0].getParent(),
                    i.GLocale.get(this.getTitle())
                  ),
                  this._setIsConfirmWindowDisplaying(!1);
              },
              null,
              null,
              null,
              !0,
              !0
            ));
        } else if (o.context && (n.Fill || n.Border || n.Effect)) {
          var u = null,
            p = null,
            m = t.getSelection();
          if (o.context === h.FillPropertiesPanel) (u = n.Fill), (p = "fill");
          else if (o.context === h.BorderPropertiesPanel)
            (u = n.Border), (p = "border");
          else {
            if (o.context !== h.EffectPropertiesPanel)
              return void t.deleteSelection();
            (u = n.Effect), (p = "effect");
          }
          a.GEditor.tryRunTransaction(
            e.getScene(),
            function () {
              (0, l.iterateEqualStyleLayers)(p, u, m, function (e) {
                e.getParent().removeChild(e);
              });
            },
            i.GLocale.get(f.TITLE)
          );
        } else t.deleteSelection();
      }),
      (f.prototype.getIcon = function () {
        return gDesigner.isTouchEnabled() ? "gravit-icon-delete" : "";
      }),
      (f.prototype._setIsConfirmWindowDisplaying = function (e) {
        this._isConfirmWindowDisplaying = e;
      }),
      (f.prototype.toString = function () {
        return "[Object GDeleteAction]";
      }),
      (e.exports = f);
  }