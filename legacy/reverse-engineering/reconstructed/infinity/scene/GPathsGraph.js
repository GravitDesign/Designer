/**
 * GPathsGraph
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GPathsGraph() {
  // Constructor (reconstructed)
}

// Prototype methods
GPathsGraph.prototype._requireMiterLimitApproximation = function () {
          return true;
        }

GPathsGraph.prototype._calculateMarkersBorderBBox = function (e, t) {
          for (var i = this._edges.getFirstChild(); i; i = i.getNext()) {
            var n = i.getMarkersBorderBBox(this.$trf, t);
            n && (e = e.united(n));
          }
          return e;
        }

GPathsGraph.prototype._calculatePaintBBox = function (e, t) {
          var i = this.getGeometryBBox(t);
          if (!i) return null;
          var n = this.getEffects(),
            r = i,
            o = new g(i.getX(), i.getY(), i.getWidth(), i.getHeight());
          if (this.hasStyleFill()) {
            var a = n.getEffectsBBox(i, c.StyleLayer.Fill, o);
            r = r.united(a);
          }
          var s = null;
          if (this.hasStyleBorder()) {
            var l = i;
            b.each(
              this.getPaintLayers().getBorderLayers(!0),
              function (e, t) {
                for (
                  var i = this.getStyleBorderPadding(t),
                    o = this._edges.getFirstChild();
                  o;
                  o = o.getNext()
                )
                  if (o.getProperty("cSt", !1, null, !0)) {
                    var a = o.getStyleBorderPadding(t);
                    a > i && (i = a);
                  }
                i && (l = l.expanded(i, i, i, i)),
                  (l = this._calculateMarkersBorderBBox(l, t));
                var h = n.getEffectsBBox(l, c.StyleLayer.Border, l);
                (r = r.united(h)), (s = s ? s.united(l) : l);
              }.bind(this)
            );
          }
          return (r = n.getEffectsBBox(r, null, s || o));
        }

GPathsGraph.prototype._geometryChange = function (e) {
          e.temporary || this._notifyChange(n._Change.FinishGeometryUpdate);
        }

GPathsGraph.prototype._beforeGeometryChange = function (e) {
          this._notifyChange(n._Change.PrepareGeometryUpdate);
        }

GPathsGraph.prototype.toString = function () {
          return "[Object GPathsGraph]";
        }

module.exports = GPathsGraph;
