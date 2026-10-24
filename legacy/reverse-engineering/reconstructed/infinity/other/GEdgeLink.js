/**
 * GEdgeLink
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GEdgeLink(e, t) {
        t ? this.setEdge(t) : (this._uid = e);
      }

// Prototype methods
GEdgeLink.prototype.getId = function () {
          return this._uid;
        }

GEdgeLink.prototype.setId = function (e) {
          e && this._edge && !this._uid.isEqual(e) && (this._edge = null);
(this._uid = e);
        }

GEdgeLink.prototype.getEdge = function () {
          return this._edge;
        }

GEdgeLink.prototype.setEdge = function (e) {
          (this._uid = e.getId()), (this._edge = e);
        }

GEdgeLink.prototype.toString = function () {
          return "[Object GEdgeLink]";
        }


module.exports = GEdgeLink;
