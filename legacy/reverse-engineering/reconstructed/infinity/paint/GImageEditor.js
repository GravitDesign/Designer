/**
     * A base editor for an image
     * @param {IFImage} image the image this editor works on
     * @class GImageEditor
     * @extends IFShapeEditor
     * @constructor
     */

function GImageEditor() {
  // Constructor (reconstructed)
}

// Prototype methods
GImageEditor.prototype._iterateCropHandles = function (e, t) {
          var i = this.getBox();
          if (i && !i.isEmpty()) {
            p = (p = this.getBoxTransform()) || new m();
            var n = {
                tl: (p = e ? p.multiplied(e) : p).mapPoint(
                  i.getSide(g.Side.TOP_LEFT)
                ),
                tc: p.mapPoint(i.getSide(g.Side.TOP_CENTER)),
                tr: p.mapPoint(i.getSide(g.Side.TOP_RIGHT)),
                rc: p.mapPoint(i.getSide(g.Side.RIGHT_CENTER)),
                br: p.mapPoint(i.getSide(g.Side.BOTTOM_RIGHT)),
                bc: p.mapPoint(i.getSide(g.Side.BOTTOM_CENTER)),
                bl: p.mapPoint(i.getSide(g.Side.BOTTOM_LEFT)),
                lc: p.mapPoint(i.getSide(g.Side.LEFT_CENTER)),
                c: p.mapPoint(i.getSide(g.Side.CENTER)),
              },
              r = E.getVectorProjection(
                n.bl.getX(),
                n.bl.getY(),
                n.br.getX(),
                n.br.getY(),
                n.tl.getX(),
                n.tl.getY()
              ),
              o = E.ptDist(n.tl.getX(), n.tl.getY(), r.getX(), r.getY());
            r = E.getVectorProjection(
              n.tr.getX(),
              n.tr.getY(),
              n.br.getX(),
              n.br.getY(),
              n.tl.getX(),
              n.tl.getY()
            );
            var a = E.ptDist(n.tl.getX(), n.tl.getY(), r.getX(), r.getY()),
              s = E.ptDist(n.tl.getX(), n.tl.getY(), n.bl.getX(), n.bl.getY()),
              l = E.ptDist(n.tl.getX(), n.tl.getY(), n.tr.getX(), n.tr.getY()),
              h = T.Annots.AngleLength + T.Annots.Width / 1.5 + T.Annots.Width,
              A = 2 * T.Annots.AngleLength + 2;
            if (o >= h && a >= h && s >= A && l >= A) {
              var c,
                p,
                u = [];
              this.hasFlag(b.Flag.ResizeEdges) &&
                ((c = new f()),
                this._constructAngleAnnot(n.bl, n.tl, n.tr, s, l, c) &&
                  (u.push({
                    vertices: c,
                    point: n.tl,
                    side: g.Side.TOP_LEFT,
                  }),
                  (p = new m()
                    .translated(-n.tl.getX(), -n.tl.getY())
                    .rotated(Math.PI)
                    .translated(n.br.getX(), n.br.getY())),
                  u.push({
                    vertices: new _(c, p),
                    point: n.br,
                    side: g.Side.BOTTOM_RIGHT,
                  })),
                (c = new f()),
                this._constructAngleAnnot(n.tl, n.tr, n.br, l, s, c) &&
                  (u.push({
                    vertices: c,
                    point: n.tr,
                    side: g.Side.TOP_RIGHT,
                  }),
                  (p = new m()
                    .translated(-n.tr.getX(), -n.tr.getY())
                    .rotated(Math.PI)
                    .translated(n.bl.getX(), n.bl.getY())),
                  u.push({
                    vertices: new _(c, p),
                    point: n.bl,
                    side: g.Side.BOTTOM_LEFT,
                  }))),
                this.hasFlag(b.Flag.ResizeCenters) &&
                  (l > A + T.Annots.MiddleLength + 2 &&
                    o / 2 > 2 * T.Annots.Width + 2 &&
                    a / 2 > T.Annots.MiddleLength / 2 + T.Annots.Width + 2 &&
                    ((c = new f()),
                    this._constructMiddleAnnot(n.tl, n.tc, n.tr, l, c) &&
                      (u.push({
                        vertices: c,
                        point: n.tc,
                        side: g.Side.TOP_CENTER,
                      }),
                      (p = new m()
                        .translated(-n.tc.getX(), -n.tc.getY())
                        .rotated(Math.PI)
                        .translated(n.bc.getX(), n.bc.getY())),
                      u.push({
                        vertices: new _(c, p),
                        point: n.bc,
                        side: g.Side.BOTTOM_CENTER,
                      }))),
                  s > A + T.Annots.MiddleLength + 2 &&
                    a / 2 > 2 * T.Annots.Width + 2 &&
                    o / 2 > T.Annots.MiddleLength / 2 + T.Annots.Width + 2 &&
                    ((c = new f()),
                    this._constructMiddleAnnot(n.tr, n.rc, n.br, s, c) &&
                      (u.push({
                        vertices: c,
                        point: n.rc,
                        side: g.Side.RIGHT_CENTER,
                      }),
                      (p = new m()
                        .translated(-n.rc.getX(), -n.rc.getY())
                        .rotated(Math.PI)
                        .translated(n.lc.getX(), n.lc.getY())),
                      u.push({
                        vertices: new _(c, p),
                        point: n.lc,
                        side: g.Side.LEFT_CENTER,
                      }))));
              for (
                var d = E.getRotationSegment(n.c, n.tc),
                  y = E.getRotationSegment(n.c, n.rc),
                  v =
                    (y >= 3 ? y : d - y >= 4 ? y + 8 : y) >
                    (d >= 3 ? d : y - d >= 4 ? d + 8 : d),
                  C = 0;
                C < u.length;
                ++C
              ) {
                var w = u[C],
                  B = this._getResizeSegment(w.side, d, y, v);
                if (!0 === t(w.vertices, w.point, w.side, B)) break;
              }
            }
          }
        }

