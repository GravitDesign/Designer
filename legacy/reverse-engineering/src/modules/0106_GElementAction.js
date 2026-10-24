/**
 * Webpack Module #106
 * Type: class
 * Name: GElementAction
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    n(3);
    var i = n(1),
      a = o(n(31)),
      r = o(n(567)),
      s = o(n(10));
    function l() {}
    i.GObject.inherit(l, a.default),
      (l.prototype.isEnabled = function () {
        return (
          !s.default ||
          gDesigner.getRightSidebars().getActiveSidebar() !== r.default.ID
        );
      }),
      (l.prototype.toString = function () {
        return "[Object GElementAction]";
      }),
      (e.exports = l);
  }