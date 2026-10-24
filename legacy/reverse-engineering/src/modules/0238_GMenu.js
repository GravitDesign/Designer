/**
 * Webpack Module #238
 * Type: class
 * Name: GMenu
 */

function (e, t, n) {
    "use strict";
    n(3), n(4), n(13);
    var o = n(1),
      i = n(40),
      a = n(1156),
      r = n(444),
      s = n(339),
      l = n(1157),
      c = n(804),
      d = n(31);
    function u(e, t) {
      (this._parent = e),
        (this._htmlElement = $("<ul></ul>").addClass("g-menu")),
        this._htmlElement.on("mouseover", this._mouseOver.bind(this)),
        this._htmlElement.on("mouseout", this._mouseOut.bind(this));
      const n = (e) => {
          e.cancelable ||
            (e.stopImmediatePropagation(),
            "touchmove" === e.type && this.closeMenus(!0));
        },
        o = !!(0, i.isPassiveSupported)() && { capture: !1, passive: !0 };
      this._htmlElement[0].addEventListener("touchstart", n, o),
        this._htmlElement[0].addEventListener("touchmove", n, o),
        this._htmlElement[0].addEventListener("touchend", n, o),
        t && this._htmlElement.addClass(t);
    }
    o.GObject.inherit(u, o.GEventTarget),
      (u.prototype._parent = null),
      (u.prototype._htmlElement = null),
      (u.prototype._items = null),
      (u.prototype._hovered = !1),
      (u.prototype._tooltipType = null),
      (u.prototype._rangeLeftX = null),
      (u.prototype._rangeLeftY = null),
      (u.prototype._rangeRightX = null),
      (u.prototype._rangeRightY = null),
      (u.prototype.getParent = function () {
        return this._parent;
      }),
      (u.prototype.setTooltipType = function (e) {
        if (e && "string" == typeof e) return (this._tooltipType = e), this;
      }),
      (u.prototype.isHovered = function (e) {
        if (this._hovered) return !0;
        if (e) {
          for (var t = 0; t < this.getItemCount(); ++t) {
            var n = this.getItem(t);
            if (
              n instanceof s &&
              n.getType() === s.Type.Menu &&
              n.getMenu().isHovered(!0)
            )
              return !0;
          }
          return !1;
        }
        return !1;
      }),
      (u.prototype.createMenuItem = function (e) {
        return e ? new s(s.Type.Menu, u) : new s();
      }),
      (u.prototype.createDivider = function () {
        return new s(s.Type.Divider);
      }),
      (u.prototype.setActiveItem = function (e) {
        let t = this.getActiveItem();
        t && t.changeActiveState(!1), e.changeActiveState(!0);
      }),
      (u.prototype.getActiveItem = function () {
        let e = null;
        for (let n = 0; n < this._items.length; n++) {
          var t = this._items[n];
          if (t.isActive()) {
            e = t;
            break;
          }
        }
        return e;
      }),
      (u.prototype.isRootMenu = function () {
        return !(this._parent && this._parent instanceof s);
      }),
      (u.prototype.isSubMenu = function () {
        return (
          !!(this._parent && this._parent instanceof s) &&
          !this._parent.isRootItem()
        );
      }),
      (u.prototype.createAddDivider = function () {
        return this.createInsertDivider(this.getItemCount());
      }),
      (u.prototype.createInsertDivider = function (e) {
        var t = new s(s.Type.Divider);
        return this.insertItem(e, t), t;
      }),
      (u.prototype.createAddItem = function (e, t, n, o, i) {
        return this.createInsertItem(this.getItemCount(), e, t, n, o, i);
      }),
      (u.prototype.createInsertItem = function (e, t, n, o, i, a) {
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
      }),
      (u.prototype.addItem = function (e) {
        return this.insertItem(this.getItemCount(), e);
      }),
      (u.prototype.insertItem = function (e, t) {
        null == this._items && (this._items = []),
          e + 1 < this._items.length
            ? (this._items.splice(e, 0, t),
              this._items[e + 1]._htmlElement.before(t._htmlElement))
            : (this._items.push(t), this._htmlElement.append(t._htmlElement)),
          (t._parent = this);
      }),
      (u.prototype.removeItem = function (e) {
        e >= 0 &&
          e < this.getItemCount() &&
          ((this._items[e]._parent = null),
          this._items[e]._htmlElement.detach(),
          this._items.splice(e, 1));
      }),
      (u.prototype.clearItems = function () {
        if (this._items) {
          for (var e = 0; e < this._items.length; ++e)
            (this._items[e]._parent = null),
              this._items[e]._htmlElement.detach();
          this._items = [];
        }
      }),
      (u.prototype.getItem = function (e) {
        return e >= 0 && e < this.getItemCount() ? this._items[e] : null;
      }),
      (u.prototype.getItemCount = function () {
        return this._items ? this._items.length : 0;
      }),
      (u.prototype.indexOf = function (e) {
        return this._items ? this._items.indexOf(e) : -1;
      }),
      (u.prototype.findItem = function (e) {
        for (var t = 0; t < this.getItemCount(); ++t) {
          var n = this.getItem(t);
          if (e == n.getCaption()) return n;
        }
        return null;
      }),
      (u.prototype.update = function () {
        for (var e = 0; e < this.getItemCount(); ++e) {
          this.getItem(e).update();
        }
      }),
      (u.prototype.isOpen = function () {
        return !!this._htmlElement.parent().length;
      }),
      (u.prototype.open = function (e, t, n, o) {
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
      }),
      (u.prototype.close = function () {
        this.isOpen() &&
          this._htmlElement.parent().is("body") &&
          (this.closeMenus(!0),
          this._htmlElement.removeClass(
            "g-menu-left g-menu-right g-menu-top g-menu-bottom"
          ),
          this._htmlElement.detach(),
          this === l._activeMenu && l.setActiveMenu(null, !0),
          this.trigger(a.EVENT));
      }),
      (u.prototype.setTouchMode = function (e) {
        this._htmlElement.toggleClass("g-touch", !!e);
      }),
      (u.prototype.closeMenus = function () {
        let e = arguments.length > 0 && void 0 !== arguments[0] && arguments[0];
        for (var t = 0; t < this.getItemCount(); ++t) {
          var n = this.getItem(t);
          n instanceof s &&
            n.getType() === s.Type.Menu &&
            (!n.isForcedAsOpened() || e) &&
            n.getMenu().close();
        }
      }),
      (u.prototype._mouseOver = function (e) {
        this._hovered = !0;
      }),
      (u.prototype._mouseOut = function (e) {
        (this._hovered = !1),
          this.isSubMenu() &&
            setTimeout(
              function () {
                this.isHovered(!0) || this.closeMenus();
              }.bind(this),
              150
            );
      }),
      (u.prototype.getHtmlElement = function () {
        return this._htmlElement;
      }),
      (u.prototype.detach = function () {
        this.closeMenus(!0),
          this._htmlElement.find(".g-hover").removeClass("g-hover"),
          this._htmlElement.removeClass("g-menu-root"),
          this._htmlElement.detach(),
          (this._parent = null);
      }),
      (u.prototype.addClass = function (e) {
        this._htmlElement.addClass(e);
      }),
      (u.prototype.setActiveRangeSize = function (e, t, n, o) {
        (this._rangeLeftX = e),
          (this._rangeLeftY = t),
          (this._rangeRightX = this._rangeLeftX + o),
          (this._rangeRightY = this._rangeLeftY + n);
      }),
      (u.prototype.toString = function () {
        return "[Object GMenu]";
      }),
      (u.prototype.setEnabled = function (e) {
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
      }),
      (e.exports = u);
  }