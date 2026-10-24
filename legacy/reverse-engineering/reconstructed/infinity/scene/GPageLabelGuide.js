/**
 * GPageLabelGuide
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GPageLabelGuide() {
  // Constructor (reconstructed)
}

// Prototype methods
GPageLabelGuide.prototype.getId = function () {
          return p.ID;
        }

GPageLabelGuide.prototype._gatherLabels = function (e, t) {
          var i = null;
          if (t.configuration.pageLabelsVisible) {
            var n = t.canvas,
              a = t.dirtyMatcher.getDirtyRectangles(),
              p = [],
              u = this._scene.getActivePage().isScaleLabel()
                ? e.getScaleFactor()
                : 1,
              d = this._scene.getLabelBBox(u).getHeight();
            i = [];
            var g = e
              .inverted()
              .mapRect(new s(0, 0, n.getWidth(), n.getHeight()));
            (g = g.expanded(0, d, 0, d)),
              (p = this._scene.retrieveChildrenInPaintBBox(
                g,
                c.RETRIEVE_MODE_INTERSECT
              ));
            var f = this;
            p = p.filter(function (i) {
              return f._pageFilter(i, t, e);
            });
            for (var m = 0; m < a.length; ++m)
              for (var y = a[m], _ = p.length - 1; _ >= 0; _--) {
                var v = p[_],
                  b = null;
                if (t.configuration.multiPageView || v.hasFlag(l.Flag.Active)) {
                  b = v.getGeometryBBox();
                  var C = v.getPosition(t.configuration.multiPageView);
                  if (b) {
                    (0 === C.getX() && 0 === C.getY()) ||
                      (b = b.translated(C.getX(), C.getY()));
                    var w = new s(b.getX(), b.getY() - d, b.getWidth(), d);
                    if (y.containsRect(w) || w.intersectsRect(y)) {
                      var E = e.mapRect(b),
                        B = v.$name || h.get(new A("GPage", "name")),
                        x = this._scene.$lbc || t.labelColor;
                      v.hasFlag(l.Flag.Selected)
                        ? (x = t.selectionShapeOutlineColor)
                        : v.hasFlag(l.Flag.Highlighted) &&
                          (x = t.highlightOutlineColor),
                        i.push(
                          new r.LabelItem(
                            new o(E.getX(), E.getY()),
                            E.getWidth(),
                            B,
                            x,
                            v.isScaleLabel()
                          )
                        ),
                        p.splice(_, 1);
                    }
                  }
                }
              }
          }
          return i;
        }

GPageLabelGuide.prototype.toString = function () {
          return "[Object GPageLabelGuide]";
        }

module.exports = GPageLabelGuide;
