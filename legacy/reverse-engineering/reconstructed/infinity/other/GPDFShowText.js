/**
 * GPDFShowText
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GPDFShowText(e) {
        this._array = e;
      }

GObject.inherit(GPDFShowText, o);

// Prototype methods
GPDFShowText.prototype.write = function (e) {
          this._array.write(e), e.writeln(o.TJ);
        }

GPDFShowText.prototype.toString = function () {
          return "[Object GPDFShowText]";
        }


module.exports = GPDFShowText;
