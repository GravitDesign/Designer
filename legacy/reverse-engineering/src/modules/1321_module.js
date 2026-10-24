/**
 * Webpack Module #1321
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(30), n(3);
    var o = n(1);
    function i(e, t) {
      (this.notification = Object.assign(
        { popup: !1, annonymous: !1 },
        e || {}
      )),
        (this.builder = t);
    }
    o.GObject.inherit(i, o.GEvent),
      (i.prototype.notification = null),
      (i.prototype.toString = function () {
        return "GEvent [GNotificationEvent]";
      }),
      (e.exports = i);
  }