/**
 * GGroupFrameProperties
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GGroupFrameProperties() {
  // Constructor (reconstructed)
}

// Prototype methods
GGroupFrameProperties.prototype._afterPropertiesChange = function (e) {
        !e.temporary &&
          this._items.length > 0 &&
          this._items[0] === e.node &&
          this._updateProperties();
      }

GGroupFrameProperties.prototype._updateProperties = function () {
        var e = this._items[0];
        this._panel.find("[major-item-only]").css("display", ""),
          this._panel
            .find('[data-item-property="frm"]')
            .prop("disabled", !1)
            .prop("value", e.getProperty("frm") ? "1" : "0");
      }

GGroupFrameProperties.prototype._assignProperty = function (e, t, n) {
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

GGroupFrameProperties.prototype.toString = function () {
        return "[Object GGroupFrameProperties]";
      }

module.exports = GGroupFrameProperties;
