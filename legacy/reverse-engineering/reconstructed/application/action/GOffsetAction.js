/**
 * GOffsetAction
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GOffsetAction() {}

GObject.inherit(GOffsetAction, GAction);

// Prototype methods
GOffsetAction.prototype.getId = function () {
        return a.ID;
      }

GOffsetAction.prototype.getTitle = function () {
        return a.TITLE;
      }

GOffsetAction.prototype.getGroup = function () {
        return "structure/modify";
      }

GOffsetAction.prototype.getShortcut = function () {
        return null;
      }

GOffsetAction.prototype.getIcon = function () {
        return gDesigner.isTouchEnabled() ? "gravit-icon-expand-shrink" : null;
      }

GOffsetAction.prototype._dialogPromptMessage = function () {
        return o.GLocale.get(
          new o.GLocaleKey("GOffsetAction", "text.dialog-prompt-message")
        );
      }

GOffsetAction.prototype._makeOffsetter = function (e, t) {
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
      }

GOffsetAction.prototype._dialogAlertMessage = function () {
        return o.GLocale.get(
          new o.GLocaleKey("GOffsetAction", "text.invalid-value")
        );
      }

GOffsetAction.prototype.toString = function () {
        return "[Object GOffsetAction]";
      }


module.exports = GOffsetAction;
