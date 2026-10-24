/**
 * GPDFObject
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GPDFObject() {}

// Prototype methods
GPDFObject.prototype.write = function (e) {}

GPDFObject.prototype.isEmpty = function () {
          return false;
        }

GPDFObject.prototype.equals = function (e) {
          return this === e;
        }

GPDFObject.prototype.toString = function () {
          return "[Object GPDFObject]";
        }


module.exports = GPDFObject;
