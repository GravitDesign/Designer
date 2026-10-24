/**
 * Webpack Module #1276
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(58), n(19), n(193), n(8), n(196), n(20), n(34), n(4), n(13), n(26);
    var o = n(1);
    const {
        gApi: i,
        AUTO_SAVE_ENABLED: a,
        AUTOSAVE_INTERVAL_DEFAULT: r,
        CloudIntegration: s,
        DESIGNER: l,
        EXTERNAL_APP: c,
      } = n(10),
      { buildDialogDocumentHasUpdates: d } = n(40),
      u = n(85),
      p = n(44),
      g = n(556),
      h = n(448),
      f = n(78),
      m = n(135),
      y = n(291),
      v = n(1530),
      _ = n(1534),
      b = n(86),
      w = n(217),
      { SETUP: C, CODES: x } = n(591),
      S = n(1277);
    function E() {
      if (
        ((this._pendingSyncDialog = new Set()),
        (this._pendingFormatNotSupportDialog = new Set()),
        (this._pendingEntriesNotCreatedWarning = new Set()),
        (this._documentsMap = new Map()),
        (this._savingQueue = new _()),
        this._savingQueue.onNext(this._processDocumentSave.bind(this)),
        E._instance && console.warn("[GAutoSaveManager] Already initiated"),
        (this._autoSaveWorker = new Worker("./autosave.worker.js")),
        !this._autoSaveWorker)
      )
        return (
          console.warn("[GAutoSaveManager] Worker initiation failed"),
          Promise.reject()
        );
      this._autoSaveWorker.postMessage({
        cmd: C.ENDPOINT,
        data: { url: i.url },
      }),
        (this._autoSaveModel = new v(this._autoSaveWorker)),
        this._updateStatus(
          gDesigner.getSetting(E.AUTO_SAVE_SETTING)
            ? E.Status.Stopped
            : E.Status.Disabled
        ),
        this._setInterval(gDesigner.getSetting(E.AUTO_SAVE_INTERVAL_SETTING)),
        gContainer.getProperty(E.AUTO_SAVE_WARN_DIALOG_SHOWN).then((e) => {
          this._warnDialogShown = !!e;
        }),
        gDesigner.addEventListener(f, this._documentEvent, this),
        gDesigner.addEventListener(m, this._settingsChangedEvent, this),
        gDesigner.addEventListener(
          y,
          this._networkAvailabilityChangedEvent,
          this
        );
    }
    (E.ALTERNATE_STRINGS = [
      new o.GLocaleKey("GAutoSave", "text.notification-message-1"),
      new o.GLocaleKey("GAutoSave", "text.notification-message-2"),
      new o.GLocaleKey("GAutoSave", "text.notification-message-3"),
    ]),
      (E.DISABLE_EXTERNAL_FILE_NO_ENTRIES_CREATED_WARING =
        "disable-external-file-no-entries-created-waring"),
      (E.DISABLE_WARNING_SETTING_NAME =
        "autosave-prompt-for-local-files-disabled"),
      (E.REMINDER_FOR_CDR_DES_FILE =
        "autosave-prompt-for-reminding-not-support-cdr-des"),
      (E.AUTO_SAVE_SETTING = "auto_save"),
      (E.AUTO_SAVE_INTERVAL_SETTING = "auto_save_interval"),
      (E.AUTO_SAVE_WARN_DIALOG_SHOWN =
        "designer.settings.auto-save-warn-dialog-shown"),
      (E.AUTO_SAVE_HIDE_NOTIFICATION_PROP_NAME =
        "designer.settings.auto-save-hide-notification"),
      (E.Status = { Stopped: -1, Enabled: 0, Disabled: 1 }),
      (E._instance = null),
      (E.prototype._timerId = null),
      (E.prototype._warnDialogShown = !1),
      (E.prototype._fileUpdatedWarningShowing = !1),
      (E.prototype._warnDialogTimer = null),
      (E.prototype._status = E.Status.Stopped),
      (E.prototype._documentsMap = null),
      (E.prototype._pendingSyncDialog = null),
      (E.prototype._pendingFormatNotSupportDialog = null),
      (E.prototype._pendingEntriesNotCreatedWarning = null),
      (E.prototype._savingQueue = null),
      (E.prototype._syncDialogShown = {}),
      (E.prototype._formatNotSupportDialogShown = {}),
      (E.prototype._noEntriesCreatedWaringShown = {}),
      (E.prototype._offlineAlert = null),
      (E.prototype._interval = null),
      (E.prototype._autoSaveWorker = null),
      (E.getInstance = function () {
        return E._instance || (E._instance = new E()), E._instance;
      }),
      (E.prototype._updateStatus = function (e) {
        this._status = e;
      }),
      (E.prototype.getStatus = function () {
        return this._status;
      }),
      (E.prototype._setInterval = function (e) {
        const t = parseFloat(e) || r;
        this._interval = 60 * t * 1e3;
      }),
      (E.prototype._shouldHandle = async function (e) {
        return (
          !e.isCloudFile() || (await e.canSaveToCloud()) || e.isExternalFile()
        );
      }),
      (E.prototype._processDocumentSave = async function (e) {
        if (!(await this._shouldHandle(e))) return;
        if (!this._warnDialogShown) {
          this._warnDialogTimer && clearTimeout(this._warnDialogTimer);
          if (!(await this._showWarnDialog())) return;
        }
        if (
          (this._resetDocumentTimeout(e, this.getStatus() === E.Status.Enabled),
          gDesigner.isOffline())
        )
          return (
            this._toggleOfflineAlert(!0),
            Promise.reject(x.AUTOSAVE_OFFLINE_NOT_AVAILABLE)
          );
        this._offlineAlert && this._toggleOfflineAlert(!1);
        const t = [b.Saving, b.Syncing, b.Loading].includes(e.getStatus());
        return this._autoSaveModel.has(e) || t
          ? x.AUTOSAVE_ALREADY_SAVING
          : e.isCloudFile() || e.isExternalFile()
          ? this._isCDRFile(e)
            ? (this._executeDocumentFormatNotSupportedDialog(e),
              x.AUTOSAVE_CLOUD_SYNCHRONIZM_NOT_AVAILABLE)
            : e.isWebFile() || e.isCloudSyncOn() || e.isExternalFile()
            ? e.isExternalFile() &&
              !(await this._executeExternalFileWarningDialog(e))
              ? x.AUTOSAVE_CLOUD_SYNCHRONIZM_NOT_AVAILABLE
              : e.isModified()
              ? (await e.isUpdateAvailable())
                ? (this._executeDocumentConflictResolutionDialog(e),
                  x.AUTOSAVE_FILE_CONFLICT)
                : this._runAndScheduleAutoSave(e)
              : x.AUTOSAVE_NOT_MODIFIED
            : x.AUTOSAVE_LOCAL_FILES_WITHOUT_CID_NOT_AVAILABLE
          : (this._executeDocumentSyncDialog(e),
            x.AUTOSAVE_CLOUD_SYNCHRONIZM_NOT_AVAILABLE);
      }),
      (E.prototype._executeDocumentSyncDialog = function (e) {
        this._syncDialogShown[e.sessionId] ||
          (gDesigner.isActiveDocument(e)
            ? this._showSyncDialog(e)
            : this._pendingSyncDialog.add(e));
      }),
      (E.prototype._executeDocumentFormatNotSupportedDialog = function (e) {
        this._formatNotSupportDialogShown[e.sessionId] ||
          (gDesigner.isActiveDocument(e)
            ? this._showFormatNotSupportedDialog(e)
            : this._pendingFormatNotSupportDialog.add(e));
      }),
      (E.prototype._executeDocumentConflictResolutionDialog = function (e) {
        gDesigner.isActiveDocument(e) &&
          (this._dialogResolveDocumentConflicts &&
            this._dialogResolveDocumentConflicts.gDialog("isOpen") &&
            this._dialogResolveDocumentConflicts.gDialog("close"),
          (this._dialogResolveDocumentConflicts = d.call(
            this,
            e,
            function (e) {
              e.reload();
            }.bind(this),
            function (e) {
              this._runAndScheduleAutoSave(e);
            }.bind(this)
          )));
      }),
      (E.prototype._executeExternalFileWarningDialog = async function (e) {
        return e.getStorageItem() &&
          (await e.getStorageItem().hasUpdates()) &&
          !this._fileUpdatedWarningShowing
          ? this._showExternalFileUpdatedOutAppWarningDialog(e)
          : !!this._noEntriesCreatedWaringShown[e.sessionId] ||
              (gDesigner.isActiveDocument(e)
                ? this._showNoEntriesCreatedInVersionHistoryForExternalFileWarningDialog(
                    e
                  )
                : (this._pendingEntriesNotCreatedWarning.add(e), !1));
      }),
      (E.prototype._runAndScheduleAutoSave = function (e) {
        return this._handleAutoSave(e).finally(() => {
          this._resetDocumentTimeout(e, this.getStatus() === E.Status.Enabled);
        });
      }),
      (E.prototype._handleAutoSave = function (e) {
        return (
          gDesigner.isActiveDocument(e) && this._showNotification(),
          this._autoSaveModel.save(e).catch((t) => {
            console.warn("[GAutoSaveManager][Failed to auto save]", t),
              gDesigner.isActiveDocument(e) && this._showNotification(!0);
          })
        );
      }),
      (E.prototype._resetDocumentTimeout = function (e) {
        let t =
          !(arguments.length > 1 && void 0 !== arguments[1]) || arguments[1];
        const n = this._documentsMap.get(e);
        n.timeoutId && (clearTimeout(n.timeoutId), (n.timeoutId = null)),
          t &&
            (n.timeoutId = setTimeout(() => {
              this._savingQueue.has(e) ||
                (this._savingQueue.add(e), this._savingQueue.process());
            }, this._interval)),
          this._documentsMap.set(e, n);
      }),
      (E.prototype._resetAllDocumentsTimeout = function () {
        let e =
          !(arguments.length > 0 && void 0 !== arguments[0]) || arguments[0];
        for (let t of this._documentsMap.values())
          this._resetDocumentTimeout(t.doc, e);
      }),
      (E.prototype.disable = function () {
        this.getStatus() !== E.Status.Disabled &&
          (this._resetAllDocumentsTimeout(!1),
          this._updateStatus(E.Status.Disabled));
      }),
      (E.prototype.enable = function () {
        a &&
          this.getStatus() !== E.Status.Enabled &&
          !gDesigner.isOffline() &&
          gDesigner.getSetting(E.AUTO_SAVE_SETTING) &&
          (this._resetAllDocumentsTimeout(),
          this._updateStatus(E.Status.Enabled));
      }),
      (E.prototype._removeDocument = function (e) {
        this._documentsMap.has(e) &&
          (this._resetDocumentTimeout(e, !1),
          this._savingQueue.delete(e),
          this._documentsMap.delete(e),
          this._syncDialogShown[e.sessionId] &&
            delete this._syncDialogShown[e.sessionId],
          this._formatNotSupportDialogShown[e.sessionId] &&
            delete this._formatNotSupportDialogShown[e.sessionId],
          this._noEntriesCreatedWaringShown[e.sessionId] &&
            delete this._noEntriesCreatedWaringShown[e.sessionId]);
      }),
      (E.prototype._addDocument = function (e) {
        this._documentsMap.has(e) ||
          (this._documentsMap.set(e, { doc: e }),
          this._resetDocumentTimeout(e, this.getStatus() === E.Status.Enabled),
          (this._syncDialogShown[e.sessionId] = !1),
          (this._formatNotSupportDialogShown[e.sessionId] = !1),
          (this._noEntriesCreatedWaringShown[e.sessionId] = !1));
      }),
      (E.prototype._documentEvent = function (e) {
        if (!e.document.isLockedByVersionHistory())
          switch (e.type) {
            case f.Type.Added:
              this._addDocument(e.document),
                e.document.addEventListener(
                  w,
                  this._handleDocumentStatusEvent,
                  this,
                  void 0,
                  void 0,
                  !0
                ),
                this.enable();
              break;
            case f.Type.Removed:
              this._removeDocument(e.document),
                e.document.removeEventListener(
                  w,
                  this._handleDocumentStatusEvent,
                  this
                );
              break;
            case f.Type.SynchronismUpdated: {
              let t = !0;
              e.document.isWebFile() ||
                (e.document.isCloudSyncOn()
                  ? this.enable()
                  : ((t = !1), this._removeDocument(e.document))),
                t && this._addDocument(e.document);
              break;
            }
            case f.Type.Activated:
              this._documentsMap.has(e.document) ||
                (this._addDocument(e.document),
                e.document.addEventListener(
                  w,
                  this._handleDocumentStatusEvent,
                  this,
                  void 0,
                  void 0,
                  !0
                ),
                this.enable()),
                e.document.isCloudSynchronismAvailable() ||
                  this._syncDialogShown[e.document.sessionId] ||
                  !this._pendingSyncDialog.has(e.document) ||
                  (this._showSyncDialog(e.document),
                  this._pendingSyncDialog.delete(e.document)),
                !this._noEntriesCreatedWaringShown[e.document.sessionId] &&
                  this._pendingEntriesNotCreatedWarning.has(e.document) &&
                  (this._processDocumentSave(e.document),
                  this._pendingEntriesNotCreatedWarning.delete(e.document)),
                this._shouldFormatNotSupportedDialogAppearForUser(e.document) &&
                  (this._showFormatNotSupportedDialog(e.document),
                  this._pendingFormatNotSupportDialog.delete(e.document)),
                this._warnDialogTimer && clearTimeout(this._warnDialogTimer),
                this._shouldWarningDialogAppearForUser() &&
                  (this._warnDialogTimer = setTimeout(() => {
                    this._showWarnDialog(!0).then((e) => {
                      e && this._savingQueue.process();
                    });
                  }, this._interval));
              break;
            case f.Type.BeforeReload:
              this._removeDocument(e.document);
          }
      }),
      (E.prototype._shouldWarningDialogAppearForUser = function () {
        return (
          !this._warnDialogShown &&
          !gDesigner.getLicense().isGuest() &&
          !gDesigner.isAnonymous()
        );
      }),
      (E.prototype._shouldFormatNotSupportedDialogAppearForUser = function (e) {
        return (
          !gDesigner.getLicense().isGuest() &&
          !gDesigner.isAnonymous() &&
          this._pendingFormatNotSupportDialog.has(e) &&
          e.isCloudFile() &&
          this._isCDRFile(e) &&
          !this._formatNotSupportDialogShown[e.sessionId]
        );
      }),
      (E.prototype._handleDocumentStatusEvent = function (e) {
        e.status === b.Loaded && this._addDocument(e.sender);
      }),
      (E.prototype._settingsChangedEvent = function (e) {
        e.previousValue !== e.newValue &&
          (e.key === E.AUTO_SAVE_SETTING
            ? e.newValue
              ? this.enable()
              : this.disable()
            : e.key === E.AUTO_SAVE_INTERVAL_SETTING &&
              (this._setInterval(e.newValue),
              this._resetAllDocumentsTimeout(
                this.getStatus() === E.Status.Enabled
              )));
      }),
      (E.prototype._networkAvailabilityChangedEvent = function (e) {
        e.connected
          ? (this._toggleOfflineAlert(!1), this.enable())
          : (this._toggleOfflineAlert(!0), this.disable());
      }),
      (E.prototype._toggleOfflineAlert = function (e) {
        if (e) {
          let e = o.GLocale.get(
            new o.GLocaleKey("GAutoSave", "text.alert-offline")
          );
          gContainer.getRuntime() === u.Runtime.Electron &&
            o.GLocale.get(
              new o.GLocaleKey("GAutoSave", "text.alert-offline-desktop")
            ),
            this._offlineAlert ||
              (this._offlineAlert = p.alert(e, () => {
                this._offlineAlert = null;
              }));
        } else
          this._offlineAlert &&
            0 !== this._offlineAlert.length &&
            this._offlineAlert.gDialog("close"),
            (this._offlineAlert = null);
      }),
      (E.prototype._showWarnDialog = function () {
        let e = arguments.length > 0 && void 0 !== arguments[0] && arguments[0];
        return this._warnDialogShown ||
          (e && this.getStatus() === E.Status.Enabled)
          ? Promise.resolve()
          : this.getStatus() === E.Status.Enabled
          ? Promise.resolve(!0)
          : new Promise((e) => {
              p.custom({
                title: o.GLocale.get(
                  new o.GLocaleKey(
                    "GAutoSave",
                    "text.dialog-inform-warn-feature.title"
                  )
                ),
                subtitle: $("<span />")
                  .text(
                    "".concat(
                      o.GLocale.get(
                        new o.GLocaleKey(
                          "GAutoSave",
                          "text.dialog-inform-warn-feature.text"
                        )
                      ),
                      " "
                    )
                  )
                  .append(
                    $("<a />")
                      .attr(
                        "href",
                        ""
                      )
                      .attr("target", "_blank")
                      .text(
                        o.GLocale.get(
                          new o.GLocaleKey("GCommonNames", "text.learn-more")
                        )
                      )
                  ),
                className: "g-auto-save-warn-dialog",
                icon: "autosave",
                closeable: !1,
                buttons: [
                  {
                    label: o.GLocale.get(
                      new o.GLocaleKey(
                        "GAutoSave",
                        "text.dialog-inform-warn-feature.cancel-button"
                      )
                    ),
                    closeOnClick: !0,
                    shortcut: p.Shortcut.Esc,
                    onclick: () => {
                      gDesigner.setSetting(E.AUTO_SAVE_SETTING, !1),
                        (this._warnDialogShown = !0),
                        gContainer.setProperty(
                          E.AUTO_SAVE_WARN_DIALOG_SHOWN,
                          !0
                        ),
                        gDesigner.stats("settings_toggle_auto-save-disabled"),
                        e(!1);
                    },
                  },
                  {
                    label: o.GLocale.get(
                      new o.GLocaleKey(
                        "GAutoSave",
                        "text.dialog-inform-warn-feature.enable-button"
                      )
                    ),
                    className: "primary",
                    closeOnClick: !0,
                    shortcut: p.Shortcut.Enter,
                    onclick: () => {
                      gDesigner.setSetting(E.AUTO_SAVE_SETTING, !0),
                        (this._warnDialogShown = !0),
                        gContainer.setProperty(
                          E.AUTO_SAVE_WARN_DIALOG_SHOWN,
                          !0
                        ),
                        gDesigner.stats("settings_toggle_auto-save-enabled"),
                        e(!0);
                    },
                  },
                ],
              });
            });
      }),
      (E.prototype._showFormatNotSupportedDialog = function (e) {
        gDesigner.getSetting(E.REMINDER_FOR_CDR_DES_FILE, !0) &&
          (p.custom({
            title: o.GLocale.get(
              new o.GLocaleKey(
                "GAutoSave",
                "text.dialog-auto-save-is-not-available-for-cdr-and-des.text"
              )
            ),
            className: "g-auto-save-format-not-support-warn-dialog",
            icon: "info",
            closeable: !1,
            buttons: [
              {
                label: o.GLocale.get(
                  new o.GLocaleKey(
                    "GAutoSave",
                    "text.dialog-auto-save-is-not-available-for-cdr-and-des.save-as-button"
                  )
                ),
                closeOnClick: !0,
                onclick: () => {
                  gDesigner.executeAction(
                    h.getIdForAction(h.Actions.SaveAs),
                    e
                  );
                },
              },
              {
                label: o.GLocale.get(
                  new o.GLocaleKey(
                    "GAutoSave",
                    "text.dialog-auto-save-is-not-available-for-cdr-and-des.keep-cdr-button"
                  )
                ),
                closeOnClick: !0,
                className: "primary",
                shortcut: p.Shortcut.Enter,
              },
            ],
            dontShowAgainCb: (e) => {
              gDesigner.setSetting(E.REMINDER_FOR_CDR_DES_FILE, !e),
                gDesigner.stats(
                  "settings_toggle_auto-save-not-support-for-cdr-des-reminder-enabled",
                  !e
                );
            },
          }),
          (this._formatNotSupportDialogShown[e.sessionId] = !0));
      }),
      (E.prototype._showSyncDialog = function (e) {
        if (gDesigner.getSetting(E.DISABLE_WARNING_SETTING_NAME)) return;
        let t, n, i;
        e.hasCloudReference()
          ? ((t = o.GLocale.get(
              new o.GLocaleKey("GAutoSave", "text.alert-cloud-reference-sync")
            )),
            (n = o.GLocale.get(
              new o.GLocaleKey(
                "GAutoSave",
                "text.alert-cloud-reference-sync-sub-text"
              )
            )),
            (i = [
              {
                label: o.GLocale.get(new o.GLocaleKey("GLocale", "ok")),
                closeOnClick: !0,
                shortcut: p.Shortcut.Enter,
              },
            ]))
          : ((t = o.GLocale.get(
              new o.GLocaleKey("GAutoSave", "text.alert-sync")
            )),
            (n = o.GLocale.get(
              new o.GLocaleKey("GAutoSave", "text.alert-sync-sub-text")
            )),
            (i = [
              {
                label: o.GLocale.get(
                  new o.GLocaleKey("GAutoSave", "text.alert-button.cancel")
                ),
                closeOnClick: !0,
                shortcut: p.Shortcut.Esc,
              },
              {
                label: o.GLocale.get(
                  new o.GLocaleKey(
                    "GAutoSave",
                    "text.alert-button.save-to-cloud"
                  )
                ),
                className: "primary",
                closeOnClick: !0,
                shortcut: p.Shortcut.Enter,
                onclick: () => {
                  gDesigner.executeAction(
                    h.getIdForAction(h.Actions.SaveAs),
                    e
                  );
                },
              },
            ])),
          (this._syncDialogShown[e.sessionId] = !0),
          p.custom({
            title: t.replace("%title", e.getTitle()),
            subtitle: n.replace("%title", e.getTitle()),
            className: "g-auto-save-sync-dialog",
            icon: "info",
            closeable: !1,
            buttons: i,
            dontShowAgainCb: (e) => {
              gDesigner.setSetting(E.DISABLE_WARNING_SETTING_NAME, !!e),
                gDesigner.stats(
                  "settings_toggle_auto-save-warning-enabled",
                  !e
                );
            },
          });
      }),
      (E.prototype._showNoEntriesCreatedInVersionHistoryForExternalFileWarningDialog =
        function (e) {
          return new Promise((t) => {
            gDesigner.getSetting(
              E.DISABLE_EXTERNAL_FILE_NO_ENTRIES_CREATED_WARING,
              !1
            )
              ? t(!0)
              : ((this._noEntriesCreatedWaringShown[e.sessionId] = !0),
                p.custom({
                  title: o.GLocale.get(
                    new o.GLocaleKey(
                      "GAutoSave",
                      "text.dialog-no-entries-created-waring.title"
                    )
                  ).replace("%storage", this._getExternalStorageName(e)),
                  subtitle: o.GLocale.get(
                    new o.GLocaleKey(
                      "GAutoSave",
                      "text.dialog-no-entries-created-waring.subtitle"
                    )
                  ),
                  className:
                    "g-auto-save-no-entries-created-in-version-history-warn-dialog",
                  icon: "info",
                  closeable: !1,
                  buttons: [
                    {
                      label: o.GLocale.get(
                        new o.GLocaleKey(
                          "GAutoSave",
                          "text.dialog-no-entries-created-waring.go-settings"
                        )
                      ),
                      closeOnClick: !0,
                      onclick: () => {
                        gDesigner.executeAction(S.ID), t(!1);
                      },
                    },
                    {
                      label: o.GLocale.get(new o.GLocaleKey("GLocale", "ok")),
                      closeOnClick: !0,
                      className: "primary",
                      shortcut: p.Shortcut.Enter,
                      onclick: () => {
                        t(!0);
                      },
                    },
                  ],
                  dontShowAgainCb: (e) => {
                    gDesigner.setSetting(
                      E.DISABLE_EXTERNAL_FILE_NO_ENTRIES_CREATED_WARING,
                      !!e
                    ),
                      gDesigner.stats(
                        "settings_toggle_auto-save-no-entries-created-warning-enabled",
                        !e
                      );
                  },
                }));
          });
        }),
      (E.prototype._showExternalFileUpdatedOutAppWarningDialog = function (e) {
        return (
          p.custom({
            title: o.GLocale.get(
              new o.GLocaleKey(
                "GAutoSave",
                "text.dialog-file-updated-out-app-waring.title"
              )
            )
              .replace(
                "%file-name",
                e.getTitle() + "." + e.getExtension().toLowerCase()
              )
              .replace("%app-name", l.TITLE),
            className: "g-auto-save-file-updated-out-app-warn-dialog",
            icon: "info",
            closeable: !1,
            buttons: [
              {
                label: o.GLocale.get(
                  new o.GLocaleKey(
                    "GAutoSave",
                    "text.dialog-file-updated-out-app-waring.do-not-reload"
                  )
                ),
                closeOnClick: !0,
                onclick: () => {
                  this._fileUpdatedWarningShowing = !1;
                },
              },
              {
                label: o.GLocale.get(
                  new o.GLocaleKey(
                    "GAutoSave",
                    "text.dialog-file-updated-out-app-waring.reload"
                  )
                ),
                closeOnClick: !0,
                className: "primary",
                shortcut: p.Shortcut.Enter,
                onclick: () => {
                  (this._fileUpdatedWarningShowing = !1), e.reload();
                },
              },
            ],
          }),
          (this._fileUpdatedWarningShowing = !0),
          !1
        );
      }),
      (E.prototype._getExternalStorageName = function (e) {
        if (!e) return "";
        const t = e.getStorageItem();
        return t && t instanceof g.Item
          ? s.cloudOptions.find((e) => e.type === c.GOOGLEDRIVE).name
          : "";
      }),
      (E.prototype._shouldHideNotifications = function () {
        return gContainer.getProperty(E.AUTO_SAVE_HIDE_NOTIFICATION_PROP_NAME);
      }),
      (E.prototype._showNotification = async function (e) {
        if (
          this._autoSaveModel.isSaving() ||
          (await this._shouldHideNotifications())
        )
          return;
        let t = "";
        t = e
          ? o.GLocale.get(
              new o.GLocaleKey("GAutoSave", "text.failed-auto-saving")
            )
          : o.GLocale.get(
              E.ALTERNATE_STRINGS[
                Math.floor(Math.random() * E.ALTERNATE_STRINGS.length)
              ]
            );
        let n = {
          custom: !0,
          class: "g-auto-save-notification",
          enter: "enter",
          exit: "exit",
          timeout: 5e3,
          content: [
            e
              ? null
              : $("<div/>")
                  .addClass("spinner")
                  .append([
                    $("<div/>"),
                    $("<div/>"),
                    $("<div/>"),
                    $("<div/>"),
                    $("<div/>"),
                    $("<div/>"),
                    $("<div/>"),
                    $("<div/>"),
                  ]),
            $("<div/>").addClass("message").text(t),
          ],
          closeCallback: function () {
            gContainer.setProperty(E.AUTO_SAVE_HIDE_NOTIFICATION_PROP_NAME, !0);
          },
        };
        gDesigner.addNotification(n);
      }),
      (E.prototype._isCDRFile = function (e) {
        return !1;
      }),
      (e.exports = E);
  }