/**
 * GAnchorLink
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GAnchorLink(e, t) {
        t ? this.setAnchor(t) : (this._uid = e);
      }

// Prototype methods
GAnchorLink.prototype.getId = function () {
          return this._uid;
        }

GAnchorLink.prototype.setId = function (e) {
          e && this._anchor && !this._uid.isEqual(e) && (this._anchor = null),
            (this._uid = e);
        }

GAnchorLink.prototype.getAnchor = function () {
          return this._anchor;
        }

GAnchorLink.prototype.setAnchor = function (e) {
          (this._uid = e.getId()), (this._anchor = e);
        }

GAnchorLink.prototype.toString = function () {
          return "[Object GAnchorLink]";
        }

module.exports = GAnchorLink;
