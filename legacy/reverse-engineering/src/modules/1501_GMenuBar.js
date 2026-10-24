/**
 * Webpack Module #1501
 * Type: class
 * Name: GMenuBar
 */

function (e, t, n) {
    "use strict";
    n(3);
    var o = n(238),
      i = n(339),
      a = n(1157);
    function r(e) {
      (this._htmlElement = $("<nav></nav>").addClass("g-menu-bar")),
        this.setMenu(e || new o(this));
    }
    (r.prototype._menu = null),
      (r.prototype.getMenu = function () {
        return this._menu;
      }),
      (r.prototype.isActive = function () {
        var e = a.getActiveMenu();
        return (
          !!(e && e._parent && e._parent instanceof i) &&
          e._parent.getMenuBar() === this
        );
      }),
      (r.prototype.getParent = function () {
        return null;
      }),
      (r.prototype.setMenu = function (e) {
        e.detach(),
          (this._menu = e),
          (this._menu._parent = this),
          this._menu._htmlElement.addClass("g-menu-root"),
          this._htmlElement.append(this._menu._htmlElement),
          e.update();
      }),
      (r.prototype.toString = function () {
        return "[Object GMenuBar]";
      }),
      (e.exports = r);
  }