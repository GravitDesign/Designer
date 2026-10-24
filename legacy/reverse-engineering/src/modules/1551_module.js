/**
 * Webpack Module #1551
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(8);
    const o = n(75),
      i = n(0),
      a = n(1174);
    function r() {}
    i.inherit(r, o),
      (r.prototype.render = async function (e, t) {
        throw "Not implemented!";
      }),
      (r.prototype._triggerEvent = async function (e, t) {
        this.hasEventListeners(a) && this.trigger(new a(e, t));
      }),
      (e.exports = r);
  }