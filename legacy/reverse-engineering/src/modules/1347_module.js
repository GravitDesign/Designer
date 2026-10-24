/**
 * Webpack Module #1347
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(1);
    function i(e, t) {
      (this.type = e), (this.data = t);
    }
    o.GObject.inherit(i, o.GEvent),
      (i.Type = { OpenInAppLink: 1 }),
      (i.prototype.type = null),
      (i.prototype.data = null),
      (e.exports = i);
  }