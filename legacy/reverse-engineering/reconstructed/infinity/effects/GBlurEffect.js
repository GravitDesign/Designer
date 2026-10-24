/**
 * GBlurEffect
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GBlurEffect() {
  // Constructor (reconstructed)
}

// Prototype methods
GBlurEffect.prototype.applyNativeEffect = function (e, t, i, n) {
          e.setFilter(l.Filter.Blur, this.$r * n);
        }

GBlurEffect.prototype.removeNativeEffect = function (e, t, i) {
          e.setFilter(l.Filter.Blur, null);
        }

GBlurEffect.prototype.render = function (e, t, i, r, o, a) {
          return (
            this.$r &&
              (this.canApplyNativeEffect()
                ? (this.applyNativeEffect(e, t, i, r),
                  e.drawCanvas(e, 0, 0, 1, l.CompositeOperator.Copy),
                  this.removeNativeEffect(e))
                : this._glblur
                ? ((this._glblur.$shp = {
                    radius: this.$r,
                    clip: this.$b,
                  }),
                  this._glblur.render(e, t, i, r, o, a))
                : e.getBitmap().applyFilter(n, this.$r * r)),
            e
          );
        }

GBlurEffect.prototype._handleChange = function (e, t) {
          e === r._Change.Store
            ? this.storeProperties(t.blob, A.GeometryProperties)
            : e === r._Change.Restore &&
              this.restoreProperties(t.blob, A.GeometryProperties),
            this._handleGeometryChangeForProperties(e, t, A.GeometryProperties),
            o.Effect.prototype._handleChange.call(this, e, t);
        }

GBlurEffect.prototype.setAffectedByGLBug = function (e) {
          this._glblur && this._glblur.setAffectedByGLBug(e);
        }

GBlurEffect.prototype.toString = function () {
          return "[Object GBlurEffect]";
        }

GBlurEffect.prototype.destroy = function () {
          this._glblur && this._glblur.destroy();
        }

module.exports = GBlurEffect;
