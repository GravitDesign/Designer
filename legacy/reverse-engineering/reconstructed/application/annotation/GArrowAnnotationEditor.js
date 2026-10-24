/**
 * GArrowAnnotationEditor
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GArrowAnnotationEditor(e, t) {
        r.call(this, e), (this._uid = t);
      }

GObject.inheritAndMix(GArrowAnnotationEditor, r, [s]);

// Prototype methods
GArrowAnnotationEditor.prototype._showEditor = function (e) {
          return (
            (!e ||
              e.configuration.isElementAnnotationsVisible(this._element)) &&
            r.prototype._showEditor.call(this, e)
          );
        }

GArrowAnnotationEditor.prototype.initialSetup = function (e) {
          r.prototype.initialSetup.call(this, e), this._annotationSetup();
        }

GArrowAnnotationEditor.prototype.canHandleDblClick = function () {
          return true;
        }

GArrowAnnotationEditor.prototype.handleDblClick = function () {
          return true;
        }

GArrowAnnotationEditor.prototype.isRemovalBlocked = function () {
          return (
            0 != (this._element.getProperty("plkt") & l.ProgramLck.NoDelete) ||
            r.prototype.isRemovalBlocked.call(this)
          );
        }

GArrowAnnotationEditor.prototype._getGuideExclusions = function () {
          return [h];
        }

GArrowAnnotationEditor.prototype.toString = function () {
          return "[Object GArrowAnnotationEditor]";
        }

module.exports = GArrowAnnotationEditor;
