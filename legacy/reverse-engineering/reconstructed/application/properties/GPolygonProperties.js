/**
     * Polygon properties panel
     * @class GPolygonProperties
     * @extends GProperties
     * @constructor
     */

function GPolygonProperties() {
  // Constructor (reconstructed)
}

// Prototype methods
GPolygonProperties.prototype._assignEdges = function (e, t) {
        if (e) {
          t || this._document.getEditor().beginTransaction();
          try {
            for (var n = 0; n < this._polygons.length; ++n) {
              var i = this._polygons[n],
                a = i.getProperty("or"),
                r = i.getProperty("pts"),
                s = i.getProperty("oa"),
                l = Math.PI / r,
                c = s + l,
                d = a * Math.cos(l);
              i.setProperties(["ir", "ia"], [d, c], !1, !1, t);
            }
          } finally {
            t ||
              this._document
                .getEditor()
                .commitTransaction(
                  o.GLocale.get(
                    new o.GLocaleKey(
                      "GPolygonProperties",
                      "action.change-polygon-size"
                    )
                  )
                );
          }
        }
      }

/** @override */
GPolygonProperties.prototype.toString = function () {
        return "[Object GPolygonProperties]";
      }

// Static methods and properties
s._rectangles = [];

module.exports = GPolygonProperties;
