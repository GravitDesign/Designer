/**
 * Webpack Module #447
 * Type: class
 * Name: GSaveAction
 */

function (e, t, n) {
    "use strict";
    n(8), n(3), n(4), n(13);
    var o = n(1),
      i = n(15),
      a = n(40),
      r = n(1247),
      s = n(10),
      l = n(67),
      c = n(18),
      d = n(31),
      u = n(445),
      p = n(448),
      g = n(86),
      h = n(119),
      f = n(1510),
      m = n(1511);
    const y = n(44),
      v = n(1512);
    var _ = n(85),
      b = "." + s.FILE_FORMATS.find((e) => e.default).ext;
    function w() {
      w.TOOLTIP_CONFIG = {
        [l.TOOLTIP_AREA.TOOLBAR]: l.GRichTooltipConfig.from({
          title: o.GLocale.get(
            new o.GLocaleKey("GSaveAction", "tooltip-title")
          ),
          description: o.GLocale.get(
            new o.GLocaleKey("GSaveAction", "tooltip-description")
          ),
          shortcut: w.SHORTCUT,
          learnMore: "",
        }),
      };
    }
    o.GObject.inherit(w, d),
      (w.ID = "file.save"),
      (w.TITLE = new o.GLocaleKey("GSaveAction", "title")),
      (w.SHORTCUT = [i.GKey.Constant.META, "S"]),
      (w.TOOLTIP_CONFIG = null),
      (w.prototype.getId = function () {
        return w.ID;
      }),
      (w.prototype.getTitle = function () {
        return w.TITLE;
      }),
      (w.prototype.getIcon = function () {
        return "gravit-icon-save";
      }),
      (w.prototype.getCategory = function () {
        return c.CATEGORY_FILE;
      }),
      (w.prototype.getGroup = function () {
        return "file";
      }),
      (w.prototype.getShortcut = function () {
        return w.SHORTCUT;
      }),
      (w.prototype.isShortcutGlobal = function () {
        return !0;
      }),
      (w.prototype.isEnabled = function (e) {
        return (
          !!gDesigner.getApplicationManager().isEditingEnabled() &&
          !(
            !(e = e || gDesigner.getActiveDocument()) ||
            (!e.isModified() && !e.isNew())
          ) &&
          !e.isSynchronizing() &&
          (!(
            e.isNew() ||
            !e.getStorageItem() ||
            !e.getStorageItem().getStorage().canSave()
          ) ||
            gDesigner.canExecuteAction(u.ID + b, [null, e], void 0, !0))
        );
      }),
      (w.prototype.execute = function (e, t, n) {
        const o = e || gDesigner.getActiveDocument();
        if (o && o.isCommercialProductFile())
          return o.openPaywall(this.getId()), !1;
        gContainer.getRuntime() === _.Runtime.IPad && (n = !0),
          this._save(o, t, n);
      }),
      (w.prototype._performSave = async function (e, t) {
        (await e.isUpdateAvailable())
          ? a.buildDialogDocumentHasUpdates.call(
              this,
              e,
              function () {
                e.reload();
              },
              function () {
                h.performSave(e, t);
              }
            )
          : h.performSave(e, t);
      }),
      (w.prototype._save = async function (e, t, n) {
        if (gDesigner.getDefaultStorage().canSave()) {
          if (!e.getScene().hasLinkedFiles()) return this._saveDesktop(e, t, n);
          new m(() => {
            this._saveDesktop(e, t, n);
          }).open();
        } else {
          if (e.isNew()) return this._saveToCloud(e, t);
          if (e.isCloudFile() && e.getId()) {
            if (!(await e.canSaveToCloud())) return this._saveToCloud(e, t);
            await this._performSave(e, t);
          } else if (e.isExternalFile()) e.storeToCloud(e.getScene(), t);
          else {
            if (!e.hasCloudReference()) return this._saveToCloud(e, t);
            if (!e.isCloudSyncOn())
              return gDesigner.executeAction(
                u.ID + b,
                [null, e, t],
                void 0,
                !0
              );
            if (!(await e.canSaveToCloud())) return this._saveToCloud(e, t);
            e.chooseLatestDocument(
              e.getScene(),
              (n) => {
                n !== e.getScene()
                  ? (e.setScene(n), t && t())
                  : e.storeToCloud(e.getScene(), t);
              },
              () => this._saveToCloud(e, t),
              (e, t) =>
                t.lastModifiedDate().getTime() > e.lastModifiedDate().getTime(),
              () => {
                t && t();
              }
            );
          }
        }
      }),
      (w.prototype._saveDesktop = async function (e, t) {
        let n = arguments.length > 2 && void 0 !== arguments[2] && arguments[2];
        if (e.isNew()) {
          if (n) return this._saveToCloud(e, t);
          new f(
            async function (n) {
              if (n === f.file()) {
                if (await p.prototype._hasUnsupported.call(this, e)) return;
                return gDesigner.executeAction(
                  u.ID + b,
                  [null, e, t],
                  void 0,
                  !0
                );
              }
              if (n === f.cloud()) return this._saveToCloud(e, t);
            }.bind(this),
            {
              closeCallback: (e) =>
                e && t && t({ documentStatus: g.SaveCancelled }),
            }
          ).open();
        } else if (e.isCloudFile()) {
          if (!(await e.canSaveToCloud())) return this._saveToCloud(e, t);
          await this._performSave(e, t);
        } else if (e.hasCloudReference())
          if (e.isCloudSyncOn()) {
            if (!(await e.canSaveToCloud())) return this._saveToCloud(e, t);
            e.chooseLatestDocument(
              e.getScene(),
              (n) => {
                n !== e.getScene()
                  ? (e.setScene(n),
                    e.store(e.getStorageItem(), t, null, {
                      lastModifiedDate: n.getLastSavedTime(),
                    }))
                  : e.store(e.getStorageItem(), () => {
                      e.storeToCloud(e.getScene(), t);
                    });
              },
              (n) => {
                n && 404 === n.status
                  ? e.store(e.getStorageItem(), t)
                  : y.alert(s.gApi.formatError(n));
              },
              (e, t) =>
                t.lastModifiedDate().getTime() > e.lastModifiedDate().getTime()
            );
          } else
            e.isExternalFile()
              ? e.storeToCloud(e.getScene(), t)
              : e.store(e.getStorageItem(), t);
        else if (e.isExternalFile()) e.storeToCloud(e.getScene(), t);
        else {
          const n = e.getStorageItem();
          let o = {};
          n instanceof v.Item && (o = (0, r.updateSaveOptions)(o, e, n)),
            e.store(n, t, null, o);
        }
      }),
      (w.prototype._saveToCloud = function (e, t) {
        return gDesigner.executeAction(
          p.ID + ".save-as",
          [
            e,
            (n) => {
              n === g.Loaded
                ? gDesigner.removeDocument(e, null, !0)
                : n === g.Saved
                ? t && t({ documentStatus: g.Saved })
                : n === g.SaveCancelled &&
                  t &&
                  t({ documentStatus: g.SaveCancelled });
            },
          ],
          void 0,
          !0
        );
      }),
      (w.prototype.getTooltipConfig = function (e) {
        return (e && w.TOOLTIP_CONFIG[e]) || null;
      }),
      (w.prototype.toString = function () {
        return "[Object GSaveAction]";
      }),
      (e.exports = w);
  }