GImageEditor.prototype._constructAngleAnnot = function (e, t, i, n, o, a) {
          var s = false;
          if (n > 0 && o > 0) {
            var l = E.getPointAtLength(
                t.getX(),
                t.getY(),
                e.getX(),
                e.getY(),
                T.Annots.AngleLength
              ),
              h = E.getPointAtLength(
                t.getX(),
                t.getY(),
                i.getX(),
                i.getY(),
                T.Annots.AngleLength
              ),
              A = t.getX() - e.getX(),
              c = t.getY() - e.getY(),
              p = new r((-c / n) * T.Annots.Width, (A / n) * T.Annots.Width),
              u = l.add(p),
              d = t.add(p),
              g = t.getX() - i.getX(),
              f = t.getY() - i.getY(),
              m = new r((f / o) * T.Annots.Width, (-g / o) * T.Annots.Width),
              y = h.add(m),
              _ = t.add(m),
              v = E.getIntersectionPoint(
                u.getX(),
                u.getY(),
                d.getX(),
                d.getY(),
                y.getX(),
                y.getY(),
                _.getX(),
                _.getY()
              );
            v
              ? (a.addVertex(C.Command.Move, l.getX(), l.getY()),
                a.addVertex(C.Command.Line, t.getX(), t.getY()),
                a.addVertex(C.Command.Line, h.getX(), h.getY()),
                a.addVertex(C.Command.Line, y.getX(), y.getY()),
                a.addVertex(C.Command.Line, v.getX(), v.getY()),
                a.addVertex(C.Command.Line, u.getX(), u.getY()),
                a.addVertex(C.Command.Close),
                (s = true))
              : (v = E.getIntersectionPoint(
                  l.getX(),
                  l.getY(),
                  u.getX(),
                  u.getY(),
                  h.getX(),
                  h.getY(),
                  y.getX(),
                  y.getY()
                ))
              ? (a.addVertex(C.Command.Move, l.getX(), l.getY()),
                a.addVertex(C.Command.Line, t.getX(), t.getY()),
                a.addVertex(C.Command.Line, h.getX(), h.getY()),
                a.addVertex(C.Command.Line, v.getX(), v.getY()),
                a.addVertex(C.Command.Close),
                (s = true))
              : (a.addVertex(C.Command.Move, l.getX(), l.getY()),
                a.addVertex(C.Command.Line, t.getX(), t.getY()),
                a.addVertex(C.Command.Line, h.getX(), h.getY()),
                a.addVertex(C.Command.Close),
                (s = true));
          }
          return s;
        }

GImageEditor.prototype._constructMiddleAnnot = function (e, t, i, n, o) {
          var a = false;
          if (n > 0) {
            var s = i.getX() - e.getX(),
              l = i.getY() - e.getY(),
              h = new r((-l / n) * T.Annots.Width, (s / n) * T.Annots.Width),
              A = E.getPointAtLength(
                t.getX(),
                t.getY(),
                e.getX(),
                e.getY(),
                T.Annots.MiddleLength / 2
              ),
              c = A.add(h),
              p = E.getPointAtLength(
                t.getX(),
                t.getY(),
                i.getX(),
                i.getY(),
                T.Annots.MiddleLength / 2
              ),
              u = p.add(h);
            o.addVertex(C.Command.Move, A.getX(), A.getY()),
              o.addVertex(C.Command.Line, p.getX(), p.getY()),
              o.addVertex(C.Command.Line, u.getX(), u.getY()),
              o.addVertex(C.Command.Line, c.getX(), c.getY()),
              o.addVertex(C.Command.Close),
              (a = true);
          }
          return a;
        }

GImageEditor.prototype._showResizeHandlesInDetailMode = function () {
          return true;
        }

/** @override */
    IFImageEditor.prototype.initialSetup = function () {
        // Add an empty style to images by default
        this.getElement().getStyleSet().appendChild(new IFInlineStyle());
    };

    /** @override */
GImageEditor.prototype.toString = function () {
          return "[Object GImageEditor]";
        }

module.exports = GImageEditor;
