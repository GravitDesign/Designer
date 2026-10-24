/**
 * GFrameProperties
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GFrameProperties() {
  // Constructor (reconstructed)
}

// Prototype methods
GFrameProperties.prototype._updateUI = function () {
        gDesigner.isTouchEnabled()
          ? this._panel.find(".frm-checkbox").gCheckboxSlider()
          : this._panel.find(".frm-checkbox").gCheckboxSlider("unmount");
      }

GFrameProperties.prototype._settingChanged = function (e) {
        "touch" === e.key && this._updateUI();
      }

GFrameProperties.prototype._afterPropertiesChange = function (e) {
        !e.temporary &&
          this._items.length > 0 &&
          this._items[0] === e.node &&
          this._updateProperties();
      }

GFrameProperties.prototype._updateProperties = function () {
        var e = this._items[0];
        this._panel.find("[major-item-only]").css("display", ""),
          this._panel
            .find('input[data-item-property="frm"]')
            .prop("disabled", !1)
            .prop("checked", !!e.getProperty("frm"));
      }

GFrameProperties.prototype._assignProperty = function (e, t, n) {
        if ("frm" == e) {
          var o = this._document.getEditor();
          o.beginTransaction();
          try {
            for (var i = 0; i < this._items.length; ++i) {
              var a = this._items[i];
              a.setFrame && a.setFrame(t);
            }
          } finally {
            o.commitTransaction(n);
          }
        }
      }

GFrameProperties.prototype.toString = function () {
        return "[Object GFrameProperties]";
      }

module.exports = GFrameProperties;
