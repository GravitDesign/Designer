/**
     * A menu implementation
     * @param {GMenuItem|GMenuBar} parent parent if not a standalone menu
     * @class GMenu
     * @extends GEventTarget
     * @constructor
     * @version 1.0
     */

function GMenu() {
  // Constructor (reconstructed)
}

// Prototype methods
/**
     * Creates and appends a divider and returns it
     * @returns {GMenuItem}
     */
    GMenu.prototype.createAddDivider = function () {
        return this.createInsertDivider(this.getItemCount());
    };

    /**
     * Creates and inserts a divider and returns it
     * @param index
     * @returns {GMenuItem}
     */
GMenu.prototype.createInsertDivider = function (index) {
        var t = new s(s.Type.Divider);
        return this.insertItem(e, t), t;
      }

/**
     * Creates and appends a menu item and returns it
     * @param caption
     * @param activate
     * @param enter
     * @param leave
     * @returns {GMenuItem}
     */
GMenu.prototype.createAddItem = function (caption, activate, enter, leave) {
        return this.createInsertItem(this.getItemCount(), e, t, n, o, i);
      }

/**
     * Creates and inserts a menu item and returns it
     * @param index
     * @param caption
     * @param activate
     * @param enter
     * @param leave
     * @returns {GMenuItem}
     */
GMenu.prototype.createInsertItem = function (index, caption, activate, enter, leave) {
        var r = new s(null, null, a);
        return (
          t instanceof d
            ? r.setAction(t, this._tooltipType)
            : (r.setCaption(t),
              n && r.addEventListener(s.ActivateEvent, n),
              o && r.addEventListener(s.EnterEvent, o),
              i && r.addEventListener(s.LeaveEvent, i)),
          this.insertItem(e, r),
          r
        );
      }

/**
     * Add a menu item to this menu
     * @param {GMenuItem} item
     * @returns {Number} index of newly inserted item
     * @version 1.0
     */
GMenu.prototype.addItem = function (item) {
        return this.insertItem(this.getItemCount(), e);
      }

/**
     * Insert a menu item into this menu
     * @param {Number} index the index to insert before, if equal
     * to length, inserts at end
     * @param {GMenuItem} item
     * @returns {Number} index of newly inserted item
     * @version 1.0
     */
GMenu.prototype.insertItem = function (index, item) {
        null == this._items && (this._items = []),
          e + 1 < this._items.length
            ? (this._items.splice(e, 0, t),
              this._items[e + 1]._htmlElement.before(t._htmlElement))
            : (this._items.push(t), this._htmlElement.append(t._htmlElement)),
          (t._parent = this);
      }

/**
     * Remove an item at a given index
     * @param {Number} index
     * @version 1.0
     */
GMenu.prototype.removeItem = function (index) {
        e >= 0 &&
          e < this.getItemCount() &&
          ((this._items[e]._parent = null),
          this._items[e]._htmlElement.detach(),
          this._items.splice(e, 1));
      }

/**
     * Remove an item at a given index
     * @param {Number} index
     * @version 1.0
     */
    GMenu.prototype.removeItem = function (index) {
        if (index >= 0 && index < this.getItemCount()) {
            this._items[index]._parent = null;
            this._items[index]._htmlElement.detach();
            this._items.splice(index, 1);
        }
    };

    /**
     * Removes all items of this menu
     */
GMenu.prototype.clearItems = function () {
        if (this._items) {
          for (var e = 0; e < this._items.length; ++e)
            (this._items[e]._parent = null),
              this._items[e]._htmlElement.detach();
          this._items = [];
        }
      }

/**
     * Get a menu item by it's index
     * @param {Number} index the index to look for
     * @return {GMenuItem} the menu item or null if index is invalid
     */
GMenu.prototype.getItem = function (index) {
        return e >= 0 && e < this.getItemCount() ? this._items[e] : null;
      }

/**
     * Get a menu item by it's index
     * @param {Number} index the index to look for
     * @return {GMenuItem} the menu item or null if index is invalid
     */
    GMenu.prototype.getItem = function (index) {
        if (index >= 0 && index < this.getItemCount()) {
            return this._items[index];
        }
        return null;
    };

    /**
     * @returns {Number} the number of items in this menu
     * @version 1.0
     */
