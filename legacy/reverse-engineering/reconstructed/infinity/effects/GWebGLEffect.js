/**
 * GWebGLEffect
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GWebGLEffect() {
  // Constructor (reconstructed)
}

// Prototype methods
GWebGLEffect.prototype.isAffectedByGLBug = function () {
          if (this._isAffectedByGLBug) return true;
          var e = this.getEffectPadding();
          return "number" == typeof e
            ? e > 0
            : !!e.length && Math.max.apply(0, e) > 0;
        }

GWebGLEffect.prototype.render = function (e, t, i, n, r, o, a) {
          if (this.canApplyNativeEffect())
            return (
              this.applyNativeEffect(e, null, null, n),
              e.drawCanvas(e, 0, 0, 1, s.CompositeOperator.Copy),
              this.removeNativeEffect(e),
              e
            );
          if (this.$sh && !this.prepareShader()) return false;
          var h = t || e;
          t && t.drawCanvas(e, 0, 0, 1, this._defaultBlending);
          var A = this.drawShader(h, this.$shp, n, 0, 0, r, o, a);
          return (
            this.$sh && l.DELETE_EFFECT_TEXTURES_AFTER_DRAW && this.destroy(), A
          );
        }

GWebGLEffect.prototype._handleChange = function (e, t) {
          if (e === r._Change.Store)
            this.storeProperties(t.blob, h.GeometryProperties);
          else if (e === r._Change.Restore)
            this.restoreProperties(t.blob, h.GeometryProperties);
          else if (e === r._Change.WorkspaceAttached) {
            (i = this.getScene()) && i.addDestroyable(this);
          } else if (e === r._Change.WorkspaceDetach) {
            var i;
            (i = this.getScene()) && i.destroy([this]);
          }
          this._handleGeometryChangeForProperties(e, t, h.GeometryProperties),
            o.Effect.prototype._handleChange.call(this, e, t);
        }

GWebGLEffect.prototype.destroy = function () {
          this._destroy();
        }

GWebGLEffect.prototype.toString = function () {
          return "[Object GWebGLEffect]";
        }

module.exports = GWebGLEffect;
