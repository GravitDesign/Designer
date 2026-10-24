/**
 * Webpack Module #1348
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(8), n(196);
    var o = n(53),
      i = n(1);
    const { gApi: a } = n(10),
      r = n(393),
      s = n(217),
      l = n(86);
    function c(e) {
      (this._document = e),
        (this._currentLock = null),
        (this._openingInlineEditor = !1),
        (this._alreadyRequestedAccess = !1),
        this._document.addEventListener(
          r,
          this._collaborationEvent,
          this,
          null,
          !0
        );
      const t = this._document.getEditor();
      t &&
        t.addEventListener(
          o.GEditor.InlineEditorEvent,
          this._inlineEditorEvent,
          this,
          null,
          !0
        );
    }
    (c.StatusChangedEvent = function (e) {
      this.status = e;
    }),
      i.GObject.inherit(c.StatusChangedEvent, i.GEvent),
      (c.StatusChangedEvent.prototype.status = null),
      (c.Status = {
        Initial: 0,
        Editing: 1,
        Finished: 2,
        Previewing: 3,
        Previewed: 4,
        Sending: 5,
        UpdateAvailable: 6,
        Updating: 7,
      }),
      (c.LockUpdateEvent = function (e) {
        this.lock = e;
      }),
      i.GObject.inherit(c.LockUpdateEvent, i.GEvent),
      (c.LockUpdateEvent.prototype.lock = null),
      (c.prototype._status = c.Status.Initial),
      (c.prototype._openingInlineEditor = !1),
      (c.prototype._currentLock = null),
      (c.prototype._alreadyRequestedAccess = !1),
      (c.prototype.detach = function () {
        this._document.removeEventListener(r, this._collaborationEvent, this);
        const e = this._document.getEditor();
        e &&
          e.removeEventListener(
            o.GEditor.InlineEditorEvent,
            this._inlineEditorEvent,
            this
          );
      }),
      (c.prototype.getStatus = function () {
        return this._status;
      }),
      (c.prototype.getCurrentLock = async function () {
        return (
          this._currentLock ||
            ((this._currentLock = await a.lock
              .get(this._document.getId())
              .catch(() => null)),
            this._currentLock && this._fireLockUpdateEvent()),
          this._currentLock
        );
      }),
      (c.prototype.acquireLock = async function () {
        return (await this.canLock())
          ? (this._currentLock ||
              ((this._currentLock = await a.lock
                .acquire(this._document.getId())
                .catch(() => null)),
              this._currentLock && this._fireLockUpdateEvent()),
            this._currentLock)
          : null;
      }),
      (c.prototype.releaseLock = function () {
        return a.lock.release(this._document.getId()).then(() => {
          this._currentLock = null;
        });
      }),
      (c.prototype.canLock = async function () {
        return !(await this.getCurrentLock()) || this.isLockedByMe();
      }),
      (c.prototype.isLockedByMe = function () {
        if (!this._currentLock) return !1;
        const e = gDesigner.getSyncUser();
        return this._currentLock.isLockedBy(e);
      }),
      (c.prototype.reloadDocument = async function () {
        this._updateStatus(c.Status.Updating);
        const e = (t) => {
          t.status !== l.Loading &&
            (this._document.removeEventListener(s, e),
            this._document.unlock(),
            this.resetTextEditing());
        };
        await this.releaseLock(),
          this._document.addEventListener(s, e),
          this._document.lock(),
          this._document.reload();
      }),
      (c.prototype.resetTextEditing = function () {
        this._updateStatus(c.Status.Initial);
      }),
      (c.prototype.finishTextEditing = async function () {
        this._closeInlineEditor(), this._updateStatus(c.Status.Finished);
      }),
      (c.prototype.backToTextEditing = async function () {
        this._closeInlineEditor(), this._updateStatus(c.Status.Editing);
      }),
      (c.prototype.sendChanges = async function () {
        return (
          this._closeInlineEditor(),
          this._document.lock(),
          this._updateStatus(c.Status.Sending),
          new Promise(async (e, t) => {
            this._document.storeToCloud(
              this._document.getScene(),
              async () => {
                await this.releaseLock().catch((e) => console.error(e)), e();
              },
              t,
              !0,
              { collabTextUpdate: !0, sendEmail: !0 }
            );
          })
            .then(async () => {
              await gDesigner
                .updateCollabTextPreviews()
                .catch((e) => console.error(e)),
                this.resetTextEditing();
            })
            .catch((e) => {
              throw (
                (this.finishTextEditing(),
                this._document.updateStatus(l.SaveCancelled),
                this._document.updateStatus(l.Ready),
                e)
              );
            })
            .finally(() => {
              this._document.unlock();
            })
        );
      }),
      (c.prototype.previewChanges = async function () {
        return (
          this._closeInlineEditor(),
          this._updateStatus(c.Status.Previewing),
          this._document.lock(),
          gDesigner
            .updateCollabTextPreviews()
            .then(() => {
              this._updateStatus(c.Status.Previewed);
            })
            .catch(() => {
              this.finishTextEditing();
            })
            .finally(() => {
              this._document.unlock();
            })
        );
      }),
      (c.prototype.requestAccess = async function () {
        return a.lock
          .request(this._document.getId())
          .then(() => (this._alreadyRequestedAccess = !0));
      }),
      (c.prototype.hasAlreadyRequestedAccess = function () {
        return this._alreadyRequestedAccess;
      }),
      (c.prototype._updateStatus = function (e) {
        e !== this._status &&
          ((this._status = e),
          this._document.hasEventListeners(c.StatusChangedEvent) &&
            this._document.trigger(new c.StatusChangedEvent(this._status)));
      }),
      (c.prototype._closeInlineEditor = function () {
        const e = this._document.getEditor();
        e && (e.closeInlineEditor(), e.clearSelection());
      }),
      (c.prototype._inlineEditorEvent = function (e) {
        switch (e.type) {
          case o.GEditor.InlineEditorEvent.Type.TryOpen:
            this._tryOpenInlineEditor(e);
        }
      }),
      (c.prototype._tryOpenInlineEditor = async function (e) {
        if (
          !this._openingInlineEditor &&
          this._document.isCollaborativeTextEditing()
        )
          if (
            (e.editor.disableInlineEditingSupport(),
            e.editor instanceof o.GCollabTextEditor)
          ) {
            this._openingInlineEditor = !0;
            try {
              gDesigner.toggleLoading(!0);
              if (!(await this.acquireLock()))
                return void this._closeInlineEditor();
              e.editor.enableInlineEditingSupport();
              const t = this._document.getEditor();
              if (t) {
                const n = this._document.getActiveWindow(),
                  o = n && n.getView();
                o &&
                  t.openInlineEditor(e.editor.getElement(), o) &&
                  this._updateStatus(c.Status.Editing);
              }
            } finally {
              (this._openingInlineEditor = !1), gDesigner.toggleLoading(!1);
            }
          } else this._closeInlineEditor();
      }),
      (c.prototype._fireLockUpdateEvent = function () {
        this._document.hasEventListeners(c.LockUpdateEvent) &&
          this._document.trigger(new c.LockUpdateEvent(this._currentLock));
      }),
      (c.prototype._collaborationEvent = function (e) {
        if (e.type === r.Type.LockUpdated)
          (this._currentLock = e.data), this._fireLockUpdateEvent();
        else if (e.type === r.Type.FileUpdate) {
          if (e.data && e.data.from === gDesigner.getSyncUser().id) return;
          this._updateStatus(c.Status.UpdateAvailable);
        }
      }),
      (e.exports = c);
  }