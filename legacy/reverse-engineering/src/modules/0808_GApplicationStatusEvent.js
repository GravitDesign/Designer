/**
 * Webpack Module #808
 * Type: class
 * Name: GApplicationStatusEvent
 */

function (e, t, n) {
    "use strict";
    n(3);
    var o = n(1);
    function i(e) {
      this.status = e;
    }
    o.GObject.inherit(i, o.GEvent),
      (i.Status = { Init: 0, Ready: 1 }),
      (i.prototype.status = null),
      (i.prototype.toString = function () {
        return "[Object GApplicationStatusEvent]";
      }),
      (e.exports = i);
  }