/**
 * GSelectionPositionEditor
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GSelectionPositionEditor() {
  // Constructor (reconstructed)
}

// Prototype methods
GSelectionPositionEditor.prototype.requestInvalidation = function (e) {
          var t = null,
            i = this._selection;
          if (i && i.length) {
            var n = this._scene.getActivePage(),
              r = n ? n.getPosition(!0) : null;
            r && (t = new h(1, 0, 0, 1, r.getX(), r.getY()));
          }
          t &&
            (e
              ? (e.pageTransform = t)
              : (e = {
                  pageTransform: t,
                })),
            s.getEditor(this._scene).requestInvalidation(this, e);
        }

GSelectionPositionEditor.prototype.invalidate = function (e, t) {
          return o.prototype.invalidate.call(this, e, null);
        }

GSelectionPositionEditor.prototype.getPartInfoAt = function (e, t, i, n, r) {
          if (((n = n || 0), i && !0 !== i.call(null, this))) return null;
          var o = t || new h(),
            a = this.getBBox(o, r);
          if (a && a.expanded(n, n, n, n).containsPoint(e)) {
            var s = this._getPartInfoAt(e, o, n);
            if (s) return s;
          }
          return null;
        }

GSelectionPositionEditor.prototype.isRelativeToPage = function () {
          return false;
        }

GSelectionPositionEditor.prototype._showOutline = function () {
          return true;
        }

GSelectionPositionEditor.prototype._geometryChange = function (e) {
          this.requestInvalidation();
        }

GSelectionPositionEditor.prototype.toString = function () {
          return "[Object GSelectionPositionEditor]";
        }

module.exports = GSelectionPositionEditor;
