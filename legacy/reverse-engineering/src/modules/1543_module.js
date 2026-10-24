/**
 * Webpack Module #1543
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(168), n(4), n(13), n(169);
    const o = n(449),
      i = n(566),
      a = n(447),
      r = n(1171),
      s = n(1167),
      l = n(813),
      c = n(448),
      d = n(445),
      u = n(1293),
      p = n(238),
      g = n(339),
      h = n(257),
      f = n(85),
      { GSystem: m, GMath: y } = n(1),
      { FILE_FORMATS: v } = n(10);
    e.exports = function (e) {
      (e.prototype._windowButton = null),
        (e.prototype._nativeButton = null),
        (e.prototype._touchSection = null),
        (e.prototype._updateTouchUI = function () {
          this._touchSection ||
            (this._touchSection = this._createTouchSection().prependTo(
              this._htmlElement
            )),
            this._windowButton ||
              (this._windowButton = this._createWindowButton()
                .hide()
                .insertBefore(this._exportButton)),
            this._nativeButton ||
              (gContainer.getRuntime() === f.Runtime.Electron &&
                m.operatingSystem !== m.OperatingSystem.OSX_IOS &&
                (this._nativeButton = this._createNativeButton().appendTo(
                  this._htmlElement.find(".export-section")
                )));
          !gDesigner.getApplicationManager().isEditingEnabled()
            ? this._updateTouchSimpleUI()
            : this._updateTouchFullUI(),
            this._updateActiveWindow(),
            this._updateZoomFromWindow(!0),
            this._updateActions(),
            this._updateContextTools(),
            this._updateViewBasedOnPermissions();
        }),
        (e.prototype._updateViewBasedOnPermissions = function () {
          this._windowButton &&
            (gDesigner.getApplicationManager().isDocumentTabManagementEnabled()
              ? this._windowButton.show()
              : this._windowButton.hide());
        }),
        (e.prototype._updateTouchFullUI = function () {
          this._htmlElement.find(".menu-section > .zoom-button").length ||
            (this._touchZoomButton && (this._touchZoomButton = null),
            this._initTouchZoomButton(),
            this._touchZoomButton.insertBefore(".menu-section > .snap-button"));
        }),
        (e.prototype._updateTouchSimpleUI = function () {
          this._updateTouchZoomButtonSimpleUI(),
            this._updateZoomFromWindow(!0),
            this._updateTouchPageButton();
        }),
        (e.prototype._updateTouchZoomButtonSimpleUI = function () {
          const e = this._htmlElement.find(".view-section > .zoom-button");
          e.is(this._touchZoomButton) ||
            ((this._touchZoomButton = null),
            this._initTouchZoomButton(),
            e.replaceWith(this._touchZoomButton));
        }),
        (e.prototype._updateTouchPageButton = function () {
          this._pageButton &&
            (this._pageButton.gPageButton("reinit"),
            this._pageButton.addClass("dropdown"));
        }),
        (e.prototype._initTouchZoomButton = function () {
          const e = $("<button />")
              .addClass("dropdown-button")
              .append($("<span></span>").addClass("gravit-icon-down")),
            t = new p(void 0, "g-zoom-menu");
          this._touchZoomButton = $("<div/>")
            .addClass("zoom-button")
            .addClass("toolbar-button")
            .addClass("action-button")
            .addClass("g-menu-button")
            .addClass("dropdown")
            .append(
              $("<div />")
                .addClass("action-button")
                .append($("<span />").addClass("caption").text("100%"))
            )
            .append(e)
            .gMenuButton({
              menu: () => (
                t.clearItems(),
                [
                  gDesigner.getAction(o.ID),
                  gDesigner.getAction(i.ID),
                  gDesigner.getAction("".concat(s.ID, ".50")),
                  gDesigner.getAction("".concat(s.ID, ".100")),
                  gDesigner.getAction("".concat(s.ID, ".200")),
                  gDesigner.getAction("".concat(s.ID, ".400")),
                ].reduce((e, t) => (e.createAddItem(t), e), t)
              ),
              getActiveItem: () => {
                var e = gDesigner.getWindows().getActiveWindow(),
                  n = 100 * (e && e.getView()).getZoom(),
                  o = n && y.round(n, !1, 0),
                  i = o && gDesigner.getAction("".concat(s.ID, ".").concat(o)),
                  a = i && i.getTitle();
                return a && t.findItem(a);
              },
              reference: e,
            });
        }),
        (e.prototype._getTouchMenubarIcon = function () {
          return gContainer.getRuntime() === f.Runtime.IPad
            ? "gravit-icon-touch-menubar-ipad"
            : "gravit-icon-touch-menubar";
        }),
        (e.prototype._createTouchSection = function () {
          return (
            this._touchZoomButton || this._initTouchZoomButton(),
            $("<div></div>")
              .addClass("section menu-section g-touch-only")
              .append(
                this._createLabelButton({
                  icon: this._getTouchMenubarIcon(),
                  menu: () => {
                    const e = gDesigner.getMainMenu();
                    return e.detach(), e;
                  },
                }).addClass("menubar-toolbar-button")
              )
              .append(
                this._createLabelButton({
                  icon: "gravit-icon-open",
                  split: !0,
                  menu: () => this._createOpenMenu(),
                  click: () => gDesigner.executeAction(l.ID),
                }).addClass("open-toolbar-button")
              )
              .append(this._createSaveButtonGroup())
              .append(
                this._createLabelButton({
                  action: gDesigner.getAction(r.ID),
                  icon: "gravit-icon-undo",
                  split: !0,
                  menu: () => this._createQuickHistoryUndoRedoMenu(),
                  click: () => gDesigner.executeAction(r.ID),
                }).addClass("undo-toolbar-button")
              )
              .append(this._touchZoomButton)
              .append(this._createSnapButton())
          );
        }),
        (e.prototype._createSaveButtonGroup = function () {
          const e = gDesigner.getAction(a.ID);
          return this._createLabelButton({
            icon: "gravit-icon-save",
            split: !0,
            menu: [
              gDesigner.getAction(
                "".concat(d.ID, ".").concat(v.find((e) => e.default).ext)
              ),
              gDesigner.getAction(
                "".concat(c.ID, ".").concat(c.Actions.SaveAs)
              ),
              gDesigner.getAction(u.ID),
            ].reduce((e, t) => (e.createAddItem(t), e), new p()),
            click: () => gDesigner.executeAction(a.ID),
          })
            .addClass("save-toolbar-button")
            .attr("data-action", e.getId())
            .data("action", e);
        }),
        (e.prototype._createWindowButton = function () {
          const e = new p();
          return this._createLabelButton({
            caption: " ",
            menu: () => {
              e.clearItems();
              const t = gDesigner.getWindows();
              return t
                .getWindows()
                .reduce(
                  (e, n) => (this._createAndAppendWindowTabToMenu(t, e, n), e),
                  e
                );
            },
            getActiveItem: () => this._findActiveWindowItemInMenu(e),
          })
            .addClass("window-button")
            .addClass("g-touch-only");
        }),
        (e.prototype._createAndAppendWindowTabToMenu = function (e, t, n) {
          const o = this._getWindowTitle(n),
            i = t.createAddItem(o, () => {
              e.activateWindow(n, !0);
            });
          i.setDetachable(!0),
            i.addEventListener(g.DetachEvent, () => {
              e.removeWindow(n);
            });
          const a = n.getDocument();
          a &&
            (a.isCloudFile() || a.isExternalFile()) &&
            i.setIcon(h["gravit-icon-cloud"]);
        }),
        (e.prototype._findActiveWindowItemInMenu = function (e) {
          const t = gDesigner.getWindows(),
            n = t && t.getActiveWindow(),
            o = this._getWindowTitle(n);
          return o && e.findItem(o);
        }),
        (e.prototype._createNativeButton = function () {
          const e = (e) =>
            $("<button/>")
              .addClass("native-button")
              .append($("<span/>").addClass(e));
          return this._createLabelButton({
            caption: "",
            icon: "gravit-icon-3-dots",
            click: (t) => {
              $("<div/>")
                .append(
                  $("<div/>")
                    .addClass("container")
                    .append(
                      e("gravit-icon-minimize").on("click", () =>
                        gContainer.minimizeWindow()
                      )
                    )
                    .append(
                      e("gravit-icon-maximize").on("click", () =>
                        gContainer.maximizeWindow()
                      )
                    )
                    .append(
                      e("gravit-icon-close").on("click", () =>
                        gContainer.closeWindow()
                      )
                    )
                )
                .gOverlay({
                  releaseOnClose: !0,
                  clazz: "g-toolbar-native-button-overlay",
                })
                .gOverlay("open", $(t.target));
            },
          })
            .addClass("native-button")
            .addClass("g-touch-only");
        }),
        (e.prototype._updateActiveWindow = function () {
          if (gDesigner.isTouchEnabled() && this._windowButton)
            if (
              gDesigner.getApplicationManager().isDocumentTabManagementEnabled()
            ) {
              const o =
                gDesigner.getWindows() &&
                gDesigner.getWindows().getActiveWindow();
              if (o) {
                const i = o.getDocument();
                var e = this._getWindowTitle(o),
                  t = "..." + e.substr(e.length - 3);
                const a = this._windowButton
                  .show()
                  .toggleClass("syncing", i && i.isSynchronizing())
                  .find(".action-button .caption")
                  .text(e);
                this._windowButton.find(".subicon").remove(),
                  this._windowButton.find(".ending").remove();
                var n = a[0].offsetWidth < a[0].scrollWidth;
                this._windowButton.toggleClass("text-overflow", n),
                  n &&
                    $("<span/>")
                      .addClass("ending")
                      .attr("data-ending", t)
                      .insertBefore(
                        this._windowButton.find(".gravit-icon-down")
                      ),
                  this._windowButton.find(".subicon").remove(),
                  i &&
                    (i.isCloudFile() || i.isExternalFile()) &&
                    $("<span/>")
                      .addClass("subicon")
                      .addClass(h["gravit-icon-cloud-window"])
                      .insertBefore(
                        this._windowButton.find(".gravit-icon-down")
                      );
              } else this._windowButton.hide();
            } else this._windowButton.hide();
        }),
        (e.prototype._getWindowTitle = function (e) {
          const t = e && e.getDocument();
          return (
            e &&
            ""
              .concat(e.getTitleWithExtension())
              .concat(t && t.isModified() ? "*" : "")
          );
        });
    };
  }