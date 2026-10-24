/**
 * GEdge
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GEdge() {
  // Constructor (reconstructed)
}

// Prototype methods
GEdge.prototype.getData = function () {
          return this._data;
        }

GEdge.prototype.setSource = function (e) {
          e instanceof n
            ? (this._srcAnchor = e)
            : (e instanceof r || (e.hasMixin && e.hasMixin(r))) &&
              (this._srcAnchor = new n(null, e));
        }

GEdge.prototype.setDestination = function (e) {
          e instanceof n
            ? (this._dstAnchor = e)
            : (e instanceof r || (e.hasMixin && e.hasMixin(r))) &&
              (this._dstAnchor = new n(null, e));
        }

GEdge.prototype.setAnchors = function (e) {
          e &&
            2 === e.length &&
            (this.setSource(e[0]), this.setDestination(e[1]));
        }

GEdge.prototype.setData = function (e) {
          this._data = e;
        }

GEdge.prototype.init = function (e, t, i) {
          this.setSource(e), this.setDestination(t), i && this.setData(i);
        }

GEdge.prototype.toString = function () {
          return "[Object GEdge]";
        }

module.exports = GEdge;
