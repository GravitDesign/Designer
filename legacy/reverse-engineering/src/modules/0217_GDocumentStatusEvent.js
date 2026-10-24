/**
 * Webpack Module #217
 * Type: class
 * Name: GDocumentStatusEvent
 */

function (e, t, n) {
    "use strict";
    n(3);
    var o = n(1);
    function i(e, t) {
      (this.status = e), (this.data = t);
    }
    o.GObject.inherit(i, o.GEvent),
      (i.prototype.status = null),
      (i.prototype.data = null),
      (i.prototype.toString = function () {
        return "[Object GDocumentStatusEvent]";
      }),
      (e.exports = i);
  }