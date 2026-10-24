/**
 * Webpack Module #606
 * Type: class
 * Name: GPanel
 */

function (e, t, n) {
    "use strict";
    n(3);
    var o = n(1),
      i = n(394);
    function a() {
      i.call(this);
    }
    o.GObject.inherit(a, i),
      (a.prototype.init = function (e) {}),
      (a.prototype.activate = function () {}),
      (a.prototype.deactivate = function () {}),
      (a.prototype.isEnabled = function () {
        return !0;
      }),
      (a.prototype.toString = function () {
        return "[Object GPanel]";
      }),
      (e.exports = a);
  }