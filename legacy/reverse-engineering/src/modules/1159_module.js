/**
 * Webpack Module #1159
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(1);
    function i(e, t) {
      (this.type = e), (this.fileId = t);
    }
    o.GObject.inherit(i, o.GEvent),
      (i.Type = { Enable: 1, Disable: 0, Close: 2 }),
      (i.prototype.fileId = null),
      (i.prototype.type = null),
      (e.exports = i);
  }