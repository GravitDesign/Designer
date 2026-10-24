/**
 * GBBoxGuide
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GBBoxGuide() {
  // Constructor (reconstructed)
}

// Prototype methods
GBBoxGuide.prototype._setEffectiveScope = function (e) {
          if (((this._eSnapElems = []), e.hasMixin(p.Container)))
            for (var t = e.getFirstChild(); null != t; t = t.getNext())
              t instanceof u && this._eSnapElems.push(t);
        }

GBBoxGuide.prototype._getEffectiveSnapElems = function () {
          return this._eSnapElems ? this._eSnapElems : this._snapElems;
        }

GBBoxGuide.prototype._getAllChildrenInBBox = function (e, t) {
          var i = [];
          if (!e.hasMixin(p.Container)) return [];
          if (e.hasMixin(l.Accelerated))
            i =
              e.retrieveChildrenInGeometryBBox(t, f.RETRIEVE_MODE_INTERSECT) ||
              [];
          else
            for (var n = e.getFirstChild(); n; n = n.getNext())
              if (n instanceof l) {
                var r = n.getGeometryBBox();
                r && r.intersectsRect(t) && i.push(n);
              }
          for (var o = [], a = 0; a < i.length; a++)
            o = o.concat(this._getAllChildrenInBBox(i[a], t));
          return i.concat(o);
        }

GBBoxGuide.prototype._applySnappingToPivots = function (e, t, i, n) {
          var r = i.getGeometryBBox();
          if (r) {
            for (var o = [], h = 0; h < e.length; h++) {
              var A = e[h].getX(),
                c = e[h].getY(),
                p = new a(A - t, r.getY() - t, 2 * t, r.getHeight() + 2 * t),
                u = new a(r.getX() - t, c - t, r.getWidth() + 2 * t, 2 * t);
              o = (o = o.concat(
                this._getAllChildrenInBBox(i, p).filter(function (e) {
                  return o.indexOf(e) < 0;
                })
              )).concat(
                this._getAllChildrenInBBox(i, u).filter(function (e) {
                  return o.indexOf(e) < 0;
                })
              );
            }
            for (h = 0; h < o.length; h++) {
              var g = o[h];
              if (
                (g instanceof s || g instanceof d) &&
                !g.hasFlag(l.Flag.Hidden)
              ) {
                var f = null,
                  m = this._getEffectiveSnapElems();
                if (m || g.getParent() instanceof s) {
                  if (m)
                    for (var y = 0; y < m.length && !f; ++y)
                      g == m[y] && (f = g);
                } else f = g;
                f && n(f);
              }
            }
          }
        }

GBBoxGuide.prototype.toString = function () {
          return "[Object GBBoxGuide]";
        }

module.exports = GBBoxGuide;
