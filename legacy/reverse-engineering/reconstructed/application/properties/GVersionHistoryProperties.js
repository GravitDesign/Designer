/**
 * GVersionHistoryProperties
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GVersionHistoryProperties() {
  // Constructor (reconstructed)
}

// Prototype methods
GVersionHistoryProperties.prototype._toggleLoading = function (e) {
        var t = this._panel.find(".container");
        e
          ? (t.hide(), this._loadingIndicator.show())
          : (t.show(), this._loadingIndicator.hide());
      }

GVersionHistoryProperties.prototype.close = function () {
        gDesigner.stats("version-history-panel_close_panel", this._fileId),
          this._closePreview(),
          gDesigner.trigger(new l.default(l.default.Type.Disable)),
          gDesigner.removeEventListener(p.default, this._documentEvent, this),
          gDesigner.removeEventListener(
            f.default,
            this._storageEventHandler,
            this
          );
      }

GVersionHistoryProperties.prototype.toString = function () {
        return "[Object GVersionHistoryProperties]";
      }

module.exports = GVersionHistoryProperties;
