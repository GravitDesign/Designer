/**
 * Webpack Module #1317
 * Type: class
 * Name: GOffsetAction
 */

function (e, t, n) {
    "use strict";
    n(3);
    var o = n(1),
      i = n(1185);
    function a() {}
    o.GObject.inherit(a, i),
      (a.ID = "modify.offset"),
      (a.TITLE = new o.GLocaleKey("GOffsetAction", "title")),
      (a.prototype.getId = function () {
        return a.ID;
      }),
      (a.prototype.getTitle = function () {
        return a.TITLE;
      }),
      (a.prototype.getGroup = function () {
        return "structure/modify";
      }),
      (a.prototype.getShortcut = function () {
        return null;
      }),
      (a.prototype.getIcon = function () {
        return gDesigner.isTouchEnabled() ? "gravit-icon-expand-shrink" : null;
      }),
      (a.prototype._dialogPromptMessage = function () {
        return o.GLocale.get(
          new o.GLocaleKey("GOffsetAction", "text.dialog-prompt-message")
        );
      }),
      (a.prototype._makeOffsetter = function (e, t) {
        var n;
        if (t.hasMixin(o.GStylable)) {
          var i = t.getPaintLayers();
          if (i) {
            var a = i.getBorderLayers(!0).pop();
            a && (n = a.$_blc);
          }
        }
        return (
          (t = o.GPathUtil.makeClockWise(t)),
          e > 0
            ? new o.GVertexOffsetter(t, e, !1, !0, 0, n)
            : new o.GVertexOffsetter(t, -e, !0, !1, 0, n)
        );
      }),
      (a.prototype._dialogAlertMessage = function () {
        return o.GLocale.get(
          new o.GLocaleKey("GOffsetAction", "text.invalid-value")
        );
      }),
      (a.prototype.toString = function () {
        return "[Object GOffsetAction]";
      }),
      (e.exports = a);
  }