GMenu.prototype.getItemCount = function () {
        return this._items ? this._items.length : 0;
      }

/**
     * @returns {Number} the number of items in this menu
     * @version 1.0
     */
    GMenu.prototype.getItemCount = function () {
        return this._items ? this._items.length : 0;
    };

    /**
     * Get the index for an item
     * @param {GMenuItem} item the item to get an index for
     * @return {Number} index of the item or -1 if not found
     * @version 1.0
     */
GMenu.prototype.indexOf = function (item) {
        return this._items ? this._items.indexOf(e) : -1;
      }

/**
     * Get the index for an item
     * @param {GMenuItem} item the item to get an index for
     * @return {Number} index of the item or -1 if not found
     * @version 1.0
     */
    GMenu.prototype.indexOf = function (item) {
        return this._items ? this._items.indexOf(item) : -1;
    };

    /**
     * Find a menu item by its caption
     * @param {String} caption the caption to find
     * @return {GMenuItem} the menu item or null if not found
     */
GMenu.prototype.findItem = function (caption) {
        for (var t = 0; t < this.getItemCount(); ++t) {
          var n = this.getItem(t);
          if (e == n.getCaption()) return n;
        }
        return null;
      }

/**
     * Called to update the status of all direct children of this menu
     * @version 1.0
     */
GMenu.prototype.update = function () {
        for (var e = 0; e < this.getItemCount(); ++e) {
          this.getItem(e).update();
        }
      }

/**
     * Called to update the status of all direct children of this menu
     * @version 1.0
     */
    GMenu.prototype.update = function () {
        for (var i = 0; i < this.getItemCount(); ++i) {
            var item = this.getItem(i);
            item.update();
        }
    };

    /**
     * Returns whether this menu is open or not
     * @return {Boolean}
     */
GMenu.prototype.isOpen = function () {
        return !!this._htmlElement.parent().length;
      }

/**
     * Open the menu at a given reference which can be
     * either an absolute point or a jquery html element
     * @param {JQuery|{{x: Number, y: Number}}} reference the reference element or point to open at
     * @param {GMenu.Position|Number} horzPosition the horizontal position to open at
     * @param {GMenu.Position|Number} vertPosition the vertical position to open at
     */
GMenu.prototype.open = function (reference, horzPosition, vertPosition) {
        (t = "number" == typeof t ? t : r.Position.Center),
          (n = "number" == typeof n ? n : r.Position.Center);
        const i = e && "number" == typeof e.x && "number" == typeof e.y,
          a = this._htmlElement.hasClass("g-touch"),
          s = !i && $(e).hasClass("g-menu-button");
        if (
          (this._htmlElement.toggleClass("g-menu-button", !!s),
          this.isOpen() ||
            (this.update(),
            this._htmlElement.appendTo($("body")),
            this.isSubMenu() || l.setActiveMenu(this, !1, o),
            this.trigger(c.EVENT)),
          this._htmlElement.parent().is("body"))
        ) {
          var d = this._htmlElement.outerWidth(),
            u = this._htmlElement.outerHeight(),
            p = $(window).width(),
            g = $(window).height(),
            h = { x: 0, y: 0, width: 0, height: 0 };
          if (i) (h.x = e.x), (h.y = e.y);
          else {
            var f = $(e),
              m = f.offset();
            (h.x = m.left),
              (h.y = m.top),
              (h.width = f.outerWidth()),
              (h.height = f.outerHeight());
          }
          var y = 0;
          switch (t) {
            case r.Position.Left_Top:
              (y = h.x - d) < 0 && (y = h.x + h.width);
              break;
            case r.Position.Center:
              y = h.x;
              break;
            case r.Position.Right_Bottom:
              (y = h.x + h.width) + d > p && (y = h.x - d);
          }
          var v = 0;
          switch (n) {
            case r.Position.Left_Top:
              (v = h.y - u) < 0 && (v = h.y + h.height);
              break;
            case r.Position.Center:
              v = h.y;
              break;
            case r.Position.Right_Bottom:
              (v = h.y + h.height) + u > g && (v = h.y - u);
          }
          const o = this._rangeLeftX ? this._rangeLeftX : 0;
          y < o && (y = o);
          const l = this._rangeRightX ? this._rangeRightX : p;
          y + d >= l && (y = l - d);
          const c = this._rangeLeftY ? this._rangeLeftY : 0;
          v < c && (v = c);
          const _ = this._rangeRightY ? this._rangeRightY : g;
          if (
            (v + u >= _ && (v = _ - u),
            this._htmlElement.find(".g-menu-arrow").remove(),
            a && s)
          ) {
            const e = $("<div/>")
              .addClass("g-menu-arrow")
              .prependTo(this._htmlElement);
            let t = h.width / 2 - 14;
            t < 0 && (y - 14 > 0 ? ((y -= 14), (t += 14)) : e.remove()),
              e.css("left", "".concat(t, "px"));
          }
          switch (
            (this._htmlElement.css("left", y),
            this._htmlElement.css("top", v),
            t)
          ) {
            case r.Position.Left_Top:
              this._htmlElement.addClass("g-menu-left");
              break;
            case r.Position.Right_Bottom:
              this._htmlElement.addClass("g-menu-right");
          }
          switch (n) {
            case r.Position.Left_Top:
              this._htmlElement.addClass("g-menu-top");
              break;
            case r.Position.Right_Bottom:
              this._htmlElement.addClass("g-menu-bottom");
          }
        }
      }

