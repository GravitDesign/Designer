/**
 * Webpack Module #1684
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(8), n(527);
    const o = n(292),
      i = n(1685),
      { gApi: a, DateAPI: r } = n(10);
    e.exports = class {
      init() {
        gDesigner.addEventListener(o, this._userLoggedEvent, this);
      }
      async _userLoggedEvent(e) {
        const t = e.user;
        if (t && t.getUID()) {
          gDesigner.removeEventListener(o, this._userLoggedEvent, this);
          try {
            (await this._shouldShowWindowsStoreAnnouncement(t)) &&
              this._showWindowsStoreAnnouncement();
          } finally {
            this._updateWindowStoreAnnouncementFlag();
          }
        }
      }
      async _shouldShowWindowsStoreAnnouncement(e) {
        const { flags: { windowsStoreAnnouncement: t = !1 } = {} } = await a
          .getUserSettings()
          .catch(() => ({}));
        return !(t || !r.lt(e.created, Date.now()));
      }
      _updateWindowStoreAnnouncementFlag() {
        a.updateUserSettings({ flags: { windowsStoreAnnouncement: !0 } });
      }
      _showWindowsStoreAnnouncement() {
        gDesigner.executeWhenReady(() => {
          new i().open();
        });
      }
    };
  }