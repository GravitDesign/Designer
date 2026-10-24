/**
 * Webpack Module #1293
 * Type: class
 * Name: GCloudSynchronizationAction
 */

function (e, t, n) {
    "use strict";
    n(20), n(3), n(34), n(4), n(13);
    var o = n(1);
    const { FILE_FORMATS: i, CLOUD_SYNC_FEATURE: { NEW_LAYOUT: a } = {} } =
        n(10),
      r = n(18),
      s = n(31),
      l = n(119),
      c = n(448),
      d = n(86),
      u = n(163),
      p = n(445),
      g = n(44),
      h = i.find((e) => e.default).ext;
    function f() {}
    o.GObject.inherit(f, s),
      (f.ID = "sync"),
      (f.prototype.getId = function () {
        return f.ID;
      }),
      (f.prototype._getSyncInformation = function (e) {
        if (e.getScene()) {
          const t = e.getScene().lastModifiedDate();
          return t
            ? o.GLocale.get(
                new o.GLocaleKey(
                  "GCloudSynchronizationAction",
                  "text.last-synced-at"
                )
              ).replace(
                "%date",
                o.GLocale.toLocaleDate(t, {
                  year: "numeric",
                  month: "numeric",
                  day: "numeric",
                  hour: "numeric",
                  minute: "numeric",
                  second: "numeric",
                })
              )
            : o.GLocale.get(
                new o.GLocaleKey("GDocumentChooser", "text.unavailable")
              );
        }
      }),
      (f.prototype.isAvailable = function () {
        return !!a;
      }),
      (f.prototype.getTitle = function () {
        const e = gDesigner.getActiveDocument();
        if (e) {
          if (e.isSynchronizing())
            return new o.GLocaleKey(
              "GCloudSynchronizationAction",
              "text.syncing"
            );
          if (e.isCloudFile()) return this._getSyncInformation(e);
          if (e.isCloudSyncOn())
            return new o.GLocaleKey(
              "GCloudSynchronizationAction",
              "text.unsync-from-cloud"
            );
        }
        return new o.GLocaleKey(
          "GCloudSynchronizationAction",
          "text.sync-to-cloud"
        );
      }),
      (f.prototype.getIcon = function () {
        const e = gDesigner.getActiveDocument();
        if (e) {
          if (e.isSynchronizing()) return "gravit-icon-cloud-syncing";
          if (e.isCloudSyncOn() || e.isCloudFile())
            return "gravit-icon-cloud-synced";
        }
        return "gravit-icon-cloud-unsynced";
      }),
      (f.prototype.getInfo = function () {
        const e = gDesigner.getActiveDocument();
        return e && e.isCloudSyncOn() && !e.isSynchronizing()
          ? this._getSyncInformation(e)
          : null;
      }),
      (f.prototype.getCategory = function () {
        return r.CATEGORY_FILE;
      }),
      (f.prototype.getGroup = function () {
        return "file";
      }),
      (f.prototype.isVisible = function () {
        const e = gDesigner.getActiveDocument();
        return (
          !!e &&
          !e.isWebFile() &&
          !e.isExternalFile() &&
          !e.isNew() &&
          (!e.isCloudSyncOn() || e.isCloudSynchronismAvailable())
        );
      }),
      (f.prototype.isEnabled = function () {
        const e = gDesigner.getActiveDocument();
        return (
          !!e &&
          !e.isCloudFile() &&
          ((!e.getScene().getProperty("cfs") &&
            !e.getScene().getProperty("cid")) ||
            e.getScene().isCloudSynchronization())
        );
      }),
      (f.prototype._performCloudSync = function (e) {
        gDesigner.getDefaultStorage().canSave()
          ? e.isNew()
            ? l.createFile(e, (t) => {
                e.getScene().setCloudSynchronization(t.id),
                  gDesigner.executeAction(
                    p.ID + "." + h,
                    [
                      null,
                      e,
                      () => {
                        l.renameFile(t, e.getTitle(), () => {
                          e.storeToCloud(e.getScene());
                        });
                      },
                    ],
                    void 0,
                    !0
                  );
              })
            : e.isCloudFile()
            ? gDesigner.executeAction(p.ID + "." + h, void 0, void 0, !0)
            : l.createFile(e, (t) => {
                e.getScene().setCloudSynchronization(t.id),
                  e.storeToCloud(e.getScene(), () => {
                    e.store(null, null, null, {
                      lastModifiedDate: e.getScene().getLastSavedTime(),
                    });
                  });
              })
          : e.isCloudFile()
          ? gDesigner.executeAction(p.ID + "." + h, void 0, void 0, !0)
          : gDesigner.executeAction(
              c.ID + ".save-as",
              [
                e,
                (t) => {
                  t === d.Loaded && gDesigner.removeDocument(e, null, !0);
                },
                !0,
              ],
              void 0,
              !0
            );
      }),
      (f.prototype._toggleCloudSync = function (e) {
        const t = !e.isCloudSyncOn(),
          n = e.getScene();
        n.setProperty("cfs", t),
          n.getProperty("cfs")
            ? e.chooseLatestDocument(
                n,
                function (t, o) {
                  if (t !== n || o) {
                    const n = new u(e.getStorageItem());
                    n.setScene(t), gDesigner.replaceDocument(e, n);
                  } else
                    e.storeToCloud(t, () => {
                      gDesigner.getDefaultStorage().canSave() &&
                        e.store(null, null, null, {
                          lastModifiedDate: n.getLastSavedTime(),
                        });
                    });
                },
                function () {
                  g.alert(
                    o.GLocale.get(
                      new o.GLocaleKey("GDocument", "text.sync-to-cloud-error")
                    )
                  );
                },
                function (e, t) {
                  return (
                    t.lastModifiedDate().getTime() >
                    e.lastModifiedDate().getTime()
                  );
                }
              )
            : e.isCloudFile() ||
              (gDesigner.getDefaultStorage().canSave()
                ? e.store()
                : gDesigner.executeAction(p.ID + "." + h, void 0, void 0, !0));
      }),
      (f.prototype.statsValue = function () {
        return gDesigner.getActiveDocument().isCloudSyncOn()
          ? f.ID + ".unsync-from-cloud"
          : f.ID + ".sync-to-cloud";
      }),
      (f.prototype.execute = function (e) {
        (e = e || gDesigner.getActiveDocument()) &&
          (e.hasCloudReference()
            ? this._toggleCloudSync(e)
            : this._performCloudSync(e));
      }),
      (f.prototype.toString = function () {
        return "[Object GCloudSynchronizationAction]";
      }),
      (e.exports = f);
  }