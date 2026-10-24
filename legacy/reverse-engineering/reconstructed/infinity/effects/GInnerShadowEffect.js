/**
 * GInnerShadowEffect
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GInnerShadowEffect() {
  // Constructor (reconstructed)
}

// Prototype methods
GInnerShadowEffect.prototype._handleChange = function (e, t) {
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
            this._handleGeometryChangeForProperties(e, t, c.GeometryProperties),
            this._handleVisualChangeForProperties(e, t, c.VisualProperties),
            o.Effect.prototype._handleChange.call(this, e, t);
        }

GInnerShadowEffect.prototype.toString = function () {
          return "[Object GInnerShadowEffect]";
        }

GInnerShadowEffect.prototype.destroy = function () {
          this._blur && this._blur.destroy();
        }


module.exports = GInnerShadowEffect;
