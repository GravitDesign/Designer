/**
 * Webpack Module #1616
 * Type: class
 * Name: GVectorizeImageAction
 */

function (e, t, n) {
    "use strict";
    n(19), n(328), n(3), n(26);
    var o = n(1),
      i = n(40),
      a = n(18),
      r = n(106);
    function s() {}
    o.GObject.inherit(s, r),
      (s.ID = "modify.bmp2path"),
      (s.TITLE = new o.GLocaleKey("GVectorizeImageAction", "title")),
      (s.prototype.getId = function () {
        return s.ID;
      }),
      (s.prototype.getTitle = function () {
        return s.TITLE;
      }),
      (s.prototype.getCategory = function () {
        return a.CATEGORY_MODIFY_PATH;
      }),
      (s.prototype.getGroup = function () {
        return "structure/modify";
      }),
      (s.prototype.isEnabled = function () {
        if (!r.prototype.isEnabled.call(this)) return !1;
        var e = gDesigner.getActiveDocument()
          ? gDesigner.getActiveDocument().getEditor().getSelection()
          : null;
        if (e)
          for (var t = 0; t < e.length; ++t)
            if (e[t] instanceof o.GImage && !e[t].getStatus()) return !0;
        return !1;
      }),
      (s.prototype.execute = function () {
        var e = gDesigner.getActiveDocument(),
          t = e ? e.getEditor() : null,
          n = t ? t.getIndividualSelection() : null,
          a = [];
        if (n)
          for (var r = 0; r < n.length; ++r)
            n[r] instanceof o.GImage && !n[r].getStatus() && a.push(n[r]);
        if (a.length) {
          t.beginTransaction();
          try {
            var s,
              l = [];
            s = new Set();
            for (r = 0; r < a.length; ++r) {
              var c = a[r].getParent();
              c && s.add(c);
            }
            try {
              (0, i.blockChanges)(t, s);
              for (r = 0; r < a.length; ++r) {
                var d = a[r],
                  u = d.getParent(),
                  p = d.getNext(),
                  g = this._vectorize(d);
                g && (u.insertChild(g, p), l.push(g)), u.removeChild(d);
              }
            } finally {
              (0, i.releaseChanges)(t, s), l.length && t.updateSelection(!1, l);
            }
          } finally {
            t.commitTransaction(o.GLocale.get(this.getTitle()));
          }
        }
      }),
      (s.prototype._vectorize = function (e) {
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
      }),
      (s.prototype.toString = function () {
        return "[Object GVectorizeImageAction]";
      }),
      (e.exports = s);
  }