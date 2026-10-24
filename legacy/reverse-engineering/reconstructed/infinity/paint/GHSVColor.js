/**
 * GHSVColor
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GHSVColor(e) {
        n.call(this),
          (this._value = e && e instanceof Array ? e.slice() : [0, 0, 0]);
      }

// Prototype methods
GHSVColor.prototype.clone = function () {
          return new o(this._value);
        }

GHSVColor.prototype.toScreen = function (e) {
          return r.hsvToRGB(this._value, e);
        }

GHSVColor.prototype.toHumanString = function () {
          return (
            "hsv " +
            this._value[0] +
            "," +
            this._value[1] +
            "," +
            this._value[2]
          );
        }

GHSVColor.prototype.toString = function () {
          return "[Object GHSVColor]";
        }

module.exports = GHSVColor;
