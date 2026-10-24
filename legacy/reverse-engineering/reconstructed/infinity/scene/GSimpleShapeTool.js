/**
 * GSimpleShapeTool
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GSimpleShapeTool() {
  // Constructor (reconstructed)
}

// Prototype methods
GSimpleShapeTool.prototype._createShape = function () {
          var e = null;
          return (
            this._parameterizedVertexProcessor &&
              (e = new h(
                this._parameterizedVertexProcessor,
                this._annotationsParamInitVals,
                this._sShapeInitWidth,
                this._sShapeInitHeight,
                this._sShapeName,
                this._icon
              )),
            e
          );
        }

GSimpleShapeTool.prototype._updateShape = function (e, t, i) {
          if (t) {
            var n = e.getSourceBBox();
            if (n && !n.isEmpty()) {
              var r = a.getNativeRectTransformation(n),
                o = a.getNativeRectTransformation(t);
              return e.setProperty("trf", r.inverted().multiplied(o)), !0;
            }
          }
          return false;
        }

GSimpleShapeTool.prototype.toString = function () {
          return "[Object GSimpleShapeTool]";
        }

module.exports = GSimpleShapeTool;
