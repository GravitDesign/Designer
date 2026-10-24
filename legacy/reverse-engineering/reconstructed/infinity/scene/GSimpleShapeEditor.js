/**
 * GSimpleShapeEditor
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GSimpleShapeEditor() {
  // Constructor (reconstructed)
}

// Prototype methods
GSimpleShapeEditor.prototype._postPaint = function (e, t) {
          (s.prototype._postPaint.call(this, e, t),
          this._showSegmentDetails()) &&
            this.getPaintElement().iterateAnnotations(
              function (i, n) {
                var r =
                    this._partSelection &&
                    this._partSelection.indexOf(u.ANNOTATION_PART_ID) >= 0,
                  o = h.annotationHandles.simpleShape;
                c.paintAnnotation(
                  t,
                  e,
                  i,
                  o.type,
                  r,
                  o.size,
                  p.WHITE,
                  t.annotationColor
                );
              }.bind(this),
              !0
            );
        }

GSimpleShapeEditor.prototype._getPartInfoAt = function (e, t, i) {
          if (this._showSegmentDetails()) {
            var n = null;
            if (
              (this._element.iterateAnnotations(
                function (i, r) {
                  if (
                    c
                      .getAnnotationBBox(
                        t,
                        i,
                        h.annotationHandles.simpleShape.size,
                        !1
                      )
                      .expanded(
                        h.annotPickDistance,
                        h.annotPickDistance,
                        h.annotPickDistance,
                        h.annotPickDistance
                      )
                      .containsPoint(e)
                  )
                    return (
                      (n = new A.PartInfo(
                        this,
                        u.ANNOTATION_PART_ID,
                        {
                          annotationIdx: r,
                        },
                        !0,
                        !1
                      )),
                      !0
                    );
                }.bind(this),
                !0
              ),
              n)
            )
              return n;
          }
          return s.prototype._getPartInfoAt.call(this, e, t, i);
        }

GSimpleShapeEditor.prototype._showSegmentDetails = function () {
          return (
            this._showAnnotations() &&
            this.hasFlag(A.Flag.Detail) &&
            !this._elementPreview
          );
        }

GSimpleShapeEditor.prototype.toString = function () {
          return "[Object GSimpleShapeEditor]";
        }

module.exports = GSimpleShapeEditor;
