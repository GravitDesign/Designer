/**
     * Action saving a document filed under a name
     * @class GSaveAsAction
     * @extends GAction
     * @constructor
     */

function GSaveAsAction() {
  // Constructor (reconstructed)
}

// Prototype methods
/**
     * @override
     */
    GSaveAsAction.prototype.getShortcut = function () {
        return [IFKey.Constant.SHIFT, IFKey.Constant.META, 'S'];
    };

    /**
     * @override
     */
    GSaveAsAction.prototype.isEnabled = function () {
        return !!this._getViableStorage() && !!gApp.getActiveDocument();
    };

    /**
     * @override
     */
GSaveAsAction.prototype.execute = function (e, t, n) {
        let o =
            arguments.length > 3 && undefined !== arguments[3]
              ? arguments[3]
              : w.DEFAULT_SAVE_OPTIONS,
          i = arguments.length > 4 ? arguments[4] : undefined;
        const a = t || gDesigner.getActiveDocument();
        if (a && a.isCommercialProductFile())
          return a.openPaywall(this.getId()), !1;
        new f(
          () => {
            this._performSave(e, a, n, o, i);
          },
          () => {
            gDesigner.stats("action_cancelled_anonymous", this.getId());
          }
        );
      }

GSaveAsAction.prototype._showError = function (e) {
        e && y.error(e, { showTitle: !1 });
      }

GSaveAsAction.prototype._getFileTypes = function () {
        return [{ ext: this._fileExt, mime: this._mime }];
      }

GSaveAsAction.prototype._updateSaveOptions = function (e) {
        return e;
      }

/** @override */
GSaveAsAction.prototype.toString = function () {
        return "[Object GSaveAsAction]";
      }

module.exports = GSaveAsAction;
