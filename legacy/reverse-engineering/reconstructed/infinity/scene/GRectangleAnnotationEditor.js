/**
 * GRectangleAnnotationEditor
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GRectangleAnnotationEditor(e, t) {
        o.call(this, e),
          (this._uid = t),
          (this._flags =
            this._flags & ~(A.Flag.RotateCorners | A.Flag.RotateHandle));
      }

GObject.inheritAndMix(GRectangleAnnotationEditor, o, [l]);

// Prototype methods
GRectangleAnnotationEditor.prototype._getGuideExclusions = function () {
          return [h];
        }

GRectangleAnnotationEditor.prototype.toString = function () {
          return "[Object GEllipseAnnotationEditor]";
        }

GRectangleAnnotationEditor.prototype._showEditor = function (e) {
          return (
            (!e ||
              e.configuration.isElementAnnotationsVisible(this._element)) &&
            o.prototype._showEditor.call(this, e)
          );
        }

GRectangleAnnotationEditor.prototype.initialSetup = function (e) {
          o.prototype.initialSetup.call(this, e), this._annotationSetup();
        }

GRectangleAnnotationEditor.prototype.canHandleDblClick = function () {
          return true;
        }

GRectangleAnnotationEditor.prototype.handleDblClick = function () {
          return true;
        }

GRectangleAnnotationEditor.prototype.isRemovalBlocked = function () {
          return (
            0 != (this._element.getProperty("plkt") & r.ProgramLck.NoDelete) ||
            o.prototype.isRemovalBlocked.call(this)
          );
        }

GRectangleAnnotationEditor.prototype._getGuideExclusions = function () {
          return [h];
        }

GRectangleAnnotationEditor.prototype.toString = function () {
          return "[Object GRectangleAnnotationEditor]";
        }

module.exports = GRectangleAnnotationEditor;
