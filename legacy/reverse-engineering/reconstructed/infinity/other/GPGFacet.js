/**
 * GPGFacet
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GPGFacet() {
  // Constructor (reconstructed)
}

// Prototype methods
GPGFacet.prototype.deserialize = function (e) {
          if (e.length >= 3) {
            (this.$uid = new h(e[0])), (this.$cSt = e[1]);
            for (var t = 1; t < e.length; ++t) {
              var i = new v.DirectedEdge(new p(new h(e[t].euid)), e[t].dir);
              this._directedEdges.appendChild(i);
            }
          }
        }

GPGFacet.prototype.getDirectedEdges = function () {
          return this._directedEdges;
        }

GPGFacet.prototype._handleChange = function (e, t) {
          e === o._Change.Store
            ? (t.blob.props = this.serialize())
            : e === o._Change.Restore &&
              t.blob.hasOwnProperty("props") &&
              this.deserialize(t.blob.props),
            s.prototype._handleStyleChange.call(this, e, t),
            o.prototype._handleChange.call(this, e, t);
        }

GPGFacet.prototype._styleRepaint = function (e) {
          this._parent instanceof o.MapContainer &&
            this._parent.getParent() &&
            "Paths Graph" === o.getName(this._parent.getParent()) &&
            this._parent
              .getParent()
              ._notifyChange(_._Change.InvalidationRequest);
        }

GPGFacet.prototype._styleFinishGeometryChange = function (e) {
          this._parent instanceof o.MapContainer &&
            this._parent.getParent() &&
            "Paths Graph" === o.getName(this._parent.getParent()) &&
            this._parent
              .getParent()
              ._notifyChange(_._Change.FinishGeometryUpdate, 1);
        }

GPGFacet.prototype._init = function () {
          (this._directedEdges = new v.DirectedEdges()),
            this._directedEdges._setParent(this);
        }

GPGFacet.prototype._paintFill = function (e, t, i, r, o) {
          if (
            ((this._path._scene = this._scene),
            i && this._path.setTransform(i),
            !e.configuration.isOutline(e) && this.hasStyleFill())
          ) {
            var a = this._path.getGeometryBBox();
            y.each(
              this.getPaintLayers().getFillLayers(!0),
              function (t, s) {
                var l = this._path.createShapePaint(
                  e,
                  s.$_pt,
                  this._path.getPatternBBox()
                );
                if (l) {
                  var h = this._path,
                    A = e.canvas,
                    c = s.$_op / 2,
                    p = c / (1 - c),
                    g = null;
                  if (undefined !== A.putVertices(h)) {
                    if (
                      (l.transform &&
                        (i && (l.transform = l.transform.multiplied(i)),
                        s.$_px &&
                          !s.$_px.isIdentity() &&
                          (l.transform = l.transform.preMultiplied(s.$_px))),
                      r)
                    )
                      if (
                        (A.strokeVertices(
                          d.Black,
                          1,
                          null,
                          null,
                          null,
                          1,
                          1,
                          u.CompositeOperator.DestinationOut
                        ),
                        s.$_pt instanceof n)
                      )
                        A.strokeVertices(
                          l.paint,
                          1,
                          null,
                          null,
                          null,
                          1,
                          s.$_op,
                          u.CompositeOperator.SourceOver
                        );
                      else {
                        A.strokeVertices(
                          d.White,
                          1,
                          null,
                          null,
                          null,
                          1,
                          s.$_op,
                          u.CompositeOperator.SourceOver
                        ),
                          l.transform &&
                            (g = A.setTransform(
                              A.getTransform(!0).preMultiplied(l.transform)
                            ));
                        var f = l.transform
                          ? l.transform.inverted().mapRect(a)
                          : a;
                        A.fillRect(
                          f.getX(),
                          f.getY(),
                          f.getWidth(),
                          f.getHeight(),
                          l.paint,
                          s.$_op,
                          u.CompositeOperator.SourceAtTop
                        );
                      }
                    else
                      l.transform &&
                        (g = A.setTransform(
                          A.getTransform(!0).preMultiplied(l.transform)
                        )),
                        o &&
                          A.fillVertices(
                            d.Black,
                            1,
                            u.CompositeOperator.DestinationOut,
                            this._path._isEvenOddFill()
                          ),
                        A.fillVertices(
                          l.paint,
                          o ? c : p,
                          s.getBlendingForContext(e),
                          this._path._isEvenOddFill()
                        );
                    g && A.setTransform(g);
                  }
                }
              }.bind(this)
            );
          }
          i && this._path.setTransform(null);
        }

GPGFacet.prototype.toString = function () {
          return "[Object GPGFacet]";
        }

module.exports = GPGFacet;
