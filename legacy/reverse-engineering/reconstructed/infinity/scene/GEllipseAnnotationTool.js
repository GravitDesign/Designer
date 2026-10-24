/**
 * GEllipseAnnotationTool
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GEllipseAnnotationTool() {
        n.call(this, !0, !0);
      }

GObject.inheritAndMix(GEllipseAnnotationTool, n, [a]);

// Prototype methods
GEllipseAnnotationTool.prototype._getRelatedItemClass = function () {
          return r;
        }

GEllipseAnnotationTool.prototype.getCursor = function () {
          return s.CrossEllipse;
        }

GEllipseAnnotationTool.prototype._showMousePositionInlineHint = function () {
          return false;
        }

GEllipseAnnotationTool.prototype.toString = function () {
          return "[Object GEllipseAnnotationTool]";
        }

module.exports = GEllipseAnnotationTool;
