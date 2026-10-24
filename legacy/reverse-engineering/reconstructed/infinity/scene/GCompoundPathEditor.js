/**
 * GCompoundPathEditor
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GCompoundPathEditor() {
  // Constructor (reconstructed)
}

// Prototype methods
GCompoundPathEditor.prototype.isAlignPartsAllowed = function () {
          var e = false;
          return (
            this.hasFlag(p.Flag.Selected) &&
              this._editors &&
              this._iterateChildPathsEditors(
                function (t) {
                  if (t.isAlignPartsAllowed()) return (e = true);
                }.bind(this)
              ),
            e
          );
        }

GCompoundPathEditor.prototype.alignParts = function (e, t, i) {
          this.hasFlag(p.Flag.Selected) &&
            this._editors &&
            (this._element.beginUpdate(),
            this._iterateChildPathsEditors(
              function (n) {
                n.isAlignPartsAllowed() && n.alignParts(e, t, i);
              }.bind(this)
            ),
            this._element.endUpdate());
        }

GCompoundPathEditor.prototype._geometryChange = function (e) {
          if (
            e.type == A.GeometryChangeEvent.Type.Before ||
            e.type == A.GeometryChangeEvent.Type.After
          ) {
            var t = e.element == this._element;
            if (!t && e.element instanceof h)
              for (
                var i = this._element.getPaths().getFirstChild();
                null != i && !t;
                i = i.getNext()
              )
                i == e.element && (t = true);
            t &&
              (e.type == A.GeometryChangeEvent.Type.After &&
                this.releasePathPreview(),
              this.requestInvalidation());
          }
        }

GCompoundPathEditor.prototype.setFlag = function (e) {
          if (0 == (this._flags & e)) {
            this.requestInvalidation(), (this._flags = this._flags | e);
            for (
              var t = this._element.getPaths().getFirstChild();
              null != t;
              t = t.getNext()
            ) {
              var i = s.openEditor(t);
              i.setCatchHandle(!1),
                (e & l.Flag.ResizeAll) != l.Flag.ResizeAll &&
                  i &&
                  !i.hasFlag(e) &&
                  i.setFlag(e),
                this.hasFlag(l.Flag.ResizeAll) &&
                  i &&
                  !i.hasFlag(p.Flag.Outline) &&
                  i.setFlag(p.Flag.Outline),
                i &&
                  i.hasFlag(l.Flag.ResizeAll) &&
                  i.removeFlag(l.Flag.ResizeAll);
            }
            this.requestInvalidation();
          }
        }

GCompoundPathEditor.prototype.removeFlag = function (e) {
          0 != (this._flags & e) &&
            (this.requestInvalidation(),
            this._editors &&
              this._iterateChildPathsEditors(
                function (t) {
                  (e & l.Flag.ResizeAll) == l.Flag.ResizeAll
                    ? t.removeFlag(p.Flag.Outline)
                    : ((e & p.Flag.Outline) == p.Flag.Outline &&
                        (this._flags & l.Flag.ResizeAll) == l.Flag.ResizeAll) ||
                      t.removeFlag(e);
                }.bind(this)
              ),
            (this._flags = this._flags & ~e),
            this.requestInvalidation());
        }

GCompoundPathEditor.prototype._paintOutline = function (e, t, i, n, r) {
          this._editors && this._editors.length > d.maxNumberOfEditorsToDraw
            ? l.prototype._paintOutline.call(this, e, t, i, n)
            : !this.hasFlag(p.Flag.Selected) &&
              this.hasFlag(p.Flag.Outline) &&
              this._editors &&
              this._iterateChildPathsEditors(
                function (o) {
                  o._paintOutline(e, t, i, n, r);
                }.bind(this)
              );
        }

GCompoundPathEditor.prototype.releasePathPreview = function () {
          for (
            var e = this._element.getPaths().getFirstChild();
            null != e;
            e = e.getNext()
          ) {
            var t = s.getEditor(e);
            t && t.releasePathPreview();
          }
        }

GCompoundPathEditor.prototype.hasPathPartSelection = function () {
          var e = false;
          return (
            this._editors &&
              this._iterateChildPathsEditors(
                function (t) {
                  if (t.getPartSelection()) return (e = true), !0;
                }.bind(this)
              ),
            e
          );
        }

GCompoundPathEditor.prototype._iterateChildPathsEditors = function (e) {
          if (
            this._editors &&
            this._element.getPaths().getFirstChild() &&
            s.getEditor(this._element.getPaths().getFirstChild())
          )
            for (
              var t = false, i = this._element.getPaths().getFirstChild();
              null != i && !t;
              i = i.getNext()
            ) {
              var n = s.getEditor(i);
              if (n) !0 === e(n) && (t = true);
            }
        }

GCompoundPathEditor.prototype.toString = function () {
          return "[Object GCompoundPathEditor]";
        }

module.exports = GCompoundPathEditor;