/**
     * Close the menu if it is opened and closeable
     */
GMenu.prototype.close = function () {
        this.isOpen() &&
          this._htmlElement.parent().is("body") &&
          (this.closeMenus(!0),
          this._htmlElement.removeClass(
            "g-menu-left g-menu-right g-menu-top g-menu-bottom"
          ),
          this._htmlElement.detach(),
          this === l._activeMenu && l.setActiveMenu(null, !0),
          this.trigger(a.EVENT));
      }

GMenu.prototype.setTouchMode = function (e) {
        this._htmlElement.toggleClass("g-touch", !!e);
      }

/**
     * Close all sub menus
     */
GMenu.prototype.closeMenus = function () {
        let e = arguments.length > 0 && undefined !== arguments[0] && arguments[0];
        for (var t = 0; t < this.getItemCount(); ++t) {
          var n = this.getItem(t);
          n instanceof s &&
            n.getType() === s.Type.Menu &&
            (!n.isForcedAsOpened() || e) &&
            n.getMenu().close();
        }
      }

GMenu.prototype._mouseOver = function (evt) {
        this._hovered = true;
      }

GMenu.prototype._mouseOut = function (evt) {
        (this._hovered = false),
          this.isSubMenu() &&
            setTimeout(
              function () {
                this.isHovered(!0) || this.closeMenus();
              }.bind(this),
              150
            );
      }

GMenu.prototype.getHtmlElement = function () {
        return this._htmlElement;
      }

GMenu.prototype.detach = function () {
        this.closeMenus(!0),
          this._htmlElement.find(".g-hover").removeClass("g-hover"),
          this._htmlElement.removeClass("g-menu-root"),
          this._htmlElement.detach(),
          (this._parent = null);
      }

GMenu.prototype.addClass = function (e) {
        this._htmlElement.addClass(e);
      }

GMenu.prototype.setActiveRangeSize = function (e, t, n, o) {
        (this._rangeLeftX = e),
          (this._rangeLeftY = t),
          (this._rangeRightX = this._rangeLeftX + o),
          (this._rangeRightY = this._rangeLeftY + n);
      }

GMenu.prototype.toString = function () {
        return "[Object GMenu]";
      }

GMenu.prototype.setEnabled = function (e) {
        ["file", "edit", "modify", "view"].forEach((t) => {
          $(
            '.g-menu-item-menu:contains("'.concat(
              o.GLocale.get(
                new o.GLocaleKey("GCategory", "category.".concat(t))
              ),
              '")'
            )
          )
            [e ? "removeClass" : "addClass"]("g-disabled")
            [e ? "on" : "off"]("click");
        });
      }

module.exports = GMenu;
