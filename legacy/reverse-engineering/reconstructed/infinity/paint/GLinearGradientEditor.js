/**
 * GLinearGradientEditor
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GLinearGradientEditor() {
  // Constructor (reconstructed)
}

// Prototype methods
GLinearGradientEditor.prototype.resetPartMove = function (e, t) {
          (this._scaleDelta = 1),
            (this._angleDelta = 0),
            this._gradient.setTransform(null),
            A.prototype.resetPartMove.call(this, e, t);
        }

GLinearGradientEditor.prototype._getAnnotationPoints = function () {
          for (
            var e = this._getGradientPoints(),
              t = this._getCompositeTransform(!0),
              i = 0;
            i < e.length;
            ++i
          )
            e[i] = t.mapPoint(e[i]);
          return e;
        }

GLinearGradientEditor.prototype._getGradientPoints = function () {
          for (
            var e = this._gradient.getScale(),
              t = this._gradient.getAngle(),
              i = Math.cos(t) * e,
              n = Math.sin(t) * e,
              r = this._gradient.getStops(),
              o = [],
              a = 0;
            a < r.length;
            ++a
          ) {
            var l = new s(
              this._gradient._fx + i * r[a].position,
              this._gradient._fy + n * r[a].position
            );
            o.push(l);
          }
          return o;
        }

GLinearGradientEditor.prototype.toString = function () {
          return "[Object GLinearGradientEditor]";
        }

module.exports = GLinearGradientEditor;
