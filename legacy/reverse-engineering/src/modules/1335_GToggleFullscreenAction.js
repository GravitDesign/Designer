/**
 * Webpack Module #1335
 * Type: class
 * Name: GToggleFullscreenAction
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    n(3);
    var i = n(1),
      a = n(15),
      r = o(n(443)),
      s = o(n(1330));
    const { isExecutingOnMSTeamsSync: l } = r.default;
    var c = n(863),
      d = n(449),
      u = n(18),
      p = n(31),
      g = n(1588);
    function h() {
      this._banner.setBannerText(
        i.GLocale.get(
          new i.GLocaleKey("GToggleFullscreenAction", "fullscreen-banner")
        )
      );
    }
    i.GObject.inherit(h, p),
      (h.ID = "view.fullscreen"),
      (h.TITLE = new i.GLocaleKey("GToggleFullscreenAction", "title")),
      (h.prototype._lastStates = {}),
      (h.prototype._banner = new g()),
      (h.prototype.getId = function () {
        return h.ID;
      }),
      (h.prototype.getTitle = function () {
        return h.TITLE;
      }),
      (h.prototype.getCategory = function () {
        return u.CATEGORY_VIEW;
      }),
      (h.prototype.getShortcut = function () {
        return [a.GKey.Constant.ALT_LEFT, a.GKey.Constant.ENTER];
      }),
      (h.prototype.isEnabled = function () {
        return !!gDesigner.getActiveDocument() && this._isSupported();
      }),
      (h.prototype.isVisible = function () {
        return this._isSupported();
      }),
      (h.prototype._isSupported = function () {
        return !l();
      }),
      (h.prototype.getIcon = function () {
        return gDesigner.isTouchEnabled()
          ? "gravit-icon-toggle-full-screen"
          : null;
      }),
      (h.prototype.isFullscreen = function () {
        return !(
          gDesigner.isPartVisible(c.Header) ||
          gDesigner.isPartVisible(c.Toolbar) ||
          gDesigner.isPartVisible(c.RightSidebars) ||
          gDesigner.isPartVisible(c.LeftSidebars) ||
          gDesigner.isPartVisible(c.Panels)
        );
      }),
      (h.prototype.execute = function () {
        var e = this.isFullscreen();
        e
          ? this._banner.hide()
          : (this._updateLastStates(),
            gDesigner.isTouchEnabled() || this._banner.show()),
          gDesigner.setPartVisible(
            c.Header,
            !!e && this._lastStates.header,
            ""
          ),
          gDesigner.setPartVisible(
            c.Toolbar,
            !!e && this._lastStates.toolbar,
            ""
          ),
          gDesigner.setPartVisible(c.Panels, !!e && this._lastStates.panels),
          gDesigner.setPartVisible(
            c.RightSidebars,
            !!e && this._lastStates.rightSidebar
          ),
          gDesigner.setPartVisible(
            c.LeftSidebars,
            !!e && this._lastStates.leftSidebar
          ),
          gDesigner.relayout(),
          gDesigner.executeAction(d.ID, void 0, void 0, !0),
          gDesigner.hasEventListeners(s.default) &&
            gDesigner.trigger(new s.default(e));
      }),
      (h.prototype._updateLastStates = function () {
        this._lastStates = {
          header: gDesigner.isPartVisible(c.Header),
          toolbar: gDesigner.isPartVisible(c.Toolbar),
          panels: gDesigner.isPartVisible(c.Panels),
          leftSidebar: gDesigner.isPartVisible(c.LeftSidebars),
          rightSidebar: gDesigner.isPartVisible(c.RightSidebars),
        };
      }),
      (h.prototype.toString = function () {
        return "[Object GToggleFullscreenAction]";
      }),
      (e.exports = h);
  }