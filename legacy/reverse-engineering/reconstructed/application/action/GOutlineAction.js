/**
 * GOutlineAction
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GOutlineAction() {
  // Constructor (reconstructed)
}

// Prototype methods
GOutlineAction.prototype._dialogPromptMessage = function () {
        return o.GLocale.get(
          new o.GLocaleKey("GOutlineAction", "text.dialog-prompt-message")
        );
      }

GOutlineAction.prototype._makeOffsetter = function (e, t) {
        var n;
        if (t.hasMixin(o.GStylable)) {
          var i = t.getPaintLayers();
          if (i) {
            var a = i.getBorderLayers(!0).pop();
            a && (n = a.$_blc);
          }
        }
        var r = e > 0 ? e : -e;
        return (
          t instanceof o.GPathBase && !t.isClockWise() && t.reverseOrder(),
          new o.GVertexOffsetter(t, r, !0, !0, 0, n)
        );
      }

GOutlineAction.prototype.toString = function () {
        return "[Object GOutlineAction]";
      }

module.exports = GOutlineAction;
