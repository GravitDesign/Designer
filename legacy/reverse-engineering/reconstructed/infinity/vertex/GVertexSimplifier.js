/**
 * GVertexSimplifier
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GVertexSimplifier() {
  // Constructor (reconstructed)
}

// Prototype methods
GVertexSimplifier.prototype.simplify = function (e, t, i) {
          var n = [];
          this.fitter = new o(e);
          for (var r = 0; r < this.polys.length; r++) {
            var a = this._simplifyPoly(this.polys[r], e, t, i);
            a && n.push(a);
          }
          return l.mergeVertexSources(n);
        }

GVertexSimplifier.prototype._getInflections = function (e, t, i, n, r, o, a, s) {
          var l = new Float64Array(3),
            A = new Float64Array(3);
          h.getBezierDerivativeEquationCoeffs(e, t, a, s, i, n, r, o, l, A);
          var c = [];
          h.getCubicCurveSplits(l, A, c);
          return c;
        }

GVertexSimplifier.prototype._pushUnique = function (e, t, i) {
          var n = e.length;
          if (n) {
            var r = e[n - 1];
            (h.isEqualEps(r.getX(), t, 1e-9) &&
              h.isEqualEps(r.getY(), i, 1e-9)) ||
              e.push(new a(t, i));
          } else e.push(new a(t, i));
        }

GVertexSimplifier.prototype._simplifyPoly = function (e, t, i, o) {
          var s,
            l,
            A,
            c,
            p,
            u,
            d,
            g,
            f,
            m = e,
            y = null,
            _ = null,
            v = 0;
          if (m) {
            var b,
              C = true,
              w = null;
            o && (w = new r(!1, !1, !1, 2));
            do {
              for (; m && m.next && (i || undefined !== m.cx1); ) {
                if (
                  (_ ||
                    ((_ = [new a(m.x, m.y)]),
                    (y = m === e ? null : m.prev),
                    m.cx1 && !i && (s = new a(m.cx1 - m.x, m.cy1 - m.y))),
                  undefined !== m.cx2)
                )
                  if (o) {
                    if (
                      ((b = new r.PolyLine()),
                      w._subdivideBezier(
                        b,
                        m.x,
                        m.y,
                        m.cx1,
                        m.cy1,
                        m.cx2,
                        m.cy2,
                        m.next.x,
                        m.next.y
                      ),
                      (b = b.next))
                    ) {
                      for (; b.point; )
                        this._pushUnique(_, b.point.getX(), b.point.getY()),
                          (b = b.next);
                      this._pushUnique(_, m.next.x, m.next.y);
                    }
                  } else {
                    d = this._getInflections(
                      m.x,
                      m.y,
                      m.cx1,
                      m.cy1,
                      m.cx2,
                      m.cy2,
                      m.next.x,
                      m.next.y
                    );
                    for (var E = 1; E < d.length; E++)
                      (g = d[E]),
                        (f = d[E - 1]),
                        (A = h.getCubicCurveAtT(
                          m.x,
                          m.next.x,
                          m.cx1,
                          m.cx2,
                          0.5 * (g + f)
                        )),
                        (c = h.getCubicCurveAtT(
                          m.y,
                          m.next.y,
                          m.cy1,
                          m.cy2,
                          0.5 * (g + f)
                        )),
                        this._pushUnique(_, A, c),
                        (p = h.getCubicCurveAtT(
                          m.x,
                          m.next.x,
                          m.cx1,
                          m.cx2,
                          g
                        )),
                        (u = h.getCubicCurveAtT(
                          m.y,
                          m.next.y,
                          m.cy1,
                          m.cy2,
                          g
                        )),
                        this._pushUnique(_, p, u);
                  }
                else if (undefined !== m.cx1)
                  if (o) {
                    if (
                      ((b = new r.PolyLine()),
                      w._subdivideBezier(
                        b,
                        m.x,
                        m.y,
                        m.cx1,
                        m.cy1,
                        m.next.x,
                        m.next.y
                      ),
                      (b = b.next))
                    ) {
                      for (; b.point; )
                        this._pushUnique(_, b.point.getX(), b.point.getY()),
                          (b = b.next);
                      this._pushUnique(_, m.next.x, m.next.y);
                    }
                  } else {
                    d = this._getInflections(
                      m.x,
                      m.y,
                      m.cx1,
                      m.cy1,
                      m.cx1,
                      m.cy1,
                      m.next.x,
                      m.next.y
                    );
                    for (E = 1; E < d.length; E++)
                      (g = d[E]),
                        (f = d[E - 1]),
                        (A = h.getCurveAtT(
                          m.x,
                          m.next.x,
                          m.cx1,
                          0.5 * (g + f)
                        )),
                        (c = h.getCurveAtT(
                          m.y,
                          m.next.y,
                          m.cy1,
                          0.5 * (g + f)
                        )),
                        this._pushUnique(_, A, c),
                        (p = h.getCurveAtT(m.x, m.next.x, m.cx1, g)),
                        (u = h.getCurveAtT(m.y, m.next.y, m.cy1, g)),
                        this._pushUnique(_, p, u);
                  }
                else i && this._pushUnique(_, m.x, m.y);
                if (
                  (m.next ||
                    i ||
                    (undefined !== m.cx2
                      ? (l = new a(m.prev.cx2 - m.x, m.prev.cy2 - m.y))
                      : undefined !== m.cx1 &&
                        (l = new a(m.prev.cx1 - m.x, m.prev.cy1 - m.y))),
                  v++,
                  (m = m.next) === e)
                )
                  break;
              }
              if (_) {
                var B = null;
                if (
                  (_.length > 1
                    ? (m &&
                        !i &&
                        (undefined !== m.prev.cx2
                          ? (l = new a(m.prev.cx2 - m.x, m.prev.cy2 - m.y))
                          : undefined !== m.prev.cx1 &&
                            (l = new a(m.prev.cx1 - m.x, m.prev.cy1 - m.y))),
                      i ||
                        (s && (s = s.scale(1 / Math.sqrt(s.dot(s)))),
                        l && (l = l.scale(1 / Math.sqrt(l.dot(l))))),
                      (B = this.fitter.fitCurve(
                        _,
                        i ? Math.max(Math.min(v, 666), 200) : v,
                        s,
                        l
                      )))
                    : (B = []),
                  this.force || B)
                ) {
                  var x = null,
                    P = null;
                  for (E = 0; E < B.length; E++)
                    (P = B[E]),
                      ((x = y ? new n.PolyLineExtended() : e).x = P[0].getX()),
                      (x.y = P[0].getY()),
                      (x.cx1 = P[1].getX()),
                      (x.cy1 = P[1].getY()),
                      (x.cx2 = P[2].getX()),
                      (x.cy2 = P[2].getY()),
                      y && ((y.next = x), (x.prev = y)),
                      (y = x);
                  x
                    ? (((x = new n.PolyLineExtended()).x = P[3].getX()),
                      (x.y = P[3].getY()),
                      (y.next = x),
                      (x.prev = y),
                      m && ((x.next = m), (m.prev = x)))
                    : (y || (y = e), (y.next = m), m && (m.prev = y));
                }
                (_ = null), (s = null), (l = null), (v = 0);
              }
              if (!C && m === e) break;
              m && (m = m.next), (C = false);
            } while (m && m !== e);
            return e.getPoints();
          }
        }

GVertexSimplifier.prototype.toString = function () {
          return "[Object GVertexSimplifier]";
        }

module.exports = GVertexSimplifier;
