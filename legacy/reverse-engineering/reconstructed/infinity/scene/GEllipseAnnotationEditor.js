/**
 * GEllipseAnnotationEditor
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GEllipseAnnotationEditor(e, t) {
        o.call(this, e),
          (this._uid = t),
          (this._flags =
            this._flags & ~(A.Flag.RotateCorners | A.Flag.RotateHandle));
      }

GObject.inheritAndMix(GEllipseAnnotationEditor, o, [l]);

// Prototype methods
GEllipseAnnotationEditor.prototype._showEditor = function (e) {
          return (
            (!e ||
              e.configuration.isElementAnnotationsVisible(this._element)) &&
            o.prototype._showEditor.call(this, e)
          );
        }

GEllipseAnnotationEditor.prototype.initialSetup = function (e) {
          o.prototype.initialSetup.call(this, e), this._annotationSetup();
        }

GEllipseAnnotationEditor.prototype.canHandleDblClick = function () {
          return true;
        }

GEllipseAnnotationEditor.prototype.handleDblClick = function () {
          return true;
        }

GEllipseAnnotationEditor.prototype.isRemovalBlocked = function () {
          return (
            0 != (this._element.getProperty("plkt") & r.ProgramLck.NoDelete) ||
            o.prototype.isRemovalBlocked.call(this)
          );
        }

GEllipseAnnotationEditor.prototype._getGuideExclusions = function () {
          return [h];
        }

GEllipseAnnotationEditor.prototype.toString = function () {
          return "[Object GEllipseAnnotationEditor]";
        }

module.exports = GEllipseAnnotationEditor;
