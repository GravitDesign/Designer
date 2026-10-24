/**
 * GRadialGradient
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GRadialGradient(e, t, i, r, o, a, s) {
        n.call(this, e, t, i, r, s);
(this._scale = "number" == typeof t ? t : 0.5);
(this._cx = "number" == typeof o ? o : 0.5);
(this._cy = "number" == typeof a ? a : 0.5);
      }

// Prototype methods
GRadialGradient.prototype.asCSSBackground = function (e) {
          return (
            "radial-gradient(ellipse at " +
            Math.round(100 * this._cx) +
            "% " +
            Math.round(100 * this._cy) +
            "%, " +
            this.toScreenCSS(e) +
            ")"
          );
        }

GRadialGradient.prototype.clone = function () {
          return new a(
            this.getClonedStops(),
            this._scale,
            this._fx,
            this._fy,
            this._cx,
            this._cy,
            this._transform
          );
        }

GRadialGradient.prototype._serializeToBlob = function () {
          var e = n.prototype._serializeToBlob.call(this);
          return (
            e &&
              (o.isEqualEps(this._cx, 0.5) || (e._cx = this._cx),
              o.isEqualEps(this._cy, 0.5) || (e._cy = this._cy)),
            e
          );
        }

GRadialGradient.prototype._deserializeFromBlob = function (e) {
          n.prototype._deserializeFromBlob.call(this, e);
(this._cx = e.hasOwnProperty("cx") ? e.cx : 0.5);
(this._cy = e.hasOwnProperty("cy") ? e.cy : 0.5);
        }

GRadialGradient.prototype.toString = function () {
          return "[Object GRadialGradient]";
        }


module.exports = GRadialGradient;
