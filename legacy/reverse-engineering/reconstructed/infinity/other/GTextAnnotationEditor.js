/**
 * GTextAnnotationEditor
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GTextAnnotationEditor(e, t) {
        (this._uid = t), o.call(this, e);
      }

GObject.inheritAndMix(GTextAnnotationEditor, o, [l]);

// Prototype methods
GTextAnnotationEditor.prototype._showEditor = function (e) {
          return (
            (!e ||
              e.configuration.isElementAnnotationsVisible(this._element)) &&
            o.prototype._showEditor.call(this, e)
          );
        }

GTextAnnotationEditor.prototype.initialSetup = function (e) {
          o.prototype.initialSetup.call(this, e), this._annotationSetup();
        }

GTextAnnotationEditor.prototype.canHandleDblClick = function () {
          return true;
        }

GTextAnnotationEditor.prototype.handleDblClick = function () {
          return true;
        }

GTextAnnotationEditor.prototype.isRemovalBlocked = function () {
          return (
            0 != (this._element.getProperty("plkt") & r.ProgramLck.NoDelete) ||
            o.prototype.isRemovalBlocked.call(this)
          );
        }

GTextAnnotationEditor.prototype._getGuideExclusions = function () {
          return [h];
        }

GTextAnnotationEditor.prototype.toString = function () {
          return "[Object GTextAnnotationEditor]";
        }

module.exports = GTextAnnotationEditor;
