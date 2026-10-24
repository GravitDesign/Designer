/**
     * An editor for an rectangle
     * @param {IFRectangle} rectangle the rectangle this editor works on
     * @class GRectangleEditor
     * @extends IFPathBaseEditor
     * @constructor
     */

function GRectangleEditor() {
  // Constructor (reconstructed)
}

// Prototype methods
/** @override */
GRectangleEditor.prototype._partIdAreEqual = function (a, b) {
          var i = e === t || e.id === t.id;
          return i && e.id && (i = e.side === t.side), i;
        }

/** @override */
    IFRectangleEditor.prototype._partIdAreEqual = function (a, b) {
        var eqs = (a === b) || (a.id === b.id);
        if (eqs && a.id) {
            eqs = (a.side === b.side);
        }
        return eqs;
    };

    /** @override */
GRectangleEditor.prototype._getPartInfoAt = function (location, transform, tolerance) {
          if (this._showSegmentDetails()) {
            var n = this._getDetailsPartInfoAt(e, t, i);
            if (n) return n;
          }
          return p.prototype._getPartInfoAt.call(this, e, t, i);
        }

GRectangleEditor.prototype._getDetailsPartInfoAt = function (e, t, i) {
          var n = null;
          return (
            this.getPaintElement().iterateSegments(
              function (i, r, o, a, l, A) {
                if (
                  (this._processCornerVisualization(
                    t,
                    A,
                    r,
                    function (t, i, r, o, a, l) {
                      f
                        .getAnnotationBBox(
                          o,
                          r,
                          h.annotationHandles.rectangle.size,
                          !1
                        )
                        .expanded(
                          h.annotPickDistance,
                          h.annotPickDistance,
                          h.annotPickDistance,
                          h.annotPickDistance
                        )
                        .containsPoint(e) &&
                        (n = new s.PartInfo(
                          this,
                          {
                            id: y.SHOULDER_PART_ID,
                            side: i,
                            ap: t,
                            point: r,
                          },
                          null,
                          !0,
                          !0
                        ));
                    }.bind(this)
                  ),
                  n)
                )
                  return true;
              }.bind(this),
              !0
            ),
            n
          );
        }

GRectangleEditor.prototype._getShoulderLimits = function (e, t, i, n, r) {
          var o = null,
            a = e.getLeftShoulderLimitPoint(i, t),
            s = e.getRightShoulderLimitPoint(i, t),
            l = n ? n.mapPoint(a) : a,
            A = n ? n.mapPoint(s) : s,
            c = g.ptDist(l.getX(), l.getY(), r.getX(), r.getY()),
            p = g.ptDist(A.getX(), A.getY(), r.getX(), r.getY()),
            u =
              h.annotationHandles.rectangle.margin +
              h.annotationHandles.rectangle.size;
          c > u &&
            p > u &&
            (o = {
              limLPos: l,
              sLeft: (c - u) / c,
              limRPos: A,
              sRight: (p - u) / p,
            });
          return o;
        }

GRectangleEditor.prototype._processCornerVisualization = function (e, t, i, n) {
          var r = this.getPaintElement(),
            o = r.getAnchorPoints().getChildByIndex(t),
            a = r.getTransform(),
            s = new l(o.getProperty("x"), o.getProperty("y")),
            c = a || new u(),
            p = (c = e ? c.multiplied(e) : c).mapPoint(s),
            d = r.getProperty("uf"),
            f = this._getShoulderLimits(o, d, a, e, p);
          if (f) {
            var m = a
              ? o.getLeftShoulderPointTransformed(a, !0)
              : o.getLeftShoulderPoint(!0);
            m ||
              ((m = new l(o.getProperty("x"), o.getProperty("y"))),
              (m = a ? a.mapPoint(m) : m));
            var y = a
              ? o.getRightShoulderPointTransformed(a, !0)
              : o.getRightShoulderPoint(!0);
            y ||
              ((y = new l(o.getProperty("x"), o.getProperty("y"))),
              (y = a ? a.mapPoint(y) : y)),
              (m = e ? e.mapPoint(m) : m),
              (y = e ? e.mapPoint(y) : y);
            var _,
              v = g.ptDist(m.getX(), m.getY(), p.getX(), p.getY()),
              b = g.ptDist(y.getX(), y.getY(), p.getX(), p.getY()),
              C = h.annotationHandles.rectangle.margin + f.sLeft * v,
              w = h.annotationHandles.rectangle.margin + f.sRight * b,
              E = g.getPointAtLength(
                p.getX(),
                p.getY(),
                f.limLPos.getX(),
                f.limLPos.getY(),
                C
              ),
              B = g.getPointAtLength(
                p.getX(),
                p.getY(),
                f.limRPos.getX(),
                f.limRPos.getY(),
                w
              ),
              x = c.inverted(),
              P = x.mapPoint(E),
              S = x.mapPoint(B);
            switch (i) {
              case A.Side.TOP_LEFT:
                _ = new l(S.getX(), P.getY());
                break;
              case A.Side.TOP_RIGHT:
                _ = new l(P.getX(), S.getY());
                break;
              case A.Side.BOTTOM_RIGHT:
                _ = new l(S.getX(), P.getY());
                break;
              case A.Side.BOTTOM_LEFT:
                _ = new l(P.getX(), S.getY());
            }
            _ && n(o, i, (_ = a ? a.mapPoint(_) : _), e, m, y);
          }
        }

/**
     * @returns {Boolean}
     * @private
     */
GRectangleEditor.prototype._showSegmentDetails = function () {
          return (
            this._showAnnotations() &&
            this.hasFlag(s.Flag.Detail) &&
            !this._elementPreview
          );
        }

/**
     * @returns {Boolean}
     * @private
     */
    IFRectangleEditor.prototype._showSegmentDetails = function () {
        return this._showAnnotations() && this.hasFlag(IFElementEditor.Flag.Detail) && !this._elementPreview;
    };

    /** @override */
GRectangleEditor.prototype.toString = function () {
          return "[Object GRectangleEditor]";
        }

module.exports = GRectangleEditor;
