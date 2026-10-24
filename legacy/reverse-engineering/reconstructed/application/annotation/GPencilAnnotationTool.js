/**
 * GPencilAnnotationTool
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GPencilAnnotationTool() {
        n.call(this, !0, !0);
      }

GObject.inheritAndMix(GPencilAnnotationTool, n, [s]);

// Prototype methods
GPencilAnnotationTool.prototype._getRelatedItemClass = function () {
          return r;
        }

GPencilAnnotationTool.prototype._createAndAppendPath = function () {
          var e = new (this._getRelatedItemClass())();
          return (
            this._editor.insertElements([e], !1, !0, !0),
            e.getScene() ? ((this._pathEditor = a.openEditor(e)), e) : null
          );
        }

GPencilAnnotationTool.prototype._mouseRelease = function (e) {
          n.prototype._mouseRelease.call(this, e),
            this._manager.notifyJobDone(this);
        }

GPencilAnnotationTool.prototype._escAction = function () {}

GPencilAnnotationTool.prototype._enterAction = function () {}

GPencilAnnotationTool.prototype.getCursor = function () {
          return l.CrossFreehand;
        }

GPencilAnnotationTool.prototype.toString = function () {
          return "[Object GPencilAnnotationTool]";
        }

module.exports = GPencilAnnotationTool;
