/**
 * GCMYKColor
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GCMYKColor(e) {
        n.call(this, e || [1, 1, 1, 1]);
      }

// Prototype methods
GCMYKColor.prototype.toHumanString = function () {
          return (
            "cmyk " +
            (100 * this._value[0]).toFixed() +
            "%," +
            (100 * this._value[1]).toFixed() +
            "%," +
            (100 * this._value[2]).toFixed() +
            "%," +
            (100 * this._value[3]).toFixed() +
            "%"
          );
        }

GCMYKColor.prototype.toScreen = function (e) {
          return n.cmykToRGB(this._value, e);
        }

GCMYKColor.prototype.clone = function () {
          return new o(this._value);
        }

GCMYKColor.prototype.toString = function () {
          return "[Object GCMYKColor]";
        }


module.exports = GCMYKColor;
