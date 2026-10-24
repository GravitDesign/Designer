/**
 * GPDFRawBuffer
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GPDFRawBuffer(e) {
        this._buffer = e;
      }

// Prototype methods
GPDFRawBuffer.prototype.write = function (e) {
          e.writeBuffer(this._buffer);
        }

GPDFRawBuffer.prototype.length = function () {
          return this._buffer.byteLength;
        }

GPDFRawBuffer.prototype.getBuffer = function () {
          return this._buffer;
        }

GPDFRawBuffer.prototype.toString = function () {
          return "[Object GPDFRawBuffer]";
        }

module.exports = GPDFRawBuffer;
