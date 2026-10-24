/**
 * GStyleEditor
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GStyleEditor() {}

GObject.inherit(GStyleEditor, A);

// Prototype methods
GStyleEditor.prototype.getCursor = function (e, t) {
          return o.Default;
        }

GStyleEditor.prototype.activate = function (e) {
          var t = e.parentEditor;
          return (
            (t instanceof a ||
              t instanceof h ||
              t instanceof l ||
              t instanceof s) &&
            (t.insertEditor(this),
            this.setFlag(A.Flag.Selected),
            this.requestInvalidation(),
            !0)
          );
        }

GStyleEditor.prototype.deactivate = function () {
          this._parentEditor &&
            (this.updatePartSelection(!1, null, !0),
            this.removeFlag(A.Flag.Selected),
            this.requestInvalidation(),
            this._parentEditor.removeEditor(this, !0)),
            this._manager.notifyDeactivated(this);
        }

GStyleEditor.prototype.validateAlreadyActive = function (e) {
          return e.parentEditor === this._parentEditor;
        }

GStyleEditor.prototype.isDeactivatable = function () {
          return null != this._parentEditor;
        }

GStyleEditor.prototype.getEditObj = function () {
          return null;
        }

GStyleEditor.prototype.updateCursor = function () {
          this._manager &&
            this == this._manager.getActiveEditor() &&
            this._manager.updateActiveEditorCursor();
        }

GStyleEditor.prototype.getBBox = function (e) {
          return this.getCustomBBox(e);
        }

GStyleEditor.prototype.requestInvalidation = function (e) {
          var t = this._manager.getScene();
          t && n.getEditor(t).requestInvalidation(this, e);
        }

GStyleEditor.prototype.movePart = function (e, t, i, n, r, o, a) {
          A.prototype.movePart.call(this, e, t, i, n, r, o, a),
            this._manager.blockEditorUpdate();
        }

GStyleEditor.prototype._applyPartMove = function (e, t, i, n) {
          this._manager.releaseEditorUpdate(),
            A.prototype._applyPartMove.call(this, e, t, i, n);
        }

GStyleEditor.prototype.toString = function () {
          return "[Object GStyleEditor]";
        }


module.exports = GStyleEditor;
