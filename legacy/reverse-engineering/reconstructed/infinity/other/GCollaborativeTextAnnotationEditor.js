/**
 * GCollaborativeTextAnnotationEditor
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GCollaborativeTextAnnotationEditor(e, t) {
        r.call(this, e),
          (this._uid = t),
          (this._flags =
            this._flags &
            ~(
              l.Flag.RotateCorners |
              l.Flag.RotateHandle |
              l.Flag.ResizeAll |
              l.Flag.ResizeCenters |
              l.Flag.ResizeEdges
            ));
      }

GObject.inheritAndMix(GCollaborativeTextAnnotationEditor, r, [s]);

// Prototype methods
GCollaborativeTextAnnotationEditor.prototype.finishInlineEdit = function () {
          var e = null;
          return (
            this._textEditor &&
              (e = o.prototype.finishInlineEdit.call(this._textEditor)),
            e
          );
        }

GCollaborativeTextAnnotationEditor.prototype.setEditMode = function () {}

GCollaborativeTextAnnotationEditor.prototype.toString = function () {
          return "[Object GCollabTextEditor]";
        }

GCollaborativeTextAnnotationEditor.prototype._showEditor = function (e) {
          return false;
        }

GCollaborativeTextAnnotationEditor.prototype.toString = function () {
          return "[Object GCollaborativeTextAnnotationEditor]";
        }

module.exports = GCollaborativeTextAnnotationEditor;
