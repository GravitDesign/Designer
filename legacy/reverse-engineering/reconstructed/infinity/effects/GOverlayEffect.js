/**
 * GOverlayEffect
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GOverlayEffect() {
  // Constructor (reconstructed)
}

// Prototype methods
GOverlayEffect.prototype._handleChange = function (e, t) {
          e === o._Change.Store
            ? this.storeProperties(t.blob, c.VisualProperties, function (e, t) {
                return t && "pat" === e ? r.serialize(t) : t;
              })
            : e === o._Change.Restore &&
              this.restoreProperties(
                t.blob,
                c.VisualProperties,
                function (e, t) {
                  return t && "pat" === e ? r.deserialize(t) : t;
                }
              ),
            this._handleVisualChangeForProperties(e, t, c.VisualProperties),
            a.Effect.prototype._handleChange.call(this, e, t);
        }

GOverlayEffect.prototype.toString = function () {
          return "[Object GOverlayEffect]";
        }

module.exports = GOverlayEffect;
