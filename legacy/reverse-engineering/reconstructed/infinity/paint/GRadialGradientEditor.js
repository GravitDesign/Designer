/**
 * GRadialGradientEditor
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GRadialGradientEditor() {
  // Constructor (reconstructed)
}

// Prototype methods
GRadialGradientEditor.prototype.getCursor = function (e, t) {
          var i = c.prototype.getCursor.call(this, e, t);
          return i || (e === v.MOVE_HANDLE_PART_ID ? s.SelectCross : null);
        }

GRadialGradientEditor.prototype.getCustomBBox = function (e, t) {
          var i = c.prototype.getCustomBBox.call(this, e, t),
            n = this._getPivotPoints();
          if (n && n.length)
            for (var r = 1; r < n.length; ++r) {
              var o = m.getAnnotationBBox(
                e,
                n[r],
                h.annotationHandles.gradient.size,
                !0
              );
              i = i ? i.united(o) : o;
            }
          return i;
        }

GRadialGradientEditor.prototype._getAnnotationPoints = function () {
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

GRadialGradientEditor.prototype._getPivotPoints = function () {
          var e = [];
          (e[0] = new l(this._gradient._cx, this._gradient._cy)),
            (e[1] = new l(
              this._gradient._cx + this._gradient._scale,
              this._gradient._cy
            )),
            (e[2] = new l(
              this._gradient._cx,
              this._gradient._cy - this._gradient._scale
            )),
            (e[3] = new l(this._gradient._fx, this._gradient._fy));
          for (
            var t = this._getCompositeTransform(!0), i = 0;
            i < e.length;
            ++i
          )
            e[i] = t.mapPoint(e[i]);
          return e;
        }

GRadialGradientEditor.prototype._getGradientPoints = function () {
          for (
            var e = [],
              t = this._gradient.getStops(),
              i = this._xLeading
                ? new l(
                    this._gradient._cx + this._gradient._scale,
                    this._gradient._cy
                  )
                : new l(
                    this._gradient._cx,
                    this._gradient._cy - this._gradient._scale
                  ),
              n = new l(this._gradient._fx, this._gradient._fy),
              r = i.getX() - n.getX(),
              o = i.getY() - n.getY(),
              a = 0;
            a < t.length;
            ++a
          ) {
            var s = new l(
              this._gradient._fx + r * t[a].position,
              this._gradient._fy + o * t[a].position
            );
            e.push(s);
          }
          return e;
        }

GRadialGradientEditor.prototype.toString = function () {
          return "[Object GRadialGradientEditor]";
        }

module.exports = GRadialGradientEditor;
