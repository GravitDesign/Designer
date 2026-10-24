/**
 * GTranslationNotificationEvent
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GTranslationNotificationEvent(e, t) {
        (this._name = n.getName(e)), (this._key = t);
      }

// Prototype methods
GTranslationNotificationEvent.prototype.getClassReference = function () {
        return this._name;
      }

GTranslationNotificationEvent.prototype.getKey = function () {
          return this._key;
        }

GTranslationNotificationEvent.prototype.toString = function () {
          return "[Object GTranslationNotificationEvent]";
        }


module.exports = GTranslationNotificationEvent;
