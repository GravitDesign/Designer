/**
 * Webpack Module #163
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    n(58),
      n(19),
      n(328),
      n(180),
      n(181),
      n(30),
      n(8),
      n(196),
      n(20),
      n(71),
      n(151),
      n(34),
      n(851),
      n(1388),
      n(218),
      n(189),
      n(190),
      n(191),
      n(192),
      n(4),
      n(41),
      n(13),
      n(32),
      n(38),
      n(33),
      n(26);
    var i = n(53),
      a = n(1),
      r = n(15),
      s = n(1201),
      l = n(797),
      c = n(10),
      d = n(40),
      u = o(n(1468)),
      p = o(n(1470)),
      g = o(n(1471)),
      h = o(n(177)),
      f = n(165);
    const m = n(1472);
    var y = n(388),
      v = n(78),
      _ = n(86),
      b = n(217),
      w = n(336),
      C = n(237),
      x = n(841),
      S = n(1473),
      E = n(219),
      A = n(1238),
      T = n(1475),
      G = n(255),
      P = n(119),
      D = n(220),
      L = n(85);
    const I = n(441),
      k = n(392),
      O = n(291),
      F = n(292),
      R = n(44),
      M = n(442),
      N = n(389),
      B = c.FILE_FORMATS.find((e) => e.default),
      U = c.FILE_FORMATS.filter((e) => e.secondary),
      $ = n(393),
      j = n(436);
    n(1152);
    function K(e) {
      (this._storageItem = e instanceof C.Item ? e : null),
        (this._windows = []),
        (this._activeWindow = null),
        this._updateStatus(_.Init),
        (this.sessionId = a.GUtil.uuid()),
        e instanceof a.GScene
          ? this.setScene(e)
          : this.setScene(gDesigner.createScene()),
        this._storageItem &&
          gDesigner.hasEventListeners(v) &&
          gDesigner.trigger(new v(v.Type.StorageItemUpdated, this)),
        (this._activeStylesList = { Fill: null, Border: null, Effect: null }),
        (this._lockedSymbolInstances = !1);
    }
    a.GObject.inherit(K, a.GEventTarget),
      (K.FileTypes = N.getFileTypesArray()),
      (K.prototype._status = null),
      (K.prototype._errored = !1),
      (K.prototype._storageItem = null),
      (K.prototype._isUpdateAvailable = !1),
      (K.prototype._tempCloudStorageItem = null),
      (K.prototype._documentColors = null),
      (K.prototype._scene = null),
      (K.prototype._editor = null),
      (K.prototype._windows = null),
      (K.prototype._activeWindow = null),
      (K.prototype._synchronizing = !1),
      (K.prototype._title = null),
      (K.prototype._reservedId = null),
      (K.prototype._trashed = null),
      (K.prototype._fontImporter = null),
      (K.prototype._paywall = null),
      (K.prototype._lockedSymbolInstances = !1),
      (K.prototype._lockedByVersionHistory = !1),
      (K.prototype._editable = !0),
      (K.prototype._annotationsEditable = c.HAS_ANNOTATIONS),
      (K.prototype._owner = null),
      (K.prototype._cloudSynchronismFlag = !1),
      (K.prototype._documentFromTemplate = !1),
      (K.prototype._isShared = !1),
      (K.prototype._focusAnnotationId = null),
      (K.prototype._failedDocumentIdOrToken = null),
      (K.prototype._lastDownloadSize = 0),
      (K.prototype._lastDownloadSize = 0),
      (K.prototype.hasUTS = void 0),
      (K.prototype._activeStylesList = null),
      (K.prototype.updateActiveStylesList = function (e, t) {
        this._activeStylesList.hasOwnProperty(e) &&
          (this._activeStylesList[e] = t);
      }),
      (K.prototype.getActiveStylesList = function () {
        return this._activeStylesList;
      }),
      (K.prototype.clearActiveStylesList = function () {
        Object.keys(this._selectedStylesList).forEach((e) => {
          this._selectedStylesList[e] = null;
        });
      }),
      (K.prototype.setFocusAnnotationId = function (e) {
        this._focusAnnotationId = e;
      }),
      (K.prototype.getFocusAnnotationId = function () {
        return this._focusAnnotationId;
      }),
      (K.prototype.setFailedDocumentIdOrToken = function (e) {
        this._failedDocumentIdOrToken = e;
      }),
      (K.prototype.getFailedDocumentIdOrToken = function () {
        return this._failedDocumentIdOrToken;
      }),
      (K.prototype._annotationFocused = !1),
      (K.prototype.setAnnotationFocused = function () {
        let e =
          !(arguments.length > 0 && void 0 !== arguments[0]) || arguments[0];
        this._annotationFocused = e;
      }),
      (K.prototype.isAnnotationFocused = function () {
        return this._annotationFocused;
      }),
      (K.prototype._colorModeElms = null),
      (K.prototype.setColorModeElms = function (e) {
        this._colorModeElms = e;
      }),
      (K.prototype.getColorModeElms = function () {
        return this._colorModeElms;
      }),
      (K.prototype.setDocumentFromTemplate = function (e) {
        this._documentFromTemplate = e;
      }),
      (K.prototype.isDocumentFromTemplate = function () {
        return this._documentFromTemplate;
      }),
      (K.prototype.setIsShared = function (e) {
        this._isShared = e;
      }),
      (K.prototype.isShared = function () {
        return this._isShared;
      }),
      (K.prototype.openPaywall = function (e) {
        this._paywall && this._paywall.close(),
          (this._paywall = new S(this, this.getStorageItem(), e)),
          this._paywall.open();
      }),
      (K.prototype.getStatus = function () {
        return this._status;
      }),
      (K.prototype.isNew = function () {
        return !this._storageItem;
      }),
      (K.prototype.isModified = function () {
        return (
          !!this._editor &&
          (!!this._errored ||
            !!this._editor.isModified(
              c.HAS_ANNOTATIONS
                ? (e) => e.hasMixin(a.GAnnotation) || e instanceof a.GComment
                : null
            ) ||
            !(
              !this._editable ||
              !this.getScene() ||
              (this.getStorageItem() && this.getStorageItem().getVersionId()) ||
              !(
                this.getScene().getLastTimeAnnotationsFromCloudModified() -
                  this.getScene().getLastSavedTime() >
                0
              )
            ))
        );
      }),
      (K.prototype.getStorageItem = function () {
        return this._storageItem;
      }),
      (K.prototype.getExtension = function () {
        const e = this.getStorageItem();
        return e ? e.getExtension() : B.ext;
      }),
      (K.prototype.hasCDR = function () {
        return !!(
          M.CDR_ORIGIN_PROPERTY_NAME &&
          this._scene &&
          this._scene.getProperty(M.CDR_ORIGIN_PROPERTY_NAME, !0)
        );
      }),
      (K.prototype.getTempCloudStorageItem = function () {
        return this._tempCloudStorageItem || this._storageItem;
      }),
      (K.prototype.getStorage = function () {
        return this._storageItem ? this._storageItem.getStorage() : null;
      }),
      (K.prototype.setStorageItem = function (e) {
        e !== this._storageItem &&
          ((this._storageItem = e),
          this._storageItem &&
            this.getFileFormatVersion() &&
            this._storageItem.storeFileFormatVersion(
              this.getFileFormatVersion()
            ),
          gDesigner.hasEventListeners(v) &&
            gDesigner.trigger(new v(v.Type.StorageItemUpdated, this)));
      }),
      (K.prototype.getScene = function () {
        return this._scene;
      }),
      (K.prototype.setScene = function (e) {
        let t = arguments.length > 1 && void 0 !== arguments[1] && arguments[1];
        if (e !== this._scene || t) {
          var n = !1;
          gDesigner.getActiveDocument() === this &&
            (gDesigner.activateDocument(null), (n = !0)),
            this._updateScene(e),
            this._updateStatus(_.Ready, e),
            n && gDesigner.activateDocument(this);
        }
      }),
      (K.prototype.setFileFormatVersion = function () {}),
      (K.prototype.saveFileFormatVersion = async function () {}),
      (K.prototype.getFileFormatVersion = function () {
        return null;
      }),
      (K.prototype.getDocumentColors = function (e) {
        var t = Object.keys(this._documentColors);
        t.sort(
          function (e, t) {
            return this._documentColors[t] - this._documentColors[e];
          }.bind(this)
        );
        var n = t.map(
          function (e) {
            return a.GPattern.deserialize(e);
          }.bind(this)
        );
        return "number" == typeof e && e > 0 && (n = n.slice(0, e)), n;
      }),
      (K.prototype._applicationStateChangedEvent = function (e) {
        e.document === this &&
          this._scene &&
          this._checkPermissionsAndUpdateState();
      }),
      (K.prototype._networkAvailabilityChangedEvent = function () {
        this._checkPermissionsAndUpdateState();
      }),
      (K.prototype._checkPermissionsAndUpdateState = function () {
        const e = gDesigner.getApplicationManager().isInspectEnabled(),
          t = gDesigner.getApplicationManager().isCommentingEnabled();
        (e === this._editable && t === this._annotationsEditable) ||
          ((this._editable = e),
          (this._annotationsEditable = t),
          this._updateState());
      }),
      (K.prototype._resolvedMissingEntryEvent = function (e) {
        try {
          const t = this.isCloudFile() ? this.getStorageItem().getId() : null;
          u.default.register({
            message: "DICTIONARY_MISSING_ENTRY",
            data: { entry: e.entry.uuid, file_id: t },
          });
        } catch (e) {
          console.error(e);
        }
      }),
      (K.prototype._updateScene = function (e) {
        if (
          (this._scene &&
            (this._editor.release(),
            this._editor.removeEventListener(
              i.GEditor.FileDropEvent,
              this._dropFileEvent,
              this
            ),
            this._editor.removeEventListener(
              i.GEditor.ModifiedEvent,
              this._modifiedEvent,
              this
            ),
            this._editor.removeAllEventListeners(),
            this._scene
              .getDictionary()
              .removeEventListener(
                a.GSceneDictionary.ResolvedMissingEntryEvent,
                this._resolvedMissingEntryEvent,
                this
              ),
            this._scene.removeEventListener(
              a.GNode.AfterInsertEvent,
              this._afterInsertNodeEvent,
              this
            ),
            this._scene.removeEventListener(
              a.GNode.AfterRemoveEvent,
              this._afterRemoveNodeEvent,
              this
            ),
            this._scene.removeEventListener(
              a.GNode.BeforeRemoveEvent,
              this._beforeRemoveNodeEvent,
              this
            ),
            this._scene.removeEventListener(
              a.GNode.BeforePropertiesChangeEvent,
              this._beforePropertiesChangeEvent,
              this
            ),
            this._scene.removeEventListener(
              a.GNode.AfterPropertiesChangeEvent,
              this._afterPropertiesChangeEvent,
              this
            ),
            this._scene.removeEventListener(
              a.GNode.AfterFlagChangeEvent,
              this._afterFlagChangeEvent,
              this
            ),
            this._scene.removeAllEventListeners(),
            this._scene.iteratePages((e) => {
              e.removeAllEventListeners();
            }, !0),
            this._scene.getDictionary().removeAllEventListeners(),
            this._scene.getSymbolDictionary().removeAllEventListeners(),
            gDesigner.removeEventListener(I, this._licenseChangedEvent, this),
            gDesigner.removeEventListener(
              k,
              this._applicationStateChangedEvent,
              this
            ),
            gDesigner.removeEventListener(
              O,
              this._networkAvailabilityChangedEvent,
              this
            ),
            gDesigner.removeEventListener(F, this._userLoggedEvent, this),
            gDesigner.removeEventListener(v, this._handleDocumentEvent, this),
            gDesigner.removeEventListener(
              w,
              this._handleStorageItemEvent,
              this
            ),
            this.removeEventListener($, this._collaborationEvent, this),
            this.removeEventListener(b, this._handleDocumentStatusEvent, this),
            (this._editor = null),
            (this._scene = null)),
          (this._documentColors = {}),
          (this._scene = e),
          this._scene)
        ) {
          this._editor = i.GEditor.getEditor(e) || new i.GEditor(e);
          const t = gDesigner.getSyncUser();
          t && this._editor.setUID(t.getUID()),
            this._editor.addEventListener(
              i.GEditor.FileDropEvent,
              this._dropFileEvent,
              this,
              void 0,
              void 0,
              !0
            ),
            this._editor.addEventListener(
              i.GEditor.ModifiedEvent,
              this._modifiedEvent,
              this,
              void 0,
              void 0,
              !0
            ),
            this._scene
              .getDictionary()
              .addEventListener(
                a.GSceneDictionary.ResolvedMissingEntryEvent,
                this._resolvedMissingEntryEvent,
                this,
                void 0,
                void 0,
                !0
              ),
            this._scene.addEventListener(
              a.GNode.AfterInsertEvent,
              this._afterInsertNodeEvent,
              this,
              void 0,
              void 0,
              !0
            ),
            this._scene.addEventListener(
              a.GNode.AfterRemoveEvent,
              this._afterRemoveNodeEvent,
              this,
              void 0,
              void 0,
              !0
            ),
            this._scene.addEventListener(
              a.GNode.BeforeRemoveEvent,
              this._beforeRemoveNodeEvent,
              this,
              void 0,
              void 0,
              !0
            ),
            this._scene.addEventListener(
              a.GNode.BeforePropertiesChangeEvent,
              this._beforePropertiesChangeEvent,
              this,
              void 0,
              void 0,
              !0
            ),
            this._scene.addEventListener(
              a.GNode.AfterPropertiesChangeEvent,
              this._afterPropertiesChangeEvent,
              this,
              void 0,
              void 0,
              !0
            ),
            this._scene.addEventListener(
              a.GNode.AfterFlagChangeEvent,
              this._afterFlagChangeEvent,
              this,
              void 0,
              void 0,
              !0
            ),
            gDesigner.addEventListener(I, this._licenseChangedEvent, this),
            gDesigner.addEventListener(
              k,
              this._applicationStateChangedEvent,
              this
            ),
            gDesigner.addEventListener(
              O,
              this._networkAvailabilityChangedEvent,
              this
            ),
            gDesigner.addEventListener(F, this._userLoggedEvent, this),
            gDesigner.addEventListener(v, this._handleDocumentEvent, this),
            gDesigner.addEventListener(w, this._handleStorageItemEvent, this),
            this.addEventListener(
              $,
              this._collaborationEvent,
              this,
              void 0,
              void 0,
              !0
            ),
            this.addEventListener(
              b,
              this._handleDocumentStatusEvent,
              this,
              void 0,
              void 0,
              !0
            ),
            e.acceptChildren((e) => {
              if (e.hasMixin(a.GElement.Stylable) && e.getPaintLayers())
                for (
                  var t = e.getPaintLayers().getFirstChild();
                  null !== t;
                  t = t.getNext()
                )
                  this._updateDocumentColorsFromElement(t, ["_pt"]);
            }),
            this._updateState();
        }
      }),
      (K.prototype._userLoggedEvent = function (e) {
        const { user: t } = e;
        t && this._editor && this._editor.setUID(new h.default(t).getUID());
      }),
      (K.prototype._handleDocumentEvent = function () {}),
      (K.prototype._handleStorageItemEvent = function () {}),
      (K.prototype._collaborationEvent = async function (e) {
        if (this.isLockedByVersionHistory()) return;
        const { type: t, data: n } = e;
        switch (t) {
          case $.Type.ReviewStatusChanged:
            this.isCollaborative() &&
              this.getStorageItem().setCollaborativeFileStatus(n.status);
            break;
          case $.Type.FileUpdate:
            if (
              n &&
              n.metadata &&
              n.metadata.sessionId &&
              n.metadata.sessionId === this.sessionId
            )
              return;
            (this._isUpdateAvailable = !0),
              (this._isIgnoringCurrentUpdate = !1),
              gDesigner.hasEventListeners(v) &&
                gDesigner.trigger(new v(v.Type.UpdateAvailable, this));
        }
      }),
      (K.prototype._handleDocumentStatusEvent = async function (e) {
        switch (e.status) {
          case _.Loaded:
            (this._isUpdateAvailable = !1),
              (this._isIgnoringCurrentUpdate = !1);
            break;
          case _.Ready:
            this._checkPermissionsAndUpdateState();
            break;
          case _.Saved:
            (this._isUpdateAvailable = !1),
              (this._isIgnoringCurrentUpdate = !1),
              this._handleDocumentStatusSavedEventForRealtimeNotification(e);
            break;
          case _.Saving:
            gDesigner.trigger(new v(v.Type.Saving, this, e.data));
        }
      }),
      (K.prototype._handleDocumentStatusSavedEventForRealtimeNotification =
        async function (e) {
          e.data &&
          (e.data.hasOwnProperty("collabTextUpdate") ||
            e.data.hasOwnProperty("sendEmail"))
            ? this.publish({
                collabTextUpdate: e.data.collabTextUpdate,
                sendEmail: e.data.sendEmail,
              })
            : this.publish();
        }),
      (K.prototype.isUpdateAvailable = async function () {
        if (this._isUpdateAvailable) return !0;
        const e = this.getStorageItem();
        return (
          !(
            !e ||
            (!e.hasVersionControl() && !this.isCloudFile()) ||
            this._synchronizing
          ) && e.hasUpdates()
        );
      }),
      (K.prototype.isIgnoringCurrentUpdate = function () {
        return this._isIgnoringCurrentUpdate;
      }),
      (K.prototype.ignoreCurrentUpdate = function () {
        this._isIgnoringCurrentUpdate = !0;
      }),
      (K.prototype.getEditor = function () {
        return this._editor;
      }),
      (K.prototype.getWindows = function () {
        return this._windows;
      }),
      (K.prototype.getActiveWindow = function () {
        return this._activeWindow;
      }),
      (K.prototype.setOwner = function (e) {
        (this._owner && this._owner.id) !== (e && e.id) &&
          ((this._owner = e),
          gDesigner.hasEventListeners(v) &&
            gDesigner.trigger(new v(v.Type.OwnerUpdated, this)));
      }),
      (K.prototype.getOwner = function () {
        return this._owner;
      }),
      (K.prototype.canSaveToCloud = async function () {
        if (!this._owner) return !0;
        const e = await gDesigner.getUser();
        return (
          !!e &&
          (this._owner.id === e.getUID() ||
            gDesigner
              .getApplicationManager()
              .hasPermission(this, c.SharePermissions.EDIT))
        );
      }),
      (K.prototype.setTitle = function (e) {
        e !== this._title &&
          ((this._title = e),
          this.isCloudFile() && this.getStorageItem().setFileName(e),
          gDesigner.hasEventListeners(v) &&
            gDesigner.trigger(new v(v.Type.Modified, this)));
      });
    var V = {},
      H = 1;
    function W(e) {
      setTimeout(e, 10);
    }
    (K.prototype.getTitle = function () {
      return (
        this.isNew() &&
          (V[this.sessionId] = V[this.sessionId] ? V[this.sessionId] : H++),
        this.isNew()
          ? this._title ||
            a.GLocale.get(
              new a.GLocaleKey("GDocument", "text.default-document-name")
            ) +
              "-" +
              V[this.sessionId]
          : this._storageItem.getName()
      );
    }),
      (K.prototype.insertElement = function (e, t, n, o) {
        var i = this.getScene();
        if (i.isFixedSized() && e.hasMixin(a.GElement.Transform)) {
          var r = e.getGeometryBBox();
          if (!r) return;
          var s = r.getWidth(),
            l = r.getHeight(),
            c = i.getProperty("w"),
            d = i.getProperty("h"),
            u = new a.GTransform();
          if (n && (s > c || l > d)) {
            var p = 1,
              g = 1;
            s > c && (p = c / s),
              l > d && (g = d / l),
              p < g ? (g = p) : (p = g),
              (u = u
                .translated(-r.getX(), -r.getY())
                .scaled(p, g)
                .translated(r.getX(), r.getY())),
              (s *= p),
              (l *= g);
          }
          t &&
            (u = u.translated((c - s) / 2 - r.getX(), (d - l) / 2 - r.getY())),
            e.transform(u, !0);
          var h = u.getScaleFactor(),
            f = function (e) {
              if (
                e instanceof a.GItem &&
                e.hasMixin(a.GElement.Stylable) &&
                e.hasStyleBorder()
              ) {
                var t = e.getPaintLayers();
                t &&
                  a.GUtil.each(t.getBorderLayers(), function (e, t) {
                    t && t.setProperty("_bw", t.$_bw * h);
                  });
              }
            };
          e.beginUpdate(),
            f(e),
            e.hasMixin(a.GNode.Container) && e.acceptChildren(f),
            e.endUpdate();
        }
        this._editor.insertElements([e], !0, o, e instanceof a.GItem);
      }),
      (K.prototype.loadFromData = function (e) {
        var t = { progress: null, checkAnnotations: !1 };
        this._updateStatus(_.Loading, t), this._loadDataIntoDocument(e, t);
      }),
      (K.prototype._loadDataIntoDocument = async function (e, t) {
        t.progress && t.progress(5), await (0, d.sleep)(10);
        const n = P.unzipData(e);
        return (
          t.progress && t.progress(10),
          await (0, d.sleep)(10),
          this.deserializeData(n, t)
        );
      }),
      (K.prototype.deserializeData = function (e, t) {
        const n = this.getActiveWindow();
        return (
          n && n.centerAndZoom(),
          this._updateCloudSynchronism(this.isCloudFile()),
          new Promise(async (n, o) => {
            t || ((t = { progress: null }), this._updateStatus(_.Loading, t)),
              t.progress && t.progress(15);
            const i = await new Promise((n, o) => {
              try {
                a.GNode.deserializeAsync(
                  e,
                  gDesigner.getWorkspace(),
                  t.progress,
                  null,
                  n
                );
              } catch (e) {
                o(e);
              }
            }).catch(o);
            (e = null),
              i &&
                (!this.isCloudFile() &&
                !this.isExternalFile() &&
                i &&
                i.isCloudSynchronization()
                  ? this.loadFromCloud(
                      i,
                      t,
                      () => {
                        this._updateCloudSynchronism(!0);
                      },
                      () => {
                        this._updateCloudSynchronism(!1),
                          gDesigner.isOffline() || i.setProperty("cfs", !1);
                      },
                      !1
                    )
                  : i
                  ? (this.isExternalFile() && i.setProperty("cfs", !1),
                    this._updateScene(i),
                    !this.isCloudFile() &&
                      t.checkAnnotations &&
                      this.loadCloudAnnotations(),
                    this._updateStatus(_.Loaded),
                    this.setScene(i, !0))
                  : this._updateStatus(_.LoadFailed),
                n());
          })
        );
      }),
      (K.prototype.loadFromCloud = function (e, t, n, o) {
        let i =
          !(arguments.length > 4 && void 0 !== arguments[4]) || arguments[4];
        (t = t || { progress: null }), this._updateStatus(_.Syncing, t);
        var a = () => {
          this.chooseLatestDocument(
            e,
            (e) => {
              this.setScene(e),
                t.checkAnnotations && this.loadCloudAnnotations(),
                this._updateStatus(_.Loaded),
                n && n(e);
            },
            (n) => {
              this.setScene(e),
                t.checkAnnotations && this.loadCloudAnnotations(),
                this._updateStatus(_.SyncFailed),
                o && o(n);
            },
            null,
            (i &&
              (() => {
                this._updateStatus(_.LoadCancelled);
              })) ||
              void 0
          );
        };
        a();
      }),
      (K.prototype.storeToCloud = async function (e, t, n) {
        let o = arguments.length > 3 && void 0 !== arguments[3] && arguments[3],
          i = arguments.length > 4 ? arguments[4] : void 0;
        var r = i || {};
        this.isModified() ||
          Object.assign(r, { lastModifiedDate: e.getLastSavedTime() });
        const s = () => {
            this._updateCloudSynchronism(!1),
              n
                ? n.apply(null, arguments)
                : new E(
                    a.GLocale.get(
                      new a.GLocaleKey("GDocument", "text.sync-to-cloud-error")
                    )
                  ).open();
          },
          l = () => {
            this._updateCloudSynchronism(!0), t && t.apply(null, arguments);
          };
        this.isExternalFile()
          ? this.performCloudSave(l, s, r, o)
          : P.performSave(
              this,
              l,
              s,
              r,
              await D.from(
                gDesigner.getDefaultStorage(),
                e.getProperty("cid"),
                this.getTitle()
              ),
              o
            );
      }),
      (K.prototype.saveAnnotations = function (e, t) {
        return P.saveDocumentAnnotations(this, e, t);
      }),
      (K.prototype.loadCloudAnnotations = function () {
        return P.getCloudAnnotations(this);
      }),
      (K.prototype.performCloudSave = async function (e, t, n) {
        let o = arguments.length > 3 && void 0 !== arguments[3] && arguments[3];
        var i = this;
        let r = !1;
        if (this.isCommercialProductFile()) this.openPaywall();
        else {
          var s = this.getStorageItem(),
            l = (n) => {
              o ||
                (n && 507 === n.code
                  ? (R.alert(n.message), n.noFailCall && (r = !0))
                  : R.confirm(
                      a.GLocale.get(
                        new a.GLocaleKey(
                          "GCommonNames",
                          "text.save-to-cloud-failed"
                        )
                      ),
                      (n) => {
                        n
                          ? gDesigner.executeAction(
                              "file.save-as.".concat(B.ext),
                              [null, this],
                              "savefailed"
                            )
                          : "function" != typeof t || r
                          ? "function" == typeof e && e(!1)
                          : ((r = !0), t());
                      },
                      a.GLocale.get(new a.GLocaleKey("GLocale", "no")),
                      a.GLocale.get(new a.GLocaleKey("GLocale", "yes"))
                    )),
                n && console.log(n),
                this.setSynchronizing(!1),
                this._updateStatus(_.SyncFailed),
                this._updateStatus(_.SaveFailed),
                gDesigner.trigger(new v(v.Type.SynchronismUpdateFailed, this)),
                this.setErrored(!0),
                t && !r && ((r = !0), t());
            };
          try {
            this.setSynchronizing(!0);
            var c = async () => {
              const t = !i.isCloudFile() || s.getType() !== B.type;
              await this.saveAnnotations(t),
                (n = this.updateSaveOptionsLastModifiedDate(n)),
                s.write(
                  this,
                  function () {
                    i.setSynchronizing(!1),
                      i.setErrored(!1),
                      i._updateStatus(_.Saved, {}),
                      gDesigner.hasEventListeners(v) &&
                        gDesigner.trigger(new v(v.Type.Modified, i));
                    try {
                      i.isCloudFile() &&
                        gDesigner.updateRecentDocumentsAction();
                    } finally {
                      e && e();
                    }
                  },
                  function (e) {
                    l(e);
                  },
                  null,
                  n
                );
            };
            if (s.hasVersionControl() && (await s.hasUpdates())) {
              var d = this.getScene(),
                u = await s.getLatestFileVersion(),
                p = await new Promise((e, t) => {
                  u.read(
                    (t) => e(t),
                    (e) => t(e)
                  );
                }),
                g = a.GNode.deserialize(
                  P.unzipData(p),
                  gDesigner.getWorkspace()
                );
              return new T(
                d,
                g,
                this.getTitle(),
                u.getName(),
                (e) => {
                  if (e === d) c();
                  else {
                    this.setSynchronizing(!1);
                    const t = new K(u);
                    t.setScene(e), gDesigner.replaceDocument(this, t, !0);
                  }
                },
                () => {
                  this.setSynchronizing(!1),
                    i.setErrored(!1),
                    this._updateStatus(_.SaveCancelled, {}),
                    e && e();
                }
              ).open();
            }
            c();
          } catch (e) {
            l(e);
          }
        }
      }),
      (K.prototype.chooseLatestDocument = async function (e, t, n, o, i) {
        var r = (e) => {
          n && n(e),
            (e instanceof Error || "string" == typeof e) && console.error(e);
        };
        let s;
        try {
          s = await c.gApi.getFile(e.getProperty("cid"));
        } catch (e) {
          return void r(e);
        }
        P.loadDesignData(
          e.getProperty("cid"),
          void 0,
          void 0,
          void 0,
          void 0,
          s.autosave
        )
          .then(async (n) => {
            var s = n.data,
              l = n.file;
            (this._tempCloudStorageItem = await D.from(
              gDesigner.getDefaultStorage(),
              e.getProperty("cid")
            )),
              (o =
                o ||
                function (e, t) {
                  return (
                    e.lastModifiedDate().getTime() !==
                      t.lastModifiedDate().getTime() && (0, d.isDifferent)(e, t)
                  );
                });
            var c = a.GNode.deserialize(
              P.unzipData(s),
              gDesigner.getWorkspace()
            );
            c
              ? o(e, c)
                ? new T(
                    e,
                    c,
                    this.getTitle(),
                    l.name,
                    (n) => {
                      (this._tempCloudStorageItem = null),
                        n === e
                          ? this.storeToCloud(n)
                          : n.setProperties(
                              ["cid", "cfs"],
                              e.getProperties(["cid", "cfs"])
                            ),
                        t(n, !0);
                    },
                    i
                  ).open()
                : t(e)
              : r();
          })
          .catch(r);
      }),
      (K.prototype.isCloudSynchronismAvailable = function () {
        return this._cloudSynchronismFlag;
      }),
      (K.prototype._updateCloudSynchronism = function (e) {
        this._cloudSynchronismFlag !== e &&
          ((this._cloudSynchronismFlag = e),
          gDesigner.hasEventListeners(v) &&
            gDesigner.trigger(new v(v.Type.CloudSynchronismUpdated, this)));
      }),
      (K.prototype.isCloudFile = function () {
        return this.getStorageItem() instanceof D.Item;
      }),
      (K.prototype.isCollaborative = function () {
        return this.getStorageItem() && this.getStorageItem().hasMixin(j);
      }),
      (K.prototype.isShareable = function () {
        const e = this.getStorageItem();
        return (
          (this.isCloudFile() && e && e.getId()) ||
          (e && e.getId() && e.supportsShadowFile() && e.supportsSharing())
        );
      }),
      (K.prototype.isExternalFile = function () {
        return this.getStorageItem() instanceof y.Item;
      }),
      (K.prototype.isEditingEnabled = function () {
        const e = this.getStorageItem();
        return !e || e.isEditingEnabled();
      }),
      (K.prototype.getId = function () {
        return this.isCloudFile() || this.isExternalFile()
          ? this.getStorageItem().getId()
          : this.getCloudReferenceId()
          ? this.getCloudReferenceId()
          : null;
      }),
      (K.prototype.getToken = function () {
        return this.isCollaborative() ? this.getStorageItem().getToken() : null;
      }),
      (K.prototype.getAnnotationsId = function () {
        if (!c.HAS_ANNOTATIONS) return null;
        var e = this.getId();
        if (!e) {
          var t = this.getScene();
          (e = t.isCloudAnnotations() ? t.getProperty("cid") : null) ||
            (e = this.getReservedId());
        }
        return e;
      }),
      (K.prototype.getAnnotationsToken = async function (e) {
        if (!c.HAS_ANNOTATIONS) return null;
        var t = null;
        let n = location.search.match(
          /token=(?:[\0-%'-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])+/
        );
        n && (t = n[0].slice(6));
        var o = null,
          i = this.getScene(),
          a = this.getId(),
          r = i.getProperty("cid"),
          s = this.getReservedId();
        return (
          !t || (e !== a && e !== s)
            ? e === r && e !== a && e !== s && (o = i.getProperty("asec"))
            : (o = t),
          o
        );
      }),
      (K.prototype.updateSaveOptionsLastModifiedDate = function (e, t) {
        return (
          e ? (e.save = !0) : (e = { save: !0 }),
          c.HAS_ANNOTATIONS &&
            this._scene &&
            this._scene.getLastTimeAnnotationsFromCloudModified() &&
            (e.lastModifiedDate =
              this._scene.getLastTimeAnnotationsFromCloudModified()),
          t && !e.lastModifiedDate && (e.lastModifiedDate = t),
          e
        );
      }),
      (K.prototype.isWebFile = function () {
        const e = this.getStorageItem();
        return e
          ? e instanceof D.Item
          : gContainer.getRuntime() === L.Runtime.Browser ||
              gContainer.getRuntime() === L.Runtime.PWA;
      }),
      (K.prototype.isCommercialProductFile = function () {
        return (
          this.getStorageItem() &&
          this.getStorageItem() instanceof D.CommercialProduct
        );
      }),
      (K.prototype.restrictElements = function (e) {
        return (
          e.forEach((e) => {
            e.setProperty("restricted", this.getStorageItem().getId(), !0);
          }),
          e
        );
      }),
      (K.prototype.filterUnrestrictedCommercialFileElements = function (e) {
        return (
          e &&
          e.filter((e) => {
            let t = e.getProperty("restricted", !0) || !1;
            if (!t) return !0;
            let n = this.getStorageItem();
            return n && n.getId() === t;
          })
        );
      }),
      (K.prototype.hasCloudReference = function () {
        return !this.isCloudFile() && !!this._getCloudSceneId();
      }),
      (K.prototype.getCloudReferenceId = function () {
        return (this.hasCloudReference() && this._getCloudSceneId()) || null;
      }),
      (K.prototype._getCloudSceneId = function () {
        return this.getScene() && this.getScene().getProperty("cid");
      }),
      (K.prototype.isCloudSyncOn = function () {
        return (
          this.hasCloudReference() &&
          this.getScene() &&
          this.getScene().isCloudSynchronization()
        );
      }),
      (K.prototype.isExtensionAvailableForLoading = function (e) {
        return (
          e &&
          !!K.FileTypes.find(
            (t) => t.load && t.ext.toUpperCase() === e.toUpperCase()
          )
        );
      }),
      (K.prototype.reload = async function () {
        let e;
        if (
          (gDesigner.hasEventListeners(v) &&
            gDesigner.trigger(new v(v.Type.BeforeReload, this)),
          this.isCloudFile())
        ) {
          const t = await c.gApi.getFile(this.getId());
          (e = await D.from(
            gDesigner.getDefaultStorage(),
            t,
            void 0,
            void 0,
            t.autosave
          )),
            this.getEditor() && this.getEditor().markSavePoint(),
            this.setStorageItem(e);
        } else e = this.getStorageItem();
        this.load(e);
      }),
      (K.prototype.load = function (e) {
        let t =
          arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {};
        if ("lts" !== gDesigner.getEnv() || gDesigner.isEnabledProFeatures()) {
          var n = e || this._storageItem;
          if (n) {
            var o = n.getName(),
              i = n.getExtension();
            (t = Object.assign(
              {},
              { progress: null, filename: o, ext: i ? i.toLowerCase() : null },
              t
            )),
              this._updateStatus(_.Loading, t);
            var r = (e) => {
                let t = !1;
                G.getInstance().query(
                  (n) => {
                    var o = [];
                    n.faces.slice().map((e) => {
                      for (var t = [e.family], n = 0; n < e.fonts.length; n++)
                        e.fonts[n].family &&
                          t.indexOf(e.fonts[n].family) < 0 &&
                          t.push(e.fonts[n].family);
                      o = o.concat(t);
                    }),
                      s.GPDFImport.updateFontFamilies(o),
                      t || ((t = !0), e());
                  },
                  "%",
                  !0
                );
              },
              l = function (e, o, r, s) {
                if (e)
                  return (
                    new E(
                      a.GLocale.get(
                        new a.GLocaleKey("GDocument", "text.image-too-big")
                      )
                    ).open(),
                    void this._updateStatus(_.LoadFailed)
                  );
                t.progress(100);
                var l = gDesigner.createScene(),
                  c = l.getActivePage(),
                  d = new a.GImage();
                d.setProperties(["iw", "ih", "url"], [r, s, o]),
                  c.setProperties(
                    ["w", "h", "bck"],
                    [r, s, "PNG" !== i ? a.GRGBColor.WHITE : null]
                  ),
                  c.appendChild(d),
                  n.getName() && this.setTitle(n.getName()),
                  this.setScene(l),
                  this._updateStatus(_.Loaded),
                  gDesigner.gtmEvent("DOCUMENT_IMPORT_EVENT");
              }.bind(this);
            n.read(
              async (e) => {
                if ("GVDESIGN" === i || i === B.ext.toUpperCase()) {
                  gDesigner.stats("document_open_".concat(i.toLowerCase())),
                    (t.checkAnnotations = !0);
                  const o = G.getInstance();
                  o.setShowMissingFontsDialog(!1);
                  const a = new p.default();
                  a.start(),
                    this._loadDataIntoDocument(e, t).finally(async () => {
                      try {
                        const e = gDesigner.getWorkspace().getFontManager();
                        await new g.default(e).waitForAllPendingFonts();
                        const t = a.getMissingFonts();
                        t && t.length && new x(this, t).open();
                      } finally {
                        a.stop(), o.setShowMissingFontsDialog(!0);
                      }
                    }),
                    gDesigner.addToRecentFiles(n),
                    gDesigner.gtmEvent("DOCUMENT_OPEN_EVENT");
                } else if (
                  U.length &&
                  U.find((e) => e.ext.toUpperCase() === i)
                ) {
                  await this._handleSecondaryFormatRead(n, e, t);
                  var o = gDesigner.getWindows().getActiveWindow().getView();
                  if (
                    o &&
                    this.hasCDR() &&
                    !o.getViewConfiguration().multiPageView
                  ) {
                    var c = this._scene.getActivePage();
                    if (c) {
                      var d = c.getContentBBox();
                      if (d && !d.isEmpty()) {
                        var u = d.getSide(a.GRect.Side.CENTER);
                        o.zoomAtCenter(u);
                      }
                    }
                  }
                  gDesigner.gtmEvent("DOCUMENT_OPEN_EVENT");
                } else if ("SVG" === i || "SVGZ" === i)
                  gDesigner.stats("document_open_svg"),
                    s.GSVGImport.import(
                      e,
                      { fontProvider: J },
                      gDesigner.getWorkspace().getFontManager(),
                      (e, t, o) => {
                        if (t) {
                          let e;
                          if (t instanceof a.GPage)
                            (e = gDesigner.createScene(!0)),
                              e.appendChild(t),
                              e.setActivePage(t);
                          else {
                            e = gDesigner.createScene();
                            var i = e.getActivePage(),
                              r = null,
                              s = [];
                            if (t instanceof a.GGroup)
                              for (
                                var l = 1 === t.getChildren().length;
                                t.getFirstChild();

                              ) {
                                var c = t.getFirstChild();
                                if (
                                  (t.removeChild(c),
                                  i.appendChild(c),
                                  l && c.hasMixin(a.GStylable))
                                ) {
                                  var d = t.getEffects();
                                  d &&
                                    d.getChildren().length &&
                                    d.getChildren().forEach(function (e) {
                                      c.getEffects().appendChild(e.clone());
                                    });
                                }
                                if (
                                  !c.hasMixin(a.GStylable) ||
                                  null === c.getPaintLayers() ||
                                  c instanceof a.GImage ||
                                  c.hasStyleBorder() ||
                                  c.hasStyleFill()
                                )
                                  s.push(c),
                                    c.getPaintBBox() &&
                                      (r = r
                                        ? r.united(c.getPaintBBox())
                                        : c.getPaintBBox());
                              }
                            else
                              s.push(t),
                                i.appendChild(t),
                                (r = t.getPaintBBox());
                            a.GUtil.each(s, function () {}),
                              i.setProperties(
                                ["w", "h"],
                                [o ? o.width : 0, o ? o.height : 0]
                              ),
                              o.unit && e.setProperty("ut", o.unit);
                          }
                          this._updateStatus(_.Loaded),
                            n.getName() && this.setTitle(n.getName()),
                            this.setScene(e),
                            gDesigner.gtmEvent("DOCUMENT_IMPORT_EVENT");
                        } else this._updateStatus(_.LoadFailed);
                        var u = gDesigner
                          .getWindows()
                          .getActiveWindow()
                          .getView();
                        (u.getViewConfiguration().paintMode =
                          a.GScenePaintConfiguration.PaintMode.Output),
                          u.invalidate();
                      }
                    );
                else if ("EPS" === i)
                  gDesigner.stats("document_open_eps"),
                    this._preProcessFonts(
                      a.GLocale.get(
                        new a.GLocaleKey("GDocument", "text.keep-fonts-eps")
                      )
                    ),
                    s.GEPSImport.import(
                      e,
                      gDesigner.getSetting("eps_outline_fonts", !0),
                      gDesigner.getWorkspace().getFontManager(),
                      (e, t, o, i) => {
                        if ((this._postProcessFonts(), e || !t)) {
                          e && new E(e).open(),
                            this._updateStatus(_.LoadFailed);
                          var r = gDesigner
                            .getWindows()
                            .getActiveWindow()
                            .getView();
                          return (
                            (r.getViewConfiguration().paintMode =
                              a.GScenePaintConfiguration.PaintMode.Output),
                            void r.invalidate()
                          );
                        }
                        var s = gDesigner.createScene(),
                          l = s.getActivePage(),
                          c = null;
                        "production" !== gDesigner.getEnv() &&
                          "lts" !== gDesigner.getEnv() &&
                          ((z = 0), console.time("optimization time")),
                          Q(t),
                          "production" !== gDesigner.getEnv() &&
                            "lts" !== gDesigner.getEnv() &&
                            (console.timeEnd("optimization time"),
                            console.log("Nodes removed: " + z));
                        var d = [];
                        for (
                          s._beginBlockChanges([
                            a.GNode._Change.BeforeChildRemove,
                            a.GNode._Change.AfterChildRemove,
                            a.GNode._Change.BeforeChildInsert,
                            a.GNode._Change.AfterChildInsert,
                          ]),
                            t._blockUpdateChanges();
                          t.getFirstChild();

                        ) {
                          var u = t.getFirstChild();
                          t.removeChild(u),
                            l.appendChild(u),
                            d.push(u),
                            u.getPaintBBox() &&
                              (c = c
                                ? c.united(u.getPaintBBox())
                                : u.getPaintBBox());
                        }
                        l.acceptChildren(function (e) {
                          e instanceof a.GText &&
                            e.hasFontsToResolve() &&
                            e.toFakeText();
                        }),
                          t._releaseUpdateChanges(),
                          a.GUtil.each(d, function (e, t) {
                            t.transform(
                              new a.GTransform().translated(
                                -c.getX(),
                                -c.getY()
                              )
                            );
                          }),
                          o
                            ? l.setProperties(
                                ["w", "h"],
                                [o ? o.width : 0, o ? o.height : 0]
                              )
                            : l.trimToContent(),
                          l.setProperty("bck", i || a.GRGBColor.WHITE),
                          s._endBlockChanges([
                            a.GNode._Change.BeforeChildRemove,
                            a.GNode._Change.AfterChildRemove,
                            a.GNode._Change.BeforeChildInsert,
                            a.GNode._Change.AfterChildInsert,
                          ]),
                          this._updateStatus(_.Loaded),
                          n.getName() && this.setTitle(n.getName()),
                          this.setScene(s),
                          gDesigner.gtmEvent("DOCUMENT_IMPORT_EVENT");
                      },
                      function (e) {
                        new E(e).open();
                      },
                      function (e) {
                        t && t.progress && t.progress(e);
                      },
                      this.initCancelHandler.bind(this)
                    );
                else if ("PDF" === i || "AI" === i) {
                  "PDF" === i
                    ? gDesigner.stats("document_open_pdf")
                    : gDesigner.stats("document_open_ai"),
                    this._preProcessFonts();
                  var h = 0,
                    f = function (e) {
                      new E(
                        a.GLocale.get(
                          new a.GLocaleKey(
                            "GDocument",
                            "text.ai-not-pdf-compatible"
                          )
                        ),
                        e
                      ).open();
                    };
                  r(() =>
                    s.GPDFImport.import(
                      e,
                      {},
                      gDesigner.getWorkspace().getFontManager(),
                      (e, t, o) => {
                        if ((this._postProcessFonts(), e)) new E(e).open();
                        else {
                          var i = gDesigner.createScene(!0);
                          i._beginBlockChanges([
                            a.GNode._Change.BeforeChildRemove,
                            a.GNode._Change.AfterChildRemove,
                            a.GNode._Change.BeforeChildInsert,
                            a.GNode._Change.AfterChildInsert,
                          ]),
                            a.GUtil.each(t, function (e, t) {
                              t.setProperty(
                                "name",
                                a.GLocale.get(
                                  new a.GLocaleKey("GCommonNames", "text.page")
                                ) +
                                  " " +
                                  (e + 1)
                              ),
                                "production" !== gDesigner.getEnv() &&
                                  "lts" !== gDesigner.getEnv() &&
                                  (console.time("optimization time"), (z = 0)),
                                Q(t),
                                "production" !== gDesigner.getEnv() &&
                                  "lts" !== gDesigner.getEnv() &&
                                  (console.timeEnd("optimization time"),
                                  console.log("Nodes removed: " + z)),
                                i.appendChild(t);
                            }),
                            i._endBlockChanges([
                              a.GNode._Change.BeforeChildRemove,
                              a.GNode._Change.AfterChildRemove,
                              a.GNode._Change.BeforeChildInsert,
                              a.GNode._Change.AfterChildInsert,
                            ]),
                            i.setActivePage(t[0]),
                            this._updateStatus(_.Loaded),
                            n.getName() && this.setTitle(n.getName()),
                            this.setScene(i),
                            o instanceof Array &&
                              o.length &&
                              new x(this, o, null, (e) => {
                                e ||
                                  i.acceptChildren((e) => {
                                    e instanceof a.GText && e.toFakeText();
                                  });
                              }).open();
                          var r = gDesigner
                            .getWindows()
                            .getActiveWindow()
                            .getView();
                          (r.getViewConfiguration().paintMode =
                            a.GScenePaintConfiguration.PaintMode.Output),
                            r.invalidate(),
                            gDesigner.gtmEvent("DOCUMENT_IMPORT_EVENT");
                        }
                      },
                      function (e, n) {
                        (h = Math.max(h, (e / n) * 100)), t.progress(h);
                      },
                      f
                    )
                  );
                } else if ("SKETCH" === i)
                  gDesigner.stats("document_open_sketch"),
                    this._preProcessFonts(),
                    s.GSketchImport.import(
                      e,
                      {
                        progress: t.progress,
                        fontProvider: J,
                        workspace: gDesigner.getWorkspace(),
                      },
                      (e) => {
                        this._postProcessFonts();
                        var t = (e = e || {}).pages,
                          o = e.v50error;
                        if (t && Array.isArray(t)) {
                          e.replacedFonts &&
                            new x(this, e.replacedFonts).open();
                          var i = gDesigner.createScene(!0);
                          i._beginBlockChanges([
                            a.GNode._Change.BeforeChildRemove,
                            a.GNode._Change.AfterChildRemove,
                            a.GNode._Change.BeforeChildInsert,
                            a.GNode._Change.AfterChildInsert,
                          ]),
                            t.forEach((e) => {
                              i.appendChild(e);
                            }),
                            i._endBlockChanges([
                              a.GNode._Change.BeforeChildRemove,
                              a.GNode._Change.AfterChildRemove,
                              a.GNode._Change.BeforeChildInsert,
                              a.GNode._Change.AfterChildInsert,
                            ]),
                            i.setActivePage(t[0]),
                            this._updateStatus(_.Loaded),
                            n.getName() && this.setTitle(n.getName()),
                            this.setScene(i),
                            gDesigner.gtmEvent("DOCUMENT_IMPORT_EVENT");
                        } else if (o)
                          new E(
                            a.GLocale.get(
                              new a.GLocaleKey(
                                "GDocument",
                                "text.unsupported-sketch-version-50+"
                              )
                            )
                          ).open(),
                            this._updateStatus(_.LoadFailed);
                        else {
                          var r = { text: "string" == typeof e ? e : null };
                          this._updateStatus(_.LoadFailed, r);
                        }
                      }
                    );
                else if (
                  "JPG" === i ||
                  "JPEG" === i ||
                  "PNG" === i ||
                  "HEIC" === i
                )
                  if (
                    (gDesigner.stats("document_open_".concat(i.toLowerCase())),
                    "HEIC" === i)
                  ) {
                    const t = new Blob([e]);
                    m.getInstance()
                      .then((e) => e.parse(t))
                      .then((e) => s.GBitmapImport.import(e, l))
                      .catch((e) => console.log("Heic conversion error", e));
                  } else s.GBitmapImport.import(e, l);
                else this._updateStatus(_.LoadFailed);
              },
              (e) => {
                e &&
                  (console.log(e),
                  new E(
                    a.GLocale.get(
                      new a.GLocaleKey("GDocument", "text.error-reading-file")
                    )
                  ).open()),
                  this._updateStatus(_.LoadFailed);
              },
              t.progress
            );
          }
        }
      }),
      (K.prototype._handleSecondaryFormatRead = async function (e, t) {
        this._updateStatus(_.LoadFailed, t);
      }),
      (K.prototype._handleSecondaryFormatSave = async function (e, t, n) {
        n &&
          n(a.GLocale.get(new a.GLocaleKey("GDocument", "text.cannot-save")));
      }),
      (K.prototype.store = async function (e, t, n) {
        let o =
          arguments.length > 3 && void 0 !== arguments[3] ? arguments[3] : {};
        const i = !o.export;
        var r = (e) => {
          i &&
            (this._updateStatus(_.SaveFailed, e), this._updateStatus(_.Ready)),
            n && n(e);
        };
        if ("lts" === gDesigner.getEnv() && !gDesigner.isEnabledProFeatures())
          return r();
        if ((gContainer.verifyEnoughMemoryToSave(this), !this._scene))
          return r();
        var s = e || this._storageItem;
        if (!s) throw new Error("Unable to save, no storage item available.");
        var d = s.getExtension(),
          u = {
            progress: null,
            filename: o.filename,
            ext: d && d.toLowerCase(),
            referer: o.referer,
          };
        i && this._updateStatus(_.Saving, u);
        var p = () => {
            i && (this._updateStatus(_.Saved), this._updateStatus(_.Ready)),
              (d !== B.ext.toUpperCase() &&
                -1 === U.findIndex((e) => e.ext.toUpperCase() === d)) ||
              !this._editor
                ? gDesigner.gtmEvent("DOCUMENT_EXPORT_EVENT")
                : (gDesigner.gtmEvent("DOCUMENT_SAVE_EVENT"),
                  i && this._editor.markSavePoint()),
              i &&
                gDesigner.hasEventListeners(v) &&
                gDesigner.trigger(new v(v.Type.Modified, this));
            try {
              d === B.ext.toUpperCase() && gDesigner.addToRecentFiles(s);
            } finally {
              t && t();
            }
          },
          g = (e) => {
            s.write(e, p, r, u.progress, this);
          };
        const h = [
            N.JPEG.ext.toUpperCase(),
            N.JPG.ext.toUpperCase(),
            N.PNG.ext.toUpperCase(),
          ],
          m = [N.JPEG.ext.toUpperCase(), N.JPG.ext.toUpperCase()];
        if (d === B.ext.toUpperCase()) {
          var y = this._scene,
            b = 0,
            _previewDoc = this;
          y.acceptChildren(function () {
            b++;
          }),
            u.progress && u.progress instanceof Function && u.progress(10),
            W(function () {
              var e;
              try {
                e = a.GNode.serialize(y, a.GUtil.extend({ save: !0 }, o || {}));
              } catch (e) {
                return (
                  console.error(e),
                  void r(
                    a.GLocale.get(
                      new a.GLocaleKey("GDocument", "text.cannot-save")
                    )
                  )
                );
              }
              null === e || "" === e || e.length < b
                ? r(
                    a.GLocale.get(
                      new a.GLocaleKey("GDocument", "text.cannot-save")
                    )
                  )
                : (u.progress &&
                    u.progress instanceof Function &&
                    u.progress(50),
                  W(function () {
                    var finish = function (json) {
                      var t = new Uint8Array(f.gzip(json, { level: 9 }).buffer);
                      u.progress &&
                        u.progress instanceof Function &&
                        u.progress(75),
                        t.byteLength > 20 + b
                          ? g(t)
                          : r("GZIP compression fail");
                    };
                    // Embed a JPEG preview (data URL) as the first JSON key so
                    // Windows Explorer thumbnail providers can extract it. The
                    // app/Gravit deserializer ignores this unknown root key.
                    var inject = function (url) {
                      try {
                        if (
                          url &&
                          "string" == typeof e &&
                          "{" === e.charAt(0)
                        )
                          return finish(
                            "{" +
                              '"_preview":' +
                              JSON.stringify(url) +
                              "," +
                              e.slice(1)
                          );
                      } catch (x) {}
                      return finish(e);
                    };
                    try {
                      var _done = !1,
                        _to = setTimeout(function () {
                          _done || ((_done = !0), inject(null));
                        }, 4e3);
                      _previewDoc
                        .buildPreview()
                        .then(function (blob) {
                          if (_done) return;
                          if (
                            !blob ||
                            "undefined" == typeof FileReader
                          ) {
                            return (
                              (_done = !0), clearTimeout(_to), inject(null)
                            );
                          }
                          var fr = new FileReader();
                          fr.onloadend = function () {
                            _done ||
                              ((_done = !0),
                              clearTimeout(_to),
                              inject(fr.result));
                          };
                          fr.onerror = function () {
                            _done ||
                              ((_done = !0), clearTimeout(_to), inject(null));
                          };
                          fr.readAsDataURL(blob);
                        })
                        .catch(function () {
                          _done ||
                            ((_done = !0), clearTimeout(_to), inject(null));
                        });
                    } catch (x) {
                      inject(null);
                    }
                  }));
            });
        } else if (U && U.find((e) => e.ext.toUpperCase() === d))
          await this._handleSecondaryFormatSave(u, g, r, o);
        else if ("SVG" === d || "SVGZ" === d) {
          const { exportOptions: e = {} } = o;
          l.GSVGExport.export(this._scene.getActivePage(), e, (e, t) => {
            if (e || !t) return r();
            if (
              !o.suppressMessages &&
              !gDesigner.getSetting("disable_warning_unsupported_features", !1)
            ) {
              let e = l.GSVGExport.getUnsupportedFeatures(
                this._scene.getActivePage()
              );
              e && e.length && new A(e).open();
            }
            if ("SVGZ" === d) g(new Uint8Array(f.gzip(t, { level: 9 }).buffer));
            else if ("function" == typeof TextEncoder)
              g(new TextEncoder("utf-8").encode(t));
            else {
              var n = encodeURIComponent(t).replace(
                  /%([0-9A-F]{2})/g,
                  function (e, t) {
                    return String.fromCharCode("0x" + t);
                  }
                ),
                i = new Uint8Array(n.length);
              Array.prototype.forEach.call(n, function (e, t) {
                i[t] = e.charCodeAt(0);
              }),
                g(i);
            }
          });
        } else if (h.includes(d)) {
          var w = a.GLength.DPI,
            C = this._scene.getActivePage();
          l.GBitmapExport.export(
            C,
            null,
            m.includes(d) ? a.GRGBColor.WHITE : null,
            null,
            w,
            1,
            !0
          ).toImageBuffer(d, (e) => g(new Uint8Array(e)));
        } else if ("PDF" === d) {
          var x = this;
          gDesigner.getUser().then(function (e) {
            var t;
            (t =
              e && e.getFullUserName()
                ? e.getFullUserName()
                : a.GLocale.get(
                    new a.GLocaleKey("GDocument", "text.default-export-author")
                  )),
              l.GPDFExport.export(
                x._scene,
                {
                  dpi: o.dpi || 72,
                  progress: u.progress,
                  user: t,
                  jpegQuality: o.jpegQuality || c.JPEG_EXPORT_QUALITY_DEFAULT,
                  title: x.getTitle(),
                },
                (e, t) => {
                  if (e || !t)
                    return r(
                      a.GLocale.get(
                        new a.GLocaleKey(
                          "GCommonNames",
                          "text.pdf-export-error"
                        )
                      )
                    );
                  var n = new FileReader();
                  (n.onload = () => g(new Uint8Array(n.result))),
                    n.readAsArrayBuffer(new Blob([t]));
                },
                null,
                { message: (e) => u.progressInfo && u.progressInfo(e) }
              );
          });
        } else r();
      }),
      (K.prototype.initCancelHandler = function (e) {
        this._activeWindow && this._activeWindow.activateCancelLoading(e);
      }),
      (K.prototype.placeOrImport = function (e, t, n, o, i) {
        var l = (e, o) => {
            if (
              (o && e instanceof a.GBlock && e.setProperty("name", o),
              t && e.hasMixin(a.GElement.Transform))
            ) {
              var r = e.getGeometryBBox(),
                s = r && r.getX() ? r.getX() : 0,
                l = r && r.getY() ? r.getY() : 0,
                c = t.center ? -r.getWidth() / 2 : 0,
                d = t.center ? -r.getHeight() / 2 : 0;
              e.transform(
                new a.GTransform(1, 0, 0, 1, t.x - s + c, t.y - l + d),
                !0
              );
            }
            (i && i([e])) || this.insertElement(e, !t, !0, n);
          },
          c = (e, t) => {
            s.GBitmapImport.import(e, function (e, n, o, i) {
              if (e)
                new E(
                  a.GLocale.get(
                    new a.GLocaleKey("GDocument", "text.image-too-big")
                  )
                ).open();
              else {
                var r = new a.GImage();
                r.setProperties(["iw", "ih", "url"], [o, i, n]), l(r, t);
              }
            });
          };
        const d = (e, t) => {
          let o = t
              ? "".concat(
                  a.GLocale.get(
                    new a.GLocaleKey("GCommonNames", "text.loading-file")
                  ).replace("%name", t),
                  "..."
                )
              : a.GLocale.get(
                  new a.GLocaleKey("GDocument", "text.opening-your-image")
                ),
            i = this._activateProgress(o);
          try {
            this._preProcessFonts(
              a.GLocale.get(
                new a.GLocaleKey("GDocument", "text.keep-fonts-eps")
              )
            ),
              s.GEPSImport.import(
                e,
                gDesigner.getSetting("eps_outline_fonts", !0),
                gDesigner.getWorkspace().getFontManager(),
                (e, o, i, r) => {
                  if (
                    (this._deactivateProgress(),
                    this._postProcessFonts(),
                    !e && o)
                  ) {
                    "production" !== gDesigner.getEnv() &&
                      "lts" !== gDesigner.getEnv() &&
                      ((z = 0), console.time("optimization time")),
                      Q(o),
                      "production" !== gDesigner.getEnv() &&
                        "lts" !== gDesigner.getEnv() &&
                        (console.timeEnd("optimization time"),
                        console.log("Nodes removed: " + z));
                    var s = o,
                      l = o.getPaintBBox();
                    if (r) {
                      (s = new a.GRectangle()).setBounds(
                        0,
                        0,
                        l.getWidth(),
                        l.getHeight()
                      ),
                        s._blockUpdateChanges();
                      var c = new a.GStylable.FillPaintLayer();
                      for (
                        c.setProperties(["_pt"], [r]),
                          s.getPaintLayers().appendChild(c);
                        o.getFirstChild();

                      ) {
                        var d = o.getFirstChild();
                        o.removeChild(d),
                          d.transform(
                            new a.GTransform().translated(-l.getX(), -l.getY())
                          ),
                          s.appendChild(d);
                      }
                      s._releaseUpdateChanges(),
                        s._invalidateGeometryForChildUpdate(!0);
                    } else
                      s.transform(
                        new a.GTransform().translated(-l.getX(), -l.getY())
                      );
                    s.setProperty(
                      "name",
                      t ||
                        a.GLocale.get(
                          new a.GLocaleKey("GCommonNames", "text.image")
                        )
                    ),
                      n || this._editor.beginTransaction();
                    try {
                      this._scene.appendChild(s),
                        s.acceptChildren(function (e) {
                          e instanceof a.GText &&
                            e.hasFontsToResolve() &&
                            e.toFakeText();
                        });
                    } finally {
                      n ||
                        this._editor.commitTransaction(
                          a.GLocale.get(
                            new a.GLocaleKey(
                              "GDocument",
                              "text.import-from-eps"
                            )
                          )
                        );
                    }
                  } else e && new E(e).open();
                },
                (e) => {
                  this._deactivateProgress(), new E(e).open();
                },
                i,
                this.initCancelHandler.bind(this)
              );
          } catch (e) {
            throw (this._deactivateProgress(), e);
          }
        };
        var u = (e, t, o) => {
            let i = t
                ? "".concat(
                    a.GLocale.get(
                      new a.GLocaleKey("GCommonNames", "text.loading-file")
                    ).replace("%name", t),
                    "..."
                  )
                : a.GLocale.get(
                    new a.GLocaleKey("GDocument", "text.opening-your-image")
                  ),
              r = this._activateProgress(i);
            try {
              this._preProcessFonts(),
                s.GPDFImport.import(
                  e,
                  { startPage: 1 },
                  gDesigner.getWorkspace().getFontManager(),
                  (e, i) => {
                    if (
                      (this._deactivateProgress(), this._postProcessFonts(), e)
                    )
                      new E(e).open();
                    else if (i && i.length) {
                      n || this._editor.beginTransaction();
                      try {
                        var r = i.shift();
                        "production" !== gDesigner.getEnv() &&
                          "lts" !== gDesigner.getEnv() &&
                          (console.time("optimization time"), (z = 0)),
                          Q(r),
                          "production" !== gDesigner.getEnv() &&
                            "lts" !== gDesigner.getEnv() &&
                            (console.timeEnd("optimization time"),
                            console.log("Nodes removed: " + z));
                        var s = r.getGeometryBBox(),
                          l = new a.GRectangle();
                        l.setProperty(
                          "name",
                          t ||
                            a.GLocale.get(
                              new a.GLocaleKey("GCommonNames", "text.image")
                            )
                        ),
                          l.setBounds(
                            s.getX(),
                            s.getY(),
                            s.getWidth(),
                            s.getHeight()
                          ),
                          l.beginUpdate(),
                          r.getChildren().forEach((e) => {
                            r.removeChild(e), l.appendChild(e);
                          }),
                          this._scene.appendChild(l),
                          l.acceptChildren((e) => {
                            e instanceof a.GText && e.toFakeText();
                          }),
                          l.endUpdate();
                      } finally {
                        n ||
                          this._editor.commitTransaction(
                            a.GLocale.get(
                              new a.GLocaleKey(
                                "GDocument",
                                o
                                  ? "text.import-from-ai"
                                  : "text.import-from-pdf"
                              )
                            )
                          );
                      }
                    }
                  },
                  (e) => r(e),
                  function (e) {
                    new E(
                      a.GLocale.get(
                        new a.GLocaleKey(
                          "GDocument",
                          "text.ai-not-pdf-compatible"
                        )
                      ),
                      e
                    ).open();
                  }
                );
            } catch (e) {
              throw (this._deactivateProgress(), e);
            }
          },
          p = (e, t, n) => {
            t = t && t.toUpperCase();
            var o = r.GPlatform.maxPngDataSize;
            switch (
              (("JPG" !== t && "JPEG" !== t) ||
                (a.GSystem.operatingSystem !==
                  a.GSystem.OperatingSystem.OSX_IOS &&
                  (o >>= 2)),
              t)
            ) {
              case "JPG":
              case "JPEG":
              case "HEIC":
              case "GIF":
              case "PNG":
                if (e.size > o)
                  return void new E(
                    a.GLocale.get(
                      new a.GLocaleKey("GDocument", "text.image-too-big")
                    )
                  ).open();
                "HEIC" === t
                  ? m
                      .getInstance()
                      .then((t) => t.parse(e))
                      .then((e) => c(e, n))
                      .catch(() => console.log("HEIC conversion failed"))
                  : c(e, n);
                break;
              case "SVG":
              case "SVGZ":
                ((e, t) => {
                  s.GSVGImport.import(
                    e,
                    { fontProvider: J },
                    gDesigner.getWorkspace().getFontManager(),
                    (e, n) => {
                      n && l(n, t);
                    }
                  );
                })(e, n);
                break;
              case "PDF":
                u(e, n, !1);
                break;
              case "AI":
                N.getFileTypesArray().includes(N.AI) && u(e, n, !0);
                break;
              case "EPS":
                d(e, n);
            }
          };
        if (e instanceof C.Item)
          e.read((t) => {
            var n = e.getExtension(),
              o = e.getName();
            p(new Blob([t]), n, o);
          });
        else {
          var g = null,
            h = null;
          if (!o && e.name) {
            var f = e.name.lastIndexOf(".");
            f >= 0 && ((g = e.name.substr(f + 1)), (h = e.name.substr(0, f)));
          }
          if (!g && e.type)
            for (var y = 0; y < K.FileTypes.length; ++y)
              if (K.FileTypes[y].mime === e.type) {
                g = K.FileTypes[y].ext;
                break;
              }
          if (!gDesigner.isEnabledProFeatures()) {
            let e = K.FileTypes.find(
              (e) => e.ext.toUpperCase() === g.toUpperCase()
            );
            if (e && e.pro)
              return void gDesigner.handlePROFeatureInterruption();
          }
          p(e, g, h);
        }
      }),
      (K.prototype._preProcessFonts = function (e) {
        if (gContainer.getRuntime() === L.Runtime.Electron) {
          let e = gContainer.getSystemFontsProvider();
          e && G.enableProviders([e], !0);
        }
        let t = G.getInstance();
        t && (e && (t.keepFontsMessage = e), t.setShowMissingFontsDialog(!1));
      }),
      (K.prototype._postProcessFonts = function () {
        if (gContainer.getRuntime() === L.Runtime.Electron) {
          let e = gContainer.getSystemFontsProvider();
          e && G.disableProviders([e], !0);
        }
        let e = G.getInstance();
        e && e.setShowMissingFontsDialog(!0);
      }),
      (K.prototype._activateProgress = function (e) {
        if (this._activeWindow) {
          let t = this._activeWindow.activateProgress(e, !0).find("progress");
          return (e) => t.val(e);
        }
        return (e) => console.info("progress", e);
      }),
      (K.prototype._deactivateProgress = function () {
        this._activeWindow && this._activeWindow.deactivateProgress();
      }),
      (K.prototype.activate = function () {
        this._updateState();
      }),
      (K.prototype.isCollaborativeTextEditing = function () {
        return !1;
      }),
      (K.prototype.getCollaborativeTextController = function () {
        return null;
      }),
      (K.prototype.deactivate = function () {}),
      (K.prototype.release = function () {
        this._scene && this.setScene(null),
          this.getStorageItem() && this.getStorageItem().release(),
          this.removeAllEventListeners(!0);
      }),
      (K.prototype.publish = function (e) {
        const t = this._storageItem && this._storageItem.getExtension(),
          n = !!U.find((e) => e.ext.toUpperCase() === t);
        let o = !1,
          i = !0;
        return (
          e && ((o = e.collabTextUpdate), (i = e.sendEmail)),
          this.getId() && c.gApi.realtime && c.gApi.realtime.publishFile
            ? c.gApi.realtime.publishFile(
                this.getId(),
                { sessionId: this.sessionId },
                n,
                o,
                i
              )
            : Promise.resolve()
        );
      }),
      (K.prototype._afterInsertNodeEvent = function (e) {
        if (e.node instanceof a.GGroup && e.node.getFirstChild())
          this._updateDocumentColorsFromGroup(e.node);
        else if (
          e.node instanceof a.GElement &&
          e.node.hasMixin(a.GElement.Stylable)
        )
          this._updateDocumentColors(e.node);
        else if (e.node instanceof a.GStylable.PaintLayer) {
          if (
            (this._updateDocumentColorsFromElement(e.node, ["_pt"]),
            this.hasCDR())
          ) {
            var t = e.node.getParent();
            t &&
              (e.node instanceof a.GStylable.FillPaintLayer
                ? t.getFillLayers(!0).length > 1 &&
                  R.showCDRUnsupportedObjectWarning()
                : e.node instanceof a.GStylable.BorderPaintLayer &&
                  t.getBorderLayers(!0).length > 1 &&
                  R.showCDRUnsupportedObjectWarning());
          }
        } else
          e.node instanceof a.GStylable.Effect &&
            this.hasCDR() &&
            R.showCDRUnsupportedObjectWarning(e.node);
        this._updateSymbolLock(this._scene.getActivePage());
      }),
      (K.prototype._beforeRemoveNodeEvent = function (e) {
        this._updateSymbolLock(e.node, !0);
      }),
      (K.prototype._afterRemoveNodeEvent = function (e) {
        e.node instanceof a.GGroup && e.node.getFirstChild()
          ? this._updateDocumentColorsFromGroup(e.node, !0)
          : e.node instanceof a.GElement && e.node.hasMixin(a.GElement.Stylable)
          ? this._updateDocumentColors(e.node, !0)
          : e.node instanceof a.GStylable.PaintLayer &&
            this._updateDocumentColorsFromElement(e.node, ["_pt"], !0),
          e.node instanceof a.GText &&
            this._updateDocumentColorsFromElement(e.node, ["content"], !0);
      }),
      (K.prototype._beforePropertiesChangeEvent = function (e) {
        e.node instanceof a.GSymbol &&
          null === e.values[e.properties.indexOf("masterRef")] &&
          this._updateSymbolLock(e.node, !0);
      }),
      (K.prototype._afterPropertiesChangeEvent = function (e) {
        if (!e.temporary) {
          const t = (t) => {
            if (
              this.hasCDR() &&
              !e.node.hasMixin(a.GAnnotation) &&
              e.properties.includes(t)
            ) {
              const n = e.node.getProperty(t);
              n &&
                n !== a.GPaintCanvas.BlendMode.Normal &&
                R.showCDRUnsupportedObjectWarning();
            }
          };
          if (
            (e.node instanceof a.GStylable.PaintLayer
              ? (this._handlePropertiesChangedForDocumentColorsElement(
                  e.node,
                  ["_pt"],
                  e.properties,
                  e.values
                ),
                t("_bl"))
              : (e.node.hasMixin(a.GStylable) && t("_sbl"),
                e.node instanceof a.GText &&
                  this._handlePropertiesChangedForDocumentColorsElement(
                    e.node,
                    ["content"],
                    e.properties,
                    e.values
                  )),
            !gDesigner.isEnabledProFeatures())
          ) {
            -1 !== e.properties.indexOf("lkt") &&
              (0, d.isSymbolInstance)(e.node) &&
              (e.node instanceof a.GSymbol
                ? e.node.acceptChildren(
                    (e) =>
                      e instanceof a.GElement &&
                      e.setFlag(a.GElement.Flag.FullLocked)
                  )
                : e.node.setFlag(a.GElement.Flag.FullLocked));
          }
        }
      }),
      (K.prototype._afterFlagChangeEvent = function (e) {
        const t = e.node;
        e.flag === a.GNode.Flag.Selected &&
          t instanceof a.GCollabText &&
          gDesigner.stats("document_canvas_select-collab-text");
      }),
      (K.prototype._licenseChangedEvent = function () {
        this._updateSymbolLock(this._scene);
      }),
      (K.prototype.lock = function () {}),
      (K.prototype.unlock = function () {}),
      (K.prototype.isLocked = function () {
        return !1;
      }),
      (K.prototype.lockByVersionHistory = function () {
        this._lockedByVersionHistory = !0;
      }),
      (K.prototype.isLockedByVersionHistory = function () {
        return this._lockedByVersionHistory;
      }),
      (K.prototype._updateState = function () {
        if (this._scene) {
          if (this._editable)
            this._scene.accept((e) => {
              if (e instanceof a.GElement) {
                e.setProperty("plkt", a.GBlock.ProgramLck.NoLock);
                const t = e.getProperty("_lkt", !0);
                void 0 !== t && e.setProperty("lkt", t);
              }
            });
          else if (
            (this._scene.accept((e) => {
              if (e instanceof a.GElement) {
                void 0 === e.getProperty("_lkt", !0) &&
                  e.setProperty("_lkt", e.getProperty("lkt") || null, !0),
                  e.setProperty("lkt", a.GBlock.LockType.Full);
              }
            }),
            this._annotationsEditable)
          ) {
            const e =
              a.GBlock.ProgramLck.NoSizeChanges |
              a.GBlock.ProgramLck.NoEdit |
              a.GBlock.ProgramLck.NoMove |
              a.GBlock.ProgramLck.NoOrigChildrenEdit |
              a.GBlock.ProgramLck.NoNewChildren |
              a.GBlock.ProgramLck.NoDelete |
              a.GBlock.ProgramLck.NoDirectVisibilityChange |
              a.GBlock.ProgramLck.NoSelect;
            this._scene.iteratePages((t) => {
              t.acceptChildren((t) => {
                t instanceof a.GElement && t.setProperty("plkt", e),
                  t.hasMixin(a.GAnnotation) &&
                    (t.setProperty("lkt", null),
                    t.setProperty("plkt", e & ~a.GBlock.ProgramLck.NoSelect));
              }),
                t.setProperty("plkt", e),
                t.setProperty("lkt", null);
            }, !0);
          }
          this._updateSymbolLock(this._scene);
        }
      }),
      (K.prototype._updateSymbolLock = function (e, t) {
        if (!this._editable) return;
        const n = !t;
        if ((e = e || this._scene)) {
          const o = (t) => {
            e.accept((e) => {
              if ((0, d.isSymbolInstance)(e)) {
                if (
                  e instanceof a.GSymbol &&
                  null === e.getProperty("masterRef")
                )
                  return !1;
                !(e instanceof a.GSymbol) && e instanceof a.GElement && t(e);
              }
            });
          };
          gDesigner.isEnabledProFeatures()
            ? this._lockedSymbolInstances &&
              (o((e) => e.setProperty("lkt", e.getProperty("lkt"), n, !0)),
              (this._lockedSymbolInstances = !1))
            : (o((e) => {
                t
                  ? e.hasFlag(a.GElement.Flag.FullLocked) &&
                    e.removeFlag(a.GElement.Flag.FullLocked)
                  : e.setFlag(a.GElement.Flag.FullLocked),
                  e.setProperty("_pro", n, !0);
              }),
              (this._lockedSymbolInstances = !0));
        }
      }),
      (K.prototype._modifiedEvent = function (e) {
        gDesigner.hasEventListeners(v) &&
          gDesigner.trigger(
            new v(v.Type.Modified, this, e.data ? e.data : null)
          );
      }),
      (K.prototype._dropFileEvent = function (e) {
        var t = null;
        if (e.file.name) {
          var n = e.file.name.lastIndexOf(".");
          n >= 0 && (t = e.file.name.substr(n + 1));
        }
        if (!t && e.file.type)
          for (var o = 0; o < K.FileTypes.length; ++o)
            if (K.FileTypes[o].mime === e.file.type) {
              t = K.FileTypes[o].ext;
              break;
            }
        gDesigner.stats("document_drop_file", t),
          this.placeOrImport(e.file, {
            x: e.position.getX(),
            y: e.position.getY(),
          });
      }),
      (K.prototype._updateStatus = function (e, t) {
        e !== this._status &&
          ((this._status = e),
          this.hasEventListeners(b) && this.trigger(new b(e, t)),
          G.getInstance().trigger(new b(e, t)),
          this._status === _.Loaded &&
            this.isCommercialProductFile() &&
            this.openPaywall());
      }),
      (K.prototype.updateStatus = function (e, t) {
        this._updateStatus(e, t || {});
      }),
      (K.prototype._extractUsedDocumentRef = function (e) {
        return (
          e &&
            0 === e.indexOf("document://") &&
            (e = e.substr("document://".length)),
          null
        );
      }),
      (K.prototype._addDocumentColors = function (e) {
        for (var t = 0; t < e.length; ++t) {
          var n = a.GPattern.serialize(e[t]);
          this._documentColors.hasOwnProperty(n)
            ? (this._documentColors[n] += 1)
            : (this._documentColors[n] = 1);
        }
      }),
      (K.prototype._clearDocumentColors = function (e) {
        for (var t = 0; t < e.length; ++t) {
          var n = a.GPattern.serialize(e[t]);
          this._documentColors.hasOwnProperty(n) &&
            0 == --this._documentColors[n] &&
            delete this._documentColors[n];
        }
      }),
      (K.prototype._updateDocumentColors = function (e, t) {
        var n = e.getPaintLayers();
        n &&
          a.GUtil.each(
            n.getLayers(),
            function (e, n) {
              t
                ? this._updateDocumentColorsFromElement(n, ["_pt"], t)
                : this._updateDocumentColorsFromElement(n, ["_pt"]);
            }.bind(this)
          );
      }),
      (K.prototype._updateDocumentColorsFromGroup = function (e, t) {
        for (var n = e.getChildren(), o = 0; o < n.length; o++) {
          var i = n[o];
          i instanceof a.GGroup || !i.hasMixin(a.GElement.Stylable)
            ? this._updateDocumentColorsFromGroup(i, t)
            : this._updateDocumentColors(i, t);
        }
      }),
      (K.prototype._updateDocumentColorsFromElement = function (e, t, n) {
        for (var o = [], i = 0; i < t.length; ++i) {
          var r = e.getProperty(t[i]);
          if (r) {
            var s = function (n, i, r) {
              if (n instanceof a.GColor) o.push(n);
              else if (n instanceof a.GGradient)
                for (var l = n.getStops(), c = 0; c < l.length; ++c)
                  o.push(l[c].color);
              else if ("content" === t[r] && e instanceof a.GText && i) {
                var d = e.getTLCore().getRichContent();
                if (d && d.length) {
                  var u = e._getGravitValue("fontColor", d[0].fontColor);
                  s(u, !1, r);
                }
              }
            };
            s(r, !0, i);
          }
        }
        o.length &&
          (n ? this._clearDocumentColors(o) : this._addDocumentColors(o));
      }),
      (K.prototype._handlePropertiesChangedForDocumentColorsElement = function (
        e,
        t,
        n,
        o
      ) {
        for (var i = [], r = [], s = [], l = 0; l < t.length; ++l) {
          var c = n.indexOf(t[l]);
          if (c >= 0) {
            i.push(c), r.push(t[l]);
            var d = function (t, o, i) {
              if (t instanceof a.GColor) s.push(t);
              else if (t instanceof a.GGradient)
                for (var r = t.getStops(), l = 0; l < r.length; ++l)
                  s.push(r[l].color);
              else if ("content" === n[i] && e instanceof a.GText && t && o) {
                var c = JSON.parse(t);
                if (c[0] && c[0].fontColor) {
                  var u = e._getGravitValue("fontColor", c[0].fontColor);
                  d(u, !1, i);
                }
              }
            };
            d(o[c], !0, c);
          }
        }
        s.length && this._clearDocumentColors(s),
          r.length && this._updateDocumentColorsFromElement(e, r);
      }),
      (K.prototype.setSynchronizing = function (e) {
        e !== this._synchronizing &&
          ((this._synchronizing = e),
          gDesigner.hasEventListeners(v) &&
            gDesigner.trigger(new v(v.Type.SynchronismUpdated, this)));
      }),
      (K.prototype.isSynchronizing = function () {
        return this._synchronizing;
      }),
      (K.prototype.setErrored = function (e) {
        e !== this._errored &&
          ((this._errored = !!e),
          gDesigner.hasEventListeners(v) &&
            gDesigner.trigger(new v(v.Type.Modified, this)));
      }),
      (K.prototype.buildPreview = function () {
        return new Promise((e) => {
          for (
            var t = null, n = this._scene.getFirstChild();
            null !== n;
            n = n.getNext()
          )
            if (n instanceof a.GPage) {
              t = n;
              break;
            }
          if (t) {
            var o = t._getBitmapPaintArea(),
              i = l.GBitmapExport.convertSizeToScale(
                o.getWidth(),
                o.getHeight(),
                o.getWidth() > o.getHeight() ? "600w" : "600h"
              );
            t.toBitmap(i.getX(), i.getY(), 2, a.GRGBColor.WHITE).toImageBlob(
              "image/jpeg",
              e
            );
          }
        });
      }),
      (K.prototype.hasPagesWithInfiniteEmptyCanvas = function () {
        for (var e = this._scene.getFirstChild(); null !== e; e = e.getNext())
          if (e instanceof a.GPage && !e.getGeometryBBox()) return !0;
        return !1;
      }),
      (K.prototype.setReservedId = function (e) {
        this._reservedId = e;
      }),
      (K.prototype.getReservedId = function () {
        return this._reservedId;
      }),
      (K.prototype.getLastDownloadSize = function () {
        return this._lastDownloadSize;
      }),
      (K.prototype.setLastDownloadSize = function (e) {
        this._lastDownloadSize = e;
      }),
      (K.waitToRendererProcess = W);
    var z,
      q = Object.keys(a.GShape.GeometryProperties)
        .concat(Object.keys(a.GShape.MetaProperties))
        .concat(Object.keys(a.GItem.MetaProperties))
        .concat(Object.keys(a.GBlock.VisualProperties))
        .concat(Object.keys(a.GBlock.MetaProperties))
        .concat(Object.keys(a.GElement.Anchor.MetaProperties));
    function Y(e, t) {
      if (e.constructor !== t.constructor) return !1;
      if (!(e instanceof a.GShape)) return !1;
      if (!t.getFirstChild()) return !1;
      if (!e.arePropertiesEqual(t, q)) return !1;
      var n = t.$ps;
      return (
        (t.$ps = e.getStylePropertySets()),
        a.GStylable.prototype.equalsStyle.call(e, t)
          ? ((t.$ps = n), !0)
          : ((t.$ps = n), !1)
      );
    }
    function X(e, t) {
      if (!e.arePropertiesEqual(t, Object.keys(a.GPath.GeometryProperties)))
        return !1;
      for (
        var n = Object.keys(a.GPathBase.AnchorPoint.GeometryProperties),
          o = e.getAnchorPoints(),
          i = t.getAnchorPoints(),
          r = o.getFirstChild(),
          s = i.getFirstChild();
        r && s;
        r = r.getNext(), s = s.getNext()
      )
        if (!r.arePropertiesEqual(s, n)) return !1;
      return null === r && null === s;
    }
    function Q(e) {
      e._blockUpdateChanges();
      let t = e.getFirstChild();
      for (; t; ) {
        var n = t.getNext();
        if (n) {
          if (!Y(t, n)) {
            t = n;
            continue;
          }
          if (!(t instanceof a.GPath)) {
            t = n;
            continue;
          }
          if (!X(t, n)) {
            t = n;
            continue;
          }
          e.removeChild(n), t._blockUpdateChanges();
          for (var o = n.getFirstChild(); null !== o; o = o.getNext())
            n.removeChild(o), t.appendChild(o);
          t._releaseUpdateChanges(), z++;
        } else t = n;
      }
      for (t = e.getFirstChild(); null !== t; t = t.getNext()) Q(t);
      e._releaseUpdateChanges();
    }
    var J = {
      queryFirst: function (e, t) {
        const n = (e, t) => {
          let n,
            o,
            i,
            a,
            r,
            s,
            l,
            c,
            d,
            u,
            p,
            g = e.length,
            h = t.length;
          if (0 === g) return h;
          if (0 === h) return g;
          for (
            g > h && ((n = e), (e = t), (t = n)),
              s = new Int8Array(g + 1),
              o = 0;
            o <= g;
            o++
          )
            s[o] = o;
          for (o = 1; o <= h; o++) {
            for (a = o, p = t[o - 1], i = 1; i <= g; i++)
              p === e[i - 1]
                ? (r = s[i - 1])
                : ((l = a + 1),
                  (c = s[i] + 1),
                  (d = l - ((l - c) & ((c - l) >> 7))),
                  (u = s[i - 1] + 1),
                  (r = d - ((d - u) & ((u - d) >> 7)))),
                (s[i - 1] = a),
                (a = r);
            s[g] = a;
          }
          return s[g];
        };
        var o = 0,
          i = [];
        e.fontName && i.push(e.fontName),
          i.length
            ? i[0] !== e.fontFamily && i.push(e.fontFamily)
            : i.push(e.fontFamily);
        var a = function (r) {
          var s;
          r.faces.length
            ? ((s = (function (t) {
                var o = {
                    family: t[0].fonts[0].family || t[0].family,
                    weight: t[0].fonts[0].weight,
                    style: t[0].fonts[0].style,
                  },
                  i =
                    e.fontName ||
                    e.fontFamily ||
                    gDesigner
                      .getWorkspace()
                      .getFontManager()
                      .getDefaultFont()
                      .getFamily(),
                  a = n(o.family, i),
                  r = 0,
                  s = o.family;
                for (let e = 0; e < t.length; e++) {
                  var l = t[e];
                  let o;
                  if (l.families)
                    for (var c = 0; c < l.families.length; c++)
                      (o = n(l.families[c], i)),
                        o < a && ((a = o), (r = e), (s = l.families[c]));
                  else
                    (o = n(l.family, i)),
                      o < a && ((a = o), (r = e), (s = l.family));
                }
                o = null;
                var d = t[r];
                for (let t = 0; t < d.fonts.length; t++) {
                  var u = d.fonts[t];
                  if (!u.family || u.family === s) {
                    if (u.style === e.fontStyle && u.weight === e.fontWeight) {
                      o = {
                        family: u.family || d.family,
                        weight: u.weight,
                        style: u.style,
                      };
                      break;
                    }
                    o ||
                      (o = {
                        family: u.family || d.family,
                        weight: u.weight,
                        style: u.style,
                      });
                  }
                }
                return o;
              })(r.faces)),
              t(s))
            : o < i.length - 1
            ? (o++, setTimeout(() => G.getInstance().query(a, i[o])))
            : t(null);
        };
        G.getInstance().query(a, i[o]);
      },
    };
    e.exports = K;
  }