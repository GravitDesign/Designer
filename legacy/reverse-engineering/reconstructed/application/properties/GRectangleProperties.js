/**
     * Rectangle properties panel
     * @class GRectangleProperties
     * @extends GProperties
     * @constructor
     */

function GRectangleProperties() {
  // Constructor (reconstructed)
}

// Prototype methods
/**
     * @param {String} property
     * @param {*} value
     * @private
     */
GRectangleProperties.prototype._assignProperty = function (property, value) {
        this._assignProperties([e], [t]);
      }

/**
     * @param {String} property
     * @param {*} value
     * @private
     */
    GRectangleProperties.prototype._assignProperty = function (property, value) {
        this._assignProperties([property], [value]);
    };

    /**
     * @param {Array<String>} properties
     * @param {Array<*>} values
     * @private
     */
GRectangleProperties.prototype._assignProperties = function (properties, values) {
        var n = this._document.getEditor();
        n.beginTransaction();
        try {
          for (var i = 0; i < this._rectangles.length; ++i)
            this._rectangles[i].setProperties(e, t);
        } finally {
          n.commitTransaction(
            o.GLocale.get(
              new o.GLocaleKey(
                "GRectangleProperties",
                "action.modify-rectangle-properties"
              )
            )
          );
        }
      }

/** @override */
GRectangleProperties.prototype.toString = function () {
        return "[Object GRectangleProperties]";
      }

module.exports = GRectangleProperties;
