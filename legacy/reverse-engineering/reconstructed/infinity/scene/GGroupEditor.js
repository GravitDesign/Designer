/**
 * GGroupEditor
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GGroupEditor() {
  // Constructor (reconstructed)
}

// Prototype methods
GGroupEditor.prototype._scaleBorder = function (e, t) {
          if (e instanceof h)
            for (var i = this._editors ? this._editors.length : 0; i > 0; --i) {
              var n = this._editors[i - 1];
              n._scaleBorder(n.getElement(), t);
            }
        }

GGroupEditor.prototype.toString = function () {
          return "[Object GGroupEditor]";
        }

module.exports = GGroupEditor;
