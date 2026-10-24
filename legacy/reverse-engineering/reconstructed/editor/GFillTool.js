/**
 * GFillTool
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GFillTool() {
  // Constructor (reconstructed)
}

// Prototype methods
GFillTool.prototype.getSelectionFillOpacity = function () {
          var e = this._editor.getIndividualSelection();
          if (e && e.length)
            for (var t = 0; t < e.length; ++t)
              if (e[t] instanceof A) {
                var i = e[t].getPaintLayers().getFillLayers()[0];
                return i ? i.$_op : null;
              }
          return 1;
        }

GFillTool.prototype.getFillPattern = function () {
          return this._fpt;
        }

GFillTool.prototype.getFillOpacity = function () {
          return this._fop;
        }

GFillTool.prototype.setFill = function (e, t) {
          (this._fpt = e), (this._fop = t);
        }

GFillTool.prototype.toString = function () {
          return "[Object GFillTool]";
        }

module.exports = GFillTool;
