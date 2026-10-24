/**
 * Webpack Module #1662
 * Type: class
 * Name: GLibrarySidebar
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    n(3);
    var i = n(1),
      a = o(n(340)),
      r = n(806),
      s = n(395),
      l = n(1663),
      c = n(119);
    const d = n(291);
    function u() {
      r.call(this);
    }
    i.GObject.inherit(u, r),
      (u.ID = "library"),
      (u.TITLE = new i.GLocaleKey("GLibrarySidebar", "title")),
      (u.prototype._initialized = !1),
      (u.prototype._libraryPanel = null),
      (u.prototype._libraryPanelInstance = null),
      (u.prototype._htmlElement = null),
      (u.prototype.getId = function () {
        return u.ID;
      }),
      (u.prototype.getTitle = function () {
        return u.TITLE;
      }),
      (u.prototype.isEnabled = function () {
        return c.isOnline();
      }),
      (u.prototype.isVisible = function () {
        return !!gDesigner.getApplicationManager().isEditingEnabled();
      }),
      (u.prototype.getOrientation = function () {
        return s.Orientation.Left;
      }),
      (u.prototype.getMinimumWidth = function () {
        return 250;
      }),
      (u.prototype.getDefaultWidth = function () {
        return 250;
      }),
      (u.prototype.isResizeable = function () {
        return !0;
      }),
      (u.prototype.resize = function () {
        this._libraryPanelInstance.resize();
      }),
      (u.prototype.relayout = function () {
        (this._libraryPanel && !this._libraryPanel.hasClass("unavailable")) ||
          !this.isEnabled() ||
          this._addLibraryPanel(this._htmlElement);
      }),
      (u.prototype.init = function (e) {
        r.prototype.init.call(this, e),
          (this._htmlElement = e),
          this._addLibraryPanel(e),
          $(document).on(
            "networkAvailable",
            function () {
              this.relayout();
              var e = gDesigner.getLeftSidebars(),
                t = e.getActiveSidebar();
              t === this.getId() && e.setSidebarEnabled(t, this.isEnabled());
            }.bind(this)
          ),
          gDesigner.addEventListener(
            d,
            this._networkAvailabilityChangedEvent,
            this
          );
      }),
      (u.prototype._networkAvailabilityChangedEvent = function (e) {
        this._libraryPanel.toggleClass("offline", !e.connected),
          this._initialized || this._addLibraryPanel(this._htmlElement);
      }),
      (u.prototype._addLibraryPanel = function (e) {
        this._libraryPanel ||
          ($("<div></div>")
            .addClass("toolbar library-toolbar g-touch-only")
            .append(
              $("<label/>").text(
                i.GLocale.get(new i.GLocaleKey("GLibrarySidebar", "title"))
              )
            )
            .appendTo(e),
          (this._libraryPanel = $("<div/>")
            .append(
              $("<div/>")
                .addClass("overlay")
                .append(
                  $("<div/>")
                    .addClass("box")
                    .append(
                      $("<span/>").text(
                        i.GLocale.get(
                          new i.GLocaleKey(
                            "GOfflineDialog",
                            "title.unavailable-feature"
                          )
                        )
                      )
                    )
                )
            )
            .addClass("library-container")
            .css("overflow", "auto")
            .appendTo(e))),
          this._libraryPanel.toggleClass("offline", gDesigner.isOffline()),
          c.isOnline()
            ? (this._libraryPanel.hasClass("unavailable") &&
                (this._libraryPanel.removeClass("unavailable"),
                this._libraryPanel.empty()),
              gDesigner.isOffline() ||
                ((this._libraryPanelInstance = new l(this._libraryPanel)),
                (this._initialized = !0)))
            : (this._libraryPanel.addClass("unavailable"),
              $("<span/>")
                .addClass("span-unavailable")
                .text(
                  i.GLocale.get(
                    new i.GLocaleKey("GLibrarySidebar", "text.connect")
                  )
                )
                .appendTo(this._libraryPanel));
      }),
      (u.prototype.getTouchTools = function () {
        return [
          new a.default({
            id: "libraries",
            sidebar: this.getId(),
            icon: "gravit-icon-touch-libraries-panel",
            panel: ".library-container",
          }),
        ];
      }),
      (u.prototype.toString = function () {
        return "[Object GLibrarySidebar]";
      }),
      (e.exports = u);
  }