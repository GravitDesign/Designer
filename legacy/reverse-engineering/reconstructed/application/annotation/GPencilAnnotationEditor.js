/**
 * GPencilAnnotationEditor
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GPencilAnnotationEditor(e, t) {
        o.call(this, e), (this._uid = t);
      }

GObject.inheritAndMix(GPencilAnnotationEditor, o, [l]);

// Prototype methods
GPencilAnnotationEditor.prototype._showEditor = function (e) {
          return (
            (!e ||
              e.configuration.isElementAnnotationsVisible(this._element)) &&
            o.prototype._showEditor.call(this, e)
          );
        }

GPencilAnnotationEditor.prototype.initialSetup = function (e) {
          o.prototype.initialSetup.call(this, e), this._annotationSetup();
        }

GPencilAnnotationEditor.prototype._showAnnotations = function () {
          return false;
        }

GPencilAnnotationEditor.prototype.canHandleDblClick = function () {
          return true;
        }

GPencilAnnotationEditor.prototype.handleDblClick = function () {
          return true;
        }

GPencilAnnotationEditor.prototype.isRemovalBlocked = function () {
          return (
            0 != (this._element.getProperty("plkt") & r.ProgramLck.NoDelete) ||
            o.prototype.isRemovalBlocked.call(this)
          );
        }

GPencilAnnotationEditor.prototype._getGuideExclusions = function () {
          return [h];
        }

GPencilAnnotationEditor.prototype.toString = function () {
          return "[Object GPencilAnnotationEditor]";
        }

module.exports = GPencilAnnotationEditor;
