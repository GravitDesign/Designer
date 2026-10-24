/**
 * Webpack Module #394
 * Type: class
 * Name: GView
 */

function (e, t, n) {
    "use strict";
    n(3);
    var o = n(1);
    function i() {}
    o.GObject.inherit(i, o.GEventTarget),
      (i.UpdateEvent = function () {}),
      o.GObject.inherit(i.UpdateEvent, o.GEvent),
      (i.UpdateEvent.prototype.toString = function () {
        return "[Object GView.UpdateEvent]";
      }),
      (i.UPDATE_EVENT = new i.UpdateEvent()),
      (i.prototype.getId = function () {
        throw new Error("Not Supported");
      }),
      (i.prototype.getTitle = function () {
        throw new Error("Not Supported");
      }),
      (i.prototype.isEnabled = function () {
        return !0;
      }),
      (i.prototype.isVisible = function () {
        return !0;
      }),
      (i.prototype._fireUpdateEvent = function () {
        this.trigger(i.UPDATE_EVENT);
      }),
      (i.prototype.toString = function () {
        return "[Object GView]";
      }),
      (e.exports = i);
  }