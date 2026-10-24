/**
 * Webpack Module #395
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(58), n(57), n(4), n(13), n(32), n(33);
    var o = n(1),
      i = n(15),
      a = n(394),
      r = n(135),
      s = n(863),
      { SidebarsIds: l } = n(198),
      c = n(807);
    function d(e, t, n) {
      (this._htmlElement = e),
        (this._orientation = t),
        (this._frame = n),
        (this._sidebarWidths = {}),
        (this._canResize = !1),
        (this._isResizing = !1);
    }
    o.GObject.inherit(d, o.GEventTarget),
      (d.Orientation = { Left: "left", Right: "right" }),
      (d.SidebarEvent = c),
      (d.prototype._htmlElement = null),
      (d.prototype._orientation = null),
      (d.prototype._sidebars = null),
      (d.prototype._activeSidebar = null),
      (d.prototype._activeTouchTool = null),
      (d.prototype._touchToolbar = null),
      (d.prototype._sidebarWidths = null),
      (d.prototype._sidebarsSelector = null),
      (d.prototype.getActiveSidebar = function () {
        return this._activeSidebar;
      }),
      (d.prototype.setActiveSidebar = function (e) {
        if ((e || this.setActiveTouchTool(null), e !== this._activeSidebar)) {
          if (e) {
            var t = this.getSidebar(e);
            if ((!t || !t.isVisible()) && ((e = null), this._activeSidebar)) {
              const e = this.getSidebar(this._activeSidebar);
              if (e && e.isVisible()) return;
            }
          }
          for (
            var n = this._activeSidebar, o = 0;
            o < this._sidebars.length;
            ++o
          ) {
            var i = this._sidebars[o],
              a = i.sidebar.getId();
            if (a === e) {
              (this._activeSidebar = a),
                i.container.css("display", ""),
                i.sidebar.activate(),
                this._sidebarWidths[a]
                  ? this._htmlElement.css(
                      "width",
                      this._sidebarWidths[a] + "px"
                    )
                  : this._htmlElement.css(
                      "width",
                      i.sidebar.getDefaultWidth() + "px"
                    ),
                this.relayout(),
                this.hasEventListeners(d.SidebarEvent) &&
                  this.trigger(
                    new d.SidebarEvent(d.SidebarEvent.Type.Activated, i.sidebar)
                  );
              const e = i.sidebar.getTouchTools();
              if (e) {
                const t =
                  e.find((e) => {
                    let { def: t } = e;
                    return !!t;
                  }) || e[0];
                t && this.setActiveTouchTool(t);
              }
            } else
              i.container.css("display", "none"),
                a === n &&
                  (i.sidebar.deactivate(),
                  (this._activeSidebar = e),
                  this.hasEventListeners(d.SidebarEvent) &&
                    this.trigger(
                      new d.SidebarEvent(
                        d.SidebarEvent.Type.Deactivated,
                        i.sidebar
                      )
                    ));
            this._updateBadge(i.sidebar);
          }
          this._htmlElement.find(".sidebar-option").removeClass("active"),
            this._htmlElement
              .find(".sidebar-option.sidebar-" + e)
              .addClass("active"),
            this._activeSidebar &&
              !this._getSidebarInfo(this._activeSidebar) &&
              this.setActiveSidebar(this._sidebars[0].sidebar.getId());
        }
      }),
      (d.prototype.setActiveTouchTool = function (e) {
        (this._activeTouchTool && e && this._activeTouchTool.id === e.id) ||
          (this._htmlElement.find("[g-touch-tool]").removeClass("g-active"),
          this._htmlElement.find(".sidebar-container").removeClass("g-active"),
          this._activeTouchTool && this._activeTouchTool.deactivate(),
          e
            ? (this._htmlElement
                .find(".sidebar-".concat(e.sidebar))
                .addClass("g-active"),
              this._htmlElement
                .find('[g-touch-tool="'.concat(e.id, '"]'))
                .addClass("g-active"),
              (this._activeTouchTool = e))
            : (this._activeTouchTool = null),
          this._activeTouchTool && this._activeTouchTool.activate());
      }),
      (d.prototype.showSidebar = function (e) {
        if (this.getSidebar(e) && this._activeSidebar !== e) {
          null === this._activeSidebar && this.setActiveSidebar(e);
          var t = this._htmlElement.find(".sidebar-option.sidebar-" + e);
          t.is(":hidden") && t.show();
        }
      }),
      (d.prototype.hideSidebar = function (e) {
        if (this.getActiveSidebar() === e) {
          for (var t = null, n = 0; n < this._sidebars.length && !t; ++n)
            if (this._sidebars[n].sidebar.getId() !== e) {
              var o = this._sidebars[n].sidebar.getId();
              this._htmlElement
                .find(".sidebar-option.sidebar-" + o)
                .is(":visible") && (t = o);
            }
          this.setActiveSidebar(t);
        }
        var i = this._htmlElement.find(".sidebar-option.sidebar-" + e);
        i.is(":visible") && i.hide();
      }),
      (d.prototype.setSidebarEnabled = function (e, t) {
        var n = this._getSidebarInfo(e);
        if (n)
          if (t)
            n.container.find(".g-disabled-overlay").remove(),
              n.container.removeClass("g-disabled");
          else {
            var o = n.container.find(".g-disabled-overlay");
            0 === o.length &&
              (o = $("<div></div>")
                .addClass("g-disabled-overlay")
                .appendTo(n.container)),
              n.container.addClass("g-disabled");
          }
      }),
      (d.prototype.init = function () {
        this._sidebars = [];
        var e = function (e, t) {
            t > 1 &&
              !this._sidebarsSelector &&
              ((this._sidebarsSelector = $("<div/>")
                .addClass("sidebar-selector")
                .css("display", "none")
                .appendTo(this._htmlElement)),
              this._htmlElement.css("width", e.getDefaultWidth() + "px")),
              this._sidebarsSelector &&
                $("<div/>")
                  .addClass("sidebar-option sidebar-" + e.getId())
                  .append([
                    $("<span/>")
                      .addClass("sidebar-title")
                      .text(o.GLocale.get(e.getTitle())),
                    $("<span/>").addClass("g-badge").hide(),
                  ])
                  .on("click", this._tryActivateSidebar.bind(this, e))
                  .appendTo(this._sidebarsSelector);
            var n = $("<div></div>")
              .addClass(
                "sidebar-container sidebar-" +
                  e.getId() +
                  (this._sidebarsSelector ? " multiple" : "")
              )
              .css("display", "none")
              .appendTo(this._htmlElement);
            e.init(n),
              this._sidebars.push({ container: n, sidebar: e }),
              n.find("button").each(function (e, t) {
                $(t).on("mousedown", function (e) {
                  e.preventDefault();
                });
              });
            const i = gDesigner.getLicense();
            e.addEventListener(
              a.UpdateEvent,
              function () {
                this.setSidebarEnabled(
                  e.getId(),
                  e.isEnabled() && i.canAccessFreemium()
                ),
                  this._updateTouchToolbar(),
                  this._updateBadge(e);
              }.bind(this)
            ),
              e.getId() === l.GInspectorSidebar &&
                e.addEventListener(
                  d.SidebarEvent,
                  function (e) {
                    [
                      d.SidebarEvent.Type.ChildAdded,
                      d.SidebarEvent.Type.ChildRemoved,
                    ].includes(e.type) && this._updateTouchToolbar();
                  }.bind(this)
                ),
              this.setSidebarEnabled(e.getId(), e.isEnabled());
          }.bind(this),
          t = [];
        for (let e = 0; e < window.gravit.sidebars.length; ++e) {
          let n = window.gravit.sidebars[e];
          n.getOrientation() === this._orientation && t.push(n);
        }
        if (window.gravit.sidebars)
          for (let n = 0; n < t.length; ++n) {
            let o = t[n];
            o.getOrientation() === this._orientation && e(o, t.length);
          }
        gDesigner.addEventListener(r, this._settingChanged, this),
          (this._mouseDownHandler = this._documentMouseDown.bind(this)),
          (this._mouseMoveHandler = this._documentMouseMove.bind(this)),
          (this._mouseReleaseHandler = this._resizeMouseUp.bind(this)),
          document.addEventListener("mousemove", this._mouseMoveHandler),
          document.addEventListener("mousedown", this._mouseDownHandler),
          document.addEventListener("mouseup", this._mouseReleaseHandler, !0),
          document.addEventListener("dragstart", this._mouseMoveHandler),
          document.addEventListener("drag", this._mouseMoveHandler),
          document.addEventListener("dragend", this._mouseMoveHandler, !0),
          this._updateTouchToolbar();
      }),
      (d.prototype.setView = function (e) {
        e !== this._view &&
          (this._view &&
            (this._view.removeEventListener(
              i.GMouseEvent.Down,
              this._mouseDownHandler,
              this
            ),
            this._view.removeEventListener(
              i.GMouseEvent.Move,
              this._mouseMoveHandler,
              this
            ),
            this._view.removeEventListener(
              i.GMouseEvent.DragStart,
              this._mouseMoveHandler,
              this
            ),
            this._view.removeEventListener(
              i.GMouseEvent.Drag,
              this._mouseMoveHandler,
              this
            ),
            this._view.removeEventListener(
              i.GMouseEvent.DragEnd,
              this._mouseMoveHandler,
              this
            ),
            this._view.removeEventListener(
              i.GMouseEvent.Release,
              this._mouseReleaseHandler,
              this
            )),
          (this._view = e),
          this._view &&
            (this._view.addEventListener(
              i.GMouseEvent.Down,
              this._mouseDownHandler,
              this
            ),
            this._view.addEventListener(
              i.GMouseEvent.Move,
              this._mouseMoveHandler,
              this
            ),
            this._view.addEventListener(
              i.GMouseEvent.DragStart,
              this._mouseMoveHandler,
              this
            ),
            this._view.addEventListener(
              i.GMouseEvent.Drag,
              this._mouseMoveHandler,
              this
            ),
            this._view.addEventListener(
              i.GMouseEvent.DragEnd,
              this._mouseMoveHandler,
              this
            ),
            this._view.addEventListener(
              i.GMouseEvent.Release,
              this._mouseReleaseHandler,
              this
            )));
      }),
      (d.prototype._isActiveSidebarDeactivatable = function () {
        return !(
          this.getSidebar(this._activeSidebar) &&
          !this.getSidebar(this._activeSidebar).isDeactivatable()
        );
      }),
      (d.prototype._tryActivateSidebar = function (e) {
        return (
          !!this._isActiveSidebarDeactivatable() &&
          (gDesigner.stats(
            "sidebars_activate_sidebar",
            (e && e.getId()) || "unkn"
          ),
          this.setActiveSidebar(e.getId()),
          this.setSidebarEnabled(e.getId(), e.isEnabled()),
          !0)
        );
      }),
      (d.prototype.disableContextSensitive = function () {
        this._updateTouchToolbar({ disableContextSensitive: !0 });
      }),
      (d.prototype.enableContextSensitive = function () {
        this._updateTouchToolbar();
      }),
      (d.prototype._documentMouseMove = function (e) {
        if (this._htmlElement && this._htmlElement[0])
          if (this._isResizing) {
            var t;
            e instanceof MouseEvent
              ? (t = e.pageX)
              : ((e.isImmediatePropagationStopped = !0),
                (t = e.client.getX() / o.GPaintCanvas.getScreenDPI())),
              e.stopPropagation instanceof Function && e.stopPropagation(),
              (this._newWidth =
                this._orientation === d.Orientation.Left
                  ? t
                  : window.innerWidth - t),
              this._newWidth < this._minimumWidth &&
                (this._newWidth = this._minimumWidth),
              this._htmlElement.css("width", this._newWidth + "px");
            var n = this.getSidebar(this._activeSidebar);
            n && n.resize();
          } else {
            var i =
                this._orientation === d.Orientation.Left
                  ? this._htmlElement[0].offsetWidth
                  : window.innerWidth - this._htmlElement[0].offsetWidth,
              a =
                o.GMath.isEqualEps(
                  e.pageX,
                  i,
                  3 * o.GPaintCanvas.getScreenDPI()
                ) && this._orientation !== d.Orientation.Right;
            (a || this._canResize) &&
              (a && !this._canResize
                ? (this._frame.addClass("resize"), (this._canResize = a))
                : this._canResize &&
                  !a &&
                  (this._frame.removeClass("resize"), (this._canResize = a)));
          }
      }),
      (d.prototype._documentMouseDown = function (e) {
        var t = this.getSidebar(this._activeSidebar);
        this._canResize &&
          t &&
          t.isResizeable() &&
          ((this._isResizing = !0),
          (this._minimumWidth = t.getMinimumWidth()),
          e instanceof i.GMouseEvent && (e.isImmediatePropagationStopped = !0),
          e.stopPropagation instanceof Function && e.stopPropagation());
      }),
      (d.prototype._resizeMouseUp = function (e) {
        if (this._isResizing) {
          e instanceof i.GMouseEvent && (e.isImmediatePropagationStopped = !0),
            e.stopPropagation instanceof Function && e.stopPropagation(),
            (this._isResizing = !1);
          var t = this.getSidebar(this._activeSidebar);
          t &&
            gDesigner.setSetting("sidebars_width_" + t.getId(), this._newWidth);
        }
      }),
      (d.prototype.relayout = function () {
        if (this._activeSidebar) {
          let e = this.getSidebar(this._activeSidebar);
          e &&
            (this._htmlElement.css("width", e.getSettingWidth() + "px"),
            e.relayout());
        }
        for (var e = 0, t = 0, n = 0; n < this._sidebars.length; ++n) {
          let i = this._sidebars[n];
          var o = i.sidebar.getId();
          i.sidebar.isVisible()
            ? (e++,
              this._htmlElement.find(".sidebar-option.sidebar-" + o).show())
            : this._htmlElement.find(".sidebar-option.sidebar-" + o).hide(),
            i.sidebar.isEnabled() && t++,
            this._updateBadge(i.sidebar);
        }
        if (e > 0) {
          let n = this._htmlElement.find(".sidebar-container");
          this._sidebarsSelector &&
            t > 0 &&
            (this._sidebarsSelector.css("display", ""),
            this._sidebarsSelector.toggleClass("singleton", 1 === e),
            n.hasClass("multiple") || n.addClass("multiple")),
            this._orientation === d.Orientation.Right &&
              n.css(
                "bottom",
                $(".license-info:visible").length > 0
                  ? parseInt($(".license-info:visible").outerHeight(), 10)
                  : 0
              );
        } else
          this._sidebarsSelector &&
            this._sidebarsSelector.css("display", "none"),
            this._htmlElement
              .find(".sidebar-container")
              .removeClass("multiple");
        this._updateTouchToolbar();
      }),
      (d.prototype._getSidebarInfo = function (e) {
        if (e && this._sidebars)
          for (var t = 0; t < this._sidebars.length; ++t) {
            if (this._sidebars[t].sidebar.getId() === e)
              return this._sidebars[t];
          }
        return null;
      }),
      (d.prototype._settingChanged = function (e) {
        if (e.key === "sidebars_" + this._orientation + "_active") {
          if (gDesigner.isTouchEnabled() && e.restoring) return;
          this.setActiveSidebar(e.newValue ? e.newValue : null),
            gDesigner.setPartVisible(this.getSidebarsPart(), !!e.newValue);
        } else if (
          0 === e.key.indexOf("sidebars_width_") &&
          this._orientation !== d.Orientation.Right
        ) {
          var t = e.key.substr("sidebars_width_".length);
          (this._sidebarWidths[t] = e.newValue),
            t === this._activeSidebar &&
              (this._htmlElement.css("width", e.newValue + "px"),
              gDesigner.relayout());
        } else
          "touch" === e.key &&
            (this._updateTouchToolbar(),
            this._htmlElement
              .find(".appearance-properties-panel")
              .removeClass("display-none"));
      }),
      (d.prototype._updateBadge = function (e) {
        if (this._sidebarsSelector) {
          var t = this._sidebarsSelector.find(
              ".sidebar-option.sidebar-" + e.getId()
            ),
            n = t.find(".g-badge");
          e.updateBadge(n)
            ? (t.addClass("content-width"), n.show())
            : (t.removeClass("content-width"), n.hide());
        }
      }),
      (d.prototype.getSidebar = function (e) {
        var t = null;
        if (e) {
          var n = this._getSidebarInfo(e);
          n && (t = n.sidebar);
        }
        return t;
      }),
      (d.prototype.getSidebarsPart = function () {
        switch (this._orientation) {
          case d.Orientation.Left:
            return s.LeftSidebars;
          case d.Orientation.Right:
            return s.RightSidebars;
        }
      }),
      (d.prototype.addClassName = function (e) {
        this._htmlElement.find(".sidebar-container").addClass(e);
      }),
      (d.prototype.removeClassName = function (e) {
        this._htmlElement.find(".sidebar-container").removeClass(e);
      }),
      (d.setOrientationStateInSetting = function (e, t) {
        gDesigner.setSetting(d.getSettingNameForSidebar(e), t);
      }),
      (d.isOrientationActiveInSetting = function (e) {
        return gDesigner.getSetting(d.getSettingNameForSidebar(e));
      }),
      (d.getSettingNameForSidebar = function (e) {
        return "sidebars_" + e + "_active";
      }),
      (d.prototype.getHtmlElement = function () {
        return this._htmlElement;
      }),
      (d.prototype.setEnabled = function (e, t) {
        $(".sidebar-selector > div")[t ? "removeClass" : "addClass"](
          "g-disabled"
        ),
          e._sidebars.forEach((e) => {
            e.container[t ? "removeClass" : "addClass"]("g-disabled");
          });
      }),
      (e.exports = d);
  }