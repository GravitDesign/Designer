/**
 * GShapeEditor
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GShapeEditor() {
  // Constructor (reconstructed)
}

// Prototype methods
GShapeEditor.prototype.getDefaultStyle = function () {
          var e = this.getElement(),
            t = o.getTypeId(e),
            i = e.getScene()
              ? e
                  .getScene()
                  .getStyles()
                  .querySingle('style[_sdf="' + t + '"]')
              : null;
          return (
            i ||
              (i = e.getScene()
                ? e
                    .getScene()
                    .getStyles()
                    .querySingle('style[_sdf="' + o.getTypeId(s) + '"]')
                : null),
            i
          );
        }

/** @override */
    IFShapeEditor.prototype.initialSetup = function () {
        // Add a default style with a default fill
        var style = new IFInlineStyle();
        style.appendChild(new IFStrokePaint());
        this.getElement().getStyleSet().appendChild(style);
    };

    /**
     * Called to check whether a center cross should be painted or not
     * @return {Boolean} true if a center cross should be painted, false if not (default)
     * @private
     */
GShapeEditor.prototype._hasCenterCross = function () {
          return false;
        }

/** @override */
GShapeEditor.prototype._postPaint = function (transform, context) {
          if (
            this.hasFlag(d.Flag.Selected) &&
            this.hasFlag(d.Flag.Detail) &&
            this._hasCenterCross() &&
            g.centerCrossSize > 0
          ) {
            var i = this.getPaintElement(),
              n = i.getTransform(),
              r = n || new u(1, 0, 0, 1, 0, 0);
            r = e ? r.multiplied(e) : r;
            var o = i.getCenter(!1);
            if (o) {
              o = r.mapPoint(o);
              var a = 2 * g.centerCrossSize,
                s = r.getMatrix();
              if (
                Math.abs(s[0]) * i.getOrigHalfWidth() > a &&
                Math.abs(s[3]) * i.getOrigHalfHeight() > a
              ) {
                var l = Math.floor(o.getX()) + 0.5,
                  h = Math.floor(o.getY()) + 0.5;
                g.outlineWidth % 2 != 0 && ((l += 0.5), (h += 0.5));
                var A = g.centerCrossSize / 2;
                t.canvas.strokeLine(
                  l - A,
                  h - A,
                  l + A,
                  h + A,
                  g.outlineWidth,
                  t.selectionOutlineColor
                ),
                  t.canvas.strokeLine(
                    l + A,
                    h - A,
                    l - A,
                    h + A,
                    g.outlineWidth,
                    t.selectionOutlineColor
                  );
              }
            }
          }
          p.prototype._postPaint.call(this, e, t);
        }

GShapeEditor.prototype._getTransformFromPreview = function () {
          var e = null;
          if (this._elementPreview) {
            var t = this._element.getTransform(),
              i = this._elementPreview.getTransform();
            (e = t && !t.isIdentity() ? t.inverted() : null),
              i && !i.isIdentity() && (e = e ? e.multiplied(i) : i);
          }
          return e;
        }

/** @override */
GShapeEditor.prototype.toString = function () {
          return "[Object GShapeEditor]";
        }

module.exports = GShapeEditor;
