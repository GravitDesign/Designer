/**
     * An editor for a page
     * @param {IFShapeSet} group the group this editor works on
     * @class GPageEditor
     * @extends IFBlockEditor
     * @constructor
     */

function GPageEditor() {
  // Constructor (reconstructed)
}

// Prototype methods
GPageEditor.prototype.edTransform = function (e, t, i, n) {
          (this._collisionlessTransform || n.doCollisionlessTransform) &&
            (e = this.getElement().doCollisionlessTransform(e)),
            o.prototype.edTransform.call(this, e, t, i, n);
        }

GPageEditor.prototype.resetTransform = function () {
          for (var e = this._editors ? this._editors.length : 0; e > 0; --e) {
            this._editors[e - 1].resetTransform();
          }
          o.prototype.resetTransform.call(this);
        }

GPageEditor.prototype.paint = function (e, t) {
          if (!t.configuration.multiPageView) {
            var i = this.getElement().getScene();
            if (i.getActivePage() && i.getActivePage() !== this.getElement())
              return;
          }
          o.prototype.paint.call(this, e, t);
        }

GPageEditor.prototype._paintResizeBoxOutline = function (e, t, i, n, r) {
          o.prototype._paintResizeBoxOutline.call(
            this,
            e,
            t,
            i,
            n,
            p.pageOutlineWidth
          );
        }

/** @override */
    IFPageEditor.prototype._prePaint = function (transform, context) {
        if (this.hasFlag(IFElementEditor.Flag.Selected) || this.hasFlag(IFElementEditor.Flag.Highlighted)) {
            this._paintBBoxOutline(transform, context);
        }
        IFBlockEditor.prototype._prePaint.call(this, transform, context);
    };

    /** @override */
GPageEditor.prototype.toString = function () {
          return "[Object GPageEditor]";
        }

GPageEditor.prototype._showEditor = function (e) {
          return !!p.pageSelectable && o.prototype._showEditor.call(this, e);
        }

module.exports = GPageEditor;
