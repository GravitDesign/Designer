/**
 * GAlignProperties
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GAlignProperties() {
  // Constructor (reconstructed)
}

// Prototype methods
GAlignProperties.prototype.update = function (e, t) {
        if (
          (this._document &&
            ((this._document = null),
            gDesigner.removeEventListener(l, this._settingChanged)),
          (this._elements = []),
          e)
        ) {
          for (var n = 0; n < t.length; ++n)
            !t[n].hasMixin(i.GElement.Transform) ||
              t[n] instanceof i.GPage ||
              this._elements.push(t[n]);
          if (this._elements.length >= 2 && this._elements.length === t.length)
            return (
              (this._document = e),
              gDesigner.addEventListener(l, this._settingChanged, this),
              !0
            );
        }
        return false;
      }

GAlignProperties.prototype._settingChanged = function (e) {
        "decimals_num" === e.key && this._updateDisplayValues();
      }

GAlignProperties.prototype._updateDisplayValues = function () {
        this._panel.find("[data-dist]").each(
          function (e, t) {
            var n = $(t),
              o = parseFloat(n.gInputBox("value"));
            (o = isNaN(o) || o <= 0 || !o ? 1 : o),
              n.gInputBox(
                "value",
                i.GUtil.formatNumber(
                  o,
                  this._document.getScene().getOptimalDecimalsCount()
                )
              );
          }.bind(this)
        );
      }

GAlignProperties.prototype.toString = function () {
        return "[Object GAlignProperties]";
      }

module.exports = GAlignProperties;
