/**
 * GDropShadowEffect
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GDropShadowEffect() {
  // Constructor (reconstructed)
}

// Prototype methods
GDropShadowEffect.prototype._handleChange = function (e, t) {
          e === r._Change.Store
            ? (this.storeProperties(t.blob, p.GeometryProperties),
              this.storeProperties(t.blob, p.VisualProperties, function (e, t) {
                return t && "pat" === e ? n.serialize(t) : t;
              }))
            : e === r._Change.Restore &&
              (this.restoreProperties(t.blob, p.GeometryProperties),
              this.restoreProperties(
                t.blob,
                p.VisualProperties,
                function (e, t) {
                  return t && "pat" === e && t ? n.deserialize(t) : t;
                }
              )),
            this._handleGeometryChangeForProperties(e, t, p.GeometryProperties),
            this._handleVisualChangeForProperties(e, t, p.VisualProperties),
            o.Effect.prototype._handleChange.call(this, e, t);
        }

GDropShadowEffect.prototype.toString = function () {
          return "[Object GDropShadowEffect]";
        }

GDropShadowEffect.prototype.destroy = function () {
          this._blur && this._blur.destroy();
        }


module.exports = GDropShadowEffect;
