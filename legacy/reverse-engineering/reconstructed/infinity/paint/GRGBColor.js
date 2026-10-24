/**
 * GRGBColor
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GRGBColor() {
  // Constructor (reconstructed)
}

// Prototype methods
GRGBColor.prototype.toHumanString = function () {
          return (
            "rgb " +
            this._value[0] +
            "," +
            this._value[1] +
            "," +
            this._value[2]
          );
        }

GRGBColor.prototype.toScreen = function (e) {
          return this._value;
        }

GRGBColor.prototype.clone = function () {
          return new a(this._value);
        }

GRGBColor.prototype.toString = function () {
          return "[Object GRGBColor]";
        }


module.exports = GRGBColor;
