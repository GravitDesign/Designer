/**
     * The lasso select tool
     * @class GLassoTool
     * @extends IFMarqueeTool
     * @constructor
     */

function GLassoTool() {
  // Constructor (reconstructed)
}

// Prototype methods
/** @override */
    IFLassoTool._AreaSelector.prototype.move = function (pos) {
        if (this._current == null || Math.abs(pos.getX() - this._current.getX()) >= 3 || Math.abs(pos.getY() - this._current.getY()) >= 3) {
            this._vertexContainer.addVertex(this._vertexContainer.getCount() == 0 ? IFVertex.Command.Move : IFVertex.Command.Line, pos.getX(), pos.getY());
            this._current = pos;
        }
    };

    /** @override */
GLassoTool.prototype.getCursor = function () {
          var e = r.prototype.getCursor.call(this);
          return e === a.SelectInverse ? a.Lasso : e;
        }

/** @override */
    IFLassoTool.prototype.getCursor = function () {
        return IFCursor.Lasso;
    };

    /** override */
GLassoTool.prototype.toString = function () {
          return "[Object GLassoTool]";
        }

module.exports = GLassoTool;
