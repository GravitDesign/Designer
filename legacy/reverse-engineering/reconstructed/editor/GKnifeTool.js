/**
 * GKnifeTool
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GKnifeTool() {
  // Constructor (reconstructed)
}

// Prototype methods
GKnifeTool.prototype._isPathClosed = function (e) {
          return !!e.getProperty("closed") && e.hasStyleFill();
        }

GKnifeTool.prototype.elementHitTest = function (e, t) {
          var i = new F();
          if (
            g.hitTest(e.getX(), e.getY(), t, 2, !1, i) &&
            ((elemHitRes = new I(this, i)),
            i.outline && 0 != i.slope && 1 != i.slope)
          ) {
            var n = g.getSegmentPoint(t, i.segment, 0.5);
            if (n)
              2 *
                G.ptDist(
                  locationInvTransformed.getX(),
                  locationInvTransformed.getY(),
                  n.getX(),
                  n.getY()
                ) <=
                2 && ((i.slope = 0.5), (i.x = n.getX()), (i.y = n.getY()));
          }
          return i;
        }

GKnifeTool.prototype.getTransformedVertices = function (e) {
          var t = new b();
          return e.getAnchorPoints()._generateVertices(t, e.$trf, !1), t;
        }

GKnifeTool.prototype.convertToPath = function (e) {
          var t = null,
            i = [],
            n = false;
          if (e instanceof c || e instanceof d) {
            var r = [];
            if (e instanceof d)
              for (
                var o = (p = e.getPaths()).getFirstChild();
                null !== o;
                o = o.getNext()
              )
                r.push(o);
            else r = [e];
            for (var a = false, s = 0; s < r.length && !a; s++)
              for (var h = r[s].getAnchorPoints().getFirstChild(); h; ) {
                if (
                  B.isCornerType(h.getProperty("tp")) &&
                  (0 !== h.getProperty("cl") || 0 !== h.getProperty("cr"))
                ) {
                  a = true;
                  break;
                }
                h = h.getNext();
              }
            n = !a;
          }
          if (n) i.push(e.getParent() ? e.clone() : e);
          else if (e instanceof y) i = e.getTextShapes() || [];
          else if (e.hasMixin(l)) {
            if ((t = A.createPathFromVertexSource(e))) {
              var p = e.$trf;
              (e.$trf = null),
                t.assignFrom(e),
                e instanceof B &&
                  ((t.$evenodd = e.getProperty("evenodd")),
                  (t.$closed = e.getProperty("closed"))),
                (e.$trf = p),
                i.push(t);
            }
          }
          var u = [];
          for (s = 0; s < i.length; s++) {
            var g = [];
            if ((t = i[s]) instanceof d) {
              var f = t.getPaths();
              for (o = f.getFirstChild(); null !== o; o = o.getNext())
                g.push(o);
              f.clearChildren();
            } else g.push(t);
            u.push(g);
          }
          return u;
        }

GKnifeTool.prototype._selectFilter = function (e) {
          return (
            !e.hasFlag(C.Flag.FullLocked) &&
            !(
              e instanceof r &&
              (e.getProperty("plkt") & r.ProgramLck.NoSelect ||
                e.getProperty("plkt") & r.ProgramLck.NoEdit ||
                e.getProperty("plkt") & r.ProgramLck.NoDelete ||
                (e.getParent() &&
                  e.getParent().getProperty("plkt") & r.ProgramLck.NoEdit))
            )
          );
        }

GKnifeTool.prototype._getSelectableElement = function (e) {
          return !(e instanceof h) || e instanceof E || e instanceof D
            ? null
            : e;
        }

GKnifeTool.prototype._getSelectableElements = function (e) {
          for (var t = [], i = 0; i < e.length; ++i) {
            var n = this._getSelectableElement(e[i]);
            n && t.indexOf(n) < 0 && t.push(n);
          }
          return t;
        }

GKnifeTool.prototype.toString = function () {
          return "[Object GKnifeTool]";
        }

module.exports = GKnifeTool;
