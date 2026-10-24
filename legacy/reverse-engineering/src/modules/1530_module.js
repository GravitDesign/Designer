/**
 * Webpack Module #1530
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(58), n(8);
    const o = n(86),
      i = n(78),
      a = n(1531),
      r = n(1532),
      s = n(1533),
      l = n(156),
      c = n(790),
      d = n(554);
    function u(e) {
      (this._worker = e), (this._docs = []);
    }
    (u.prototype._docs = null),
      (u.prototype._worker = null),
      (u.prototype.has = function (e) {
        return this._docs.indexOf(e) >= 0;
      }),
      (u.prototype._addDocToQueue = function (e) {
        this._docs.push(e);
      }),
      (u.prototype._removeDocFromQueue = function (e) {
        this._docs.splice(this._docs.indexOf(e), 1);
      }),
      (u.prototype.isSaving = function () {
        return this._docs.length > 0;
      }),
      (u.prototype.save = async function (e) {
        if (this.has(e)) return Promise.resolve(null);
        this._addDocToQueue(e);
        const t = e.getEditor(),
          n = t && t.markSavePoint();
        try {
          if (this._isDocAllowedToBeAutoSaved(e)) {
            gDesigner.trigger(new i(i.Type.AutoSaveSynchronizing, e));
            const t = this._getAutoSaveHelper(e.getStorageItem().getFile());
            return (
              (function (t) {
                const n = e.getStorageItem();
                n.setVersionId && n.setVersionId(null);
                n.setFile(t);
              })(
                await t.updateFileSceneAndMetadata(
                  e.getId(),
                  e.getStorageItem().getFile(),
                  e.getScene(),
                  await this._createDocumentMetadata(e)
                )
              ),
              gDesigner.trigger(new i(i.Type.Modified, e)),
              gDesigner.trigger(new i(i.Type.AutoSaveSynchronized, e)),
              !0
            );
          }
          return !1;
        } catch (t) {
          throw (
            (gDesigner.trigger(new i(i.Type.AutoSaveSynchronizationFailed, e)),
            n && n.rollback(),
            t)
          );
        } finally {
          this._removeDocFromQueue(e);
        }
      }),
      (u.prototype._isDocAllowedToBeAutoSaved = function (e) {
        return (
          ![o.Saving, o.Syncing].includes(e.getStatus()) && e.canSaveToCloud()
        );
      }),
      (u.prototype._createDocumentMetadata = async function (e) {
        const t = new c();
        return (t.thumbnail = await d.fromBlob(await e.buildPreview())), t;
      }),
      (u.prototype._getAutoSaveHelper = function (e) {
        let t = null;
        const n = e.getStorage(),
          o = gDesigner.getSyncUser();
        return (
          n === l.Storage.Gravit
            ? (t = new a(this._worker, o))
            : n === l.Storage.GoogleDrive
            ? (t = new r(this._worker, o))
            : (n !== l.Storage.SharePoint &&
                n !== l.Storage.OneDriveBusiness) ||
              (t = new s(this._worker, o)),
          t
        );
      }),
      (e.exports = u);
  }