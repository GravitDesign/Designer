/**
 * GLinearGradient
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GLinearGradient(e, t, i, r, o, a) {
        n.call(this, e, t, r, o, a);
(this._fx = "number" == typeof r ? r : 0);
(this._angle = "number" == typeof i ? i : 0);
      }

// Prototype methods
GLinearGradient.prototype.getAngle = function () {
          return this._angle;
        }

GLinearGradient.prototype.asCSSBackground = function (e) {
          return (
            "linear-gradient(" +
            (Math.round(o.toDegrees(this._angle)) + 90) +
            "deg, " +
            this.toScreenCSS(e) +
            ")"
          );
        }

GLinearGradient.prototype.clone = function () {
          return new a(
            this.getClonedStops(),
            this._scale,
            this._angle,
            this._fx,
            this._fy,
            this._transform
          );
        }

GLinearGradient.prototype._serializeToBlob = function () {
          var e = n.prototype._serializeToBlob.call(this);
          return e && !o.isEqualEps(this._angle, 0) && (e.r = this._angle), e;
        }

GLinearGradient.prototype._deserializeFromBlob = function (e) {
          n.prototype._deserializeFromBlob.call(this, e);
(this._angle = e.hasOwnProperty("r") ? e.r : 0);
        }

GLinearGradient.prototype.toString = function () {
          return "[Object GLinearGradient]";
        }


module.exports = GLinearGradient;
