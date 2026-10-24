/**
 * GAngularGradientEditor
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GAngularGradientEditor() {
  // Constructor (reconstructed)
}

// Prototype methods
GAngularGradientEditor.prototype.getCursor = function (e, t) {
          var i = A.prototype.getCursor.call(this, e, t);
          return i || (e === E.CENTER_HANDLE_PART_ID ? s.SelectCross : null);
        }

GAngularGradientEditor.prototype.getCustomBBox = function (e, t) {
          var i = A.prototype.getCustomBBox.call(this, e, t),
            n = new m(this._gradient._fx - 0.5, this._gradient._fy - 0.5, 1, 1),
            r = this._getCompositeTransform(!0),
            o = (r = e ? r.multiplied(e) : r).mapRect(n);
          i = i ? i.united(o) : o;
          var a = h.annotationHandles.gradient.sizeBig + 1;
          return (i = i.expanded(a, a, a, a));
        }

GAngularGradientEditor.prototype._getAnnotationPoints = function () {
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

GAngularGradientEditor.prototype._getPivotPoints = function () {
          var e = new l(this._gradient._fx, this._gradient._fy),
            t = [];
          (t[0] = new l(
            this._gradient._fx + this._gradient._scale,
            this._gradient._fy
          ).rotatedAt(this._gradient._a0 + Math.PI, e)),
            (t[1] = e);
          for (
            var i = this._getCompositeTransform(!0), n = 0;
            n < t.length;
            ++n
          )
            t[n] = i.mapPoint(t[n]);
          return t;
        }

GAngularGradientEditor.prototype._getGradientPoints = function () {
          for (
            var e = [],
              t = this._gradient.getStops(),
              i = new l(this._gradient._fx, this._gradient._fy),
              n = 0;
            n < t.length;
            ++n
          ) {
            var r = new l(
              this._gradient._fx + this._gradient._scale,
              this._gradient._fy
            ).rotatedAt(
              this._gradient._a0 + Math.PI + t[n].position * p.PI2,
              i
            );
            e.push(r);
          }
          return e;
        }

GAngularGradientEditor.prototype.toString = function () {
          return "[Object GAngularGradientEditor]";
        }

module.exports = GAngularGradientEditor;
