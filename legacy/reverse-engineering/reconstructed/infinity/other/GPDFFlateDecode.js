/**
 * GPDFFlateDecode
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GPDFFlateDecode(e) {
        n.call(this, "FlateDecode"), e && this.setBuffer(o.deflate(e));
      }

GObject.inherit(GPDFFlateDecode, n);

// Prototype methods
GPDFFlateDecode.prototype.setBuffer = function (e) {
          this._compressed = e;
        }

GPDFFlateDecode.prototype.getBuffer = function () {
          return this._compressed;
        }

GPDFFlateDecode.prototype.write = function (e) {
          e.writeBuffer(this._compressed);
        }

GPDFFlateDecode.prototype.length = function () {
          return this._compressed.length;
        }

GPDFFlateDecode.prototype.toString = function () {
          return "[Object GPDFFlateDecode]";
        }

module.exports = GPDFFlateDecode;
