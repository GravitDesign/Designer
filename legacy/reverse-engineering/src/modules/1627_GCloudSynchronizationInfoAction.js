/**
 * Webpack Module #1627
 * Type: class
 * Name: GCloudSynchronizationInfoAction
 */

function (e, t, n) {
    "use strict";
    n(20), n(3), n(34);
    var o = n(1);
    const i = n(18),
      a = n(31),
      r = n(85),
      { CLOUD_SYNC_FEATURE: { NEW_LAYOUT: s } = {} } = n(10);
    function l() {}
    o.GObject.inherit(l, a),
      (l.ID = "sync.info"),
      (l.prototype.getId = function () {
        return l.ID;
      }),
      (l.prototype.getTitle = function () {
        const e = gDesigner.getActiveDocument();
        if (e && e.getScene()) {
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
        return o.GLocale.get(
          new o.GLocaleKey("GDocumentChooser", "text.unavailable")
        );
      }),
      (l.prototype.getCategory = function () {
        return i.CATEGORY_FILE;
      }),
      (l.prototype.getGroup = function () {
        return "file";
      }),
      (l.prototype.isVisible = function () {
        const e = gDesigner.getActiveDocument();
        return e && e.isCloudSyncOn() && e.isCloudSynchronismAvailable();
      }),
      (l.prototype.isEnabled = function () {
        return !1;
      }),
      (l.prototype.isAvailable = function () {
        return (
          !!s &&
          gContainer.getRuntime() === r.Runtime.Electron &&
          o.GSystem.operatingSystem === o.GSystem.OperatingSystem.OSX_IOS
        );
      }),
      (l.prototype.toString = function () {
        return "[Object GCloudSynchronizationInfoAction]";
      }),
      (e.exports = l);
  }