/**
 * GSimplifyAction
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GSimplifyAction() {
  // Constructor (reconstructed)
}

// Prototype methods
GSimplifyAction.prototype._makeSimplified = function (e, t) {
        var n = e > 0 ? e : -e;
        return new o.GVertexSimplifier(t).simplify(n / 2, !1, !0);
      }

GSimplifyAction.prototype.toString = function () {
        return "[Object GSimplifyAction]";
      }

module.exports = GSimplifyAction;
