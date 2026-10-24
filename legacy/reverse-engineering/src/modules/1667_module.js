/**
 * Webpack Module #1667
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(1);
    function i(e, t) {
      (this._builder = e), (this._onClose = t);
    }
    o.GObject.inherit(i, o.GEventTarget),
      (i.prototype.build = function () {
        return this._builder();
      }),
      (i.prototype.close = function () {
        this.hasEventListeners(i.Event) &&
          this.trigger(new i.Event(i.Event.Type.Close)),
          this._onClose && this._onClose();
      }),
      (i.Event = function (e) {
        this.type = e;
      }),
      o.GObject.inherit(i.Event, o.GEvent),
      (i.Event.Type = { Close: 0 }),
      (e.exports = i);
  }