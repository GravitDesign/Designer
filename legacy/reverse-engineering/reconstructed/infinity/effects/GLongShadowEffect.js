/**
 * GLongShadowEffect
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GLongShadowEffect() {
  // Constructor (reconstructed)
}

// Prototype methods
GLongShadowEffect.prototype._handleChange = function (e, t) {
          e === r._Change.Store
            ? (this.storeProperties(t.blob, c.GeometryProperties),
              this.storeProperties(t.blob, c.VisualProperties, function (e, t) {
                return t && "pat" === e ? n.serialize(t) : t;
              }))
            : e === r._Change.Restore &&
              (this.restoreProperties(t.blob, c.GeometryProperties),
              this.restoreProperties(
                t.blob,
                c.VisualProperties,
                function (e, t) {
                  return t && "pat" === e ? n.deserialize(t) : t;
                }
              )),
            this._handleVisualChangeForProperties(e, t, c.VisualProperties),
            this._handleGeometryChangeForProperties(e, t, c.GeometryProperties),
            o.Effect.prototype._handleChange.call(this, e, t);
        }

GLongShadowEffect.prototype.toString = function () {
          return "[Object GLongShadowEffect]";
        }

module.exports = GLongShadowEffect;
