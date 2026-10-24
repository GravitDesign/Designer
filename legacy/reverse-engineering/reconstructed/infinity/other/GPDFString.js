/**
 * GPDFString
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GPDFString(e) {
        this._value = e;
      }

GObject.inherit(GPDFString, r);

// Prototype methods
GPDFString.prototype.write = function (e) {
          e.write("("), this._value.write(e), e.write(")");
        }

GPDFString.prototype.toString = function () {
          return "[Object GPDFString]";
        }


module.exports = GPDFString;
