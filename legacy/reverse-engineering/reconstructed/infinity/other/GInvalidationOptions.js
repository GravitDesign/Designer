/**
 * GInvalidationOptions
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GInvalidationOptions() {
      let e =
        arguments.length > 0 && undefined !== arguments[0] ? arguments[0] : {};
      Object.assign(this, { fileCache: !0, collaboratorsCache: !0 }, e);
    }

// Prototype methods
GInvalidationOptions.prototype.toString = function () {
        return "[Object GInvalidationOptions]";
      }


module.exports = GInvalidationOptions;
