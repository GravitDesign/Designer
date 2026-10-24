/**
 * GTransformProperties
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GTransformProperties() {
  // Constructor (reconstructed)
}

// Prototype methods
GTransformProperties.prototype._getOwnBorderScale = function () {
        return this._advancedTransformPanel
          .find('[data-property="_bs"]')
          .prop("checked");
      }

GTransformProperties.prototype._setBorderScale = function (e) {
        this._document &&
          this._document
            .getScene()
            .setBorderScale(
              e &&
                (undefined === o.GEditorOptions.scaleBorderWidth ||
                  o.GEditorOptions.scaleBorderWidth)
            );
      }

GTransformProperties.prototype._getOwnCornersScale = function () {
        return this._advancedTransformPanel
          .find('[data-property="esc"]')
          .prop("checked");
      }

GTransformProperties.prototype._setCornersScale = function (e) {
        this._document &&
          this._document
            .getScene()
            .setCornersScale(
              e &&
                (undefined === o.GEditorOptions.scaleCorners ||
                  o.GEditorOptions.scaleCorners)
            );
      }

GTransformProperties.prototype.toString = function () {
        return "[Object GTransformProperties]";
      }

module.exports = GTransformProperties;
