/**
 * GContactShadow
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GContactShadow() {
        o.Effect.call(this),
          this._setDefaultProperties(g.GeometryProperties, g.VisualProperties);
(this._bend = new h());
      }

// Prototype methods
GContactShadow.prototype._getIsometricTransform = function () {
          var e = p.toRadians(90 - this.$a);
          return new s(
            Math.cos(0),
            Math.cos(e) * Math.sin(0),
            -Math.sin(0),
            Math.cos(e) * Math.cos(0),
            0,
            0
          );
        }

GContactShadow.prototype._handleChange = function (e, t) {
          e === o._Change.Store
            ? (this.storeProperties(t.blob, g.GeometryProperties),
              this.storeProperties(t.blob, g.VisualProperties, function (e, t) {
                return t && "pat" === e ? n.serialize(t) : t;
              }))
            : e === o._Change.Restore &&
              (this.restoreProperties(t.blob, g.GeometryProperties),
              this.restoreProperties(
                t.blob,
                g.VisualProperties,
                function (e, t) {
                  return t && "pat" === e ? n.deserialize(t) : t;
                }
              )),
            this._handleVisualChangeForProperties(e, t, g.VisualProperties),
            this._handleGeometryChangeForProperties(e, t, g.GeometryProperties),
            a.Effect.prototype._handleChange.call(this, e, t);
        }

GContactShadow.prototype.toString = function () {
          return "[Object GContactShadow]";
        }

GContactShadow.prototype.destroy = function () {
          this._blur && this._blur.destroy();
(this._savedBBox = null);
(this._padding = null);
        }


module.exports = GContactShadow;
