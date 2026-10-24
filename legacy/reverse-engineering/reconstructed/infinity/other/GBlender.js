/**
 * GBlender
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GBlender(e) {
        (this._htmlElement = this._createHTMLElement()),
          null != e && e.appendChild(this._htmlElement);
      }

GObject.inheritAndMix(GBlender, r, [n]);

// Prototype methods
GBlender.prototype._renderWithBlend = function (e, t, i) {
          var n = this._paintCanvas,
            r = n.getTransform(!0),
            a = n.getOrigin(),
            s = n.getScale();
          n.setTransform(null), n.setOrigin(new l(0, 0)), n.setScale(1);
          var c,
            p = o.getGLContext();
          if (
            (t &&
              (c = {
                x: t.getX() - e.getX(),
                y: t.getY() - e.getY(),
                width: t.getWidth(),
                height: t.getHeight(),
              }),
            this.shaderInstance.render(
              {
                source: n._canvasContext.canvas,
                blendMode: this.globalCompositeOperation,
                opacity: 1,
                area: t || e,
                dimensions: c,
              },
              1
            ),
            i)
          ) {
            this.update();
            var u = n._canvasContext.globalCompositeOperation,
              d = n._canvasContext.globalAlpha;
            (n._canvasContext.globalCompositeOperation =
              h.CompositeOperator.Copy),
              (n._canvasContext.globalAlpha = 1),
              n._canvasContext.drawImage(
                p.canvas,
                e ? e.getX() : 0,
                e ? e.getY() : 0
              ),
              (n._canvasContext.globalCompositeOperation = u),
              (n._canvasContext.globalAlpha = d),
              n.setTransform(r),
              n.setOrigin(a),
              n.setScale(s),
              A.DELETE_BLEND_AND_GRADIENT_TEXTURES_AFTER_DRAW && this.destroy();
          }
        }

GBlender.prototype.destroy = function () {
          this._destroy();
        }

GBlender.prototype.toString = function () {
          return "[Object GBlender]";
        }

module.exports = GBlender;
