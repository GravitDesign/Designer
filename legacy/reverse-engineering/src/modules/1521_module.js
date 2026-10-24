/**
 * Webpack Module #1521
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(4), n(32), n(97), n(33);
    const o = n(394),
      i = n(78),
      a = n(86),
      r = n(217);
    function s(e) {
      this._htmlElement = e;
    }
    (s.prototype._root = null),
      (s.prototype._panels = []),
      (s.prototype._activePanel = null),
      (s.prototype.init = function () {
        (this._root = $("<div></div>")
          .addClass("root")
          .appendTo(this._htmlElement)),
          gravit.footer.forEach((e) => {
            let t = $("<div></div>").addClass("panel-container");
            this._root.append(t),
              e.init(t),
              this._panels.push({ container: t, panel: e }),
              this._activePanel || this.setActivePanel(e.getId()),
              e.addEventListener(
                o.UpdateEvent,
                function () {
                  this._updateFooter(), gDesigner.relayout();
                }.bind(this)
              );
          }),
          this._updateFooter(),
          gDesigner.addEventListener(i, this._documentEvent, this);
      }),
      (s.prototype._documentEvent = function (e) {
        const t = e.document;
        switch (e.type) {
          case i.Type.Activated:
            t.addEventListener(r, this._documentStatusChanged, this),
              (this._document = t);
            break;
          case i.Type.Deactivated:
            t.removeEventListener(r, this._documentStatusChanged, this),
              (this._document = null);
        }
      }),
      (s.prototype._documentStatusChanged = function (e) {
        if (!this._document || gDesigner.getActiveDocument() !== this._document)
          return;
        const t = (e) => this._htmlElement.toggleClass("document-loading", e);
        switch (e.status) {
          case a.Loading:
          case a.Saving:
          case a.Syncing:
          case a.Downloading:
            if (
              (this._document.isCloudFile() ||
                this._document.isExternalFile()) &&
              e.status === a.Saving
            )
              return;
            t(!0);
            break;
          case a.LoadCancelled:
          case a.DownloadCancelled:
          case a.SaveCancelled:
          case a.Saved:
          case a.SyncFailed:
          case a.Downloaded:
          case a.DownloadFailed:
          case a.Loaded:
          case a.LoadFailed:
            t(!1);
        }
      }),
      (s.prototype._updateFooter = function () {
        const e = this._panels.some((e) => e.panel.isEnabled());
        this._htmlElement.css("display", e ? "" : "none");
      }),
      (s.prototype.setActivePanel = function (e) {
        for (var t = 0; t < this._panels.length; ++t) {
          var n = this._panels[t],
            o = n.panel.getId();
          o === e
            ? (n.container.css("display", ""), n.panel.activate())
            : (n.container.css("display", "none"),
              o === this._activePanel && n.panel.deactivate());
        }
        this._activePanel = e;
      }),
      (s.prototype.relayout = function () {}),
      (s.prototype.getHeight = function () {
        return this._htmlElement[0].clientHeight;
      }),
      (e.exports = s);
  }