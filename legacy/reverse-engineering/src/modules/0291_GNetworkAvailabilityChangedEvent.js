/**
 * Webpack Module #291
 * Type: class
 * Name: GNetworkAvailabilityChangedEvent
 */

function (e, t, n) {
    "use strict";
    n(3);
    var o = n(1);
    function i(e) {
      this.connected = e;
    }
    o.GObject.inherit(i, o.GEvent),
      (i.prototype.connected = !1),
      (i.prototype.toString = function () {
        return "[Object GNetworkAvailabilityChangedEvent]";
      }),
      (e.exports = i);
  }