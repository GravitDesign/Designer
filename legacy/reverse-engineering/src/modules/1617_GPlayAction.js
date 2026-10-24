/**
 * Webpack Module #1617
 * Type: class
 * Name: GPlayAction
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    n(20), n(107), n(34);
    var i = n(1),
      a = n(15),
      r = o(n(1618)),
      s = o(n(85)),
      l = o(n(31)),
      c = o(n(18)),
      d = o(n(44)),
      u = o(n(443)),
      p = o(n(1341));
    const { isExecutingOnMSTeamsSync: g } = u.default;
    class h extends l.default {
      constructor() {
        super(),
          (this._scene = null),
          (this._isInPlayMode = null),
          (this._shouldExitFullScreen = null),
          (this._isErrorMessageDisplaying = !1),
          (this._timeoutId = null),
          (this._isLoading = !1),
          (this._keyDownHandlerBind = this._keyDownHandler.bind(this)),
          (this._fullScreenRequestDeniedHandlerBind =
            this._fullScreenRequestDeniedHandler.bind(this)),
          (this._browserFullScreenModeChangeHandlerBind =
            this._browserFullScreenModeChangeHandler.bind(this));
      }
      getId() {
        return h.ID;
      }
      getTitle() {
        return h.TITLE;
      }
      getCategory() {
        return c.default.CATEGORY_VIEW;
      }
      getShortcut() {
        return [
          a.GKey.Constant.META,
          a.GKey.Constant.OPTION,
          a.GKey.Constant.ENTER,
        ];
      }
      isEnabled() {
        return (
          !!gDesigner.getActiveDocument() &&
          r.default.enabled &&
          !this._isErrorMessageDisplaying &&
          !this._isLoading
        );
      }
      isVisible() {
        return !g();
      }
      execute() {
        if (this._isInPlayMode) return this._exitPlayMode();
        if (((this._scene = this._getScene()), this._scene))
          if (
            (this._setIsLoading(!0),
            (this._widget = new a.GSceneWidget(this._scene)),
            (this._widget.getViewConfiguration().paintMode =
              i.GScenePaintConfiguration.PaintMode.Output),
            (this._overlay = $("<div></div>").css({
              position: "absolute",
              zIndex: 9999,
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              background: "black",
            })),
            this._overlay.append(this._widget._htmlElement).appendTo($("body")),
            document.addEventListener("keydown", this._keyDownHandlerBind, !0),
            window.addEventListener(
              "unhandledrejection",
              this._fullScreenRequestDeniedHandlerBind
            ),
            gContainer.getRuntime() === s.default.Runtime.Electron)
          ) {
            const e = n(881).remote.getCurrentWindow();
            e.once("leave-full-screen", this._exitPlayMode.bind(this)),
              e.isFullScreen()
                ? (this._setShouldExitFullScreen(!1), this._enterPlayMode())
                : (this._setShouldExitFullScreen(!0),
                  e.once("enter-full-screen", () => {
                    this._timeoutId = setTimeout(
                      this._enterPlayMode.bind(this),
                      250
                    );
                  }),
                  e.setFullScreen(!0));
          } else
            this._setShouldExitFullScreen(!0),
              document.addEventListener(
                r.default.raw.fullscreenchange,
                this._browserFullScreenModeChangeHandlerBind
              ),
              r.default.request(this._overlay[0]);
      }
      changeActivePage(e, t) {
        const n = gDesigner
          .getAction("".concat(p.default.ID, ".").concat(t))
          .getNextPage(e);
        n ? e.setActivePage(n) : t === p.default.Type.Next && r.default.exit();
      }
      _getScene() {
        gDesigner.toggleLoading(!0);
        try {
          return this._cloneActiveScene();
        } catch (e) {
          return null;
        } finally {
          gDesigner.toggleLoading(!1);
        }
      }
      _cloneActiveScene() {
        const e = gDesigner.getActiveDocument(),
          t = e && e.getScene();
        return t ? t.clone(null, t.getWorkspace()) : null;
      }
      _keyDownHandler(e) {
        let t = !0;
        switch (a.GKey.translateCode(e.code)) {
          case a.GKey.Constant.DOWN:
          case a.GKey.Constant.PAGE_DOWN:
          case a.GKey.Constant.RIGHT:
          case a.GKey.Constant.SPACE:
            this.changeActivePage(this._scene, p.default.Type.Next);
            break;
          case a.GKey.Constant.UP:
          case a.GKey.Constant.PAGE_UP:
          case a.GKey.Constant.LEFT:
            this.changeActivePage(this._scene, p.default.Type.Previous);
            break;
          case a.GKey.Constant.ESC:
            gContainer.getRuntime() === s.default.Runtime.Electron &&
              this._exitPlayMode();
            break;
          default:
            t = !1;
        }
        t && e.stopPropagation();
      }
      _fullScreenRequestDeniedHandler(e) {
        "Fullscreen request denied" === e.reason.message &&
          (this._exitPlayMode(),
          d.default.custom({
            title: i.GLocale.getValue(
              "GCommonNames",
              "text.something-wrong.try-again"
            ),
            openCallback: () => this._setIsErrorMessageDisplaying(!0),
            closeCallback: () => this._setIsErrorMessageDisplaying(!1),
          }));
      }
      _enterPlayMode() {
        this._setIsInPlayMode(!0),
          this._widget.resize(
            this._overlay.outerWidth(),
            this._overlay.outerHeight()
          );
        const e = this._scene.getActivePage().getPaintBBox();
        if (
          (this._widget.zoomAll(e, !1),
          gContainer.getRuntime() === s.default.Runtime.Browser ||
            gContainer.getRuntime() === s.default.Runtime.PWA)
        ) {
          /^((?!chrome|android)(?:[\0-\t\x0B\f\x0E-\u2027\u202A-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]))*[s\u017F]afari/i.test(
            navigator.userAgent
          ) && this._createExitFullScreenHint().appendTo(this._overlay);
        }
        this._setIsLoading(!1);
      }
      _createExitFullScreenHint() {
        return $("<div/>")
          .addClass("g-exit-full-screen")
          .on("webkitAnimationEnd", (e) => {
            $(e.target).closest(".g-exit-full-screen").remove();
          })
          .append(
            $("<div/>").html(
              i.GLocale.getValue(
                "GPlayAction",
                "text.exit-full-screen"
              ).replace("%key", () =>
                $("<span/>")
                  .addClass("highlight")
                  .text(i.GLocale.getValue("GPlayAction", "text.esc"))
                  .prop("outerHTML")
              )
            )
          );
      }
      _exitPlayMode() {
        this._timeoutId && clearTimeout(this._timeoutId),
          this._shouldExitFullScreen && this._exitFullScreen(),
          this._overlay.remove(),
          this._widget.release(),
          document.removeEventListener("keydown", this._keyDownHandlerBind, !0),
          document.removeEventListener(
            r.default.raw.fullscreenchange,
            this._browserFullScreenModeChangeHandlerBind
          ),
          window.removeEventListener(
            "unhandledrejection",
            this._fullScreenRequestDeniedHandlerBind
          ),
          this._setIsInPlayMode(!1),
          this._setIsLoading(!1);
      }
      _browserFullScreenModeChangeHandler() {
        r.default.isFullscreen ? this._enterPlayMode() : this._exitPlayMode();
      }
      _exitFullScreen() {
        if (gContainer.getRuntime() === s.default.Runtime.Electron) {
          n(881).remote.getCurrentWindow().setFullScreen(!1);
        } else r.default.exit();
      }
      _setIsInPlayMode(e) {
        this._isInPlayMode = e;
      }
      _setIsLoading(e) {
        this._isLoading = e;
      }
      _setShouldExitFullScreen(e) {
        this._shouldExitFullScreen = e;
      }
      _setIsErrorMessageDisplaying(e) {
        this._isErrorMessageDisplaying = e;
      }
      toString() {
        return "[Object GPlayAction]";
      }
    }
    (h.ID = "view.play"),
      (h.TITLE = new i.GLocaleKey("GPlayAction", "title")),
      (e.exports = h);
  }