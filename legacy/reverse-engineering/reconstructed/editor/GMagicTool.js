/**
 * GMagicTool
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GMagicTool() {
  // Constructor (reconstructed)
}

// Prototype methods
GMagicTool.prototype._doTheMerge = function (e, t) {
          var i = new n(n.PIP_CHECK_ODDEVEN, n.AUTO),
            r = A.mergeVertexSources(e),
            o = A.mergeVertexSources(t);
          return i.initializeSources(r, o) ? i.clipOp(n.OR) : e.concat(t);
        }

GMagicTool.prototype._doTheSub = function (e, t) {
          var i = new n(n.PIP_CHECK_ODDEVEN, n.AUTO),
            r = A.mergeVertexSources(e),
            o = A.mergeVertexSources(t);
          return i.initializeSources(r, o) ? i.clipOp(n.SUB) : e;
        }

GMagicTool.prototype.toString = function () {
          return "[Object GMagicTool]";
        }

module.exports = GMagicTool;
