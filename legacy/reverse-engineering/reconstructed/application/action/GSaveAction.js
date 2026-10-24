/**
     * Action saving a document
     * @class GSaveAction
     * @extends GAction
     * @constructor
     */

function GSaveAction() {
  // Constructor (reconstructed)
}

// Prototype methods
GSaveAction.prototype._saveToCloud = function (e, t) {
        return gDesigner.executeAction(
          p.ID + ".save-as",
          [
            e,
            (n) => {
              n === g.Loaded
                ? gDesigner.removeDocument(e, null, !0)
                : n === g.Saved
                ? t && t({ documentStatus: g.Saved })
                : n === g.SaveCancelled &&
                  t &&
                  t({ documentStatus: g.SaveCancelled });
            },
          ],
          undefined,
          !0
        );
      }

GSaveAction.prototype.getTooltipConfig = function (e) {
        return (e && w.TOOLTIP_CONFIG[e]) || null;
      }

/**
     * @override
     */
    GSaveAction.prototype.isEnabled = function () {
        var document = gApp.getActiveDocument();
        return document && document.isSaveable();
    };

    /**
     * @override
     */
    GSaveAction.prototype.execute = function () {
        gApp.getActiveDocument().save();
    };

    /** @override */
GSaveAction.prototype.toString = function () {
        return "[Object GSaveAction]";
      }

module.exports = GSaveAction;
