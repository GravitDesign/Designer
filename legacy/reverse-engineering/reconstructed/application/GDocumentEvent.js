/**
 * GDocumentEvent
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GDocumentEvent(e, t, n) {
      (this.type = e), (this.document = t), n && (this.data = n);
    }

// Prototype methods
GDocumentEvent.prototype.toString = function () {
        return "[Object GDocumentEvent]";
      }


module.exports = GDocumentEvent;
