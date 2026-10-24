/**
 * Webpack Module #733
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    const { GObject: o, GEventTarget: i, GEvent: a } = n(1);
    function r() {}
    o.inheritAndMix(r, o, [i]),
      (r.prototype._role = null),
      (r.prototype.setRole = function (e) {
        (this._role = e),
          this.hasEventListeners(r.RoleChangedEvent) &&
            this.trigger(new r.RoleChangedEvent(e, this));
      }),
      (r.prototype.getRole = function () {
        return this._role;
      }),
      (r.RoleChangedEvent = function (e, t) {
        (this.role = e), (this.target = t);
      }),
      o.inherit(r.RoleChangedEvent, a),
      (e.exports = r);
  }