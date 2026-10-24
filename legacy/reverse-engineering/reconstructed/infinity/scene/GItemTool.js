/**
 * GItemTool
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GItemTool() {}

GObject.inherit(GItemTool, GTool);

// Prototype methods
GItemTool.prototype.getDefaultStyle = function () {
          var e = this._scene
            ? this._scene
                .getStyles()
                .querySingle(
                  'style[_sdf="' +
                    n.getTypeId(this._getRelatedItemClass()) +
                    '"]'
                )
            : null;
          return e || null;
        }

GItemTool.prototype._getRelatedItemClass = function () {
          throw new Error("GItemTool.getRelatedItemClass: virtual method");
        }

GItemTool.prototype.toString = function () {
          return "[Object GItemTool]";
        }

module.exports = GItemTool;
