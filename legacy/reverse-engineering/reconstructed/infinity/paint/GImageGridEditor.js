/**
 * GImageGridEditor
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GImageGridEditor(e) {
        a.call(this, e);
      }

GObject.inherit(GImageGridEditor, a);

// Prototype methods
GImageGridEditor.prototype._paintOutline = function (e, t, i, n, r) {
          var a,
            s = this.getPaintElement(),
            c = new o(s, e);
          (a = new l(c)) &&
            (t.canvas.putVertices(a, !1),
            t.canvas.strokeVertices(
              n ||
                (this.hasFlag(h.Flag.Highlighted)
                  ? t.highlightOutlineColor
                  : t.selectionOutlineColor),
              A.outlineWidth
            ));
        }

GImageGridEditor.prototype.getBox = function () {
          return this.getPaintElement().getGeometryBBox();
        }

GImageGridEditor.prototype.getBoxTransform = function () {
          return null;
        }

GImageGridEditor.prototype.resetTransform = function () {
          for (var e = this._editors ? this._editors.length : 0; e > 0; --e) {
            var t = this._editors[e - 1];
            t && t instanceof s && t.resetTransform();
          }
          a.prototype.resetTransform.call(this);
        }

GImageGridEditor.prototype.toString = function () {
          return "[Object GImageGridEditor]";
        }

module.exports = GImageGridEditor;
