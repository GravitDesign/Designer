/**
 * Webpack Module #1491
 * Type: class
 * Name: Je
 */

function (e, t, n) {
    "use strict";
    n(557);
    var o = n(16);
    n(58),
      n(19),
      n(168),
      n(596),
      n(96),
      n(30),
      n(57),
      n(8),
      n(20),
      n(3),
      n(71),
      n(34),
      n(134),
      n(4),
      n(41),
      n(13),
      n(32),
      n(38),
      n(169),
      n(97),
      n(33),
      n(26);
    var i = n(53),
      a = n(1),
      r = n(15),
      s = n(10),
      l = n(357),
      c = o(n(1492)),
      d = n(1246),
      u = n(40),
      p = n(1247),
      g = (function (e, t) {
        if ("function" == typeof WeakMap)
          var n = new WeakMap(),
            o = new WeakMap();
        return (function (e, t) {
          if (!t && e && e.__esModule) return e;
          var i,
            a,
            r = { __proto__: null, default: e };
          if (null === e || ("object" != typeof e && "function" != typeof e))
            return r;
          if ((i = t ? o : n)) {
            if (i.has(e)) return i.get(e);
            i.set(e, r);
          }
          for (const t in e)
            "default" !== t &&
              {}.hasOwnProperty.call(e, t) &&
              ((a =
                (i = Object.defineProperty) &&
                Object.getOwnPropertyDescriptor(e, t)) &&
              (a.get || a.set)
                ? i(r, t, a)
                : (r[t] = e[t]));
          return r;
        })(e, t);
      })(n(1739)),
      h = (o(n(1249)), o(n(1155))),
      f = o(n(556)),
      m = o(n(734)),
      y = o(n(1494)),
      v = o(n(1496)),
      _ = o(n(1497)),
      b = o(n(1498));
    var w = n(163),
      C = n(238),
      x = n(339),
      S = n(804),
      E = n(1500),
      A = n(1521),
      T = n(1522),
      G = n(1260),
      P = n(864),
      D = n(567),
      L = n(1539),
      I = n(395);
    n(1540);
    var k = n(1541),
      O = n(603),
      F = n(863),
      R = n(1294),
      M = n(135),
      N = n(1151),
      B = n(78),
      U = n(1296),
      j = n(1172),
      K = n(1170),
      V = n(1297),
      H = (n(1298), n(255)),
      W = n(590),
      z = n(1544),
      q = n(1560),
      Y = n(1562),
      X = n(1303);
    n(1563);
    var Q = n(119),
      J = n(220),
      Z = n(85),
      ee = n(44),
      te = n(1276),
      ne = n(1564),
      oe = n(1250),
      ie = n(291),
      ae = n(1313),
      re = n(860),
      se = n(441),
      le = n(292),
      ce = n(805),
      de = n(1321),
      ue = n(392),
      pe = n(868),
      ge = n(1322),
      he = n(1568),
      fe = n(1569),
      me = n(1571),
      ye = n(1165),
      ve = n(1572),
      _e = n(846),
      be = n(337),
      we = n(1325),
      Ce = n(785),
      xe = n(256),
      Se = n(604),
      Ee = n(1326),
      Ae = n(1328),
      Te = n(808),
      Ge = n(1188),
      Pe = n(447),
      De = n(86),
      Le = (n(18), n(442));
    const {
      defaultLegacyUserSettings: { features: Ie },
    } = s.defaultUserSettings;
    var ke = n(10);
    const { gApi: Oe } = ke;
    var Fe = n(388),
      Re = n(1580);
    const Me = n(1581),
      Ne = n(1584);
    var Be = n(1587);
    n(607);
    const Ue = n(40),
      $e = n(177),
      je = n(1338),
      Ke = n(1173),
      Ve = (n(1591), n(1592)),
      He = n(1593),
      We = n(1594);
    var ze = n(1595);
    n(1596),
      ze.addKeycodes({ 173: "-" }),
      ze.addKeycodes({ 187: "=" }),
      ze.addKeycodes({ 61: "=" });
    var qe,
      Ye,
      Xe = 0,
      Qe = null;
    function Je() {
      (this._settings = {}),
        (this._settingsLoaded = !1),
        (this._swatches = {}),
        (this._workspace = new i.GEditorWorkspace()),
        (this._documents = []),
        (this._actions = []),
        (this._actionsMap = {}),
        (this._clipboardMimeTypes = {}),
        (this._license = void 0),
        (this._reloading = !1),
        (this._mainMenu = new C()),
        (this._enabledSubscriptions = !1),
        (this._documentTouchHandler = new Me(document)),
        (this._editorTouchHandler = new Ne()),
        he.clearSingleton(),
        (this._cloudCommunicationManager = new he(this)),
        (this._cursorManager = new c.default()),
        document.addEventListener("gesturechange", function (e) {
          e.stopPropagation();
        }),
        window.addEventListener(
          "dragover",
          (e) => {
            e.preventDefault();
          },
          !1
        ),
        window.addEventListener(
          "drop",
          (e) => {
            e.preventDefault();
            var t = this.getWindows().getActiveWindow(),
              n = t && t.getView();
            n && n.handleDropEvent(e);
          },
          !1
        ),
        window.addEventListener(
          "wheel",
          (e) => {
            (r.GPlatform.modifiers.ctrlKey || r.GPlatform.modifiers.metaKey) &&
              e.preventDefault();
          },
          { passive: !1 }
        ),
        window.addEventListener("gesturestart", (e) => {
          e.preventDefault();
        }),
        window.addEventListener("gestureend", (e) => {
          e.preventDefault();
        }),
        window.addEventListener("gesturechange", (e) => {
          e.preventDefault();
          var t = e.scale;
          t > 1 ? (t *= -1) : (t = 2 - t);
          var n = new WheelEvent("wheel", {
              deltaY: t,
              clientX: e.clientX,
              clientY: e.clientY,
              ctrlKey: !0,
            }),
            o = this.getWindows() && this.getWindows().getActiveWindow(),
            i = o && o.getView() && o.getView()._htmlElement;
          i && i.dispatchEvent(n);
        }),
        document.addEventListener(
          "keydown",
          function (e) {
            if (
              (document.activeElement &&
                $(document.activeElement).is(":button") &&
                (13 == e.keyCode || 32 == e.keyCode) &&
                (e.preventDefault(), document.activeElement.blur()),
              this._windows)
            ) {
              var t = document.activeElement,
                n = this._windows.getActiveWindow(),
                o =
                  $(t).is("input") &&
                  "number" === $(t).attr("type") &&
                  !$(t).hasClass("g-disabled") &&
                  "true" !== $(t).attr("disabled");
              !n ||
                !n.getView() ||
                (t && ($(t).is(":editable") || o)) ||
                n.getView().focus();
            }
          }.bind(this),
          !1
        ),
        document.addEventListener(
          "contextmenu",
          function (e) {
            return !$(e.target).is(":editable") ||
              this.propertyPanelHasContextMenu(e)
              ? (e.preventDefault(), !1)
              : (e.stopPropagation(), !0);
          }.bind(this),
          !0
        ),
        this._workspace.addEventListener(
          a.GWorkspace.ResolveUrlEvent,
          this._workspaceResolveUrlEvent,
          this
        ),
        this.addEventListener(B, this._documentEvent, this),
        this.addEventListener(M, this._settingChangedEvent, this),
        this.addEventListener(le, this._userLoggedEvent, this),
        this.addEventListener(ce, this._userPropertiesChangedEvent, this),
        this.addEventListener(se, this._licenseChangedEvent, this),
        this.addEventListener(
          Ge.BeforeInstallUpdate,
          this._beforeInstallUpdate,
          this
        ),
        this.addEventListener(Te, this._applicationStatusEvent, this),
        this.addEventListener(ue, this._applicationStateChangedEvent, this),
        this.addEventListener(pe, this._shareEvent, this),
        (this._settings.theme = "light"),
        (this._settings.snap_disabled = !1),
        (this._settings.snap_zones = !1),
        (this._settings.snap_guides = [
          i.GGuideLinesGuide.ID,
          i.GFullPixelsGuide.ID,
          i.GPointsGuide.ID,
          i.GBBoxGuide.ID,
          i.GPageGuide.ID,
          i.GGridGuide.ID,
        ]),
        (this._settings.rulers_visible = !1),
        (this._settings.guide_lines_visible = !0),
        (this._settings.symbol_labels_visible = !0),
        (this._settings.grid_visible = !0),
        (this._settings.page_labels_visible = !0),
        (this._settings.highlight_on_hover = !0),
        (this._settings.invert_selection = !1),
        (this._settings.auto_expand_layers = !0),
        (this._settings.system_fonts_enabled = !0),
        (this._settings.symbols_panel_shown = !1),
        (this._settings.decimals_num = null),
        (this._settings.enable_steps_debug = !1),
        (this._settings.enable_cache = "function" == typeof gdb_loaddesign),
        (this._settings.ui_toolbar_alignment = !0),
        (this._settings.eps_outline_fonts = !0),
        (this._settings[te.AUTO_SAVE_SETTING] = !1),
        (this._settings[te.AUTO_SAVE_INTERVAL_SETTING] =
          s.AUTOSAVE_INTERVAL_DEFAULT),
        (this._settings.notifications_disabled = !1),
        (this._settings.touch = !1),
        (this._settings[I.getSettingNameForSidebar(I.Orientation.Left)] = !0),
        (this._settings[I.getSettingNameForSidebar(I.Orientation.Right)] = !0),
        $(document).on("networkAvailable", () => {
          this._initialized && gDesigner.updateRecentDocumentsAction();
        }),
        (this._paste = new ae());
      const e = (e) => {
        this.hasEventListeners(ie) && this.trigger(new ie(e));
      };
      $(window).on("online", () => e(!0)),
        $(window).on("offline", () => {
          "undefined" != typeof dataLayer &&
            dataLayer.push({ event: "NETWORK_DISCONNECTED_EVENT" }),
            e(!1);
        });
    }
    a.GObject.inherit(Je, a.GEventTarget),
      (Je.prototype._documentTouchHandler = null),
      (Je.prototype._editorTouchHandler = null),
      (Je.prototype._persona = d.GPersona.GraphicDesign),
      (Je.prototype._paymentFlow = null),
      (Je.prototype._license = void 0),
      (Je.prototype._translationManager = void 0),
      (Je.prototype._initialized = !1),
      (Je.prototype._ready = !1),
      (Je.prototype._settings = null),
      (Je.prototype._settingsLoaded = !1),
      (Je.prototype._softwareUpdateManager = null),
      (Je.prototype._swatches = null),
      (Je.prototype._workspace = null),
      (Je.prototype._CDRIntegrationEngine = null),
      (Je.prototype._documents = null),
      (Je.prototype._activeDocument = null),
      (Je.prototype._mainframe = null),
      (Je.prototype._frame = null),
      (Je.prototype._info = null),
      (Je.prototype._footer = null),
      (Je.prototype._header = null),
      (Je.prototype._toolbar = null),
      (Je.prototype._panels = null),
      (Je.prototype._leftSidebars = null),
      (Je.prototype._rightSidebars = null),
      (Je.prototype._windows = null),
      (Je.prototype._actions = null),
      (Je.prototype._actionsMap = null),
      (Je.prototype._clipboardMimeTypes = null),
      (Je.prototype._newDocumentDialog = null),
      (Je.prototype._userNameConfigDialog = null),
      (Je.prototype._contextMenu = null),
      (Je.prototype._stylesPreview = {}),
      (Je.prototype._version = null),
      (Je.prototype._commitSHA = null),
      (Je.prototype._buildNum = null),
      (Je.prototype._isBeta = null),
      (Je.prototype._storeVendor = null),
      (Je.prototype._env = null),
      (Je.prototype._user = null),
      (Je.prototype._fontsPath = null),
      (Je.prototype._paste = null),
      (Je.prototype._enabledSubscriptions = !1),
      (Je.prototype._reloading = !1),
      (Je.prototype._utm = null),
      (Je.prototype._location = null),
      (Je.prototype._supportedBrowsers = []),
      (Je.prototype._supportedTabletBrowsers = []),
      (Je.prototype._isBrowserSupported = !0),
      (Je.prototype._showCreateAccount = !1),
      (Je.prototype._signupOptions = null),
      (Je.prototype._enterpriseLoginForm = !1),
      (Je.prototype._anonymous = !1),
      (Je.prototype._assistantBar = null),
      (Je.prototype._mainMenu = null),
      (Je.prototype._mouseOverContext = {
        context: null,
        prevEvt: null,
        contextCallback: null,
      }),
      (Je.prototype._realtimeManager = null),
      (Je.prototype._fileReviewManager = null),
      (Je.prototype._shareManager = null),
      (Je.prototype._cloudCommunicationManager = null),
      (Je.prototype._annotationsManager = null),
      (Je.prototype._cursorManager = null),
      (Je.prototype._draggableItemIsDragging = !1),
      (Je.prototype._amplitudeHelper = null),
      (Je.prototype._banner = null),
      (Je.prototype._overlay = null),
      (Je.prototype.getOverlay = function () {
        return this._overlay;
      }),
      (Je.prototype.getBanner = function () {
        return this._banner;
      }),
      (Je.prototype.getMainMenu = function () {
        return this._mainMenu;
      }),
      (Je.prototype.propertyPanelHasContextMenu = function (e) {
        var t = !1;
        return (
          e.composedPath &&
            e.composedPath() &&
            e.path.forEach((e) => {
              $(e).hasClass("properties-panel") &&
                (t = !!$(e).data("contextmenu"));
            }),
          t
        );
      }),
      (Je.prototype.getMouseOverContext = function () {
        return this._mouseOverContext;
      }),
      (Je.prototype.setMouseOverContext = function (e, t, n) {
        this._mouseOverContext = { context: e, prevEvt: t, contextCallback: n };
      }),
      (Je.prototype._pwaEvent = window.__pwaEvent__ || null),
      (Je.prototype.isAnonymous = function () {
        return this._anonymous;
      }),
      (Je.prototype.toggleLoading = function (e) {
        e
          ? $("body").addClass("g-loading")
          : $("body").removeClass("g-loading");
      }),
      (Je.prototype.setSupportedBrowsers = function (e) {
        this._supportedBrowsers = e;
      }),
      (Je.prototype.setSupportedTabletBrowsers = function (e) {
        this._supportedTabletBrowsers = e;
      }),
      (Je.prototype._initBrowserSupported = function (e) {
        var t = (t) =>
          t.some((t) =>
            t instanceof Object
              ? a.GSystem.operatingSystem == t.operatingSystem &&
                e == t.platform
              : e === t
          );
        a.GSystem.hardware === a.GSystem.Hardware.Tablet
          ? (this._isBrowserSupported = t(this._supportedTabletBrowsers))
          : a.GSystem.hardware == a.GSystem.Hardware.Desktop
          ? (this._isBrowserSupported = t(this._supportedBrowsers))
          : (this._isBrowserSupported = !1);
      }),
      (Je.prototype.isBrowserSupported = function () {
        return (
          gContainer.getRuntime() === Z.Runtime.IPad || this._isBrowserSupported
        );
      }),
      (Je.prototype.setUTM = function (e) {
        this._utm = e;
      }),
      (Je.prototype.getUTM = function () {
        return this._utm;
      }),
      (Je.prototype.getTranslationManager = function () {
        return this._translationManager;
      }),
      (Je.prototype.activatePersona = function (e) {
        var t = this._persona;
        t !== e &&
          ((this._persona = e),
          this.hasEventListeners(oe) && this.trigger(new oe(t, this._persona)));
      }),
      (Je.prototype.getActivePersona = function () {
        return this._persona;
      }),
      (Je.prototype.getDefaultStorage = function () {
        return gContainer.getStorage();
      }),
      (Je.prototype.getWorkspace = function () {
        return this._workspace;
      }),
      (Je.prototype.getCDRIntegrationEngine = function () {
        return this._CDRIntegrationEngine;
      }),
      (Je.prototype.getApplicationManager = function () {
        return this._applicationManager;
      }),
      (Je.prototype.getSoftwareUpdateManager = function () {
        return this._softwareUpdateManager;
      }),
      (Je.prototype.getShareManager = function () {
        return this._shareManager;
      }),
      (Je.prototype.getCloudCommunicationManager = function () {
        return this._cloudCommunicationManager;
      }),
      (Je.prototype.getAnnotationsManager = function () {
        return this._annotationsManager;
      }),
      (Je.prototype.getCursorManager = function () {
        return this._cursorManager;
      }),
      (Je.prototype.getRealtimeManager = function () {
        return this._realtimeManager;
      }),
      (Je.prototype.getFileReviewManager = function () {
        return this._fileReviewManager;
      }),
      (Je.prototype.getToolManager = function () {
        return this._workspace.getToolManager();
      }),
      (Je.prototype.getDocuments = function () {
        return this._documents;
      }),
      (Je.prototype.getActiveDocument = function () {
        return this._activeDocument ? this._activeDocument : null;
      }),
      (Je.prototype.getActiveView = function () {
        const e = gDesigner.getActiveDocument(),
          t = e && e.getActiveWindow();
        return t && t.getView();
      }),
      (Je.prototype.getHeader = function () {
        return this._header;
      }),
      (Je.prototype.getInfo = function () {
        return this._info;
      }),
      (Je.prototype.getToolbar = function () {
        return this._toolbar;
      }),
      (Je.prototype.getPanels = function () {
        return this._panels;
      }),
      (Je.prototype.getLeftSidebars = function () {
        return this._leftSidebars;
      }),
      (Je.prototype.getRightSidebars = function () {
        return this._rightSidebars;
      }),
      (Je.prototype.getWindows = function () {
        return this._windows;
      }),
      (Je.prototype.isPartVisible = function (e) {
        return "none" !== this.getPart(e).css("display");
      }),
      (Je.prototype.setPartVisible = function (e, t, n) {
        t != this.isPartVisible(e) &&
          (this.getPart(e).css(
            "display",
            t ? (n || "" === n ? n : "block") : "none"
          ),
          this.relayout());
      }),
      (Je.prototype.getPart = function (e) {
        return this._mainframe.find("#" + e.id);
      }),
      (Je.prototype.getActions = function () {
        return this._actions;
      }),
      (Je.prototype.getAction = function (e) {
        return this._actionsMap[e] || null;
      }),
      (Je.prototype.addMenu = function (e, t, n, o, i) {
        e = e || this._mainMenu;
        var a = new x(x.Type.Menu, C);
        return (
          a.setCaption(t),
          a.setIcon(o),
          e.addItem(a),
          n && a.getMenu().addEventListener(S, n),
          i && a.addEventListener(x.UpdateEvent, () => i(a)),
          a.getMenu()
        );
      }),
      (Je.prototype.addMenuSeparator = function (e, t) {
        var n = new x(x.Type.Divider, null, null, t);
        return e.addItem(n), n;
      }),
      (Je.prototype.addMenuItem = function (e, t, n, o, i, a, r, s, l, c, d) {
        var u = new x(x.Type.Item);
        return (
          a && u.addEventListener(x.ActivateEvent, a),
          i &&
            (gDesigner.registerShortcut(
              i,
              function (e) {
                return a("shortcut", e);
              }.bind(this),
              r
            ),
            u.setShortcutHint(i)),
          u.setIcon(n),
          u.setPro(s),
          u.setNoHover(d),
          c && u.addClass(c),
          this.updateMenuItem(u, t, !0, !1),
          e.addItem(u),
          l && u.setAction(l),
          u
        );
      }),
      (Je.prototype.updateMenuItem = function (e, t, n, o, i, a) {
        e.setCaption(t), e.setEnabled(n), e.setChecked(o), e.setPro(!!i, a);
      }),
      (Je.prototype.removeMenuItem = function (e, t) {
        e.removeItem(e.indexOf(t));
      }),
      (Je.prototype.getClipboardMimeTypes = function () {
        return this._clipboardMimeTypes
          ? Object.keys(this._clipboardMimeTypes)
          : null;
      }),
      (Je.prototype.getClipboardContent = function (e) {
        return this._clipboardMimeTypes &&
          this._clipboardMimeTypes.hasOwnProperty(e)
          ? this._clipboardMimeTypes[e]
          : null;
      }),
      (Je.prototype.setClipboardContent = function (e, t) {
        this._clipboardMimeTypes[e] = t;
      }),
      (Je.prototype.getSetting = function (e, t) {
        return this._settings.hasOwnProperty(e) ? this._settings[e] : t;
      }),
      (Je.prototype.setSetting = function (e, t) {
        if (this._settingsLoaded) {
          for (
            var n = e instanceof Array ? e : [e],
              o = e instanceof Array ? t : [t],
              i = !1,
              r = 0;
            r < n.length;
            ++r
          ) {
            (e = n[r]), (t = o[r]);
            if (
              !this._settings.hasOwnProperty(e) ||
              !a.GUtil.equals(this._settings[e], t, !0)
            ) {
              var s = this._settings[e];
              (this._settings[e] = t),
                this.trigger(new M(e, s || void 0, t)),
                (i = !0);
            }
          }
          if (i)
            try {
              gContainer.setProperty("designer.settings", this._settings);
            } catch (e) {}
          return i;
        }
      }),
      (Je.prototype.getSwatches = function (e) {
        if (e.startsWith("document") && this.getActiveDocument()) {
          var t = this.getActiveDocument().getScene().getSwatches(),
            n = [];
          if (t)
            for (var o = t.getFirstChild(); null !== o; o = o.getNext()) {
              var i = a.GPattern.serialize(o.getProperty("_pt"));
              (((i.startsWith("C#") || i.startsWith("Y#")) &&
                "document" === e) ||
                (i.startsWith("L#") && "document-linear-gradient" === e) ||
                (i.startsWith("R#") && "document-radial-gradient" === e) ||
                (i.startsWith("A#") && "document-angular-gradient" === e) ||
                (i.startsWith("T#") && "document-texture-pattern" === e) ||
                (i.startsWith("N#") && "document-noise-pattern" === e)) &&
                n.push(o);
            }
          return n;
        }
        return this._swatches[e];
      }),
      (Je.prototype.setSwatches = function (e, t, n) {
        if (
          (!e.startsWith("document") || this.getActiveDocument()) &&
          (e.startsWith("document") || this._swatches.hasOwnProperty(e))
        ) {
          e.startsWith("document") || (this._swatches[e] = t);
          var o = e.startsWith("document"),
            i = e.startsWith("global"),
            r = this.getActiveDocument().getScene();
          if (o) {
            if (n) r.getSwatches().clearChildren();
            else {
              for (
                var s = this.getSwatches(e),
                  l = [],
                  c = r.getSwatches().getFirstChild();
                null !== c;
                c = c.getNext()
              )
                for (var d = 0; d < s.length; ++d)
                  a.GUtil.equals(c, s[d]) && l.push(c);
              for (d = 0; d < l.length; ++d) r.getSwatches().removeChild(l[d]);
            }
            for (d = 0; d < t.length; ++d) r.getSwatches().appendChild(t[d]);
          } else if (i) {
            var u = this._swatches.global;
            u = (u = (u = (u = (u = u.concat(
              this._swatches["global-linear-gradient"]
            )).concat(this._swatches["global-angular-gradient"])).concat(
              this._swatches["global-radial-gradient"]
            )).concat(this._swatches["global-texture-pattern"])).concat(
              this._swatches["global-noise-pattern"]
            );
            var p = [];
            for (d = 0; d < u.length; ++d) p.push(a.GNode.serialize(u[d]));
            gContainer.setProperty("swatches", p);
          }
          this.trigger(new N(e));
        }
      }),
      (Je.prototype.getAllSwatches = function (e) {
        var t = [];
        if (e.startsWith("document"))
          for (
            var n = this.getActiveDocument()
              .getScene()
              .getSwatches()
              .getFirstChild();
            null !== n;
            n = n.getNext()
          )
            t.push(n);
        else
          t = (t = (t = (t = (t = (t = t.concat(this._swatches.global)).concat(
            this._swatches["global-linear-gradient"]
          )).concat(this._swatches["global-angular-gradient"])).concat(
            this._swatches["global-radial-gradient"]
          )).concat(this._swatches["global-texture-pattern"])).concat(
            this._swatches["global-noise-pattern"]
          );
        return t;
      }),
      (Je.prototype.newInfiniteDocument = function () {
        var e = this.createScene();
        e.getActivePage().setProperties(
          ["bck", "w", "h"],
          [a.GRGBColor.WHITE, 0, 0]
        );
        var t = new w(e);
        return this.addDocument(t), t;
      }),
      (Je.prototype.createScene = function (e) {
        var t = new a.GScene(this.getWorkspace(), e);
        return (
          void 0 !== i.GEditorOptions.scaleBorderWidth &&
            t.setBorderScale(i.GEditorOptions.scaleBorderWidth),
          void 0 !== i.GEditorOptions.scaleCorners &&
            t.setCornersScale(i.GEditorOptions.scaleCorners),
          t
        );
      }),
      (Je.prototype.createNewDocumentDialog = function () {
        this._newDocumentDialog = new z();
      }),
      (Je.prototype.openNewDocumentDialog = function (e) {
        const t = this.getApplicationManager();
        (t.isCreatingNewDocumentEnabled() || t.isOpenFromCloudEnabled()) &&
          (this._newDocumentDialog || (this._newDocumentDialog = new z()),
          0 === $(".g-new-document-dialog").length
            ? this._newDocumentDialog.open(e)
            : e &&
              e.openFromCloud &&
              this._newDocumentDialog
                .getDialogElement()
                .find(".option.cloud-option")
                .click());
      }),
      (Je.prototype.openCloudSaveDialog = function (e, t, n, o, i) {
        0 === $(".g-new-document-dialog").length &&
          (this._newDocumentDialog || (this._newDocumentDialog = new z()),
          this._newDocumentDialog.saveCloudFile(e, t, n, o, i));
      }),
      (Je.prototype._shouldOpenUserNameConfigDialog = function () {
        return (
          !(this._user && !this._user.canUpdateSelfAccountData()) &&
          !(
            this._user &&
            this._user.isAnonymous() &&
            !s.ANONYMOUS_SESSION_ENABLED
          ) &&
          (!this._user || !this._user.getFirstName())
        );
      }),
      (Je.prototype.openUserNameConfigDialog = function () {
        if (!s.ENABLE_COLLABORATION) return;
        let e = this._shouldOpenUserNameConfigDialog();
        if (!this._userNameConfigDialog && e) {
          const e = this._user || { name: "", last_name: "", anonymous: "" };
          this._userNameConfigDialog = new q(e.name, e.last_name, e.anonymous);
        }
        e &&
          0 === $(".g-username-config-dialog").length &&
          this._userNameConfigDialog.open();
      }),
      (Je.prototype.closeNewDocumentDialog = function () {
        this._newDocumentDialog && this._newDocumentDialog.close();
      }),
      (Je.prototype.addDocument = function (e, t) {
        void 0 !== t
          ? this._documents.splice(t, 0, e)
          : this._documents.push(e),
          this.hasEventListeners(B) && this.trigger(new B(B.Type.Added, e)),
          this._windows.addWindow(e, !1, t);
      }),
      (Je.prototype.notifyDocumentModified = function (e) {
        this.hasEventListeners(B) &&
          this.trigger(new B(B.Type.Modified, e, null));
      }),
      (Je.prototype._isNativeDesign = function (e) {
        return e === s.FILE_FORMATS.find((e) => e.default).ext.toUpperCase();
      }),
      (Je.prototype.isInitialized = function () {
        return this._initialized;
      }),
      (Je.prototype._canOpenDocument = function (e) {
        if (!this._initialized) return !1;
        if (!this.isEnabledProFeatures()) {
          let t = w.FileTypes.find(
            (t) =>
              t.ext.toUpperCase() === (e.getExtension() || "").toUpperCase()
          );
          if (t && t.pro)
            return (
              gDesigner.stats(
                "document_nonprotriespro_".concat(t.ext.toLowerCase())
              ),
              this.handlePROFeatureInterruption(),
              !1
            );
        }
        return !0;
      }),
      (Je.prototype._processOpenDocument = function (e, t) {
        const n = e.getExtension(),
          o = this._isNativeDesign(n),
          i = new w(o ? e : null);
        if (i.isExtensionAvailableForLoading(n))
          return (
            this.addDocument(i, t),
            (i.fileExtension = n),
            i.load(e),
            this.trigger(new B(B.Type.Opened, i)),
            i
          );
        var r = !!w.FileTypes.find(
          (e) =>
            e.ext.toUpperCase() === n.toUpperCase() && "image" === e.category
        )
          ? "text.suggestion-open-image"
          : "text.unsupported-file-extension";
        return ee.alert(a.GLocale.get(new a.GLocaleKey("GDocument", r))), null;
      }),
      (Je.prototype.openDocumentWithReload = function (e, t) {
        if (this._canOpenDocument(e)) return this._processOpenDocument(e, t);
      }),
      (Je.prototype.openDocument = function (e, t) {
        if (!this._canOpenDocument(e)) return;
        if (e && (0, p.shouldShowExternalFileError)(e)) throw new m.default();
        const n = e.getExtension();
        if (this._isNativeDesign(n)) {
          const t = e.getUniqueId();
          if (null != t)
            for (var o = 0; o < this._documents.length; ++o) {
              const n = this._documents[o];
              if (
                n.getStorageItem() &&
                n.getStorageItem().getUniqueId() === t &&
                (!n.getStorageItem().getVersionId ||
                  !e.getVersionId ||
                  n.getStorageItem().getVersionId() === e.getVersionId())
              )
                return this.activateDocument(n), n;
            }
        }
        return this._processOpenDocument(e, t);
      }),
      (Je.prototype.addToRecentFiles = function (e) {
        function t(t, n) {
          let o =
            arguments.length > 2 && void 0 !== arguments[2] && arguments[2];
          gContainer.getProperty(t).then(function (i) {
            o && i && (i = JSON.parse(Ue.base64StringToString(i))),
              i || (i = []);
            for (var a = 0; a < i.length; ++a) {
              let t = !1;
              if (gContainer.getRuntime() === Z.Runtime.Electron)
                t = i[a] === n(e);
              else {
                let n = JSON.parse(i[a]),
                  o = e.getFile();
                t = n.file.id === o.id;
              }
              if (t) {
                i.splice(a, 1);
                break;
              }
            }
            i.unshift(n(e)),
              i.splice(10, i.length),
              o && (i = Ue.stringToBase64String(JSON.stringify(i))),
              gContainer.setProperty(t, i),
              gDesigner.updateRecentDocumentsAction();
          });
        }
        e &&
          (e instanceof J.Item
            ? gDesigner.updateRecentDocumentsAction()
            : gContainer.getRuntime() === Z.Runtime.Electron
            ? t("recent_documents", (e) => e.getUniqueId())
            : e instanceof Fe.Item &&
              gDesigner.getUser().then((e) => {
                t(
                  "recent_external_".concat(e.getUID()),
                  (e) => {
                    const t =
                      e instanceof f.default.Item ? "googledrive" : null;
                    return JSON.stringify({ type: t, file: e.getFile() });
                  },
                  !0
                );
              }));
      }),
      (Je.prototype.activateDocument = function (e, t) {
        if (e != this._activeDocument) {
          if (this._activeDocument) {
            var n = this._activeDocument;
            (this._activeDocument = null),
              n.deactivate(),
              this.hasEventListeners(B) &&
                this.trigger(new B(B.Type.Deactivated, n)),
              n.getActiveWindow() === this._windows.getActiveWindow() &&
                this._windows.activateWindow(null);
          }
          e &&
            ((this._activeDocument = e),
            t || this._windows.activateWindow(e.getActiveWindow()),
            e.activate(),
            this.hasEventListeners(B) &&
              this.trigger(new B(B.Type.Activated, e)));
        }
      }),
      (Je.prototype.replaceDocument = function (e, t, n) {
        var o = this._documents.indexOf(e);
        o < 0 || (this.addDocument(t, o), this.removeDocument(e, null, n));
      }),
      (Je.prototype.removeDocument = function (e, t, n) {
        var o = this._documents.indexOf(e);
        if (!(o < 0)) {
          var i = e.getWindows();
          if (i.length) {
            var a = function () {
              i.length > 0
                ? this._windows.removeWindow(i[0], a, n)
                : this.removeDocument(e, t);
            }.bind(this);
            a();
          } else
            e === this.getActiveDocument() && this.activateDocument(null),
              e.release(),
              this._documents.splice(o, 1),
              t && t(),
              this.hasEventListeners(B) &&
                this.trigger(new B(B.Type.Removed, e)),
              0 === this._documents.length &&
                this.handleWelcomeScreenOpenWithUserPermissions();
        }
      }),
      (Je.prototype.handleWelcomeScreenOpenWithUserPermissions = function () {
        let e = {
          closable: this.getApplicationManager().isCreatingNewDocumentEnabled(),
          showCloudOptions: !0,
          closeCallback: (e) => {
            e && gDesigner.newInfiniteDocument();
          },
        };
        var t;
        this.getLicense().canAccessFreemium()
          ? this.openNewDocumentDialog(e)
          : (this._newDocumentDialog || (this._newDocumentDialog = new z()),
            null === (t = this._newDocumentDialog) ||
              void 0 === t ||
              t._newDocumentCustomSize());
      }),
      (Je.prototype.canExecuteAction = function (e, t) {
        var n = this.getAction(e);
        return !!n && n.isAvailable() && n.isEnabled.apply(n, t);
      }),
      (Je.prototype.canActivateTool = function (e) {
        let t = arguments.length > 1 && void 0 !== arguments[1] && arguments[1];
        if (
          !t ||
          !s.HAS_ANNOTATIONS ||
          this.getRightSidebars().getActiveSidebar() != D.ID
        )
          return !0;
        const n = ["path", "shape", "knife", "insert"],
          o = ["special"];
        return !gravit.tools.some((t) => {
          let { tool: i, group: a, category: r } = t;
          return i === e && (n.includes(a) || o.includes(r));
        });
      }),
      (Je.prototype.executeAction = function (e, t, n, o) {
        var i = this.getAction(e);
        if (!i)
          throw new Error(
            "Unable to execute action '" + e + "' - not registered."
          );
        var a = this._windows.getActiveWindow();
        if (!a || !a.isPreview()) {
          if (i.isAvailable() && i.isEnabled.apply(i, t)) {
            if (e === Pe.ID)
              this.getPart(F.Toolbar)
                .find(".toolbar-button[data-action='" + e + "']")
                .find("button")
                .toggleClass("g-disabled", !0);
            var r = i.execute;
            if (("shortcut" === n && (r = i.executeFromShortcut), !o)) {
              var s = i.isPro()
                ? gDesigner.isEnabledProFeatures(e)
                  ? "execute"
                  : "nonprotriespro"
                : "execute";
              this.stats(
                "action_" + s + "_" + (n || "button"),
                i.statsValue() || e
              );
            }
            var l = r.apply(i, t);
            if (void 0 !== l) return l;
          }
          return !0;
        }
      }),
      (Je.prototype.setOpenSansDefaultFont = function () {
        var e = this._workspace.getFontManager();
        e.setDefaultFont(
          e.getFont("Open Sans", a.GFont.Style.Normal, a.GFont.Weight.Regular)
        ),
          e.setDefaultFontStyles([a.GFont.Style.Normal, a.GFont.Style.Italic]),
          e.setDefaultFontWeights([300, 400, 600, 700, 800]);
      }),
      (Je.prototype.isTouchDevice = function () {
        return (
          s.TOUCH_LAYOUT &&
          ("ontouchstart" in window ||
            !!navigator.msMaxTouchPoints ||
            !!navigator.maxTouchPoints)
        );
      }),
      (Je.prototype.isTouchEnabled = function () {
        return (
          gContainer.getRuntime() === Z.Runtime.IPad ||
          (!!s.TOUCH_LAYOUT &&
            this.isEnabledProFeatures() &&
            !!this.getSetting("touch", !1))
        );
      }),
      (Je.prototype.setTouchEnabled = function (e) {
        this.setSetting("touch", !!e);
      }),
      (Je.prototype.init = function () {
        (this._shareManager = new ge()),
          (this._realtimeManager = new me()),
          (this._fileReviewManager = new ye()),
          (this._annotationsManager = new ve()),
          gContainer.registerFontProviders(),
          H.getInstance().init();
        var e = this._workspace.getFontManager();
        if (
          (e.addEventListener(
            a.GFontManager.ResolveFontEvent,
            this._fontManagerResolveFontEvent,
            this
          ),
          e.addEventListener(
            a.GFontManager.QueryFontFamilyEvent,
            this._fontManagerQueryFontFamilyEvent,
            this
          ),
          this.setOpenSansDefaultFont(),
          a.GLocale.getLanguage() === a.GLocaleLanguage.Chinese ||
            a.GLocale.getLanguage() === a.GLocaleLanguage.ChineseTaiwan)
        )
          H.getProviderInstance(W).hasFont("Noto Sans CS") &&
            (e.setDefaultFont(
              e.getFont(
                "Noto Sans CS",
                a.GFont.Style.Normal,
                a.GFont.Weight.Regular
              )
            ),
            e.setDefaultFontStyles([a.GFont.Style.Normal]),
            e.setDefaultFontWeights([100, 200, 300, 400, 500, 600, 800]));
        else if (a.GLocale.getLanguage() === a.GLocaleLanguage.Japanese) {
          H.getProviderInstance(W).hasFont("Noto Sans CJK JP") &&
            (e.setDefaultFont(
              e.getFont(
                "Noto Sans CJK JP",
                a.GFont.Style.Normal,
                a.GFont.Weight.Regular
              )
            ),
            e.setDefaultFontStyles([a.GFont.Style.Normal]),
            e.setDefaultFontWeights([400, 700]));
        }
        (this._CDRIntegrationEngine = Re.createCDRIntegrationEngine()),
          (i.GEditorOptions.selectDoubleClickBehavior = "subselect"),
          (i.GEditorOptions.coordinatesTooltip = !0),
          (i.GEditorOptions.bboxPositionTooltip = !1),
          (i.GEditorOptions.sizeTooltip = !1),
          (i.GEditorOptions.angleTooltip = !1),
          (i.GEditorOptions.showTooltips = !0),
          (i.GEditorOptions.propertiesExcludedFromCopying =
            Le.PropertiesToExcludeFromCopying),
          (i.GEditorOptions.adaptiveResizeHandles = !0),
          i.GSkewHorizontalAnnotation.setIcon(
            "assets/annotation/touch/skew-horizontal-handle.png"
          ),
          i.GSkewVerticalAnnotation.setIcon(
            "assets/annotation/touch/skew-vertical-handle.png"
          ),
          i.GPreserveAspectRatioAnnotation.setIcon(
            "assets/annotation/touch/preserve-aspect-ratio-handle.png"
          ),
          i.GRotateAnnotation.setIcon(
            "assets/annotation/touch/rotate-handle.png"
          ),
          l.DESIGNER.HIGHLIGHT_COLOR &&
            (a.GPaintContext.prototype.highlightOutlineColor =
              l.DESIGNER.HIGHLIGHT_COLOR),
          gContainer.getProperty(R._keepRatioName).then((e) => {
            (e = e || !1),
              (i.GEditorOptions.preserveAspectRatio = e),
              (i.GEditorOptions.allowTextRatioPreservation = e);
          }),
          (a.GSceneOptions.scaleLabel = !1),
          (a.GSceneOptions.defaultBorderPositionForLines = !0),
          (i.GEditorPaintConfiguration.prototype.pageDecoration.shadow = 4),
          (i.GEditorPaintConfiguration.prototype.pageDecoration.shadowOffsetY = 2),
          (i.GEditorPaintConfiguration.prototype.pageDecoration.shadowBackground =
            "rgba(0,0,0,0.25)"),
          gContainer.getProperty(V.StoragePropertyName).then((e) => {
            e &&
              this.updateGEditorSceneConfigurationPaintMode(
                a.GScenePaintConfiguration.PaintMode.Outline
              );
          }),
          (i.GGridGuide.MIN_CELL_SPACE = 5);
        var t = $("body");
        t.attr("data-long-press-delay", s.LONG_PRESS_TIME_OUT),
          t.on("long-press", (e) => {
            const t = jQuery.Event("contextmenu", {
              pageX: e.detail.clientX,
              pageY: e.detail.clientY,
              clientX: e.detail.clientX,
              clientY: e.detail.clientY,
            });
            $(e.target).trigger(t);
          }),
          (this._mainframe = $("<div></div>")
            .attr("id", "mainframe")
            .css("display", "none")
            .prependTo(t));
        var n = (this._frame = $("<div></div>").addClass("frame").appendTo(this._mainframe)),
          o = $("<div></div>").attr("id", F.Windows.id).appendTo(n);
        this._windows = new O(o);
        var c = $("<div></div>").attr("id", F.Info.id).appendTo(n);
        this._info = new T(c);
        var d = $("<div></div>").attr("id", F.Header.id).appendTo(n);
        this._header = new E(d);
        var p = $("<div></div>").attr("id", F.Toolbar.id).appendTo(n);
        this._toolbar = new k(p);
        var g = $("<div></div>").attr("id", F.Banner.id).appendTo(n);
        this._banner = new _.default(g);
        var h = $("<div></div>").attr("id", F.Overlay.id).appendTo(n);
        this._overlay = new b.default(h);
        var f = $("<div></div>").attr("id", F.Panels.id).appendTo(n),
          m = $("<div></div>").attr("id", F.Footer.id).appendTo(n);
        (this._footer = new A(m)), (this._panels = new L(f));
        var y = $("<div></div>")
          .attr("id", F.LeftSidebars.id)
          .on("mousedown", () => {
            this._toggleSideBarAndAssistBarZIndex(!0, !1, !1, !1);
          })
          .appendTo(n);
        this._leftSidebars = new I(y, I.Orientation.Left, n);
        var v = $("<div></div>")
          .attr("id", F.RightSidebars.id)
          .on("mousedown", () => {
            this._toggleSideBarAndAssistBarZIndex(!1, !0, !1, !1);
          })
          .appendTo(n);
        (this._rightSidebars = new I(v, I.Orientation.Right, n)),
          this._updateStyles(t),
          this._initBrowserSupported(r.GPlatform.webBrowser),
          this.isBrowserSupported() ||
            ee.showOneTimeDialog(
              a.GLocale.get(
                new a.GLocaleKey(
                  "GSystemDialog",
                  a.GSystem.hardware === a.GSystem.Hardware.Tablet
                    ? "text.unsupported-browser-touch"
                    : "text.unsupported-browser"
                )
              ).replace("%app", ke.DESIGNER.TITLE),
              "designer.settings.dont_show_unsupported_browser_dialog"
            );
        let w = (0, u.debounce)(
          function () {
            this.relayout(),
              setTimeout(() => {
                this._windows.getActiveWindow() &&
                  this._windows
                    .getActiveWindow()
                    .getView()
                    .invalidate(null, !0);
              });
          }.bind(this),
          500
        );
        $(window).resize(
          function () {
            w();
          }.bind(this)
        );
        var C = -1;
        this._actions = gravit.actions.map(
          (e, t) => (e.getId() === U.ID && (C = t), e)
        );
        var x = gravit.sidebars.map((e) => new K(e));
        if (
          (Array.prototype.splice.apply(this._actions, [C, 0].concat(x)),
          this._createMainMenu(),
          gravit.tools)
        ) {
          for (
            var S = (e) => {
                let { tool: t, pro: n = !1, feature: o } = e;
                return () =>
                  !(!this.isEnabledProFeatures(o) && n) &&
                  !!this.canActivateTool(t, !0) &&
                  (gDesigner.stats(
                    "tools_activate_shortcut",
                    k.getToolName(t) || "unknown_tool"
                  ),
                  this.getToolManager().tempToolKeyActivate(t));
              },
              M = (e) => {
                let { tool: t, pro: n = !1, feature: o } = e;
                return () =>
                  !this.isEnabledProFeatures(o) && n
                    ? (this.handlePROFeatureInterruption(), !1)
                    : this.getToolManager().tempToolKeyRelease(t, 450);
              },
              N = 0;
            N < gravit.tools.length;
            ++N
          ) {
            var B = gravit.tools[N];
            if (B.key || B.shortcuts) {
              var j = S(B),
                z = M(B);
              B.key && this.registerShortcut([B.key], j, !1, z),
                Array.isArray(B.shortcuts) &&
                  B.shortcuts.forEach((e) => {
                    this.registerShortcut(e, j, !1, z);
                  });
            }
          }
          this.getToolManager().activateTool(gravit.tools[0].tool);
          var q = function () {
            var e = this.getToolManager();
            return (
              this.getRightSidebars().getActiveSidebar() == D.ID ||
                ((e.getActiveTool() &&
                  e.getActiveTool() instanceof i.GSelectTool) ||
                  e.activateTool(i.GPointerTool),
                e.getActiveTool() instanceof i.GSelectTool &&
                  e.getActiveTool().getEditMode() !==
                    i.GSelectTool.EditMode.Transform &&
                  e
                    .getActiveTool()
                    .setEditMode(i.GSelectTool.EditMode.Transform)),
              !0
            );
          }.bind(this);
          this.registerShortcut(["Q"], q);
        }
        this._info.init(),
          this._header.init(),
          this._toolbar.init(),
          this._panels.init(),
          this._footer.init(),
          this._leftSidebars.init(),
          this._rightSidebars.init(),
          this._windows.init(),
          this._banner.init(),
          this._overlay.init(),
          this._leftSidebars.setActiveSidebar(G.ID),
          this._rightSidebars.setActiveSidebar(P.ID),
          this.setPartVisible(F.Panels, !1),
          this.setPartVisible(F.Info, !1),
          this._mainframe.css("display", ""),
          a.GColor.setCMYKProfile("USWebCoatedSWOPv2", "assets/data/icc/"),
          (this._initialized = !0),
          this._windows.addEventListener(
            O.WindowEvent,
            this._windowEvent,
            this
          ),
          this._leftSidebars.addEventListener(
            I.SidebarEvent,
            this._sidebarEvent,
            this
          ),
          this._rightSidebars.addEventListener(
            I.SidebarEvent,
            this._sidebarEvent,
            this
          ),
          (this._contextMenu = new X(o)),
          this.updateLicenseInfo(),
          this._updateTitle({ saveToSessionHistory: !1 }),
          s.AUTO_SAVE_ENABLED && (this._autoSaveManager = te.getInstance()),
          this.getCursorManager().init(),
          this._updateLayout(),
          requestAnimationFrame(() => this.relayout()),
          this._initAmplitudeProperties(),
          this._updateState();
      }),
      (Je.prototype._updateStyles = function (e) {
        switch (r.GPlatform.webBrowser) {
          case r.GPlatform.constructor.WebBrowser.Edge:
            e.addClass("g-edge");
            break;
          case r.GPlatform.constructor.WebBrowser.Opera:
            e.addClass("g-opera");
            break;
          case r.GPlatform.constructor.WebBrowser.Chrome:
            e.addClass("g-chrome");
            break;
          case r.GPlatform.constructor.WebBrowser.Firefox:
            e.addClass("g-firefox");
            break;
          case r.GPlatform.constructor.WebBrowser.Safari:
            e.addClass("g-safari");
            break;
          case r.GPlatform.constructor.WebBrowser.MSIE:
            e.addClass("g-msie");
        }
        switch (a.GSystem.hardware) {
          case a.GSystem.Hardware.Desktop:
            e.addClass("g-desktop");
            break;
          case a.GSystem.Hardware.Tablet:
            e.addClass("g-tablet");
            break;
          case a.GSystem.Hardware.Phone:
            e.addClass("g-phone");
        }
        switch (a.GSystem.operatingSystem) {
          case a.GSystem.OperatingSystem.Unix:
            e.addClass("g-os-unix");
            break;
          case a.GSystem.OperatingSystem.Windows:
            e.addClass("g-os-windows");
            break;
          case a.GSystem.OperatingSystem.OSX_IOS:
            e.addClass("g-os-osx_ios");
        }
        gContainer.getRuntime() === Z.Runtime.IPad && e.addClass("g-ipad");
      }),
      (Je.prototype.getContextMenu = function () {
        return this._contextMenu;
      }),
      (Je.prototype.getAutoSaveManager = function () {
        if (this._autoSaveManager) return this._autoSaveManager;
      }),
      (Je.prototype.isActiveDocument = function (e) {
        const t = this.getActiveDocument();
        return (
          !!t &&
          !!(e && e instanceof w) &&
          (t === e || !(!t.getId() || t.getId() !== e.getId()))
        );
      }),
      (Je.prototype._setActiveAssistantBar = function (e) {
        if (e) {
          if (!this._assistantBar) {
            const e = $("<div/>")
              .attr("id", F.AssistantBar.id)
              .on("mousedown", () => {
                this._toggleSideBarAndAssistBarZIndex(!1, !1, !0, !1);
              })
              .appendTo(this._frame);
            this._assistantBar = new Be(e);
          }
          this._assistantBar.activate();
        } else this._assistantBar && this._assistantBar.deactivate();
      }),
      (Je.prototype._toggleSideBarAndAssistBarZIndex = function (e, t, n, o) {
        gDesigner.isTouchEnabled() &&
          (this._leftSidebars.getHtmlElement().toggleClass("bring-to-front", e),
          this._rightSidebars.getHtmlElement().toggleClass("bring-to-front", t),
          this._assistantBar.getHtmlElement().toggleClass("bring-to-front", n),
          void 0 !== o &&
            $(".g-notification-panel").toggleClass("bring-to-front", o));
      }),
      (Je.prototype.sendSideBarAndAssistBarToBack = function () {
        this._toggleSideBarAndAssistBarZIndex(!1, !1, !1);
      }),
      (Je.prototype.start = function () {
        return Promise.all([
          gContainer
            .getProperty("designer.settings")
            .then((e) => {
              for (var t in ((e = e || {}), this._settings))
                e.hasOwnProperty(t) || (e[t] = this._settings[t]);
              for (var n in ((this._settings = e),
              (this._settingsLoaded = !0),
              this._settings))
                this.trigger(new M(n, void 0, this._settings[n], !0));
            })
            .catch((e) => Promise.reject(e)),
          gContainer
            .getProperty("swatches")
            .then((e) => {
              if (
                ((this._swatches.global = []),
                (this._swatches["global-linear-gradient"] = []),
                (this._swatches["global-radial-gradient"] = []),
                (this._swatches["global-angular-gradient"] = []),
                (this._swatches["global-texture-pattern"] = []),
                (this._swatches["global-noise-pattern"] = []),
                e)
              )
                for (var t = 0; t < e.length; ++t) {
                  var n =
                      a.GNode.deserialize(e[t]) || a.GPattern.deserialize(e[t]),
                    o = n instanceof a.GSwatch ? n : new a.GSwatch(n);
                  this._addGlobalSwatch(o);
                }
              this.trigger(new N("global"));
            })
            .catch((e) => Promise.reject(e)),
        ]);
      }),
      (Je.prototype._addGlobalSwatch = function (e) {
        var t = a.GPattern.serialize(e.getProperty("_pt"));
        t.startsWith("C#") || t.startsWith("Y#")
          ? this._swatches.global.push(e)
          : t.startsWith("L#")
          ? this._swatches["global-linear-gradient"].push(e)
          : t.startsWith("R#")
          ? this._swatches["global-radial-gradient"].push(e)
          : t.startsWith("A#")
          ? this._swatches["global-angular-gradient"].push(e)
          : t.startsWith("T#")
          ? this._swatches["global-texture-pattern"].push(e)
          : t.startsWith("N#") &&
            this._swatches["global-noise-pattern"].push(e);
      }),
      (Je.prototype.updateRecentDocumentsAction = function () {
        let e = [];
        const t = gContainer.getProperty("recent_documents"),
          n = gDesigner.getUser();
        Promise.all([t, n])
          .then((e) => {
            let [t, n] = e;
            return n
              ? Promise.all([
                  t,
                  n,
                  gContainer.getProperty("recent_external_".concat(n.getUID())),
                ])
              : Promise.reject();
          })
          .then((t) => {
            let [n, o, i] = t;
            var a, r;
            if (n)
              for (a = 0, r = n.length; a < r; ++a) {
                let t = gContainer.getStorage(),
                  o = new t.constructor.Item(t, n[a]);
                e.push(o);
              }
            if (i)
              for (
                i = JSON.parse(Ue.base64StringToString(i)), a = 0, r = i.length;
                a < r;
                ++a
              ) {
                let t,
                  n = gContainer.getStorage(),
                  o = JSON.parse(i[a]);
                "googledrive" === o.type &&
                  (o.file.hasOwnProperty("version") && delete o.file.version,
                  (t = new f.default.Item(n, o.file))),
                  t && e.push(t);
              }
            var s = function () {
              gContainer.updateRecentDocumentsAction(e);
            };
            Q.getRecentStorageItems()
              .then(async function (t) {
                if (t.length > 0)
                  for (var n = 0; n < t.length; ++n)
                    e.push(await J.from(gDesigner.getDefaultStorage(), t[n]));
              })
              .then(s)
              .catch(s);
          });
      }),
      (Je.prototype.removeExternalRecentFiles = function (e, t) {
        gDesigner
          .getUser()
          .then((e) =>
            e
              ? Promise.all([
                  e,
                  gContainer.getProperty("recent_external_".concat(e.getUID())),
                ])
              : Promise.reject()
          )
          .then((n) => {
            let [o, i] = n,
              a = i ? JSON.parse(Ue.base64StringToString(i)) : [];
            a instanceof Array || (a = new Array());
            const r = [];
            for (let n = 0, o = a.length; n < o; n++) {
              let o = JSON.parse(a[n]);
              o &&
                (o.type !== e ||
                  (o.file && o.file.settings && !o.file.settings.accountId) ||
                  (o.file &&
                    o.file.settings &&
                    o.file.settings.accountId !== t)) &&
                r.push(JSON.stringify(o));
            }
            a.length > 0
              ? gContainer.setProperty(
                  "recent_external_".concat(o.getUID()),
                  Ue.stringToBase64String(JSON.stringify(r))
                )
              : gContainer.removeProperty(
                  "recent_external_".concat(o.getUID())
                ),
              gDesigner.updateRecentDocumentsAction();
          });
      }),
      (Je.prototype.relayout = function () {
        if (!this._initialized) return;
        var e,
          t,
          n = 0,
          o = 0;
        (e = this._getTopOffset(n, o)),
          (n = this._getLeftOffset(e)),
          (o = this._getRightOffset(e)),
          (t = this._getBottomOffset(n, o));
        const i = this.isTouchEnabled();
        this._header.relayout(),
          this._toolbar.relayout(),
          this._panels.relayout(),
          this._footer.relayout(),
          this._leftSidebars.relayout(),
          this._rightSidebars.relayout(),
          this._windows.relayout([i ? 0 : n, e, i ? 0 : o, t]);
      }),
      (Je.prototype.updateCollabTextPreviews = async function () {
        var e,
          t = this.getActiveDocument();
        t &&
          ((e = t.getEditor()) && e.closeInlineEditor(),
          await this._CDRIntegrationEngine.processCollabText(t));
      }),
      (Je.prototype._getTopOffset = function (e, t) {
        var n = 0,
          o = this.getPart(F.Info);
        n += this.isPartVisible(F.Info) ? o.outerHeight() : 0;
        var i = this.getPart(F.Header);
        i.css("top", n.toString() + "px"),
          (n += this.isPartVisible(F.Header) ? i.outerHeight() : 0);
        this.getPart(F.Overlay).css("top", n.toString() + "px");
        var a = this.getPart(F.Toolbar);
        a.css("left", e.toString() + "px"),
          a.css("top", n.toString() + "px"),
          a.css("right", t.toString() + "px"),
          (n += this.isPartVisible(F.Toolbar) ? a.outerHeight() : 0);
        const r = this.getPart(F.Banner);
        return (
          r.css("top", n.toString() + "px"),
          (n += this.isPartVisible(F.Banner) ? r.outerHeight() : 0)
        );
      }),
      (Je.prototype._getLeftOffset = function (e) {
        var t = 0,
          n = this._leftSidebars.getSidebar(
            this._leftSidebars.getActiveSidebar()
          ),
          o = n ? n.getMinimumWidth() : 0,
          i = this.getPart(F.LeftSidebars),
          a = this.isPartVisible(F.LeftSidebars);
        return (
          i.outerWidth() < o && a && i.outerWidth(o),
          i.css("top", e.toString() + "px"),
          i.height(this._mainframe.height() - e),
          (t += a ? i.outerWidth() : 0)
        );
      }),
      (Je.prototype._getRightOffset = function (e) {
        var t = 0,
          n = this._rightSidebars.getSidebar(
            this._rightSidebars.getActiveSidebar()
          ),
          o = n ? n.getMinimumWidth() : 0,
          i = this.getPart(F.RightSidebars),
          a = this.isPartVisible(F.RightSidebars);
        return (
          i.outerWidth() < o && a && i.outerWidth(o),
          i.css("top", e.toString() + "px"),
          i.height(this._mainframe.height() - e),
          (t += a ? i.outerWidth() : 0)
        );
      }),
      (Je.prototype._getBottomOffset = function (e, t) {
        var n = 0,
          o = this.getPart(F.Panels);
        o.css("left", e.toString() + "px"),
          o.css("width", (this._mainframe.width() - e - t).toString() + "px");
        var i = this.getPart(F.Footer);
        return (
          i.css("left", e.toString() + "px"),
          i.css("width", (this._mainframe.width() - e - t).toString() + "px"),
          (n += this.isPartVisible(F.Panels) ? o.outerHeight() : 0),
          (n += this.isPartVisible(F.Footer) ? i.outerHeight() : 0)
        );
      }),
      (Je.prototype.positionIsOnCanvas = function (e, t) {
        var n,
          o,
          i = 0,
          a = 0;
        return (
          (n = this._getTopOffset(i, a)),
          (i = this._getLeftOffset(n)),
          (a = this._getRightOffset(n)),
          (o = this._getBottomOffset(i, a)),
          e > i &&
            e < window.innerWidth - a &&
            t > n &&
            t < window.innerHeight - o
        );
      }),
      (Je.prototype.updateGEditorSceneConfigurationPaintMode = function (e) {
        [
          a.GScenePaintConfiguration.PaintMode.Full,
          a.GScenePaintConfiguration.PaintMode.Outline,
          a.GScenePaintConfiguration.PaintMode.Fast,
        ].indexOf(e) < 0 ||
          (i.GEditorPaintConfiguration.prototype.paintMode = e);
      }),
      (Je.prototype.registerShortcut = function (e, t, n, o) {
        var s = function (e, t) {
            return (n) => {
              var o,
                r,
                s = this.getActiveDocument();
              if (s && (o = s.getEditor()) && o.isInlineEditing()) {
                var l = o.getCurrentInlineEditorNode();
                i.GElementEditor &&
                  l instanceof a.GText &&
                  (r = i.GElementEditor.getEditor(l));
              }
              if (!((t && r && r.handleKeyDown(n) && (t || r)) || !0 !== e(n)))
                return n.preventDefault(), n.stopPropagation(), !1;
            };
          }.bind(this),
          l = n ? ze.bindGlobal : ze.bind;
        2 === e.length && e[0] === r.GKey.Constant.META && "+" === e[1]
          ? (l(this._shortcutToMouseTrapShortcut(e), s(t, !0)),
            l("mod+=", s(t, !0), "keydown"),
            o && l("mod+=", s(o, !1), "keyup"))
          : (l(this._shortcutToMouseTrapShortcut(e), s(t, !0), "keydown"),
            o && l(this._shortcutToMouseTrapShortcut(e), s(o, !1), "keyup"));
      }),
      (Je.prototype._createMainMenu = function () {
        for (
          var e = [],
            t = { items: [] },
            n = function (t) {
              for (var n = 0; n < e.length; ++n)
                if (e[n].item === t) return e[n].group;
            },
            o = function (t, o, i) {
              if (t.items.length > 0) {
                var a = t.items[t.items.length - 1];
                if (n(a) !== i) {
                  var r = { type: "divider" };
                  if ("item" === a.type && a.action) {
                    var s = (function (t) {
                      for (var o = n(t), i = [], a = 0; a < e.length; ++a)
                        e[a].group === o && i.push(t);
                      return i;
                    })(a);
                    r.isVisible = function () {
                      return s.some((e) => e.action.isVisible());
                    };
                  }
                  t.items.push(r);
                }
              }
              e.push({ item: o, group: i });
            },
            i = 0;
          i < this._actions.length;
          ++i
        ) {
          var r = this._actions[i];
          if (((this._actionsMap[r.getId()] = r), !r.isAvailable())) continue;
          let e = r.getCategory();
          for (var s = [e]; (e = e.parent); ) s.push(e);
          s.reverse();
          var l = r.getGroup(),
            c = r.getGroupIcon(),
            d = (r.getStyleClass(), l ? [""].concat(l.split("/")) : null);
          if (d && s && s.length !== d.length - 1)
            throw new Error(
              "The number of categories is different than the number of groups."
            );
          var u = t;
          if (s)
            for (var p = 0; p < s.length; ++p) {
              let e = s[p],
                t = d ? d[p] : null;
              for (
                var g = null, h = e.label.split("/")[p], f = 0;
                f < u.items.length;
                ++f
              )
                h == u.items[f].caption && (g = u.items[f]);
              g ||
                (o(
                  u,
                  (g = {
                    type: "menu",
                    caption: h,
                    items: [],
                    icon: c,
                    category: e,
                  }),
                  t
                ),
                u.items.push(g)),
                (u = g);
            }
          var m = { type: "item", action: r };
          o(u, m, d ? d[d.length - 1] : null), u.items.push(m);
        }
        var y = function (e, t) {
            "menu" === e.type
              ? (e.menu = v(e, t))
              : "divider" === e.type
              ? (e.separator = this.addMenuSeparator(t, e.isVisible))
              : "item" === e.type &&
                ((e.item = this.addMenuItem(
                  t,
                  a.GLocale.get(e.action.getTitle()),
                  e.action.getIcon(),
                  e.action.isCheckable(),
                  e.action.getShortcut(),
                  function (t, n) {
                    if ("shortcut" === t)
                      return this._executeShortcutAction(e.action, n);
                  }.bind(this),
                  e.action.isShortcutGlobal(),
                  e.action.isPro(),
                  e.action,
                  e.action._sidebar
                    ? e.action.getStyleClass() + " hidepanel"
                    : e.action.getStyleClass(),
                  e.action.noHover()
                )),
                this.registerAdditionalShortcuts(e.action));
          }.bind(this),
          v = function (e, t) {
            const n = e.category
              ? (t) => {
                  t.setVisible(e.category.visible), t.setIcon(e.category.icon);
                }
              : null;
            for (
              var o = this.addMenu(
                  t,
                  e.caption,
                  function () {
                    for (var t = 0; t < e.items.length; ++t) {
                      var n = e.items[t];
                      "item" === n.type &&
                        this.updateMenuItem(
                          n.item,
                          a.GLocale.get(n.action.getTitle()),
                          n.action.isEnabled(),
                          !!n.action.isCheckable() && n.action.isChecked(),
                          n.action.isPro(),
                          n.action.getId()
                        );
                    }
                  }.bind(this),
                  e.icon,
                  n
                ),
                i = 0;
              i < e.items.length;
              ++i
            )
              y(e.items[i], o);
            return o;
          }.bind(this);
        for (i = 0; i < t.items.length; ++i)
          (g = t.items[i]), v(t.items[i], null);
        this._mainMenu.update();
      }),
      (Je.prototype._workspaceResolveUrlEvent = function (e) {
        Q.resolveImage(e, this.getActiveDocument());
      }),
      (Je.prototype._shareEvent = function (e) {
        e.type === pe.Type.Updated && this._updateSidebars();
      }),
      (Je.prototype._applicationStateChangedEvent = function (e) {
        this._updateSidebars();
        const t = this.getActiveDocument();
        if (t && t.getStatus() === De.Ready) {
          this.getApplicationManager().isCommentingEnabled() &&
            this.openUserNameConfigDialog();
        }
      }),
      (Je.prototype._updateSidebars = function () {
        const e = this.getApplicationManager(),
          t = e.isInspectEnabled(),
          n = e.isCommentingEnabled(),
          o = e.isEditingEnabled();
        if (I.isOrientationActiveInSetting(I.Orientation.Right)) {
          const e = this._rightSidebars.getSidebar(
            this._rightSidebars.getActiveSidebar()
          );
          (e && e.isVisible()) ||
            (o || t
              ? this._rightSidebars.setActiveSidebar(P.ID)
              : n
              ? this._rightSidebars.setActiveSidebar(D.ID)
              : this._rightSidebars.setActiveSidebar(null)),
            this.setPartVisible(F.RightSidebars, n || o || t),
            this._rightSidebars.relayout();
        }
        if (I.isOrientationActiveInSetting(I.Orientation.Left)) {
          const e = this._leftSidebars.getSidebar(
            this._leftSidebars.getActiveSidebar()
          );
          (e && e.isVisible()) ||
            (t
              ? this._leftSidebars.setActiveSidebar(G.ID)
              : this._leftSidebars.setActiveSidebar(null)),
            this.setPartVisible(F.LeftSidebars, t),
            this._leftSidebars.relayout();
        }
      }),
      (Je.prototype._fontManagerResolveFontEvent = function (e) {
        const t = Object.assign({}, e);
        try {
          H.resolveFont(t);
        } catch (t) {
          throw (e.failed(), t);
        }
      }),
      (Je.prototype._fontManagerQueryFontFamilyEvent = function (e) {
        try {
          H.resolveQueryFontFamily(e);
        } catch (t) {
          throw (e.failed(), t);
        }
      }),
      (Je.prototype._documentEvent = function (e) {
        switch (e.type) {
          case B.Type.OwnerUpdated:
            if (e.document) {
              const t = e.document.getOwner();
              if (t) {
                const n = e.document.isCloudFile()
                    ? e.document.getStorageItem().getFile()
                    : null,
                  o = n ? n.url_t || n.url : null,
                  i = a.GLocale.get(
                    new a.GLocaleKey("GDesigner", "text.preview-by")
                  )
                    .replace("%name", t.name)
                    .replace("%appname", ke.DESIGNER.TITLE);
                $('meta[name="description"]').attr("content", i),
                  $('meta[property="og:title"]').attr(
                    "content",
                    a.GLocale.get(
                      new a.GLocaleKey("GDesigner", "text.design-by")
                    )
                      .replace("%name", t.name)
                      .replace("%appname", ke.DESIGNER.TITLE)
                  ),
                  $('meta[property="og:description"]').attr("content", i),
                  o && $('meta[property="og:image"]').attr("content", o),
                  $('meta[property="og:url"]').attr("content", location.href),
                  $('meta[name="twitter:card"]').attr(
                    "content",
                    "summary_large_image"
                  ),
                  $('meta[property="og:site_name"]').attr(
                    "content",
                    ke.DESIGNER.TITLE
                  );
              }
            }
            this._updateTitle({ saveToSessionHistory: !1 });
            break;
          case B.Type.StorageItemUpdated:
            this._updateTitle(), this._registerUsage(e.document);
            break;
          case B.Type.Added:
            this._newDocumentDialog && this._newDocumentDialog.close();
        }
      }),
      (Je.prototype._registerUsage = function (e) {
        const t = e.getStorageItem();
        t &&
          t.isRegistrable() &&
          Oe.usage(t.getId()).catch((e) => {
            console.error("gApi.usage error", e);
          });
      }),
      (Je.prototype._windowEvent = function (e) {
        let t;
        switch (e.type) {
          case O.WindowEvent.Type.Added:
          case O.WindowEvent.Type.Removed:
            this._updateTitle();
            break;
          case O.WindowEvent.Type.Activated:
            1 === this._windows.getWindows().length && this._updateTheme(),
              this.getToolManager().setView(e.window.getView()),
              this._leftSidebars.setView(e.window.getView()),
              this._rightSidebars.setView(e.window.getView()),
              this._updateTitle(),
              (t = e.window.getView().getHtmlElement()),
              this._editorTouchHandler.activate(t);
            break;
          case O.WindowEvent.Type.Deactivated:
            (t = e.window.getView().getHtmlElement()),
              this._editorTouchHandler.deactivate(t),
              this.getToolManager().setView(null),
              this._leftSidebars.setView(null),
              this._rightSidebars.setView(null),
              this._updateTitle();
        }
      }),
      (Je.prototype._sidebarEvent = function (e) {
        e.type === I.SidebarEvent.Type.Activated && this.relayout();
      }),
      (Je.prototype._settingChangedEvent = function (e) {
        switch (e.key) {
          case "touch":
            e.restoring && e.newValue && !this.isTouchEnabled()
              ? this.setTouchEnabled(!1)
              : this._updateLayout(),
              this._updateEditorOptions(),
              this._updateGTM();
            break;
          case "theme":
            this._setTheme(e.newValue);
            break;
          case "snap_disabled":
            i.GGuides.options.disabled = e.newValue;
            break;
          case "snap_zones":
            i.GGuides.options.zones = e.newValue;
            break;
          case "snap_guides":
            i.GGuides.options.guides = e.newValue;
            break;
          case "highlight_on_hover":
            i.GEditorOptions.highlightOnHover = e.newValue;
            break;
          case "dont_store_textpath":
            a.GText.dontStorePaths = e.newValue;
            break;
          case "decimals_num":
            a.GScene.decimalsNum = e.newValue;
            break;
          case "enable_steps_debug":
            i.GEditorOptions.debugTransactions = e.newValue;
            break;
          case "enable_cache":
            "function" == typeof gdb_loaddesign &&
              ((a.GRendererConfig.ENABLE_CACHE = e.newValue),
              gDesigner.getActiveDocument() &&
                gDesigner.getActiveDocument().getActiveWindow() &&
                (gDesigner
                  .getActiveDocument()
                  .getActiveWindow()
                  .getView()
                  .cleanCache(),
                gDesigner
                  .getActiveDocument()
                  .getActiveWindow()
                  .getView()
                  .configureCache()));
            break;
          case "ui_toolbar_alignment":
            e.newValue
              ? this._frame.removeClass("ui-toolbar-center")
              : this._frame.addClass("ui-toolbar-center");
        }
      }),
      (Je.prototype._updateGTM = async function () {
        const e = !!this.isTouchEnabled();
        je.updateProperty("touch", e),
          je.fireEvent(je.Events.SETTING_CHANGED_EVENT);
      }),
      (Je.prototype._updateEditorOptions = function () {
        this.isTouchEnabled()
          ? this._applyTouchEditorOptions()
          : this._applyDefaultEditorOptions();
        const e = this.getActiveDocument(),
          t = e && e.getActiveWindow(),
          n = t && t.getView();
        n && r.GPlatform.scheduleFrame(() => n.invalidate(null, !0));
      }),
      (Je.prototype._applyTouchEditorOptions = function () {
        const e = a.GPaintCanvas.getScreenDPI();
        (i.GEditorOptions.distanceHelperBehaviour =
          i.GSelectTool._DistanceHelperBehaviour.Click),
          (i.GEditorOptions.resizeHandlesInDetailMode = !1),
          (i.GEditorOptions.rotateHandleInDetailMode = !1),
          (i.GEditorOptions.annotationHandles.suppressRedundantCorners = !0),
          (i.GEditorOptions.annotationHandles.gradient.size = 16 * e),
          (i.GEditorOptions.annotationHandles.gradient.sizeBig = 20 * e),
          (i.GEditorOptions.annotationHandles.preserveAspectRatio.side =
            a.GRect.Side.BOTTOM_RIGHT),
          (i.GEditorOptions.annotationHandles.tranformBox.skew.enabled = !0),
          (i.GEditorOptions.annotationHandles.tranformBox.rotate.enabled = !0),
          (i.GEditorOptions.annotationHandles.preserveAspectRatio.enabled = !0),
          (a.GPaintContext.prototype.transformBoxOutlineColor =
            a.GPaintContext.prototype.selectionOutlineColor),
          (i.GTransformBox.OUTSIDE_TOLERANCE = 0),
          (i.GEditorOptions.annotPickDistance = 4),
          (i.GEditorOptions.pickDistance = 20),
          (i.GEditorOptions.annotationHandles.tranformBox.size = 23 * e),
          (i.GEditorOptions.annotationHandles.tranformBox.outlineWidth = 3 * e),
          (i.GEditorOptions.annotationHandles.tranformBox.pivotSize = 23 * e),
          (i.GEditorOptions.annotationHandles.tranformBox.pivotOutlineWidth =
            3 * e),
          (i.GEditorOptions.annotationHandles.tranformBox.outsideStroke = !0),
          (i.GEditorOptions.annotationHandles.tranformBox.shadowColor =
            "transparent"),
          (i.GEditorOptions.rotateHandle = "bottom"),
          (i.GEditorOptions.annotationHandles.rotate.size = 23 * e),
          (i.GEditorOptions.annotationHandles.rotate.iconSize = 23 * e),
          (i.GEditorOptions.annotationHandles.rotate.outlineWidth = e),
          (i.GEditorOptions.annotationHandles.rotate.shadowColor =
            "transparent"),
          (i.GEditorOptions.annotationHandles.rotate.distance = 46 * e),
          (i.GEditorOptions.annotationHandles.resize.size = 23 * e),
          (i.GEditorOptions.annotationHandles.resize.outlineWidth = 3 * e),
          (i.GEditorOptions.annotationHandles.resize.outsideStroke = !0),
          (i.GEditorOptions.annotationHandles.resize.shadowColor =
            "transparent"),
          (i.GEditorOptions.annotationHandles.rectangle.size = 22 * e),
          (i.GEditorOptions.annotationHandles.rectangle.outlineWidth = 4 * e),
          (i.GEditorOptions.annotationHandles.rectangle.outsideStroke = !0),
          (i.GEditorOptions.annotationHandles.rectangle.shadowColor =
            "transparent"),
          (i.GEditorOptions.annotationHandles.rectangle.maxNumberOfDetailedSegments = 1),
          (i.GEditorOptions.annotationHandles.polygon.size = 22 * e),
          (i.GEditorOptions.annotationHandles.polygon.outlineWidth = 4 * e),
          (i.GEditorOptions.annotationHandles.polygon.outsideStroke = !0),
          (i.GEditorOptions.annotationHandles.polygon.shadowColor =
            "transparent"),
          (i.GEditorOptions.annotationHandles.polygon.maxNumberOfDetailedSegments = 2),
          (i.GEditorOptions.annotationHandles.ellipse.size = 22 * e),
          (i.GEditorOptions.annotationHandles.ellipse.outlineWidth = 4 * e),
          (i.GEditorOptions.annotationHandles.ellipse.outsideStroke = !0),
          (i.GEditorOptions.annotationHandles.ellipse.shadowColor =
            "transparent"),
          (i.GEditorOptions.annotationHandles.ellipse.maxNumberOfDetailedSegments = 2),
          (i.GEditorOptions.annotationHandles.path.node.size = 20 * e),
          (i.GEditorOptions.annotationHandles.path.node.outlineWidth = 2 * e),
          (i.GEditorOptions.annotationHandles.path.control.size = 10 * e),
          i.GSkewHorizontalAnnotation.setIconVisible(!0),
          i.GSkewVerticalAnnotation.setIconVisible(!0),
          i.GPreserveAspectRatioAnnotation.setIconVisible(!0),
          i.GRotateAnnotation.setIconVisible(!0);
      }),
      (Je.prototype._applyDefaultEditorOptions = function () {
        const e = a.GPaintCanvas.getScreenDPI();
        (i.GEditorOptions.distanceHelperBehaviour =
          i.GSelectTool._DistanceHelperBehaviour.Default),
          (i.GEditorOptions.resizeHandlesInDetailMode = !0),
          (i.GEditorOptions.rotateHandleInDetailMode = !0),
          (i.GEditorOptions.annotationHandles.suppressRedundantCorners = !1),
          (i.GEditorOptions.annotationHandles.gradient.size = 9 * e),
          (i.GEditorOptions.annotationHandles.gradient.sizeBig = 12 * e),
          i.GSkewHorizontalAnnotation.setIconVisible(!1),
          i.GSkewVerticalAnnotation.setIconVisible(!1),
          i.GPreserveAspectRatioAnnotation.setIconVisible(!1),
          i.GRotateAnnotation.setIconVisible(!1),
          (a.GPaintContext.prototype.transformBoxOutlineColor = new a.GRGBColor(
            [23, 104, 196]
          )),
          (i.GTransformBox.OUTSIDE_TOLERANCE = 100),
          (i.GEditorOptions.annotPickDistance = 0),
          (i.GEditorOptions.pickDistance = 4),
          (i.GEditorOptions.annotationHandles.tranformBox.size = 10 * e),
          (i.GEditorOptions.annotationHandles.tranformBox.outlineWidth = null),
          (i.GEditorOptions.annotationHandles.tranformBox.pivotSize = null),
          (i.GEditorOptions.annotationHandles.tranformBox.pivotOutlineWidth =
            null),
          (i.GEditorOptions.annotationHandles.tranformBox.outsideStroke = !1),
          (i.GEditorOptions.annotationHandles.tranformBox.shadowColor = null),
          (i.GEditorOptions.annotationHandles.tranformBox.skew.enabled = !1),
          (i.GEditorOptions.annotationHandles.tranformBox.rotate.enabled = !1),
          (i.GEditorOptions.annotationHandles.preserveAspectRatio.enabled = !1),
          (i.GEditorOptions.rotateHandle = "top"),
          (i.GEditorOptions.annotationHandles.rotate.size = 10 * e),
          (i.GEditorOptions.annotationHandles.rotate.outlineWidth = null),
          (i.GEditorOptions.annotationHandles.rotate.shadowColor = null),
          (i.GEditorOptions.annotationHandles.rotate.distance = 16 * e),
          (i.GEditorOptions.annotationHandles.resize.size = 10 * e),
          (i.GEditorOptions.annotationHandles.resize.outlineWidth = null),
          (i.GEditorOptions.annotationHandles.resize.outsideStroke = !1),
          (i.GEditorOptions.annotationHandles.resize.shadowColor = null),
          (i.GEditorOptions.annotationHandles.rectangle.size = 8 * e),
          (i.GEditorOptions.annotationHandles.rectangle.outlineWidth = null),
          (i.GEditorOptions.annotationHandles.rectangle.outsideStroke = !1),
          (i.GEditorOptions.annotationHandles.rectangle.shadowColor = null),
          (i.GEditorOptions.annotationHandles.polygon.size = 8 * e),
          (i.GEditorOptions.annotationHandles.polygon.outlineWidth = null),
          (i.GEditorOptions.annotationHandles.polygon.outsideStroke = !1),
          (i.GEditorOptions.annotationHandles.polygon.shadowColor = null),
          (i.GEditorOptions.annotationHandles.ellipse.size = 8 * e),
          (i.GEditorOptions.annotationHandles.ellipse.outlineWidth = null),
          (i.GEditorOptions.annotationHandles.ellipse.outsideStroke = !1),
          (i.GEditorOptions.annotationHandles.ellipse.shadowColor = null),
          (i.GEditorOptions.annotationHandles.path.node.size = 10 * e),
          (i.GEditorOptions.annotationHandles.path.node.outlineWidth = null),
          (i.GEditorOptions.annotationHandles.path.control.size = 6 * e);
      }),
      (Je.prototype._updateLayout = function () {
        $("body").toggleClass("g-touch", this.isTouchEnabled()),
          this.isTouchEnabled() ||
            (this._leftSidebars &&
              this._leftSidebars
                .getHtmlElement()
                .toggleClass("bring-to-front", !1),
            this._rightSidebars &&
              this._rightSidebars
                .getHtmlElement()
                .toggleClass("bring-to-front", !1),
            this._assistantBar &&
              this._assistantBar
                .getHtmlElement()
                .toggleClass("bring-to-front", !1)),
          this._initialized &&
            (this._leftSidebars.getActiveSidebar() ||
              this._leftSidebars.setActiveSidebar(G.ID),
            this._rightSidebars.getActiveSidebar() ||
              this._rightSidebars.setActiveSidebar(P.ID),
            this._leftSidebars.setActiveTouchTool(null),
            this._rightSidebars.setActiveTouchTool(null),
            this._setActiveAssistantBar(this.isTouchEnabled())),
          this.relayout();
      }),
      (Je.prototype._setTheme = function (e) {
        (e && "default" !== e) || (e = "light");
        var t = $('head > link[href$=".css"]'),
          n = t.attr("href").split(".");
        (n[2] = e),
          t.attr("href", n.join(".")),
          $(t).load(
            n.join("."),
            function () {
              var t = this._windows.getWindows();
              l.DESIGNER.GUIDELINE_COLOR
                ? (i.GEditorOptions.guideLineColor = l.DESIGNER.GUIDELINE_COLOR)
                : (i.GEditorOptions.guideLineColor =
                    "light" === e
                      ? new a.GRGBColor([107, 156, 228])
                      : new a.GRGBColor([227, 0, 97])),
                l.DESIGNER.GUIDELINEHINT_COLOR
                  ? (i.GEditorOptions.guideLineHintColor =
                      l.DESIGNER.GUIDELINEHINT_COLOR)
                  : (i.GEditorOptions.guideLineHintColor =
                      "light" === e ? "blue" : "#F790B6"),
                l.DESIGNER.DISTANCEHELPER_COLOR &&
                  (i.GEditorOptions.distanceHelperColor =
                    l.DESIGNER.DISTANCEHELPER_COLOR),
                l.DESIGNER.HIGHLIGHTOUTLINE_COLOR &&
                  (a.GPaintContext.prototype.highlightOutlineColor =
                    new a.GRGBColor([197, 17, 98]));
              for (var n = 0; n < t.length; ++n) {
                var o = t[n].getView();
                o && (o.setRulers(!o.hasRulers()), o.setRulers(!o.hasRulers()));
              }
              this._updateTheme();
            }.bind(this)
          );
      }),
      (Je.prototype._updateTheme = function () {
        var e = this._windows.getActiveWindow();
        e &&
          e.getView() &&
          r.GPlatform.scheduleFrame(
            function () {
              var t = a.GRGBColor.BLACK,
                n = getComputedStyle(
                  this._windows.getHtmlElement()[0]
                ).getPropertyValue("background-color"),
                o = a.GRGBColor.fromCSSColor(n);
              if (o) {
                var i = o.toScreen();
                t =
                  (299 * i[0] + 587 * i[1] + 114 * i[2]) / 1e3 >= 128
                    ? a.GRGBColor.BLACK
                    : a.GRGBColor.WHITE;
              }
              (a.GPaintContext.prototype.labelColor = t),
                e && e.getView() && e.getView().invalidate();
            }.bind(this)
          ),
          this.relayout();
      }),
      (Je.prototype._updateTitle = async function () {
        let { saveToSessionHistory: e = !0 } =
          arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};
        var t = "";
        let n = ke.DESIGNER.TITLE;
        var o =
          gContainer.getRuntime() === Z.Runtime.Browser ||
          gContainer.getRuntime() === Z.Runtime.PWA;
        o && e && window.history.pushState(null, "Title", "/");
        var i = this.getWindows().getActiveWindow();
        if (i) {
          t = i.getTitle() + " - ";
          let e = i.getDocument();
          if (
            (e &&
              e.getOwner() &&
              !e.isDocumentFromTemplate() &&
              ((n = ""),
              (t = a.GLocale.get(
                new a.GLocaleKey("GDesigner", "text.design-by")
              )
                .replace("%name", e.getOwner().name)
                .replace("%appname", ke.DESIGNER.TITLE))),
            o)
          ) {
            let t = e.getStorageItem();
            e &&
              t &&
              (t instanceof J.Item ||
                (t.supportsShadowFile() && (await t.getCollaborativeFile()))) &&
              (e.getStorageItem().getToken()
                ? e.getFocusAnnotationId()
                  ? window.history.pushState(
                      null,
                      "Title",
                      "/?token=" +
                        t.getToken() +
                        "&annot=" +
                        e.getFocusAnnotationId()
                    )
                  : window.history.pushState(
                      null,
                      "Title",
                      "/?token=" + t.getToken()
                    )
                : t.getId() &&
                  (e.getFocusAnnotationId()
                    ? window.history.pushState(
                        null,
                        "Title",
                        "/?d=" +
                          t.getId() +
                          "&annot=" +
                          e.getFocusAnnotationId()
                      )
                    : window.history.pushState(
                        null,
                        "Title",
                        "/?d=" + t.getId()
                      )));
          }
        }
        (t += n), (document.title = (0, u.decodeHTML)(t));
      }),
      (Je.prototype.addNotification = function (e, t) {
        this.hasEventListeners(de) && this.trigger(new de(e, t));
      }),
      (Je.prototype._shortcutToMouseTrapShortcut = function (e) {
        for (var t = "", n = 0; n < e.length; ++n) {
          n > 0 && (t += "+");
          var o = e[n];
          if ("number" == typeof o)
            switch ((o = r.GKey.transformKey(o))) {
              case r.GKey.Constant.SPACE:
                t += "space";
                break;
              case r.GKey.Constant.ENTER:
                t += "enter";
                break;
              case r.GKey.Constant.TAB:
                t += "tab";
                break;
              case r.GKey.Constant.BACKSPACE:
                t += "backspace";
                break;
              case r.GKey.Constant.CONTROL:
                t += "ctrl";
                break;
              case r.GKey.Constant.SHIFT:
                t += "shift";
                break;
              case r.GKey.Constant.ALT_LEFT:
              case r.GKey.Constant.ALT_RIGHT:
                t += "alt";
                break;
              case r.GKey.Constant.LEFT:
                t += "left";
                break;
              case r.GKey.Constant.UP:
                t += "up";
                break;
              case r.GKey.Constant.RIGHT:
                t += "right";
                break;
              case r.GKey.Constant.DOWN:
                t += "down";
                break;
              case r.GKey.Constant.PAGE_UP:
                t += "pageup";
                break;
              case r.GKey.Constant.PAGE_DOWN:
                t += "pagedown";
                break;
              case r.GKey.Constant.HOME:
                t += "home";
                break;
              case r.GKey.Constant.END:
                t += "end";
                break;
              case r.GKey.Constant.INSERT:
                t += "ins";
                break;
              case r.GKey.Constant.DELETE:
                t += "del";
                break;
              case r.GKey.Constant.COMMAND:
                t += "meta";
                break;
              case r.GKey.Constant.F1:
                t += "f1";
                break;
              case r.GKey.Constant.F2:
                t += "f2";
                break;
              case r.GKey.Constant.F3:
                t += "f3";
                break;
              case r.GKey.Constant.F4:
                t += "f4";
                break;
              case r.GKey.Constant.F5:
                t += "f5";
                break;
              case r.GKey.Constant.F6:
                t += "f6";
                break;
              case r.GKey.Constant.F7:
                t += "f7";
                break;
              case r.GKey.Constant.F8:
                t += "f8";
                break;
              case r.GKey.Constant.F9:
                t += "f9";
                break;
              case r.GKey.Constant.F10:
                t += "f10";
                break;
              case r.GKey.Constant.F11:
                t += "f11";
                break;
              case r.GKey.Constant.F12:
                t += "f12";
                break;
              default:
                throw new Error("Unknown key code");
            }
          else t += o.toLowerCase();
        }
        return t;
      }),
      (Je.prototype.isGravitIME = function (e) {
        return e && e.className === r.GSceneWidget.GRAVIT_IME;
      }),
      (Je.prototype.hasModifiedDocuments = function () {
        for (var e = !1, t = this.getDocuments(), n = 0; n < t.length; ++n)
          if (t[n].isModified()) {
            e = !0;
            break;
          }
        return e;
      }),
      (Je.prototype.getCanvasWidth = function () {
        return (
          this.getWindows().getActiveWindow().getView().getWidth() -
          ("none" !== $("#right-sidebars").css("display")
            ? $("#right-sidebars").width()
            : 0) -
          ("none" !== $("#left-sidebars").css("display")
            ? $("#left-sidebars").width()
            : 0)
        );
      }),
      (Je.prototype.getCanvasHeight = function () {
        return (
          this.getWindows().getActiveWindow().getView().getHeight() -
          this.getHeader().getHeight() -
          this.getToolbar().getHeight()
        );
      }),
      (Je.prototype.getCanvasCenter = function () {
        var e = a.GPaintCanvas.getScreenDPI(),
          t = this.getCanvasWidth() / 2,
          n = this.getCanvasHeight() / 2;
        return (
          (t +=
            "none" !== $("#left-sidebars").css("display")
              ? $("#left-sidebars").width()
              : 0),
          (n += this.getHeader().getHeight() + this.getToolbar().getHeight()),
          new a.GPoint(t * e, n * e)
        );
      }),
      (Je.prototype.getStylePreview = function (e, t) {
        return this._stylesPreview[e.getReferenceId()]
          ? t
            ? this._stylesPreview[e.getReferenceId()].textBitmap
            : this._stylesPreview[e.getReferenceId()].bitmap
          : this.createNewStylePreview(e, !0, t);
      }),
      (Je.prototype.createStyleElement = function (e, t) {
        var n = new a.GRectangle(0, 0, 50, 50);
        if (
          t &&
          $.inArray(a.GStylable.PropertySet.Text, e.getProperty("ps")) >= 0
        ) {
          var o = new a.GText();
          o.setText("Ab"),
            o.assignStyleFrom(e),
            o.setProperty("_tfi", "20"),
            o.setBounds(7, 10, 50, 50),
            n.appendChild(o);
        } else
          n.assignStyleFrom(e),
            $.inArray(
              a.GStylable.PropertySet.FillPaintLayers,
              e.getProperty("ps")
            ) < 0 &&
              $.inArray(
                a.GStylable.PropertySet.BorderPaintLayers,
                e.getProperty("ps")
              ) < 0 &&
              n
                .getPaintLayers()
                .appendChild(
                  new a.GStylable.FillPaintLayer(
                    new a.GRGBColor([235, 235, 235]),
                    1
                  )
                );
        return n;
      }),
      (Je.prototype.createNewStylePreview = function (e, t, n) {
        var o = this.createStyleElement(e, !1),
          i = this.createStyleElement(e, !0);
        if (!gDesigner.getActiveDocument()) return null;
        var r = gDesigner.getActiveDocument().getEditor().getSelection() || [];
        r.length > 0 && r[0].appendChild(i);
        var s = o.toBitmap().toImageDataUrl(a.GBitmap.ImageType.PNG),
          l = i.toBitmap().toImageDataUrl(a.GBitmap.ImageType.PNG);
        return (
          r.length > 0 && r[0].removeChild(i),
          t &&
            (this._stylesPreview[e.getReferenceId()] = {
              preview: o,
              bitmap: s,
              textBitmap: l,
            }),
          n ? l : s
        );
      }),
      (Je.prototype.setVersion = function (e) {
        this._version = e;
      }),
      (Je.prototype.getVersion = function () {
        return this._version;
      }),
      (Je.prototype.setVersionFriendlyName = function (e) {
        this._versionFriendlyName = e;
      }),
      (Je.prototype.getVersionFriendlyName = function () {
        return this._versionFriendlyName;
      }),
      (Je.prototype.setCommitSHA = function (e) {
        this._commitSHA = e;
      }),
      (Je.prototype.getCommitSHA = function () {
        return this._commitSHA;
      }),
      (Je.prototype.setBuildNum = function (e) {
        this._buildNum = e;
      }),
      (Je.prototype.getBuildNum = function () {
        return this._buildNum;
      }),
      (Je.prototype.setIsBeta = function (e) {
        this._isBeta = e;
      }),
      (Je.prototype.isBeta = function () {
        return this._isBeta;
      }),
      (Je.prototype.setStoreVendor = function (e) {
        this._storeVendor = e;
      }),
      (Je.prototype.getStoreVendor = function () {
        return this._storeVendor;
      }),
      (Je.prototype._userLoggedEvent = function (e) {
        let t = e.user,
          n = this.getHeader();
        if ((n && n.updateLoginInfo(t), t && t.getUID()))
          this.executeWhenReady(() => {
            this.updateRecentDocumentsAction();
          }),
            (i.GEditorOptions.userConfig = {
              userName: t.getFullUserName(),
              uid: t.getUID(),
            });
        else {
          const e = a.GLocale.get(
              new a.GLocaleKey("GCommonNames", "text.anonymous-user")
            ),
            n = (t && t.getFullUserName()) || e;
          i.GEditorOptions.userConfig = { userName: n, uid: -1 };
        }
      }),
      (Je.prototype._userPropertiesChangedEvent = function (e) {
        const { user: t } = e;
        t &&
          t.getUID() &&
          (i.GEditorOptions.userConfig = {
            userName: t.getFullUserName(),
            uid: t.getUID(),
          });
      }),
      (Je.prototype._beforeInstallUpdate = function (e) {
        this._reloading = !0;
      }),
      (Je.prototype._updateDataLayerWithLicenseData = function () {
        if (this._user && "undefined" != typeof dataLayer) {
          dataLayer.push({ userType: this.getSubscriberUserType() });
          const r = this.getLicense();
          var e = r.getExpirationDate() || new Date(0),
            t = Math.floor(e.getTime() / 1e3),
            n = r.getCreationDate() || new Date(0),
            o = Math.floor(n.getTime() / 1e3),
            i = s.DateAPI.diff(n, e),
            a = s.DateAPI.millisecondsToDays(i);
          s.DateAPI.eq(n, new Date(0)) && (o = "0000000000"),
            s.DateAPI.eq(e, new Date(0)) && ((a = 0), (t = "0000000000")),
            dataLayer.push({ expirationDate: t }),
            dataLayer.push({ licenseDuration: a }),
            dataLayer.push({ creationDate: o });
        }
      }),
      (Je.prototype._licenseChangedEvent = async function (e) {
        e.license.isDefault() ||
          ((this._enabledSubscriptions = !0),
          gContainer.setProperty("enabled_subscriptions", !0)),
          "undefined" != typeof dataLayer &&
            (this._utm &&
              this._utm.forEach((e, t) => dataLayer.push({ [t]: e })),
            this._updateDataLayerWithLicenseData(),
            dataLayer.push({ event: "LICENSE_CHANGED_EVENT" })),
          e.license.isOffline() &&
            !this.isEnabledProFeatures("offline") &&
            this.reload({
              icon: "clock",
              title: a.GLocale.get(
                new a.GLocaleKey("GCommonNames", "text.license-offline-title")
              ),
              subtitle: a.GLocale.get(
                new a.GLocaleKey(
                  "GCommonNames",
                  "text.license-offline-subtitle"
                )
              ),
              footer: a.GLocale.get(
                new a.GLocaleKey("GCommonNames", "text.license-offline-footer")
              )
                .replace(
                  "%close",
                  $("<span/>")
                    .addClass("link")
                    .text(
                      a.GLocale.get(
                        new a.GLocaleKey(
                          "GCommonNames",
                          "text.license-offline-footer-highlight"
                        )
                      )
                    )
                    .prop("outerHTML")
                )
                .replace("%time", 5),
              buttons: [
                {
                  label: a.GLocale.get(new a.GLocaleKey("GLocale", "ok")),
                  onclick: (e) => e.gDialog("close"),
                },
              ],
              attachTimer: (e) => {
                const t = () => {
                  (this._reloading = !1),
                    this.clearCountdown(e),
                    $(window).off("online", t);
                };
                navigator.onLine && t(), $(window).on("online", t);
              },
            }),
          $("body")
            .toggleClass(
              "pro-expired",
              this.isEnabledSubscriptions() && !this.isEnabledProFeatures()
            )
            .toggleClass(
              "pro-license",
              this.isEnabledSubscriptions() && this.isEnabledProFeatures()
            )
            .toggleClass("pro-legacy", e.license.isLegacy())
            .toggleClass(
              "pro-subscription",
              e.license.isPro() && !e.license.isExpired()
            )
            .toggleClass(
              "trial-expired",
              e.license.isTrial() && e.license.isExpired()
            ),
          this._toggleAdditionalSubscriptionClasses(e.license),
          this.isEnabledProFeatures() || this.setTouchEnabled(!1),
          this._updateState();
      }),
      (Je.prototype._toggleAdditionalSubscriptionClasses = function () {}),
      (Je.prototype.signout = function (e, t) {
        if (this.isEnabledSubscriptions() && !e) {
          if (this.getDocuments().some((e) => e.isModified()))
            return (
              ee.alert(
                a.GLocale.get(
                  new a.GLocaleKey(
                    "GCommonNames",
                    "text.save-before-logging-out"
                  )
                )
              ),
              Promise.reject(void 0)
            );
        }
        return (
          Ce.clear(),
          new Promise(async (e, n) => {
            await (0, u._tryAndCatch)(() => Oe.signout()),
              (this._user = null),
              this.hasEventListeners(le) && this.trigger(new le(null)),
              this.isEnabledSubscriptions() &&
                (t || ((this._reloading = !0), location.reload())),
              e();
          })
        );
      }),
      (Je.prototype.isReloading = function () {
        return this._reloading;
      }),
      (Je.prototype.reload = function (e) {
        let {
          title: t,
          subtitle: n,
          icon: o,
          footer: i,
          buttons: a,
          attachTimer: r,
        } = e;
        this._initialized &&
          (this._reloading ||
            ((this._reloading = !0),
            ee
              .custom({
                icon: o,
                title: t,
                subtitle: n,
                footer: i,
                buttons: a,
                closeCallback: () => {
                  const e = this.createCountdown(() => this.signout(!0), 3e5);
                  r && r(e);
                },
              })
              .css({ zIndex: 9999 })));
      }),
      (Je.prototype.clearCountdown = function (e) {
        let { timeoutID: t, intervalID: n = 0 } = e;
        n && clearInterval(n),
          t && clearInterval(t),
          $(".g-timer[data-interval=".concat(n, "]")).remove();
      }),
      (Je.prototype.createCountdown = function (e, t) {
        let n = null;
        const o = s.DateAPI.addTime(new Date(), t),
          i = setInterval(() => {
            const e = o - Date.now();
            if (e < 0) return clearInterval(i), void (n && n.remove());
            const t = Math.floor((e % 36e5) / 6e4),
              r = Math.floor((e % 6e4) / 1e3);
            n ||
              (n = $("<time></time>")
                .attr("data-interval", i)
                .addClass("g-timer")
                .appendTo($("body"))),
              n.text(
                a.GLocale.get(
                  new a.GLocaleKey("GCommonNames", "text.countdown-timer")
                )
                  .replace("%minutes", t)
                  .replace("%seconds", r)
              );
          }, 1e3);
        let r = null;
        return e && (r = setTimeout(e, t)), { intervalID: i, timeoutID: r };
      }),
      (Je.prototype.openDeactivatedUserDialog = async function (e) {
        const t = $(
          "<div>".concat(
            a.GLocale.get(
              new a.GLocaleKey("GDocument", "text.account-deactivated")
            )
              .replace("%app", ke.DESIGNER.TITLE)
              .replace("%name", e.getFullUserName() || e.getEmail()),
            "</div>"
          )
        );
        t.find("a").on("click", (t) => {
          t.preventDefault();
          let n = $(t.target).closest(".g-dialog-content");
          return (
            Q.resendEmailConfirmation(e).then(() => n.gDialog("close")), !1
          );
        }),
          ee.custom({
            className: "g-deactivated-user-dialog",
            subtitle: t,
            icon: "email",
          });
      }),
      (Je.prototype.getSyncUser = function () {
        return this._user;
      }),
      (Je.prototype.getUser = function () {
        return new Promise(async (e, t) => {
          let n = await this.getCloudCommunicationManager().getUser();
          this._anonymous = !!n && n.isAnonymous();
          let o = await this.isOfflineAsync();
          if (!n && o) {
            const e = Ce.getUser();
            e && (n = new $e(e));
          }
          if (
            !n ||
            "lts" !== gDesigner.getEnv() ||
            this.isEnabledProFeatures()
          ) {
            if (n && n.reload)
              return (
                this.reload({
                  title:
                    "We are currently doing some important maintenance work. Please save your design in the next five minutes to avoid loss of progress!",
                }),
                void e(null)
              );
            if (n)
              if (!n || (this._user && $e.equals(this._user, n))) {
                if (this._user && n && !n.isDeactivated()) {
                  const e = { stats: void 0 };
                  a.GUtil.equals(
                    Object.assign({}, this._user, e),
                    Object.assign({}, n, e),
                    !0
                  ) ||
                    (this.hasEventListeners(ce) && this.trigger(new ce(n)));
                }
              } else
                "undefined" == typeof dataLayer ||
                  n.isAnonymous() ||
                  n.isDeactivated() ||
                  (dataLayer.push({ userId: n.getUID() }),
                  dataLayer.push({ userEmail: n.getEmail() }),
                  dataLayer.push({ userName: n.name || "" }),
                  dataLayer.push({ userLogin: n.login }),
                  this._utm &&
                    this._utm.forEach((e, t) => dataLayer.push({ [t]: e })),
                  this._updateDataLayerWithLicenseData(),
                  dataLayer.push({ event: "USER_LOGGED_EVENT" })),
                  this.hasEventListeners(le) && this.trigger(new le(n));
            var i;
            this._user &&
              n &&
              this._user.getUID() === n.getUID() &&
              (i = this._user.stats),
              (this._user = n),
              this._user && !o && Ce.updateUser(this._user),
              i && (this._user.stats = i),
              e(this._user);
          } else e(null);
        });
      }),
      (Je.prototype.stats = function (e, t, n, o) {
        return y.default.pageStats(e, t, this._user, n, o);
      }),
      (Je.prototype.pageTracking = function (e, t) {
        return y.default.pageTracking(e, t);
      }),
      (Je.prototype.gtmEvent = function (e, t) {
        "undefined" != typeof dataLayer &&
          (t &&
            t.forEach((e) => {
              "object" == typeof e && dataLayer.push(e);
            }),
          dataLayer.push({ event: e }));
      }),
      (Je.prototype.intercomStats = function (e) {
        "function" == typeof Intercom && Intercom("trackEvent", e);
      }),
      (Je.prototype.saveStats = function () {
        if (this._user && this._user.stats) {
          var e = Ue.toMD5(JSON.stringify(this._user.stats || ""));
          Ye !== e && (Oe.updateUser({ stats: this._user.stats }), (Ye = e));
        }
      }),
      (Je.prototype.setEnv = function (e) {
        this._env = e;
      }),
      (Je.prototype.getEnv = function () {
        return this._env;
      }),
      (Je.prototype.hasSynchronizingDocuments = function () {
        for (var e = !1, t = this.getDocuments(), n = 0; n < t.length; ++n)
          if (t[n].isSynchronizing()) {
            e = !0;
            break;
          }
        return e;
      }),
      (Je.prototype.zoomAtViewCenter = function (e, t) {
        var n,
          o,
          i = this.getActiveDocument();
        if (!i || !(o = i.getEditor().getSelectionBBox())) {
          n = !0;
          var r = e.getScene();
          r && (o = r.getPaintBBox());
        }
        var s =
          o && !o.isEmpty()
            ? o.getSide(a.GRect.Side.CENTER)
            : new a.GPoint(0, 0);
        if (n && !e.getViewConfiguration().multiPageView) {
          var l = e.getViewTransform().mapPoint(this.getCanvasCenter());
          isNaN(l.getX()) || isNaN(l.getY()) || (s = l);
        }
        if (e.getViewConfiguration().multiPageView) {
          var c = e.getScene().getActivePage();
          c && (s = s.add(c.getPosition(!0)));
        }
        e.zoomAtCenter(s, t);
      }),
      (Je.prototype.handleUnsavedDocuments = function () {
        return gDesigner.hasModifiedDocuments()
          ? this.getDocuments()
              .filter((e) => e.isModified())
              .reduce(
                (e, t) =>
                  e.then(
                    () =>
                      new Promise(async (e, n) => {
                        this.canUnloadDocument(t)
                          .then((o) => {
                            o
                              ? e()
                              : this.executeAction(
                                  Pe.ID,
                                  [
                                    t,
                                    function () {
                                      let t =
                                        arguments.length > 0 &&
                                        void 0 !== arguments[0]
                                          ? arguments[0]
                                          : {};
                                      const { documentStatus: o = null } = t;
                                      o && o === De.SaveCancelled ? n(t) : e();
                                    },
                                  ],
                                  "unsavedhandler"
                                );
                          })
                          .catch((e) => {
                            n(e);
                          });
                      })
                  ),
                Promise.resolve()
              )
          : Promise.resolve();
      }),
      (Je.prototype.canUnloadDocument = function (e) {
        let { changeActiveDocument: t = !0 } =
          arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {};
        return new Promise((n, o) => {
          if (!e.isModified() && !e.isSynchronizing()) return n(!0);
          t && this.getActiveDocument() !== e && this.activateDocument(e),
            gDesigner.canExecuteAction(Pe.ID, [e]) || n(!0),
            ee.advanced({
              title: a.GLocale.get(
                new a.GLocaleKey("GCommonNames", "text.document-modified")
              ).replace("%title", e.getTitle()),
              closeCallback: (e) =>
                e && o({ documentStatus: De.SaveCancelled }),
              buttons: [
                {
                  label: a.GLocale.get(
                    new a.GLocaleKey("GCommonNames", "text.dont-save")
                  ),
                  onclick: () => {
                    n(!0);
                  },
                  closeOnClick: !0,
                  position: "left",
                  shortcut: "n",
                },
                {
                  label: a.GLocale.get(
                    new a.GLocaleKey("GCommonNames", "text.cancel")
                  ),
                  onclick: () => o({ documentStatus: De.SaveCancelled }),
                  closeOnClick: !0,
                  shortcut: "esc",
                },
                {
                  label:
                    a.GLocale.get(
                      new a.GLocaleKey("GCommonNames", "text.save")
                    ) + "...",
                  onclick: () => {
                    n(!1);
                  },
                  shortcut: this._shortcutToMouseTrapShortcut(
                    r.GKey.Constant.ENTER
                  ),
                  highlighted: !0,
                  closeOnClick: !0,
                },
              ],
            });
        });
      }),
      (Je.prototype.exportSwatches = function (e) {
        for (
          var t = this.getAllSwatches(e), n = new a.GSwatches(), o = 0;
          o < t.length;
          ++o
        ) {
          var i = t[o].clone();
          n.appendChild(i);
        }
        var r = pako.gzip(a.GNode.serialize(n), { level: 9 }),
          s = this.getDefaultStorage();
        if (s.canPromptSave())
          s.savePrompt(
            null,
            [{ ext: "gvswatch", mime: "application/gzip" }],
            (e) => {
              e.setSaveCounterMeasureEnabled(!0),
                e.write(r),
                e.setSaveCounterMeasureEnabled(!1);
            },
            null
          );
        else if (s.canDownload()) {
          s.download("Swatches.gvswatch", (e) => {
            e &&
              (e.setSaveCounterMeasureEnabled(!0),
              e.write(r),
              e.setSaveCounterMeasureEnabled(!1));
          });
        }
      }),
      (Je.prototype.importSwatches = function (e) {
        var t = this.getDefaultStorage(),
          n = e.startsWith("document");
        t.openPrompt(
          [{ ext: "gvswatch", mime: "text/plain" }],
          (t) => {
            t.read((t) => {
              try {
                for (
                  var o = this.getAllSwatches(e),
                    i = a.GNode.deserialize(pako.ungzip(t, { to: "string" })),
                    r = [],
                    s = i.getFirstChild();
                  null !== s;
                  s = s.getNext()
                ) {
                  for (var l = !0, c = 0; c < o.length; ++c)
                    if (a.GUtil.equals(s, o[c])) {
                      l = !1;
                      break;
                    }
                  l && r.push(s.clone());
                }
                if (((o = o.concat(r)), n)) this.setSwatches(e, o, !0);
                else {
                  for (c = 0; c < r.length; ++c) this._addGlobalSwatch(r[c]);
                  this.setSwatches(e, this._swatches[e]);
                }
              } catch (e) {
                console.warn("error importing swatches: " + e),
                  ee.alert(
                    a.GLocale.get(
                      new a.GLocaleKey(
                        "GCommonNames",
                        "text.fail-import-swatch"
                      )
                    )
                  );
              }
            });
          },
          !1
        );
      }),
      (Je.prototype.getFontsPath = function () {
        return this._fontsPath;
      }),
      (Je.prototype.calculateFontsSize = function (e) {
        var t = this;
        return new Promise(function (n, o) {
          var i = {},
            a = function (e) {
              return new Promise(function (n, o) {
                var a = new XMLHttpRequest();
                a.open("HEAD", t.getAssetsURL() + "" + e, !0),
                  (a.onload = function () {
                    this.status >= 200 && this.status < 400
                      ? ((i[e] = parseInt(
                          a.getResponseHeader("Content-Length")
                        )),
                        n())
                      : o({ status: this.status, statusText: a.statusText });
                  }),
                  (a.onerror = function () {
                    o({ status: this.status, statusText: a.statusText });
                  }),
                  a.send();
              });
            },
            r = [];
          e.forEach((e) => {
            r.push(a(e.preview));
            for (var t = 0; t < e.fonts.length; ++t) r.push(a(e.fonts[t].url));
          }),
            Promise.all(r).then(
              () => {
                n(i);
              },
              (e) => {
                o(e);
              }
            );
        });
      }),
      (Je.prototype.downloadFonts = function (e, t) {
        var n = this,
          o = 0,
          i = {},
          r = Object.keys(t);
        if (r.length) {
          for (var s = 0, l = 0; l < r.length; ++l) s += t[r[l]];
          o = s;
        }
        $("#right-sidebars").find(".fonts-download-progress").remove();
        var c = $("<div/>")
            .addClass("fonts-download-progress")
            .append(
              $("<span/>")
                .text(
                  a.GLocale.get(
                    new a.GLocaleKey("GCommonNames", "text.downloading-fonts")
                  )
                )
                .addClass("info")
            )
            .append($("<span/>").addClass("count").text(" (0%)"))
            .appendTo($("#right-sidebars")),
          d = function (e) {
            c
              .find(".info")
              .text(
                a.GLocale.get(
                  new a.GLocaleKey(
                    "GCommonNames",
                    e ? "text.fonts-downloaded" : "text.error-downloading"
                  )
                )
              ),
              c.find(".count").remove(),
              c.append(
                $("<span/>")
                  .text("X")
                  .addClass("g-button")
                  .addClass("close")
                  .on("click", function () {
                    gDesigner.stats("font_downloaded_closebutton"), c.remove();
                  })
              );
          };
        return new Promise(function (t, a) {
          var r = [];
          try {
            var s = function (e) {
                return new Promise(function (t, a) {
                  var r = new XMLHttpRequest();
                  r.open("GET", n.getAssetsURL() + "" + e, !0),
                    (r.responseType = "blob"),
                    (r.onprogress = function (t) {
                      (i[e] = t.loaded),
                        (function () {
                          let e = Object.keys(i);
                          if (e.length) {
                            let n = 0;
                            for (var t = 0; t < e.length; ++t) n += i[e[t]];
                            let a = Math.round((n / o) * 100);
                            c.find(".count").text(
                              " (" + (a < 100 ? a : 100) + "%)"
                            );
                          }
                        })();
                    }),
                    (r.onload = function () {
                      this.status >= 200 && this.status < 400
                        ? t({ blob: r.response, url: e })
                        : a({ status: this.status, statusText: r.statusText });
                    }),
                    (r.onerror = function () {
                      a({ status: this.status, statusText: r.statusText });
                    }),
                    r.send();
                });
              },
              l = [],
              u = function (e) {
                r.push(e);
              },
              p = function () {
                throw new Exception("error downloading fonts");
              };
            e.forEach((e) => {
              l.push(
                s(e.preview)
                  .then(function (e) {
                    u(e);
                  })
                  .catch(() => {
                    p();
                  })
              );
              for (var t = 0; t < e.fonts.length; ++t)
                l.push(
                  s(e.fonts[t].url)
                    .then(function (e) {
                      u(e);
                    })
                    .catch((e) => {
                      console.log(e), p();
                    })
                );
            }),
              Promise.all(l).then(
                () => {
                  d(!0), t(r);
                },
                (e) => {
                  console.log(e), d(!1), a();
                }
              );
          } catch (e) {
            console.log(e), d(!1), a();
          }
        });
      }),
      (Je.prototype.showCreateAccount = function () {
        return this._showCreateAccount;
      }),
      (Je.prototype.setShowCreateAccount = function (e) {
        this._showCreateAccount = e;
      }),
      (Je.prototype.getSignupOptions = function () {
        return this._signupOptions;
      }),
      (Je.prototype.setSignupOptions = function (e) {
        this._signupOptions = e;
      }),
      (Je.prototype.enterpriseLoginForm = function () {
        return !1;
      }),
      (Je.prototype.setEnterpriseLoginForm = function (e) {}),
      (Je.prototype.runDeepLink = async function (e) {
        let t =
          arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {};
        if ((console.log("Called: " + e), e))
          try {
            const n = await this.getUser();
            if (0 === e.indexOf("purchase")) {
              let o;
              return (
                t.hasOwnProperty("newuser") && (this._showCreateAccount = !0),
                ke.PURCHASE.URL_TO_PRODUCT &&
                  (o = ke.PURCHASE.URL_TO_PRODUCT[e]),
                o &&
                  (Object.assign(t, { productId: o }),
                  n
                    ? await Oe.updateUserSettings({
                        subscription: { annual: { productId: o } },
                      })
                    : gContainer.setCookie({
                        name: "_gproductid",
                        value: o || "",
                        url: Oe.url,
                      })),
                this.openPaymentDialog(null, Object.assign(t, { flow: e }))
              );
            }
            if ("login_dialog" === e) this._user || Q.performLogin();
            else {
              if ("confirm_email" === e) {
                const { confirm_email: e, flow: o } = t;
                return this.getCloudCommunicationManager()
                  .confirmEmail(e)
                  .then(async () => {
                    let e = await this.getUser();
                    e &&
                      e.isEmailVerified() &&
                      this.executeWhenReady(() => {
                        const e = this.getLicense();
                        ee.custom({
                          title: a.GLocale.get(
                            new a.GLocaleKey(
                              "GCommonNames",
                              "text.activating-your-account"
                            )
                          ),
                          subtitle:
                            (e.isPro() || e.isTrial()) &&
                            a.GLocale.get(
                              new a.GLocaleKey(
                                "GCommonNames",
                                "text.activating-your-account-subtitle"
                              )
                            ),
                          icon: "ok",
                        }),
                          o && "confirm_email" !== o && this.runDeepLink(o, t);
                      });
                  })
                  .catch((e) => {
                    if (!n) return Promise.reject(e);
                    this.executeWhenReady(() => ee.error(e));
                  });
              }
              if ("account" === e)
                n &&
                  !this.isAnonymous() &&
                  this.executeWhenReady(() => {
                    new Se(n).open();
                  });
              else if ("purchases" === e) {
                n &&
                  (await Oe.hasPurchases()) &&
                  this.executeWhenReady(() => {
                    new Se(n, "purchase").open();
                  });
              } else if ("newuser" === e) this._showCreateAccount = !0;
              else if ("enterprise" === e)
                n || (this._enterpriseLoginForm = !0);
              else if ("reset_trial" === e) {
                const e = () => {
                  Oe.license
                    .resetTrial()
                    .then(() => gDesigner.requestLicenseUpdate());
                };
                n
                  ? e()
                  : new h.default()
                      .listen(le)
                      .when((e) => !!e && !!e.user)
                      .do(e);
              } else if ("procoupon" === e)
                this.executeWhenReady(() => {
                  Q.activateCoupon(t.procoupon);
                });
              else if ("annot" === e)
                s.HAS_ANNOTATIONS &&
                  this.executeWhenReady(() => {
                    const { annot: e } = t;
                    this.setPartVisible(F.RightSidebars, !0),
                      this._rightSidebars.setActiveSidebar(D.ID);
                  });
              else if (
                e === Z.DeepLinking.CreateShare &&
                "true" === t[Z.DeepLinking.CreateShare]
              )
                new h.default()
                  .listen(Te)
                  .when(() => this._initialized)
                  .do(() => {
                    const e = (t) => {
                      if (t.type === pe.Type.Updated) {
                        const t = this.getActiveDocument();
                        t &&
                          t.getStatus() === De.Loaded &&
                          (t.isShareable() &&
                            !this.getApplicationManager().isSharing() &&
                            this.getShareManager().share(),
                          this.removeEventListener(pe, e, this));
                      }
                    };
                    this.addEventListener(pe, e, this);
                  });
              else if (
                e === Z.DeepLinking.ActivateTrial &&
                t[Z.DeepLinking.ActivateTrial]
              ) {
                const e = t[Z.DeepLinking.ActivateTrial];
                Oe.license.activateTrial(e).then(() => be.checkLicense());
              } else {
                if (e === Z.DeepLinking.SetPassword) return new Ve().execute(t);
                if (e === Z.DeepLinking.ResetPassword)
                  return new He().execute(t);
                if (e === Z.DeepLinking.PasswordlessToken)
                  return new We().execute(t);
              }
            }
            return Promise.resolve();
          } catch (e) {
            return Promise.reject(e);
          }
      }),
      (Je.prototype.openProOffer = function () {
        let e =
          arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};
        Ee.openSubscriptionOffer(e);
      }),
      (Je.prototype.handlePROFeatureInterruption = function () {
        let e =
          arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};
        (e = $.extend({ campaign: "profeature" }, e)),
          this.isAnonymous()
            ? new re(() => {}).open({
                anonymous: !0,
                signup: !0,
                animate: !0,
                options: e,
              })
            : this.openProOffer(e);
      }),
      (Je.prototype.handleShareFilePROFeatureInterruption = function () {
        this.handlePROFeatureInterruption({ shareFile: !0 });
      }),
      (Je.prototype._applicationStatusEvent = function (e) {
        e.status === Te.Status.Ready && (this._ready = !0);
      }),
      (Je.prototype.executeWhenReady = function (e) {
        return new h.default()
          .listen(Te)
          .when(() => this._ready)
          .do(e);
      }),
      (Je.prototype.isReady = function () {
        return this._ready;
      }),
      (Je.prototype.isInAppPurchaseAllowed = function () {
        return gInAppPurchase.canMakePayments();
      }),
      (Je.prototype.openPaymentDialog = async function (e) {
        let t =
          arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {};
        return (
          this.getAmplitudeHelper().logEvent(
            s.AmplitudeData.Events.ACCOUNT_CART_SCREEN
          ),
          gInAppPurchase.purchase(e, t)
        );
      }),
      (Je.prototype.getWebURL = function () {
        return gContainer.getRuntime() === Z.Runtime.Browser ||
          gContainer.getRuntime() === Z.Runtime.PWA
          ? location.origin
          : gDesigner.getAssetsURL();
      }),
      (Je.prototype.getAssetsURL = function () {
        return "production" === this.getEnv()
          ? s.prodURL
          : this.isBeta()
          ? s.betaURL
          : "lts" === this.getEnv()
          ? s.ltsURL
          : "rc" === this.getEnv()
          ? s.rcURL
          : "https://app-" + this.getEnv().split(".")[0] + "." + s.domain + "/";
      }),
      (Je.prototype.getTabByDocument = function (e) {
        return this.getHeader().getWindowTab(this.getWindows().getWindow(e));
      }),
      (Je.prototype.getOpacityIncrement = function () {
        return 1;
      }),
      (Je.prototype.registerAdditionalShortcuts = function (e) {
        var t = e.getAdditionalShortcuts();
        t &&
          t.length &&
          t.forEach((t) => {
            this.registerShortcut(
              t,
              (t) => this._executeShortcutAction(e, t),
              !1
            );
          });
      }),
      (Je.prototype._executeShortcutAction = function (e, t) {
        const n = e.isKeyBoardEventRequiredToExecute() ? [t] : [void 0];
        return this.executeAction(e.getId(), n, "shortcut");
      }),
      (Je.prototype.getPaste = function () {
        return this._paste;
      }),
      (Je.prototype.getSubscriberUserType = function () {
        return this.getLicense().getSubscriberUserType();
      }),
      (Je.prototype.isLegacyFeature = function (e) {
        return !!e && Ie.includes(e);
      }),
      (Je.prototype.isEnabledProFeatures = function (e) {
        if (!this.isEnabledSubscriptions()) return !0;
        const t = this.getLicense();
        return (
          !(t.isFree() || this.isAnonymous() || t.isGuest()) &&
          (!(!t.isLegacy() || !this.isLegacyFeature(e)) ||
            (!t.isExpired() && (!t.isOffline() || !t.isOfflinePeriodExpired())))
        );
      }),
      (Je.prototype.isProTooltipNeeded = function (e) {
        const t = this.getLicense();
        return (
          !(e && this.isLegacyFeature(e) && t.isLegacy()) &&
          !(t.isPro() && !t.isExpired())
        );
      }),
      (Je.prototype.preInit = async function (e) {
        const t = this;
        await (async function () {
          e || (e = Oe.isEnabledSubscriptions());
          if (await e.catch(() => !1))
            return (
              (t._enabledSubscriptions = !0),
              void gContainer.setProperty(
                "enabled_subscriptions",
                t._enabledSubscriptions
              )
            );
          t._enabledSubscriptions = await gContainer
            .getProperty("enabled_subscriptions")
            .catch(() => !1);
        })(),
          await new Promise((e) => {
            t._applicationManager = new fe(e);
          });
      }),
      (Je.prototype.isEnabledSubscriptions = function () {
        return !!this.isInAppPurchaseAllowed() || !!this._enabledSubscriptions;
      }),
      (Je.prototype.setLicense = function (e) {
        !e ||
          (this._license && e.equals(this._license)) ||
          ((this._license = e),
          this.hasEventListeners(se) && this.trigger(new se(this._license))),
          this.updateLicenseInfo();
      }),
      (Je.prototype.updateLicenseInfo = async function () {
        let e = this._license,
          t = $(".license-info");
        const n = t.data("type");
        (n && n === e.getLicenseType()) || (t.remove(), (t = null));
      }),
      (Je.prototype.getLicense = function () {
        return navigator.onLine
          ? this._license || _e.newDefaultLicense()
          : _e.newOfflineLicense();
      }),
      (Je.prototype.getLicenseAsync = async function () {
        return (await this.isOfflineAsync())
          ? _e.newOfflineLicense()
          : this._license || _e.newDefaultLicense();
      }),
      (Je.prototype.activateTrialLicense = async function () {
        const e = async () => {
          this.toggleLoading(!0);
          try {
            await Oe.license
              .activateTrial()
              .then(() => gDesigner.requestLicenseUpdate())
              .catch((e) => ee.alert(Oe.formatError(e)));
          } finally {
            this.toggleLoading(!1);
          }
        };
        gDesigner.isOffline() ? xe.openUnavailableFeature(e) : e();
      }),
      (Je.prototype.requestLicenseUpdate = function () {
        let { showProOfferInTrial: e = s.LICENSE.UPGRADEABLE } =
          arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};
        return (
          we.reset("proOfferInTrial", e ? void 0 : gDesigner.now()),
          be.checkLicense()
        );
      }),
      (Je.prototype.now = function () {
        return new Date();
      }),
      (Je.prototype.isOffline = function (e) {
        if (!navigator.onLine) return (qe = !0), (Xe = Date.now()), !0;
        const t = e || s.OFFLINE_CHECK_MIN_WAIT;
        var n = !!qe;
        if (Date.now() - Xe > t) {
          n = !1;
          var o = new XMLHttpRequest();
          o.onerror = function () {
            console.log("OFFLINE!!!"), (n = !0);
          };
          try {
            o.open("HEAD", Oe.url + "/connection/test", !1),
              (o.withCredentials = s.CONNECTION_TEST_WITH_CREDENTIALS),
              o.setRequestHeader("Accept", "text/plain"),
              o.setRequestHeader("Content-Type", "text/plain"),
              o.send();
          } catch (e) {
            n = !0;
          }
          qe = n;
        }
        return (Xe = Date.now()), !navigator.onLine || n;
      }),
      (Je.prototype.setPaintMode = function (e) {
        var t = this.getWindows().getActiveWindow();
        if (t) {
          var n = t.getView();
          (n.getViewConfiguration().paintMode = e),
            r.GPlatform.scheduleFrame(() => {
              n.invalidateAndResetCache(null),
                this.hasEventListeners(Ae) && this.trigger(new Ae(e));
            });
        }
      }),
      (Je.prototype.isOfflineAsync = async function () {
        if (!navigator.onLine) return (qe = !0), (Xe = Date.now()), !0;
        var e = !!qe,
          t = !1;
        if (null === Qe && Date.now() - Xe > 3100) {
          var n = this.getHeader();
          n &&
            n.showBusyIcon(
              a.GLocale.get(
                new a.GLocaleKey("GCommonNames", "text.checking-connectivity")
              )
            );
          try {
            await (() =>
              new Promise((n, o) => {
                let i;
                i = this._initialized ? 3e3 : 2e4;
                var a = new XMLHttpRequest();
                (a.onerror = (o) => {
                  (e = !0), (t = !0), n();
                }),
                  (a.onload = (o) => {
                    (e = !1), (t = !0), n();
                  });
                var r = (Qe = setTimeout(() => {
                  r === Qe && (Qe = null), t || ((e = !0), n());
                }, i));
                try {
                  a.open("HEAD", Oe.url + "/connection/test", !0),
                    (a.withCredentials = s.CONNECTION_TEST_WITH_CREDENTIALS),
                    (a.timeout = 2e3),
                    a.setRequestHeader("Accept", "text/plain"),
                    a.setRequestHeader("Content-Type", "text/plain"),
                    a.send();
                } catch (o) {
                  (e = !0), (t = !0), n();
                }
              }))();
          } finally {
            n && n.hideBusyIcon(), (qe = e);
          }
        }
        return (Xe = Date.now()), !navigator.onLine || e;
      }),
      (Je.prototype.getLinkerParam = function (e) {
        const t = window[window.GoogleAnalyticsObject];
        if (t) {
          const n = t.getAll && t.getAll();
          if (n)
            for (let t = 0; t < n.length; t++) {
              let o = n[t];
              if (!e || o.get("trackingId") === e) return o.get("linkerParam");
            }
        }
        return null;
      }),
      (Je.prototype.isLocalhost = function () {
        return "localhost" === window.location.hostname;
      }),
      (Je.prototype.getAppBaseUrl = function () {
        let e = arguments.length > 0 && void 0 !== arguments[0] && arguments[0];
        return v.default.getAppBaseUrl(e);
      }),
      (Je.prototype.setPwaEvent = function (e) {
        if (!e || "beforeinstallprompt" !== e.type) return;
        if (
          ((this._pwaEvent = e),
          this._waitingPwaDialog &&
            !this._installPwaDialog &&
            (this.showInstallPwaDialog(this._waitingPwaDialogDarkBackground),
            (this._waitingPwaDialog = null),
            (this._waitingPwaDialogDarkBackground = null)),
          window.screen.availWidth < 1024)
        )
          return;
        const t = gDesigner.now().getTime();
        gContainer
          .getProperty(j.closedInstallPWADialogDatePropName)
          .then((e) => {
            e && t - e < s.DateAPI.daysToMilliseconds(30)
              ? gContainer.setProperty(
                  j.installPWA3timesAWeekPropName,
                  JSON.stringify([])
                )
              : gContainer
                  .getProperty(j.installPWA3timesAWeekPropName)
                  .then((e) => {
                    let n,
                      o = [];
                    if (e && e.length)
                      try {
                        n = JSON.parse(e);
                      } catch (e) {}
                    n || (n = []);
                    for (let e = 0, i = n.length; e < i; e++) {
                      const i = n[e];
                      t - i < s.DateAPI.daysToMilliseconds(7) && o.push(i);
                    }
                    2 === o.length &&
                      (gDesigner._ready
                        ? gDesigner.showInstallPwaDialog()
                        : this.executeWhenReady(() => {
                            gDesigner.showInstallPwaDialog();
                          })),
                      o.push(t),
                      o.length > 2 && (o = o.slice(-2)),
                      gContainer.setProperty(
                        j.installPWA3timesAWeekPropName,
                        JSON.stringify(o)
                      );
                  });
          });
      }),
      (Je.prototype.showInstallPwaDialog = function () {
        let e = arguments.length > 0 && void 0 !== arguments[0] && arguments[0];
        if (!this._installPwaDialog) {
          this._shouldWaitForPWAEvent()
            ? ((this._waitingPwaDialog = !0),
              (this._waitingPwaDialogDarkBackground = e))
            : ((this._installPwaDialog = new Y(e)),
              this._installPwaDialog.open());
        }
      }),
      (Je.prototype._shouldWaitForPWAEvent = function () {
        return !this.hasPwaEvent() && !!Ke.isSupported();
      }),
      (Je.prototype.closeInstallPwaDialog = function () {
        this._installPwaDialog &&
          (this._installPwaDialog.close(), (this._installPwaDialog = null));
      }),
      (Je.prototype.getPwaEvent = function () {
        return this._pwaEvent;
      }),
      (Je.prototype.hasPwaEvent = function () {
        return !!this._pwaEvent;
      }),
      (Je.prototype.draggableItemIsDragging = function () {
        return this._draggableItemIsDragging;
      }),
      (Je.prototype.setItemDraggingState = function (e) {
        this._draggableItemIsDragging = e;
      }),
      (Je.prototype.hasDocuments = function () {
        return !!this.getDocuments().length;
      }),
      (Je.prototype.getAmplitudeHelper = function () {
        return this._amplitudeHelper;
      }),
      (Je.prototype._initAmplitudeProperties = async function () {
        const e = await this.getUser();
        (this._amplitudeHelper = new s.AmplitudeHelper(g, {
          userId: null == e ? void 0 : e.id,
          apiKey: window.AMPLITUDE_API_KEY,
        })),
          new ne(this._amplitudeHelper);
      }),
      (Je.prototype._updateState = function () {
        var e, t, n, o, i, a, r;
        const s = gDesigner.getLicense();
        null === (e = this._toolbar) ||
          void 0 === e ||
          e.setEnabled(s.canAccessFreemium()),
          null === (t = this._leftSidebars) ||
            void 0 === t ||
            t.setEnabled(this._leftSidebars, s.canAccessFreemium()),
          null === (n = this._rightSidebars) ||
            void 0 === n ||
            n.setEnabled(this._rightSidebars, s.canAccessFreemium()),
          null === (o = this._banner) ||
            void 0 === o ||
            o.setEnabled(s.canAccessFreemium()),
          null === (i = this._overlay) ||
            void 0 === i ||
            i.setEnabled(s.canAccessFreemium()),
          null === (a = this._mainMenu) ||
            void 0 === a ||
            a.setEnabled(s.canAccessFreemium()),
          null === (r = this._header) ||
            void 0 === r ||
            r.setWindowTabEnable(s.canAccessFreemium()),
          this.relayout();
      }),
      (Je.prototype.isUserActivelyUsingApp = function () {
        var e;
        const t =
            null === (e = this.getActiveDocument()) ||
            void 0 === e ||
            null === (e = e.getEditor()) ||
            void 0 === e
              ? void 0
              : e.getUndoStates(),
          n = (null == t ? void 0 : t.length) && t[t.length - 1];
        return !!n && Date.now() - n.createdAt < ke.ACTIVE_USAGE_IDLE_TIME;
      }),
      (e.exports = Je);
  }