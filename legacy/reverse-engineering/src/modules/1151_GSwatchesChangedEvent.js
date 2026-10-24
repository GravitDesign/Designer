/**
 * Webpack Module #1151
 * Type: class
 * Name: GSwatchesChangedEvent
 */

function (e, t, n) {
    "use strict";
    n(3);
    var o = n(1);
    function i(e) {
      this.scope = e;
    }
    o.GObject.inherit(i, o.GEvent),
      (i.prototype.scope = null),
      (i.prototype.toString = function () {
        return "[Object GSwatchesChangedEvent]";
      }),
      (e.exports = i);
  }