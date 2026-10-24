/**
 * GPDFInnerShadowEffect
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GPDFInnerShadowEffect() {
  // Constructor (reconstructed)
}

// Prototype methods
GPDFInnerShadowEffect.prototype._applyOpacityMask = function (e, t, i, n) {
          return (
            t.add(i),
            t.add(
              new f({
                transform: e.getTransform(),
                doc: e.getDocument(),
                color: "rgba(0,0,0,1)",
                colorSpace: y.GRAY,
              })
            ),
            t.add(n ? _.f$ : _.f),
            t
          );
        }

GPDFInnerShadowEffect.prototype._applyGaps = function (e, t, i) {
          var n = new p.Stroke();
          (n.lineWidth = 1),
            (n.strokeStyle = new m({
              transform: e.getTransform(),
              doc: e.getDocument(),
              color: "rgba(0,0,0,1)",
              colorSpace: y.GRAY,
            })),
            t.add(i),
            t.add(n);
        }

GPDFInnerShadowEffect.prototype._applyTransparency = function (e, t, i, r, o) {
          t.add(new u(new n(1, 0, 0, 1, o.$x, -o.$y))),
            t.add(i),
            t.add(
              new f({
                transform: e.getTransform(),
                doc: e.getDocument(),
                color: "rgba(0,0,0,0)",
                colorSpace: y.GRAY,
              })
            ),
            t.add(r ? _.f$ : _.f);
        }

GPDFInnerShadowEffect.prototype.toString = function () {
          return "[Object GPDFInnerShadowEffect]";
        }

module.exports = GPDFInnerShadowEffect;
