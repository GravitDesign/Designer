/**
 * Webpack Module #1499
 * Type: class
 * Name: GMenuActivateEvent
 */

function (e, t, n) {
    "use strict";
    n(3);
    var o = n(1);
    function i(e) {
      this.item = e;
    }
    o.GObject.inherit(i, o.GEvent),
      (i.item = null),
      (i.prototype.toString = function () {
        return "[Object GMenuActivateEvent]";
      }),
      (i.EVENT = new i()),
      (e.exports = i);
  }