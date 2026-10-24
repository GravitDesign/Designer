/**
 * GCommentAnnotationTool
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GCommentAnnotationTool() {
        r.call(this, !0, !0);
      }

GObject.inheritAndMix(GCommentAnnotationTool, r, [s]);

// Prototype methods
GCommentAnnotationTool.prototype._getRelatedItemClass = function () {
          return o;
        }

GCommentAnnotationTool.prototype._updateShape = function (e, t, i) {
          if (t) {
            var r = new n(
                t.getWidth() / 2,
                0,
                0,
                t.getHeight() / 2,
                t.getX() + t.getWidth() / 2,
                t.getY() + t.getHeight() / 2
              ),
              o = (e.getProperty("trf") || new n()).inverted() || new n();
            return e.transform(o.multiplied(r)), !0;
          }
          return false;
        }

GCommentAnnotationTool.prototype._createShape = function () {
          return null;
        }

GCommentAnnotationTool.prototype._mouseDragStart = function (e) {}

GCommentAnnotationTool.prototype._mouseDrag = function (e) {}

GCommentAnnotationTool.prototype._mouseDragEnd = function (e) {}

GCommentAnnotationTool.prototype._createShapeManually = function (e) {
          var t = new o();
          t.initDefaultForLimitedRestore(),
            t.initSizeAndPosition(),
            t.transform(new n(1, 0, 0, 1, e.getX(), e.getY())),
            this._insertShape(t);
        }

GCommentAnnotationTool.prototype._showMousePositionInlineHint = function () {
          return false;
        }

GCommentAnnotationTool.prototype._showAreaInlineHint = function () {
          return true;
        }

GCommentAnnotationTool.prototype.getCursor = function () {
          return l.Comment;
        }

GCommentAnnotationTool.prototype.toString = function () {
          return "[Object GCommentAnnotationTool]";
        }

module.exports = GCommentAnnotationTool;
