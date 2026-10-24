/**
 * GGravitCloudAction
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GGravitCloudAction() {
  // Constructor (reconstructed)
}

// Prototype methods
GGravitCloudAction.prototype.execute = function (e, t, n) {
        const o = () =>
          new u(
            () => {
              this._executeAction(e, t, n);
            },
            () => {
              gDesigner.stats("action-cancelled_export", this._type);
            }
          );
        gDesigner.isOffline() ? p.openUnavailableFeature(o) : o();
      }

GGravitCloudAction.prototype._executeAction = function (e, t, n) {
        var o = this;
        if ("open" === this._type) {
          let e = { closable: !0, showCloudOptions: !0, openFromCloud: !0 };
          gDesigner.openNewDocumentDialog(e);
        } else if ("save" === this._type) {
          var i = gDesigner.getActiveDocument();
          if (i.isCommercialProductFile())
            return void i.openPaywall(this.getId());
          var a = i.getStorageItem();
          a && a instanceof c.Item
            ? d.performSave(
                i,
                () => {
                  t && t(l.Saved);
                },
                () => {
                  t && t(l.SaveFailed);
                }
              )
            : o._saveAs(!1, e, t);
        } else if ("new" === this._type) {
          let n = {
            closable: !0,
            cb: function () {
              o._saveAs(!0, e, t);
            },
          };
          gDesigner.openNewDocumentDialog(n);
        } else "save-as" === this._type && o._saveAs(!1, e, t, n);
      }

GGravitCloudAction.prototype.getIcon = function () {
        return gDesigner.getApplicationManager().isOpenFromCloudEnabled() &&
          this._type === g.Actions.Open
          ? gDesigner.isTouchEnabled()
            ? "gravit-icon-touch-file-open-cloud"
            : ""
          : gDesigner.getApplicationManager().isSavingAsEnabled() &&
            this._type === g.Actions.SaveAs
          ? gDesigner.isTouchEnabled()
            ? "gravit-icon-touch-file-save-as-cloud"
            : ""
          : undefined;
      }

GGravitCloudAction.prototype.toString = function () {
        return "[Object GGravitCloudAction]";
      }

module.exports = GGravitCloudAction;
