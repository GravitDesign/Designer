/**
 * GMirrorEffect
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GMirrorEffect() {
  // Constructor (reconstructed)
}

// Prototype methods
GMirrorEffect.prototype._handleChange = function (e, t) {
          e === r._Change.Store
            ? (this.storeProperties(t.blob, u.GeometryProperties),
              this.storeProperties(t.blob, u.VisualProperties, function (e, t) {
                return t && "pat" === e ? n.serialize(t) : t;
              }))
            : e === r._Change.Restore &&
              (this.restoreProperties(t.blob, u.GeometryProperties),
              this.restoreProperties(
                t.blob,
                u.VisualProperties,
                function (e, t) {
                  return t && "pat" === e ? n.deserialize(t) : t;
                }
              )),
            this._handleVisualChangeForProperties(e, t, u.VisualProperties),
            this._handleGeometryChangeForProperties(e, t, u.GeometryProperties),
            o.Effect.prototype._handleChange.call(this, e, t);
        }

GMirrorEffect.prototype.toString = function () {
          return "[Object GMirrorEffect]";
        }

module.exports = GMirrorEffect;
