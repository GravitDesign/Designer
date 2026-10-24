/**
 * GStyleEdManager
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GStyleEdManager() {
        c.call(this);
      }

GObject.inherit(GStyleEdManager, c);

// Prototype methods
GStyleEdManager.prototype.handleEditorPartUpdate = function (e) {
          this.hasEventListeners(v.EditorEvent) &&
            (this.blockEditorUpdate(),
            this.trigger(
              new v.EditorEvent(
                v.EditorEventType.ActivePointChange,
                e
                  ? {
                      idx: e.idx,
                    }
                  : null
              )
            ),
            this.releaseEditorUpdate());
        }

GStyleEdManager.prototype.preparePermanentChange = function () {
          this.hasEventListeners(v.EditorEvent) &&
            this.trigger(v.PREPARE_MODIFIED_EVENT);
        }

GStyleEdManager.prototype.beginTransaction = function () {
          this._mainEditor &&
            (this.preparePermanentChange(),
            this._mainEditor.beginTransaction());
        }

GStyleEdManager.prototype.commitTransaction = function (e, t) {
          this._mainEditor && this._mainEditor.commitTransaction(e, t);
        }

GStyleEdManager.prototype.toString = function () {
          return "[Object GStyleEdManager]";
        }

module.exports = GStyleEdManager;
