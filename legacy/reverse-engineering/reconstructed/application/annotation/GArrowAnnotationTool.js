/**
 * GArrowAnnotationTool
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GArrowAnnotationTool() {
        n.call(this, !0, !0);
      }

GObject.inheritAndMix(GArrowAnnotationTool, n, [a]);

// Prototype methods
GArrowAnnotationTool.prototype._getRelatedItemClass = function () {
          return r;
        }

GArrowAnnotationTool.prototype.getCursor = function () {
          return s.CrossArrow;
        }

GArrowAnnotationTool.prototype._showMousePositionInlineHint = function () {
          return false;
        }

GArrowAnnotationTool.prototype.toString = function () {
          return "[Object GArrowAnnotationTool]";
        }

module.exports = GArrowAnnotationTool;
