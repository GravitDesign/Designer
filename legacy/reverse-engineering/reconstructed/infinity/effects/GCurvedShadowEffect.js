/**
 * GCurvedShadowEffect
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GCurvedShadowEffect() {
  // Constructor (reconstructed)
}

// Prototype methods
GCurvedShadowEffect.prototype._handleChange = function (e, t) {
          e === r._Change.Store
            ? (this.storeProperties(t.blob, g.GeometryProperties),
              this.storeProperties(t.blob, g.VisualProperties, function (e, t) {
                return t && "pat" === e ? n.serialize(t) : t;
              }))
            : e === r._Change.Restore &&
              (this.restoreProperties(t.blob, g.GeometryProperties),
              this.restoreProperties(
                t.blob,
                g.VisualProperties,
                function (e, t) {
                  return t && "pat" === e && t ? n.deserialize(t) : t;
                }
              )),
            this._handleGeometryChangeForProperties(e, t, g.GeometryProperties),
            this._handleVisualChangeForProperties(e, t, g.VisualProperties),
            o.Effect.prototype._handleChange.call(this, e, t);
        }

GCurvedShadowEffect.prototype.toString = function () {
          return "[Object GCurvedShadowEffect]";
        }

GCurvedShadowEffect.prototype.destroy = function () {
          this._bend && this._bend.destroy();
        }

module.exports = GCurvedShadowEffect;
