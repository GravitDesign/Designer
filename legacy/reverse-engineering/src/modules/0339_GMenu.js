/**
 * Webpack Module #339
 * Type: class
 * Name: GMenu
 */

function (e, t, n) {
    "use strict";
    n(30), n(3), n(4), n(13);
    var o = n(1),
      i = n(15),
      a = n(67),
      r = n(1499),
      s = n(1156),
      l = n(444),
      c = n(1157),
      d = n(804);
    function u(e, t, n, o) {
      (this._htmlElement = $("<li></li>").addClass("g-menu-item")),
        (this._category = e || u.Type.Item),
        (this._componentId = n || null),
        (this._pro = !1),
        (this._visible = !0),
        (this._feature = null),
        (this._detachBound = this._detach.bind(this)),
        this._category === u.Type.Divider
          ? ((this._isVisible = o),
            this._htmlElement.addClass("g-menu-item-divider"))
          : (this._htmlElement
              .append(
                $("<span></span>")
                  .addClass("g-menu-item-icon")
                  .css("display", "none")
              )
              .append($("<span></span>").addClass("g-menu-item-caption"))
              .append($("<span></span>").addClass("g-menu-item-info"))
              .append(
                $("<span></span>")
                  .addClass("g-menu-item-shortcut")
                  .css("display", "none")
              )
              .append(
                $("<span></span>")
                  .addClass("g-menu-item-detach")
                  .addClass("gravit-icon-detach")
                  .css("display", "none")
              )
              .append($("<span></span>").addClass("g-menu-item-tail")),
            this._category === u.Type.Menu &&
              (this._htmlElement.addClass("g-menu-item-menu"),
              this.setMenu(new t(this)))),
        this._htmlElement.on("mouseover", this._mouseOver.bind(this)),
        this._htmlElement.on("mouseout", this._mouseOut.bind(this)),
        this._htmlElement.on("mousedown", this._mouseDown.bind(this)),
        this._htmlElement.on("mouseup", this._mouseUp.bind(this));
    }
    o.GObject.inherit(u, o.GEventTarget),
      (u.Type = { Item: 0, Menu: 1, Divider: 2 }),
      (u.EnterEvent = function () {}),
      o.GObject.inherit(u.EnterEvent, o.GEvent),
      (u.EnterEvent.prototype.toString = function () {
        return "[Object GMenuItem.EnterEvent]";
      }),
      (u.ENTER_EVENT = new u.EnterEvent()),
      (u.LeaveEvent = function () {}),
      o.GObject.inherit(u.LeaveEvent, o.GEvent),
      (u.LeaveEvent.prototype.toString = function () {
        return "[Object GMenuItem.LeaveEvent]";
      }),
      (u.LEAVE_EVENT = new u.LeaveEvent()),
      (u.ActivateEvent = function () {}),
      o.GObject.inherit(u.ActivateEvent, o.GEvent),
      (u.ActivateEvent.prototype.toString = function () {
        return "[Object GMenuItem.ActivateEvent]";
      }),
      (u.ACTIVATE_EVENT = new u.ActivateEvent()),
      (u.BeforeActivateEvent = function () {}),
      o.GObject.inherit(u.BeforeActivateEvent, o.GEvent),
      (u.BeforeActivateEvent.prototype.toString = function () {
        return "[Object GMenuItem.BeforeActivateEvent]";
      }),
      (u.BEFORE_ACTIVATE_EVENT = new u.BeforeActivateEvent()),
      (u.UpdateEvent = function () {}),
      o.GObject.inherit(u.UpdateEvent, o.GEvent),
      (u.UpdateEvent.prototype.toString = function () {
        return "[Object GMenuItem.UpdateEvent]";
      }),
      (u.UPDATE_EVENT = new u.UpdateEvent()),
      (u.DetachEvent = function () {}),
      o.GObject.inherit(u.DetachEvent, o.GEvent),
      (u.DetachEvent.prototype.toString = function () {
        return "[Object GMenuItem.DetachEvent]";
      }),
      (u.prototype._parent = null),
      (u.prototype._category = null),
      (u.prototype._menu = null),
      (u.prototype._icon = null),
      (u.prototype._forcedAsOpened = !1),
      (u.prototype._caption = null),
      (u.prototype._shortcutHint = null),
      (u.prototype._action = null),
      (u.prototype._data = null),
      (u.prototype._noHover = !1),
      (u.prototype._pro = !1),
      (u.prototype._visible = !0),
      (u.prototype._feature = null),
      (u.prototype._info = null),
      (u.prototype._uuid = null),
      (u.prototype._detached = !1),
      (u.prototype._detachBound = null),
      (u.prototype._isVisible = null),
      (u.prototype._proFeatureInterruption = !0),
      (u.prototype.getUUID = function () {
        return this._uuid || (this._uuid = o.GUtil.uuid()), this._uuid;
      }),
      (u.prototype.getParent = function () {
        return this._parent;
      }),
      (u.prototype.getType = function () {
        return this._category;
      }),
      (u.prototype.getIcon = function () {
        return this._icon;
      }),
      (u.prototype.isForcedAsOpened = function () {
        return this._forcedAsOpened;
      }),
      (u.prototype.setPro = function (e, t) {
        (this._pro = !!e),
          (this._feature = t),
          this._htmlElement.gPro({ pro: this._pro, feature: t });
        let n = !1;
        const o = gDesigner.getLicense(),
          i = o.isLegacy() && gDesigner.isLegacyFeature(t),
          r = !i && (o.isFree() || gDesigner.isAnonymous() || o.isExpired());
        if ((this._pro && (n = o.isTrial() && !i), (!n && !r) || !this._action))
          return;
        let s = this._action.getTooltipConfig(this._action.getTooltipArea());
        s &&
          this._htmlElement.gRichTooltip(
            a.GRichTooltipConfig.from(
              Object.assign({}, s.getConfig(), {
                isPro:
                  !gDesigner.isEnabledProFeatures() ||
                  !(o.isPro() && !o.isExpired()),
              })
            )
          );
      }),
      (u.prototype.isPro = function () {
        return !!this._pro;
      }),
      (u.prototype.getFeature = function () {
        return this._feature;
      }),
      (u.prototype.setIcon = function (e) {
        if (e !== this._icon) {
          this._icon = e;
          var t = this._htmlElement.find(".g-menu-item-icon");
          t.empty(),
            this._icon
              ? ("string" == typeof this._icon
                  ? t.append($("<i></i>").addClass(e))
                  : t.append(this._icon),
                t.css("display", ""),
                this._htmlElement.addClass("has-icon"))
              : (t.css("display", "none"),
                this._htmlElement.removeClass("has-icon"));
        }
      }),
      (u.prototype.getCaption = function () {
        return this._caption;
      }),
      (u.prototype.setCaption = function (e) {
        if (e !== this._caption) {
          this._caption = e;
          var t = this._htmlElement.find(".g-menu-item-caption");
          t.empty(),
            !this._caption ||
            this._caption instanceof o.GLocaleKey ||
            "string" == typeof this._caption
              ? t.html(this._caption ? o.GLocale.get(this._caption) : "")
              : t.append(this._caption);
        }
      }),
      (u.prototype.getInfo = function () {
        return this._info;
      }),
      (u.prototype.setInfo = function (e) {
        if (e !== this._info) {
          this._info = e;
          const t = this._htmlElement.find(".g-menu-item-info").empty();
          this._htmlElement.css("display", this._info ? "" : "none"),
            this._info &&
              (this._info instanceof o.GLocaleKey ||
              "string" == typeof this._info
                ? t.text(this._info ? o.GLocale.get(this._info) : "")
                : t.append(this._info));
        }
      }),
      (u.prototype.getShortcutHint = function () {
        return this._shortcutHint;
      }),
      (u.prototype.setShortcutHint = function (e) {
        this._shortcutHint = e;
        var t = this._htmlElement.find(".g-menu-item-shortcut");
        this._shortcutHint && this._shortcutHint.length > 0
          ? (t.text(i.GKey.shortcutToString(e)),
            t.css("display", ""),
            this._htmlElement.addClass("has-shortcut"))
          : (t.empty(),
            t.css("display", "none"),
            this._htmlElement.removeClass("has-shortcut"));
      }),
      (u.prototype.getAction = function () {
        return this._action;
      }),
      (u.prototype.updateEnabled = function () {
        this._action && this.setEnabled(!!this._action.isEnabled());
      }),
      (u.prototype.setAction = function (e, t) {
        if (e !== this._action) {
          if (this._action) {
            let t = e.getShortcut();
            t && t === this.getShortcutHint() && this.setShortcutHint(null);
          }
          if (((this._action = e), this._action)) {
            let n = e.getShortcut();
            if (
              (n && this.setShortcutHint(n),
              this.setCaption(this._action.getTitle()),
              this.setInfo(this._action.getInfo()),
              this.setIcon(this._action.getIcon()),
              this.setEnabled(!0 === this._action.isEnabled()),
              this.setVisible(this._action.isVisible()),
              t)
            ) {
              let e = this._action.getTooltipConfig(t);
              e &&
                this.setTooltipConfig(
                  a.GRichTooltipConfig.from(
                    Object.assign({}, e.getConfig(), { side: !0 })
                  )
                );
            }
          }
        }
        this.setPro(
          this._action && this._action.isPro(),
          this._action && this._action.getId()
        );
      }),
      (u.prototype.isChecked = function () {
        return this._htmlElement.hasClass("g-menu-item-checked");
      }),
      (u.prototype.isCheckable = function () {
        return !!this._action && this._action.isCheckable();
      }),
      (u.prototype.setChecked = function (e) {
        e != this.isChecked() &&
          (e
            ? this._htmlElement.addClass("g-menu-item-checked")
            : this._htmlElement.removeClass("g-menu-item-checked"));
      }),
      (u.prototype.isEnabled = function () {
        return !this._htmlElement.hasClass("g-disabled");
      }),
      (u.prototype.setEnabled = function (e) {
        e != this.isEnabled() &&
          (e
            ? this._htmlElement.removeClass("g-disabled")
            : this._htmlElement.addClass("g-disabled"));
      }),
      (u.prototype.setDetachable = function (e) {
        const t = this._htmlElement
          .find(".g-menu-item-detach")
          .css("display", e ? "" : "none");
        e
          ? (t.on("click", this._detachBound),
            t[0].addEventListener(
              "mousedown",
              this._stopPropagationEventListener,
              !0
            ),
            t[0].addEventListener(
              "mouseup",
              this._stopPropagationEventListener,
              !0
            ))
          : (t.off("click", this._detachBound),
            t[0].removeEventListener(
              "mousedown",
              this._stopPropagationEventListener,
              !0
            ),
            t[0].removeEventListener(
              "mouseup",
              this._stopPropagationEventListener,
              !0
            ));
      }),
      (u.prototype._stopPropagationEventListener = function (e) {
        e.stopPropagation();
      }),
      (u.prototype._detach = function (e) {
        if (e.button == i.GMouseEvent.BUTTON_LEFT) {
          e.stopPropagation(), e.preventDefault(), (this._detached = !0);
          const t = this._parent;
          t && (t.removeItem(t.indexOf(this)), t.close()),
            this.hasEventListeners(u.DetachEvent) &&
              this.trigger(new u.DetachEvent());
        }
      }),
      (u.prototype.setVisible = function (e) {
        (this._visible = !!e),
          this._htmlElement.css("display", e ? "" : "none");
      }),
      (u.prototype.isVisible = function () {
        return this._visible;
      }),
      (u.prototype.getData = function () {
        return this._data;
      }),
      (u.prototype.setData = function (e) {
        this._data = e;
      }),
      (u.prototype.setNoHover = function (e) {
        this._noHover = e;
      }),
      (u.prototype.addClass = function (e) {
        this._htmlElement.addClass(e);
      }),
      (u.prototype.isRootItem = function () {
        return (
          this._parent &&
          "function" == typeof this._parent.toString &&
          "[Object GMenu]" === this._parent.toString() &&
          null != this._parent._parent &&
          !(this._parent._parent instanceof u)
        );
      }),
      (u.prototype.isRootMenuBarItem = function () {
        return (
          this.isRootItem() &&
          this._parent._parent &&
          "function" == typeof this._parent._parent.toString &&
          "[Object GMenuBar]" === this._parent._parent.toString()
        );
      }),
      (u.prototype.getMenuBar = function () {
        return this.isRootMenuBarItem() ? this._parent._parent : null;
      }),
      (u.prototype.getMenu = function () {
        return this._menu;
      }),
      (u.prototype.setMenu = function (e) {
        e &&
          e !== this._menu &&
          this._category === u.Type.Menu &&
          ((this._menu = e),
          (this._menu._parent = this),
          this._menu.addEventListener(d.EVENT, this._menuOpen.bind(this)),
          this._menu.addEventListener(s.EVENT, this._menuClose.bind(this)));
      }),
      (u.prototype.update = function () {
        this._action &&
          (this.setCaption(this._action.getTitle()),
          this.setEnabled(this._action.isEnabled()),
          this.setChecked(this._action.isChecked()),
          this.setPro(this._action.isPro(), this._action.getId()),
          this.setIcon(this._icon || this._action.getIcon()),
          this.setInfo(this._action.getInfo()),
          this.setVisible(this._action.isVisible())),
          this.getType() === u.Type.Divider &&
            this._isVisible &&
            this.setVisible(this._isVisible()),
          this.hasEventListeners(u.UpdateEvent) && this.trigger(u.UPDATE_EVENT);
      }),
      (u.prototype.activate = function () {
        let e = !1;
        const t = () => {
          let e,
            t = this.getParent();
          for (; t && ((e = t), t !== t.getParent()); ) t = t.getParent();
          return e;
        };
        if (
          (this.hasEventListeners(u.BeforeActivateEvent) &&
            this.trigger(u.BEFORE_ACTIVATE_EVENT),
          this._action &&
            this._action.isAvailable(this._componentId) &&
            this._action.isEnabled())
        ) {
          let i = t();
          var n = "execute";
          this._action.isPro() &&
            !gDesigner.isEnabledProFeatures(this._action.getId()) &&
            (n = "nonprotriespro"),
            this._action.execute(),
            (e = !0);
          var o = this._action.statsValue() || this._action.getId();
          i && "context" === i.__which
            ? gDesigner.stats("action_" + n + "_context", o)
            : i && "menubar" === i.__which
            ? gDesigner.stats("action_" + n + "_menu", o)
            : i && "assistantbar" === i.__which
            ? gDesigner.stats("action_" + n + "_assistantbar", o)
            : i && "touchmenu" === i.__which
            ? gDesigner.stats("action_" + n + "_touchmenu", o)
            : gDesigner.stats("action_" + n + "_toolbar", o);
        }
        if (this.isEnabled()) {
          if (
            this.isPro() &&
            this._proFeatureInterruption &&
            !gDesigner.isEnabledProFeatures(this._feature)
          ) {
            if (!e) {
              let e = t();
              e && "context" === e.__which
                ? gDesigner.stats(
                    "action_nonprotriespro_context",
                    this._feature
                  )
                : e && "menubar" === e.__which
                ? gDesigner.stats("action_nonprotriespro_menu", this._feature)
                : e && "assistantbar" === e.__which
                ? gDesigner.stats(
                    "action_nonprotriespro_assistantbar",
                    this._feature
                  )
                : e && "touchmenu" === e.__which
                ? gDesigner.stats(
                    "action_nonprotriespro_touchmenu",
                    this._feature
                  )
                : gDesigner.stats(
                    "action_nonprotriespro_toolbar",
                    this._feature
                  ),
                gDesigner.handlePROFeatureInterruption();
            }
            return !1;
          }
          this.hasEventListeners(u.ActivateEvent) &&
            this.trigger(u.ACTIVATE_EVENT),
            this._parent &&
              this._parent.hasEventListeners(r) &&
              this._parent.trigger(new r(this));
        }
      }),
      (u.prototype.setTooltipConfig = function (e) {
        this._htmlElement.gRichTooltip(e);
      }),
      (u.prototype.setProFeatureInterruption = function (e) {
        this._proFeatureInterruption = e;
      }),
      (u.prototype._mouseOver = function (e) {
        this._parent &&
          this._category === u.Type.Menu &&
          this._parent.getActiveItem() !== this &&
          !this.isRootItem() &&
          this._parent.closeMenus(!0),
          this._parent &&
            "function" == typeof this._parent.toString &&
            "[Object GMenu]" === this._parent.toString() &&
            !this.isRootItem() &&
            this._parent.closeMenus(),
          this.isEnabled() &&
            (this._category == u.Type.Menu &&
              o.GSystem.hardware === o.GSystem.Hardware.Desktop &&
              (!this.isRootItem() ||
                (this.isRootMenuBarItem() && this.getMenuBar().isActive())) &&
              this._openMenu(),
            this._category != u.Type.Divider &&
              (this._noHover || this._htmlElement.addClass("g-hover"),
              this.hasEventListeners(u.EnterEvent) &&
                this.trigger(u.ENTER_EVENT)));
      }),
      (u.prototype.isActive = function () {
        return this._htmlElement.hasClass("g-active");
      }),
      (u.prototype.changeActiveState = function (e) {
        e
          ? this._htmlElement.addClass("g-active")
          : this._htmlElement.removeClass("g-active");
      }),
      (u.prototype._mouseOut = function (e) {
        if (
          this._category === u.Type.Menu &&
          (this.isRootItem() ||
            o.GSystem.hardware !== o.GSystem.Hardware.Desktop)
        )
          return e.stopPropagation(), void e.preventDefault();
        this.isEnabled() &&
          this._category != u.Type.Divider &&
          (this._noHover || this._htmlElement.removeClass("g-hover"),
          this.hasEventListeners(u.LeaveEvent) && this.trigger(u.LEAVE_EVENT));
      }),
      (u.prototype._mouseDown = function (e) {
        e.cancelable &&
          (this.isEnabled()
            ? e.button == i.GMouseEvent.BUTTON_LEFT
              ? (e.stopPropagation(),
                e.preventDefault(),
                this._category === u.Type.Menu &&
                  (this._forcedAsOpened
                    ? (this.getMenu().close(), (this._forcedAsOpened = !1))
                    : (this._parent &&
                        (this._parent.closeMenus(!0),
                        this._parent.setActiveItem(this)),
                      this._openMenu(),
                      (this._forcedAsOpened = !0))))
              : (e.button,
                i.GMouseEvent.BUTTON_MIDDLE,
                e.stopPropagation(),
                e.preventDefault())
            : gDesigner.isTouchEnabled() &&
              e.button === i.GMouseEvent.BUTTON_LEFT &&
              e.stopPropagation());
      }),
      (u.prototype._mouseUp = function (e) {
        if (
          e.cancelable &&
          (e.stopPropagation(),
          e.preventDefault(),
          e.button != i.GMouseEvent.BUTTON_MIDDLE &&
            e.button != i.GMouseEvent.BUTTON_RIGHT &&
            !this._detached &&
            this._category !== u.Type.Menu)
        ) {
          if (
            (this.isRootMenuBarItem() || this._mouseOut(e),
            this._category == u.Type.Item)
          ) {
            let e = this.activate();
            this.isEnabled() && !1 !== e && c.triggerGlobalActivation(this);
          }
          this.isRootMenuBarItem() || c.setActiveMenu(null);
        }
      }),
      (u.prototype._openMenu = function () {
        this.getMenu().open(
          this._htmlElement,
          this.isRootItem() ? l.Position.Center : l.Position.Right_Bottom,
          this.isRootItem() ? l.Position.Right_Bottom : l.Position.Center
        );
      }),
      (u.prototype._menuOpen = function () {
        this._htmlElement.addClass("g-active"),
          this.isRootItem() &&
            this._parent._parent._htmlElement.addClass("g-active");
      }),
      (u.prototype._menuClose = function () {
        (this._forcedAsOpened = !1),
          this._htmlElement.removeClass("g-active"),
          this.isRootItem() &&
            this._parent._parent._htmlElement.removeClass("g-active");
      }),
      (u.prototype.toString = function () {
        return "[Object GMenuItem]";
      }),
      (e.exports = u);
  }