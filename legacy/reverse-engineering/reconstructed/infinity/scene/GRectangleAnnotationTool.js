/**
 * GRectangleAnnotationTool
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GRectangleAnnotationTool() {
        n.call(this, !0, !0);
      }

GObject.inheritAndMix(GRectangleAnnotationTool, n, [a]);

// Prototype methods
GRectangleAnnotationTool.prototype._getRelatedItemClass = function () {
          return r;
        }

GRectangleAnnotationTool.prototype.getCursor = function () {
          return s.CrossRectangle;
        }

GRectangleAnnotationTool.prototype._showMousePositionInlineHint = function () {
          return false;
        }

GRectangleAnnotationTool.prototype.toString = function () {
          return "[Object GRectangleAnnotationTool]";
        }

module.exports = GRectangleAnnotationTool;
