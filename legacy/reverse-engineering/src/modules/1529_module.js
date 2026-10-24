/**
 * Webpack Module #1529
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    const o = n(395);
    e.exports = function (e) {
      (e.prototype._versionHistoryPanelOverlay = null),
        (e.prototype._updateVersionsPanelTouch = function () {
          if (this._versionHistoryMode) {
            this._versionHistoryPanelOverlay ||
              (this._versionHistoryPanelOverlay = $("<div/>")
                .append(this._versionHistoryPanel)
                .gOverlay({
                  clazz: "g-version-history-panel-overlay",
                  closeCallback: () => this._versionHistoryProperties.close(),
                }));
            const e = (
                this.getOrientation() === o.Orientation.Left
                  ? gDesigner.getLeftSidebars()
                  : gDesigner.getRightSidebars()
              ).getHtmlElement(),
              t = e.offset(),
              n = e.width();
            this._versionHistoryPanelOverlay
              .css({ minWidth: n })
              .gOverlay("open", { x: t.left + n, y: t.top });
          } else
            this._versionHistoryPanelOverlay &&
              this._versionHistoryPanelOverlay.gOverlay("close"),
              (this._versionHistoryPanelOverlay = null);
        });
    };
  }