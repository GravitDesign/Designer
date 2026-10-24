/**
 * GVectorizeImageAction
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GVectorizeImageAction() {
  // Constructor (reconstructed)
}

// Prototype methods
GVectorizeImageAction.prototype._vectorize = function (e) {
        new o.GVertexContainer();
        var t,
          n,
          i = e.getImageCanvas(),
          a = new o.GImageTracer(),
          r = a.getImgdata(i),
          s = r.width,
          l = r.height,
          c = a.imagedataToTracedata(r, {
            ltres: 1,
            qtres: Math.min(s / 4, l / 4, 10),
            numberofcolors: 8,
            blurradius: 2,
            colorquantcycles: 5,
            pathomit: Math.min(0.25 * s, 0.25 * l, 20),
          }),
          d = c.palette,
          u = [];
        for (t in c.layers)
          if (c.layers.hasOwnProperty(t))
            for (n = 0; n < c.layers[t].length; n++)
              u[c.layers[t][n][0].y1 * s + c.layers[t][n][0].x1] = {
                l: "" + t,
                p: "" + n,
              };
        var p,
          g,
          h = Object.keys(u);
        h.sort(function (e, t) {
          return e - t;
        });
        var f,
          m,
          y = new o.GGroup(),
          v = -1;
        for (t = 0; t < h.length; t++)
          if (
            ((p = u[h[t]].l),
            (f = t + 1 < h.length ? u[h[t + 1]].l : -1),
            (g = u[h[t]].p),
            0 !== d[p].a)
          ) {
            var _ = new o.GRGBColor([d[p].r, d[p].g, d[p].b]),
              b = c.layers[p];
            p !== v && (m = new o.GVertexContainer());
            var w = b[g];
            m.addVertex(o.GVertex.Command.Move, w[0].x1, w[0].y1);
            for (var C = 0; C < w.length; C++) {
              var x = w[C];
              "L" === x.type
                ? m.addVertex(o.GVertex.Command.Line, x.x2, x.y2)
                : (m.addVertex(o.GVertex.Command.Curve, x.x3, x.y3),
                  m.addVertex(o.GVertex.Command.Curve, x.x2, x.y2));
            }
            if (p !== f) {
              m = new o.GVertexSimplifier(m).simplify(0.4, !1, !0);
              var S = o.GPathUtil.createPathFromVertexSource(m);
              S &&
                (S.getPaintLayers().appendChild(
                  new o.GStylable.FillPaintLayer(_)
                ),
                S.setProperty("name", _.getClosestCSSName()),
                y.appendChild(S));
            }
            v = p;
          }
        return y;
      }

GVectorizeImageAction.prototype.toString = function () {
        return "[Object GVectorizeImageAction]";
      }

module.exports = GVectorizeImageAction;
