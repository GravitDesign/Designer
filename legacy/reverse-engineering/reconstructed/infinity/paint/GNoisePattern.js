/**
 * GNoisePattern
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GNoisePattern() {
  // Constructor (reconstructed)
}

// Prototype methods
GNoisePattern.prototype.clone = function () {
          var e = this.serialize(),
            t = new c();
          return t.deserialize(e), t;
        }

GNoisePattern.prototype._serializeToBlob = function () {
          var e = a.prototype._serializeToBlob.call(this);
          return (e.amount = this.getAmount()), (e.type = this.getType()), e;
        }

GNoisePattern.prototype._deserializeFromBlob = function (e, t) {
          a.prototype._deserializeFromBlob.call(this, e, t),
            this.setAmount(e.amount),
            this.setType(e.type || c.Type.Original);
        }

GNoisePattern.prototype._getRotatedTransform = function () {
          return null;
        }

GNoisePattern.prototype.isWebGL = function () {
          return true;
        }

GNoisePattern.prototype.toString = function () {
          return "[Object GNoisePattern]";
        }

module.exports = GNoisePattern;
