/**
 * Webpack Module #1571
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(19), n(26);
    var o = n(10);
    const {
        ANNOTATION_EVENT: i,
        SHARE_EVENT: a,
        USER_EVENT: r,
        REVIEW_STATUS_CHANGED: s,
        LOCK_REQUEST_EVENT: l,
        LOCK_UPDATE_EVENT: c,
        FILE_UPDATE_EVENT: d,
        FILE_AUTO_SAVE_EVENT: u,
      } = o.gApi.COLLABORATION_EVENTS,
      p = n(393),
      g = n(78);
    function h() {
      (this._documents = new Map()),
        gDesigner.addEventListener(g, this._documentEvent, this);
    }
    (h.prototype._documents = null),
      (h.prototype._documentEvent = function (e) {
        const t = e.document;
        switch (e.type) {
          case g.Type.Added:
          case g.Type.Activated:
          case g.Type.StorageItemUpdated:
            ((!t.isLockedByVersionHistory() && t.isCloudFile()) ||
              (t.getId() &&
                t.getStorageItem() &&
                t.getStorageItem().supportsShadowFile())) &&
              this.attachDocument(t);
            break;
          case g.Type.Removed:
            this.detachDocument(t);
        }
      }),
      (h.prototype.attachDocument = function (e) {
        if (!o.ENABLE_COLLABORATION) return;
        if (this._documents.has(e)) return;
        const t = new o.gApi.WebSocketClient();
        t.setToken(e.getToken()),
          t.connect("/v2/realtime/" + e.getId()),
          o.ENABLE_COLLABORATION &&
            (t.on(i, (t) => {
              this._trigger(e, p.Type.AnnotationsUpdate, t.data);
            }),
            t.on(r, (t) => {
              this._trigger(e, p.Type.UserUpdate, t.data);
            }),
            t.on(s, (t) => {
              this._trigger(e, p.Type.ReviewStatusChanged, t.data);
            }),
            t.on(l, (t) => {
              this._trigger(e, p.Type.LockRequest, t.data);
            }),
            t.on(c, (t) => {
              const n = t.data && t.data.lock ? new o.Lock(t.data.lock) : null;
              this._trigger(e, p.Type.LockUpdated, n);
            }),
            t.on(d, (t) => {
              this._trigger(e, p.Type.FileUpdate, t.data);
            })),
          o.SHARE_ENGINE &&
            t.on(a, (t) => {
              this._trigger(e, p.Type.ShareUpdate, t.data);
            }),
          o.AUTO_SAVE_ENABLED &&
            t.on(u, (t) => {
              this._trigger(e, p.Type.FileAutoSave, t.data);
            }),
          this._documents.set(e, { doc: e, ws: t });
      }),
      (h.prototype.detachDocument = function (e) {
        const t = this._documents.get(e);
        t && (t.ws.close(), this._documents.delete(e));
      }),
      (h.prototype._trigger = function (e, t, n) {
        const o = new p(t, n);
        e.hasEventListeners(o) && e.trigger(o);
      }),
      (e.exports = h);
  }