/**
     * An editor for a slice
     * @param {IFSlice} slice the slice this editor works on
     * @class GSliceEditor
     * @extends IFBlockEditor
     * @constructor
     */

function GSliceEditor(e) {
        s.call(this, e),
          (this._flags &= ~(a.Flag.RotateCorners | a.Flag.RotateHandle));
      }

GObject.inherit(GSliceEditor, GItemEditor);

// Prototype methods
GSliceEditor.prototype.createElementPreview = function () {
          if (!this._elementPreview) {
            var e = this._element.getSourceBBox();
            this._setElementPreview(
              new r(e.getX(), e.getY(), e.getWidth(), e.getHeight())
            );
          }
        }

GSliceEditor.prototype.canApplyTransform = function () {
          return (
            (this._elementPreview &&
              this._elementPreview.getTransform().invertible()) ||
            (a.prototype.canApplyTransform.call(this) &&
              !this.getElement().hasFlag(l.Flag.PartialLocked))
          );
        }

GSliceEditor.prototype._applyTransform = function (e, t, i, n) {
          var r = null;
          if (
            (this._elementPreview
              ? (r = this._elementPreview.getTransform())
              : ((r = this._transform), this.resetTransform()),
            r && !r.getRotationFactor())
          ) {
            var o = r.getMatrix(),
              a = (this._element.getProperty("x") || 0) + o[4],
              s = (this._element.getProperty("y") || 0) + o[5],
              l = (this._element.getProperty("w") || 0) * o[0],
              h = (this._element.getProperty("h") || 0) * o[1];
            if (1 != r.getScaleFactor()) {
              if (this._elementPreview) {
                var A = this._elementPreview.getGeometryBBox();
                A &&
                  ((a = A.getX()),
                  (s = A.getY()),
                  (l = A.getWidth()),
                  (h = A.getHeight()));
              }
              this._element.setProperties(["w", "h"], [l, h]);
            }
            this._element.setProperties(["x", "y"], [a, s]);
          }
        }

/** @override */
    IFSliceEditor.prototype._prePaint = function (transform, context) {
        if (this.hasFlag(IFElementEditor.Flag.Selected) || this.hasFlag(IFElementEditor.Flag.Highlighted)) {
            this._paintBBoxOutline(transform, context);
        }
        IFBlockEditor.prototype._prePaint.call(this, transform, context);
    };

    /** @override */
GSliceEditor.prototype.toString = function () {
          return "[Object GSliceEditor]";
        }

module.exports = GSliceEditor;
