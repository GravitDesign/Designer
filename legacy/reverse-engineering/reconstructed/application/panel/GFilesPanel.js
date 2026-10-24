/**
 * GFilesPanel
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GFilesPanel() {
  // Constructor (reconstructed)
}

// Prototype methods
GFilesPanel.prototype.fileRequiresSourceDownload = function (e) {
        return !this.drive.getSupportedFileFormats().some((t) => {
          var n = e instanceof C ? e.getMimeType() : e.type;
          const o = e.extension || e.ext || null;
          return t.type === n || (o && t.ext.toLowerCase() === o.toLowerCase());
        });
      }

GFilesPanel.prototype.getUISettings = function () {
        return this._GUISettings;
      }

GFilesPanel.prototype._canDownload = function () {
        return true;
      }

GFilesPanel.prototype._isContextMenuAvailableForFile = function (e) {
        return true;
      }

GFilesPanel.prototype.logStatsForCurrentFilesSelection = function (e, t, n) {
        gDesigner.stats(1 === this.getSelection().length ? e : t, n);
      }

GFilesPanel.prototype.getCurrentAscend = function () {
        return this.drive.getSortDirection();
      }

GFilesPanel.prototype.getCurrentSortType = function () {
        return this.drive.getSortType();
      }

GFilesPanel.prototype.getSupportedVersions = function () {
        return [];
      }

GFilesPanel.prototype.getFooterSaveDescriptionForFileExtension = function (e) {
        return i.GLocale.get(
          new i.GLocaleKey("GFilesPanel", "text.info-".concat(e.toLowerCase()))
        );
      }

GFilesPanel.prototype.toString = function () {
        return "[Object GFilesPanel]";
      }

GFilesPanel.prototype._stringToSettings = function (e) {
        return JSON.parse((0, r.base64StringToString)(e));
      }

GFilesPanel.prototype._settingsToString = function (e) {
        return (0, r.stringToBase64String)(JSON.stringify(e));
      }

GFilesPanel.prototype.manageOpenFolder = function (e, t, n) {
        this.view.manageOpenFolder(e, t, n);
      }

module.exports = GFilesPanel;
