/**
 * Webpack Module #1070
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(30);
    const { GObject: o } = n(1);
    class i {
      constructor(e) {
        Object.assign(this, e);
      }
    }
    o.inherit(i, o),
      (i.prototype.applyFrom = function (e) {
        Object.assign(this, e);
      }),
      (e.exports = i);
  }