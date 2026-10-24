/**
 * GCollaborationEvent
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GCollaborationEvent(e, t) {
      (this.type = e), (this.data = t);
    }

GObject.inherit(GCollaborationEvent, GEvent);

// Prototype methods
GCollaborationEvent.prototype.toString = function () {
        return "[Object GCollaborationEvent]";
      }


module.exports = GCollaborationEvent;
