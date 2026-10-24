/**
     * A base editor for shapes
     * @param {IFBlock} block the block this editor works on
     * @class GBlockEditor
     * @extends IFElementEditor
     * @constructor
     */

function GBlockEditor() {
  // Constructor (reconstructed)
}

// Prototype methods
GBlockEditor.prototype.getBoxTransform = function () {
          var e = this._usePaintElement
              ? this.getPaintElement()
              : this._element,
            t = e.getSourceBBox();
          return e.hasMixin(l.Transform) && t && !t.isEmpty()
            ? e.getTransform()
            : null;
        }

GBlockEditor.prototype.transformBox = function (e, t) {
          var i = this._element.getSourceBBox();
          if (i && !i.isEmpty()) {
            this.createElementPreview(),
              t && (this._storedMoveData = t.storedMoveData);
            var n = this.getPaintElement();
            this._setPreTransform(e),
              n.assignPreTransformFrom(e, this._element),
              this.requestInvalidation();
          } else this.edTransform(e, null, null, t);
        }

/** @override */
    IFBlockEditor.prototype.applyPartMove = function (partId, partData) {
        if (partId === IFBlockEditor.RESIZE_HANDLE_PART_ID) {
            this.applyTransform(this._element);
        }
        IFElementEditor.prototype.applyPartMove.call(this, partId, partData);
    };

    /** @override */
GBlockEditor.prototype.paint = function (transform, context) {
          var i = this._usePaintElement;
          (this._usePaintElement = true),
            a.prototype.paint.call(this, e, t),
            (this._usePaintElement = i);
        }

GBlockEditor.prototype._setPreTransform = function (e) {
          d.equals(this._preTransform, e) ||
            (this.hasFlag(c.Flag.Outline)
              ? this.requestInvalidation()
              : this.setOutlineTmpFlag(),
            (this._preTransform = e),
            this.requestInvalidation());
        }

GBlockEditor.prototype.resetTransform = function () {
          (this._preTransform = null), o.prototype.resetTransform.call(this);
        }

GBlockEditor.prototype._applyPartMove = function (e, t, i, n) {
          (e !== a.RESIZE_HANDLE_PART_ID && e !== a.ROTATION_HANDLE_PART_ID) ||
            (this.canApplyTransform()
              ? (this._prepareApplyTransform(this._element),
                this._applyTransform(
                  this._element,
                  e === a.ROTATION_HANDLE_PART_ID,
                  n,
                  i
                ))
              : this.resetTransform()),
            o.prototype._applyPartMove.call(this, e, t, i, n);
        }

GBlockEditor.prototype._showEditor = function () {
          return (
            a.prototype._showEditor.call(this) ||
            this.hasFlag(c.Flag.Highlighted)
          );
        }

GBlockEditor.prototype._showOutline = function () {
          return true;
        }

GBlockEditor.prototype._paintOutline = function (e, t, i, n, h) {
          var u = this.getPaintElement(),
            d = null,
            g = o.getEditor(this._element.getScene()),
            f = !!g && g.isTransformBoxActive();
          if (
            !u.hasMixin(A) ||
            i ||
            (!f && this._element.hasFlag(l.Flag.Hidden))
          )
            a.prototype._paintOutline.call(this, e, t, !0, n, h);
          else {
            var m = new r(u, e);
            (d = new s(m)) &&
              (t.canvas.putVertices(d, !1),
              t.canvas.strokeVertices(
                n ||
                  (this.hasFlag(c.Flag.Highlighted)
                    ? t.highlightOutlineColor
                    : t.selectionOutlineColor),
                p.outlineWidth
              ));
          }
        }

/** @override */
GBlockEditor.prototype.toString = function () {
          return "[Object GBlockEditor]";
        }

module.exports = GBlockEditor;
