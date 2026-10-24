/**
 * GBaseEditor
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GBaseEditor() {
  // Constructor (reconstructed)
}

// Prototype methods
GBaseEditor.prototype.blockRemoval = function () {
          this._blockRemoval = true;
        }

GBaseEditor.prototype.allowRemoval = function () {
          this._blockRemoval = false;
        }

GBaseEditor.prototype.isRemovalBlocked = function () {
          return this._blockRemoval;
        }

GBaseEditor.prototype.getCursor = function (e, t) {
          return null;
        }

GBaseEditor.prototype.getObjectNameModified = function () {
          return null;
        }

GBaseEditor.prototype._paintChildren = function (e, t, i) {
          if (this._editors)
            for (var n = 0; n < this._editors.length; ++n)
              (i && !i(this._editors[n])) || this._editors[n].paint(e, t);
        }

GBaseEditor.prototype._getPartInfoAt = function (e, t, i) {
          return null;
        }

GBaseEditor.prototype._partIdAreEqual = function (e, t) {
          return e === t;
        }

GBaseEditor.prototype._indexOfPartId = function (e, t) {
          if (e && e.length > 0)
            for (var i = 0; i < e.length; ++i)
              if (this._partIdAreEqual(e[i], t)) return i;
          return -1;
        }

GBaseEditor.prototype._updatePartSelection = function (e) {
          this.requestInvalidation(),
            (this._partSelection = e),
            this.requestInvalidation();
        }

GBaseEditor.prototype._showAnnotations = function () {
          return true;
        }

GBaseEditor.prototype._setTransform = function (e) {
          r.equals(this._transform, e) ||
            (this.hasFlag(l.Flag.Outline)
              ? this.requestInvalidation()
              : this.setOutlineTmpFlag(),
            (this._transform = e),
            this.requestInvalidation());
        }

GBaseEditor.prototype.canHandleKeyEvents = function () {
          return false;
        }

GBaseEditor.prototype.handleKeyEvent = function (e) {}

GBaseEditor.prototype.toString = function () {
          return "[Object GBaseEditor]";
        }

module.exports = GBaseEditor;
