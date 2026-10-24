/**
 * GBoxEditor
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GBoxEditor() {
  // Constructor (reconstructed)
}

// Prototype methods
GBoxEditor.prototype.getRotationAngle = function () {
          var e = this.getBoxTransform();
          return (
            this._transform &&
              (e = e ? e.multiplied(this._transform) : this._transform),
            e ? e.decomposed().rotate.getRotationFactor() : 0
          );
        }

GBoxEditor.prototype._processRotationCorners = function (e, t, i) {
          var n = this.getBox();
          if (n && !n.isEmpty()) {
            var r = this.getBoxTransform();
            r = r || new c();
            var o = (r = t ? r.multiplied(t) : r).inverted();
            if (!i || !o || !n.containsPoint(o.mapPoint(i))) {
              var a = [
                  A.Side.TOP_LEFT,
                  A.Side.TOP_RIGHT,
                  A.Side.BOTTOM_LEFT,
                  A.Side.BOTTOM_RIGHT,
                ],
                s = n.getSide(A.Side.RIGHT_CENTER);
              s = r.mapPoint(s);
              for (var l = 0; l < a.length; ++l) {
                var h = a[l];
                if (!0 === e(r.mapPoint(n.getSide(h)), s)) break;
              }
            }
          }
        }

GBoxEditor.prototype._paintOutline = function (e, t, i, n, r) {
          this._showResizeBox() || this._paintResizeBoxOutline(e, t, i, n);
        }

GBoxEditor.prototype._paintResizeBoxOutline = function (e, t, i, n, r) {
          var o = this._getResizeHandlesBBox(e);
          if (o) {
            var a = e,
              s = this.getBoxTransform();
            (a = s ? s.multiplied(a) : a),
              this._paintTransformedQuadrilateral(a, o, t, n, r);
          }
        }

GBoxEditor.prototype._paintTransformedQuadrilateral = function (e, t, i, n, o) {
          var a,
            A,
            p,
            u = null,
            d = o || l.outlineWidth,
            g = d % 2 != 0,
            y = (e = e || new c()).mapQuadrilateral(t);
          (y &&
            y.length &&
            (u = y.map(function (e) {
              var t = Math.floor(e.getX()),
                i = Math.floor(e.getY());
              return g && ((t += 0.5), (i += 0.5)), new s(t, i);
            })),
          u) &&
            (this._alignment &&
              (a = i.pushCanvas(
                i.canvas.createCanvas(e.mapRect(t).expanded(2, 2, 2, 2))
              )),
            i.canvas.putVertices(u, !0),
            (A =
              n ||
              (this.hasFlag(f.Flag.Highlighted)
                ? i.highlightOutlineColor
                : this._getOutlineColor(i, e))),
            (p = this._alignment ? (g ? 2 * d + 1 : 2 * d) : d),
            i.canvas.strokeVertices(A, p),
            this._alignment &&
              (this._alignment === m.OutlineAlignment.Outside
                ? i.canvas.fillVertices(
                    r.BLACK,
                    1,
                    h.CompositeOperator.DestinationOut
                  )
                : this._alignment === m.OutlineAlignment.Inside &&
                  i.canvas.fillVertices(
                    r.BLACK,
                    1,
                    h.CompositeOperator.DestinationIn
                  ),
              a.drawCanvas(i.canvas),
              i.canvas.finish(),
              i.popCanvas()));
        }

GBoxEditor.prototype.toString = function () {
          return "[Object GBoxEditor]";
        }

module.exports = GBoxEditor;
