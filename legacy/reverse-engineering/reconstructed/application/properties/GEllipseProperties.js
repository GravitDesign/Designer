/**
     * Ellipse properties panel
     * @class GEllipseProperties
     * @extends GProperties
     * @constructor
     */

function GEllipseProperties() {
  // Constructor (reconstructed)
}

// Prototype methods
/**
     * @param {String} property
     * @param {*} value
     * @private
     */
GEllipseProperties.prototype._assignProperty = function (property, value) {
        this._assignProperties([e], [t], n);
      }

/**
     * @param {String} property
     * @param {*} value
     * @private
     */
    GEllipseProperties.prototype._assignProperty = function (property, value) {
        this._assignProperties([property], [value]);
    };

    /**
     * @param {Array<String>} properties
     * @param {Array<*>} values
     * @private
     */
GEllipseProperties.prototype._assignProperties = function (properties, values) {
        var o = this._document.getEditor();
        o.beginTransaction();
        try {
          for (var i = 0; i < this._ellipses.length; ++i)
            this._ellipses[i].setProperties(e, t);
        } finally {
          o.commitTransaction(n);
        }
      }

/** @override */
GEllipseProperties.prototype.toString = function () {
        return "[Object GEllipseProperties]";
      }

module.exports = GEllipseProperties;
