/**
 * Webpack Module #1677
 * Type: class
 * Name: GElectronUpdateServiceClient
 */

function (e, t, n) {
    "use strict";
    n(3);
    var { ipcRenderer: o } = n(881);
    const i = n(1349);
    function a() {}
    (a.prototype.installUpdate = function () {
      console.info(this.toString() + " Firing install update"),
        o.send(i.CommandInstallUpdate);
    }),
      (a.prototype.checkForUpdates = function () {
        console.info(this.toString() + " Firing checking update"),
          o.send(i.CommandCheckForUpdates);
      }),
      (a.prototype.downloadUpdate = function () {
        console.info(this.toString() + " Firing download update"),
          o.send(i.CommandDownloadUpdate);
      }),
      (a.prototype.on = function (e, t) {
        o.on(e, t);
      }),
      (a.prototype.toString = function () {
        return "[Object GElectronUpdateServiceClient]";
      }),
      (e.exports = new a());
  }