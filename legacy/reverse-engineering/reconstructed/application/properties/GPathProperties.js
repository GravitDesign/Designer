/**
     * Path properties panel
     * @class GPathProperties
     * @extends GProperties
     * @constructor
     */

function GPathProperties() {
  // Constructor (reconstructed)
}

// Prototype methods
/**
     * @param {Array<String>} properties
     * @param {Array<*>} values
     * @private
     */
GPathProperties.prototype._assignPointProperties = function (properties, values) {
        gDesigner.stats("pathproperties_modify_point-properties");
        var n = this._document.getEditor();
        n.beginTransaction();
        try {
          for (var i = 0; i < this._points.length; ++i)
            this._points[i].setProperties(e, t);
        } finally {
          n.commitTransaction(
            o.GLocale.get(
              new o.GLocaleKey(
                "GPathProperties",
                "action.modify-point-properties"
              )
            )
          );
        }
      }

/** @override */
GPathProperties.prototype.toString = function () {
        return "[Object GPathProperties]";
      }

module.exports = GPathProperties;
