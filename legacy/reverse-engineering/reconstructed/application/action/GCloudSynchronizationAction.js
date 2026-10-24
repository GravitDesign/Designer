/**
 * GCloudSynchronizationAction
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GCloudSynchronizationAction() {
  // Constructor (reconstructed)
}

// Prototype methods
GCloudSynchronizationAction.prototype.statsValue = function () {
        return gDesigner.getActiveDocument().isCloudSyncOn()
          ? f.ID + ".unsync-from-cloud"
          : f.ID + ".sync-to-cloud";
      }

GCloudSynchronizationAction.prototype.execute = function (e) {
        (e = e || gDesigner.getActiveDocument()) &&
          (e.hasCloudReference()
            ? this._toggleCloudSync(e)
            : this._performCloudSync(e));
      }

GCloudSynchronizationAction.prototype.toString = function () {
        return "[Object GCloudSynchronizationAction]";
      }

module.exports = GCloudSynchronizationAction;
