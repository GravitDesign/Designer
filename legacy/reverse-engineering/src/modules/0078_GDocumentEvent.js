/**
 * Webpack Module #78
 * Type: class
 * Name: GDocumentEvent
 */

function (e, t, n) {
    "use strict";
    n(3);
    var o = n(1);
    function i(e, t, n) {
      (this.type = e), (this.document = t), n && (this.data = n);
    }
    o.GObject.inherit(i, o.GEvent),
      (i.Type = {
        Added: 0,
        Removed: 1,
        Opened: 2,
        Deactivated: 10,
        Activated: 11,
        StorageItemUpdated: 12,
        Saving: 20,
        Modified: 23,
        SynchronismUpdated: 30,
        SynchronismUpdateFailed: 31,
        OwnerUpdated: 40,
        CloudSynchronismUpdated: 50,
        UpdateAvailable: 60,
        BeforeReload: 70,
        AutoSaveSynchronizing: 80,
        AutoSaveSynchronized: 81,
        AutoSaveSynchronizationFailed: 82,
        ContextMenuOpened: 90,
      }),
      (i.prototype.type = null),
      (i.prototype.document = null),
      (i.prototype.toString = function () {
        return "[Object GDocumentEvent]";
      }),
      (e.exports = i);
  }