/**
 * GPDFInvokeResource
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GPDFInvokeResource(e) {
        this._resource = e;
      }

GObject.inherit(GPDFInvokeResource, r);

// Prototype methods
GPDFInvokeResource.prototype.write = function (e) {
          e.write("/" + this._resource.getName() + " " + o.Do);
        }

GPDFInvokeResource.prototype.toString = function () {
          return "[Object GPDFInvokeResource]";
        }

module.exports = GPDFInvokeResource;
