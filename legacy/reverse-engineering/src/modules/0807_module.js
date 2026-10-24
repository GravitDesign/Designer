/**
 * Webpack Module #807
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(3);
    var o = n(1);
    function i(e, t) {
      (this.type = e), (this.sidebar = t);
    }
    o.GObject.inherit(i, o.GEvent),
      (i.Type = {
        Deactivated: 10,
        Activated: 11,
        ChildAdded: 12,
        ChildRemoved: 14,
      }),
      (i.prototype.type = null),
      (i.prototype.sidebar = null),
      (i.prototype.toString = function () {
        return "[Object GSidebars.SidebarEvent]";
      }),
      (e.exports = i);
  }