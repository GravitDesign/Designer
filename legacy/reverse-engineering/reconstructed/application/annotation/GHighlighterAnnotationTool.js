/**
 * GHighlighterAnnotationTool
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GHighlighterAnnotationTool() {
        n.call(this, !0, !0);
      }

GObject.inheritAndMix(GHighlighterAnnotationTool, n, [s]);

// Prototype methods
GHighlighterAnnotationTool.prototype._getRelatedItemClass = function () {
          return r;
        }

GHighlighterAnnotationTool.prototype._createAndAppendPath = function () {
          var e = new (this._getRelatedItemClass())();
          return (
            this._editor.insertElements([e], !1, !0, !0),
            e.getScene() ? ((this._pathEditor = a.openEditor(e)), e) : null
          );
        }

GHighlighterAnnotationTool.prototype._mouseRelease = function (e) {
          n.prototype._mouseRelease.call(this, e),
            this._manager.notifyJobDone(this);
        }

GHighlighterAnnotationTool.prototype._escAction = function () {}

GHighlighterAnnotationTool.prototype._enterAction = function () {}

GHighlighterAnnotationTool.prototype.getCursor = function () {
          return l.CrossHighlight;
        }

GHighlighterAnnotationTool.prototype.toString = function () {
          return "[Object GHighlighterAnnotationTool]";
        }

module.exports = GHighlighterAnnotationTool;
