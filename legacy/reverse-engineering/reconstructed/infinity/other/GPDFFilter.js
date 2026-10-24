/**
 * GPDFFilter
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GPDFFilter(e) {
        this.name = e;
      }

// Prototype methods
GPDFFilter.prototype.write = function (e) {
        throw "Not implemented";
      }

GPDFFilter.prototype.length = function () {
          throw "Not implemented";
        }

GPDFFilter.prototype.getBuffer = function () {
          throw "Not implemented";
        }

GPDFFilter.prototype.toString = function () {
          return "[Object GPDFFilter]";
        }

module.exports = GPDFFilter;
