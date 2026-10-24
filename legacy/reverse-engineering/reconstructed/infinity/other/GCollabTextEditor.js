/**
 * GCollabTextEditor
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GCollabTextEditor(e) {
        r.call(this, e);
(this.__gtype_id__ = n.getTypeId(h)),
          h.setCorrectMode(this, e);
(this._flags =
            this._flags &
            ~(
              a.Flag.RotateCorners |
              a.Flag.RotateHandle |
              a.Flag.ResizeAll |
              a.Flag.ResizeCenters |
              a.Flag.ResizeEdges
            ));
      }

// Prototype methods
GCollabTextEditor.prototype.canInlineEdit = function () {
          return true;
        }

GCollabTextEditor.prototype.enableInlineEditingSupport = function () {
          this._textEditor && this._textEditor.setInlineEditEnabled(!0);
        }

GCollabTextEditor.prototype.disableInlineEditingSupport = function () {
          this._textEditor && this._textEditor.setInlineEditEnabled(!1);
        }

GCollabTextEditor.prototype.beginInlineEdit = function (e) {
          h.setModeText(this), this.beginInlineEdit(e);
        }

GCollabTextEditor.prototype.finishInlineEdit = function () {
          var e = null;
          return (
            this._textEditor &&
              (e = o.prototype.finishInlineEdit.call(this._textEditor)),
            e
          );
        }

GCollabTextEditor.prototype.setEditMode = function () {}

GCollabTextEditor.prototype.toString = function () {
          return "[Object GCollabTextEditor]";
        }


module.exports = GCollabTextEditor;
