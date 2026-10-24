/**
 * GModifiers
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GModifiers() {}

// Prototype methods
GModifiers.prototype.getId = function () {
          return this._uid;
        }

GModifiers.prototype.setId = function (e) {
          e && this._anchor && !this._uid.isEqual(e) && (this._anchor = null),
            (this._uid = e);
        }

GModifiers.prototype.getAnchor = function () {
          return this._anchor;
        }

GModifiers.prototype.setAnchor = function (e) {
          (this._uid = e.getId()), (this._anchor = e);
        }

GModifiers.prototype.toString = function () {
          return "[Object GAnchorLink]";
        }

GModifiers.prototype.toString = function () {
          return "[Object GModifiers]";
        }

module.exports = GModifiers;
