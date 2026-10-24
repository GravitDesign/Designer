/**
 * Webpack Module #1188
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(1);
    function i() {}
    (i.CheckingForUpdate = function () {
      let e =
        arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};
      this.isSilent = e.isSilent;
    }),
      o.GObject.inherit(i.CheckingForUpdate, o.GEvent),
      (i.InstallUpdate = function () {
        let e =
          arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};
        this.isSilent = e.isSilent;
      }),
      o.GObject.inherit(i.InstallUpdate, o.GEvent),
      (i.UpdateAvailable = function () {
        let e =
          arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};
        (this.newVersion = e.newVersion),
          (this.currentVersion = e.currentVersion),
          (this.forceUpdate = e.forceUpdate),
          (this.isSilent = e.isSilent);
      }),
      o.GObject.inherit(i.UpdateAvailable, o.GEvent),
      (i.UpdateError = function () {
        let e =
          arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};
        (this.error = e.error), (this.isSilent = e.isSilent);
      }),
      o.GObject.inherit(i.UpdateError, o.GEvent),
      (i.Downloading = function () {
        let e =
          arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};
        (this.percent = e.percent),
          (this.size = e.size),
          (this.newVersion = e.newVersion),
          (this.isSilent = e.isSilent);
      }),
      o.GObject.inherit(i.Downloading, o.GEvent),
      (i.DownloadComplete = function () {
        let e =
          arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};
        (this.newVersion = e.newVersion),
          (this.forceUpdate = e.forceUpdate),
          (this.isSilent = e.isSilent);
      }),
      o.GObject.inherit(i.DownloadComplete, o.GEvent),
      (i.AfterUpdate = function () {
        let e =
          arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};
        (this.currentVersion = e.currentVersion), (this.isSilent = e.isSilent);
      }),
      o.GObject.inherit(i.AfterUpdate, o.GEvent),
      (i.UpdateNotAvailable = function () {
        let e =
          arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};
        (this.currentVersion = e.currentVersion), (this.isSilent = e.isSilent);
      }),
      o.GObject.inherit(i.UpdateNotAvailable, o.GEvent),
      (i.BeforeInstallUpdate = function () {
        let e =
          arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};
        this.isSilent = e.isSilent;
      }),
      o.GObject.inherit(i.BeforeInstallUpdate, o.GEvent),
      (e.exports = i);
  }