/**
 * GSettingChangedEvent
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GSettingChangedEvent(e, t, n, o) {
      (this.key = e),
        (this.previousValue = t),
        (this.newValue = n),
        (this.restoring = o);
    }

// Prototype methods
GSettingChangedEvent.prototype.toString = function () {
        return "[Object GSettingChangedEvent]";
      }

module.exports = GSettingChangedEvent;
