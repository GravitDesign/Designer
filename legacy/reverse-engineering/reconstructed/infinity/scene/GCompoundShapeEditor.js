/**
 * GCompoundShapeEditor
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GCompoundShapeEditor(e) {
        s.call(this, e);
      }

GObject.inherit(GCompoundShapeEditor, GShapeEditor);

// Prototype methods
GCompoundShapeEditor.prototype.setBooleanOp = function (e, t) {
          var i = n.getEditor(this.getElement().getScene());
          if (!i) return false;
          if (!this._editors || !this._editors.length) return false;
          for (var r = false, o = 0; o < this._editors.length; ++o) {
            (a = this._editors[o]) instanceof s && (r = true);
          }
          if (!r) return false;
          i.beginTransaction();
          try {
            for (o = 0; o < this._editors.length; ++o) {
              var a;
              (a = this._editors[o]) instanceof s &&
                a.getElement().setProperty("bool", e);
            }
          } finally {
            i.commitTransaction(
              u.get(new d("GCompoundShapeEditor", "action.drop-pattern"))
            );
          }
          return true;
        }

GCompoundShapeEditor.prototype._paintOutline = function (e, t, i, n, r) {
          var o,
            s = this.getPaintElement(),
            l = new a(s, e);
          (o = new h(l)) &&
            (t.canvas.putVertices(o, !1),
            t.canvas.strokeVertices(
              n ||
                (this.hasFlag(c.Flag.Highlighted)
                  ? t.highlightOutlineColor
                  : t.selectionOutlineColor),
              p.outlineWidth
            ));
        }

GCompoundShapeEditor.prototype.getBox = function () {
          return this.getPaintElement().getGeometryBBox();
        }

GCompoundShapeEditor.prototype.getBoxTransform = function () {
          return null;
        }

GCompoundShapeEditor.prototype.edTransform = function (e, t, i, n) {
          for (
            var r = this.getElement().getFirstChild();
            null != r;
            r = r.getNext()
          )
            if (r instanceof A) {
              var o = l.openEditor(r);
              o && o.edTransform(e, null, null, n);
            }
          s.prototype.edTransform.call(this, e, t, i, n);
        }

GCompoundShapeEditor.prototype.resetTransform = function () {
          for (var e = this._editors ? this._editors.length : 0; e > 0; --e) {
            var t = this._editors[e - 1];
            t && t instanceof l && t.resetTransform();
          }
          s.prototype.resetTransform.call(this);
        }

GCompoundShapeEditor.prototype.toString = function () {
          return "[Object GCompoundShapeEditor]";
        }

module.exports = GCompoundShapeEditor;
