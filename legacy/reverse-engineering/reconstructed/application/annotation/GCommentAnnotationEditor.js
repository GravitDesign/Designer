/**
 * GCommentAnnotationEditor
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GCommentAnnotationEditor() {
  // Constructor (reconstructed)
}

// Prototype methods
GCommentAnnotationEditor.prototype.movePart = function (e, t, i, n, r, o, s) {
          return a.prototype.movePart.call(this, e, t, i, n, r, !0, s);
        }

GCommentAnnotationEditor.prototype.initialSetup = function (e) {
          a.prototype.initialSetup.call(this, e), this._annotationSetup();
        }

GCommentAnnotationEditor.prototype.canHandleDblClick = function () {
          return true;
        }

GCommentAnnotationEditor.prototype.handleDblClick = function () {
          return true;
        }

GCommentAnnotationEditor.prototype.isRemovalBlocked = function () {
          return (
            0 != (this._element.getProperty("plkt") & r.ProgramLck.NoDelete) ||
            a.prototype.isRemovalBlocked.call(this)
          );
        }

GCommentAnnotationEditor.prototype._showAnnotations = function () {
          return false;
        }

GCommentAnnotationEditor.prototype.getCustomBBox = function (e, t) {
          var i = e;
          t &&
            this._transform &&
            (i = i ? this._transform.multiplied(i) : this._transform);
          var n = new g().scaled(0.5, 0.5),
            r = this.getPaintElement();
          return n.multiplied(r.getTransform()).multiplied(i).mapRect(v);
        }

GCommentAnnotationEditor.prototype._paintOutline = function (e, t, i, n, r) {
          var a = this.getPaintElement();
          s.getEditor(this._element.getScene());
          if (!i && !this._element.hasFlag(o.Flag.Hidden)) {
            var h = new g().scaled(0.5, 0.5),
              A = new p(y, h.multiplied(a.getTransform()).multiplied(e)),
              c = new p(_, h.multiplied(a.getTransform()).multiplied(e)),
              d = new u(A),
              f = new u(c);
            d &&
              f &&
              (t.canvas.putVertices(d, !1),
              t.canvas.fillVertices("#fff", 1, 0, !0),
              t.canvas.putVertices(f, !1),
              t.canvas.fillVertices(
                n ||
                  (this.hasFlag(l.Flag.Highlighted)
                    ? t.highlightOutlineColor
                    : t.selectionOutlineColor),
                1,
                0,
                !0
              ));
          }
        }

GCommentAnnotationEditor.prototype._getGuideExclusions = function () {
          return [f];
        }

GCommentAnnotationEditor.prototype.toString = function () {
          return "[Object GCommentAnnotationEditor]";
        }

module.exports = GCommentAnnotationEditor;
