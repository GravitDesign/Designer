/**
 * GHighlighterAnnotationEditor
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GHighlighterAnnotationEditor(e, t) {
        o.call(this, e), (this._uid = t);
      }

GObject.inheritAndMix(GHighlighterAnnotationEditor, o, [l]);

// Prototype methods
GHighlighterAnnotationEditor.prototype._showEditor = function (e) {
          return (
            (!e ||
              e.configuration.isElementAnnotationsVisible(this._element)) &&
            o.prototype._showEditor.call(this, e)
          );
        }

GHighlighterAnnotationEditor.prototype._showAnnotations = function () {
          return false;
        }

GHighlighterAnnotationEditor.prototype.canHandleDblClick = function () {
          return true;
        }

GHighlighterAnnotationEditor.prototype.handleDblClick = function () {
          return true;
        }

GHighlighterAnnotationEditor.prototype.isRemovalBlocked = function () {
          return (
            0 != (this._element.getProperty("plkt") & r.ProgramLck.NoDelete) ||
            o.prototype.isRemovalBlocked.call(this)
          );
        }

GHighlighterAnnotationEditor.prototype.initialSetup = function (e) {
          o.prototype.initialSetup.call(this, e), this._annotationSetup();
        }

GHighlighterAnnotationEditor.prototype._getGuideExclusions = function () {
          return [h];
        }

GHighlighterAnnotationEditor.prototype.toString = function () {
          return "[Object GHighlighterAnnotationEditor]";
        }

module.exports = GHighlighterAnnotationEditor;
