/**
 * Webpack Module #393
 * Type: class
 * Name: GCollaborationEvent
 */

function (e, t, n) {
    "use strict";
    n(3);
    const { GEvent: o, GObject: i } = n(1);
    function a(e, t) {
      (this.type = e), (this.data = t);
    }
    i.inherit(a, o),
      (a.prototype.type = null),
      (a.prototype.data = null),
      (a.Type = {
        AnnotationsUpdate: 0,
        ShareUpdate: 10,
        UserUpdate: 20,
        LockRequest: 30,
        LockUpdated: 31,
        FileUpdate: 40,
        FileAutoSave: 41,
        ReviewStatusChanged: 50,
      }),
      (a.prototype.toString = function () {
        return "[Object GCollaborationEvent]";
      }),
      (e.exports = a);
  }