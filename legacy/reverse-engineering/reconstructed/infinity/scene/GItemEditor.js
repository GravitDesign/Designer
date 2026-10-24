/**
 * GItemEditor
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GItemEditor() {
  // Constructor (reconstructed)
}

// Prototype methods
GItemEditor.prototype._getCatchPartInfoAt = function (e, t, i) {
          var n = this.getPaintElement(),
            r = n.getTransform(),
            o = n.getCenter(!1);
          return (
            (o = r ? r.mapPoint(o || new u(0, 0)) : o),
            c
              .getAnnotationBBox(t, o, s.annotationHandles.catch.size, !1)
              .expanded(
                s.annotPickDistance,
                s.annotPickDistance,
                s.annotPickDistance,
                s.annotPickDistance
              )
              .containsPoint(e)
              ? new A.PartInfo(
                  this,
                  d.CATCH_HANDLE_PART_ID,
                  {
                    point: o,
                  },
                  !1,
                  !1
                )
              : null
          );
        }

GItemEditor.prototype._postPaint = function (e, t) {
          if (
            this.hasFlag(A.Flag.Selected) &&
            this._catchHandleAllowed() &&
            this.getPaintElement().findParent(function (e) {
              return e instanceof a;
            })
          ) {
            var i = this.getPaintElement(),
              n = i.getTransform(),
              r = n || new h(1, 0, 0, 1, 0, 0);
            r = e ? r.multiplied(e) : r;
            var o = i.getCenter(!1),
              l = o ? r.mapPoint(o) : null;
            if (l) {
              var u = s.annotationHandles.catch;
              c.paintAnnotation(
                t,
                null,
                l,
                u.type,
                !0,
                u.size,
                p.WHITE,
                t.selectionOutlineColor
              );
            }
          }
        }

GItemEditor.prototype._catchHandleAllowed = function () {
          return true;
        }

GItemEditor.prototype.toString = function () {
          return "[Object GItemEditor]";
        }

module.exports = GItemEditor;
