/**
     * The sub selection tool
     * @class GSubSelectTool
     * @extends IFSelectTool
     * @constructor
     * @version 1.0
     */

function GSubSelectTool() {
  // Constructor (reconstructed)
}

// Prototype methods
GSubSelectTool.prototype._mouseDblClick = function (e) {
          var t = n.prototype._mouseDblClick.call(this, e);
          return (
            t ||
              ((t = true),
              p.selectDoubleClickBehavior == n._DblClick.SubSelectSwitch &&
                this._manager.notifyJobDone(this)),
            t
          );
        }

GSubSelectTool.prototype._getCollisionFlags = function () {
          var e = null,
            t = this._editor.getSelection();
          return (
            (t && t.length && this._getSelectableElements(t)) ||
              (e = u.CollisionFlag.GeometryBBox | u.CollisionFlag.Partial),
            e
          );
        }

/** @override */
GSubSelectTool.prototype._getSelectableElement = function (element) {
          return e instanceof s && !(e instanceof h) ? e : null;
        }

GSubSelectTool.prototype._selectAcceptor = function (e) {
          return !(e instanceof h || e instanceof c);
        }

GSubSelectTool.prototype._keyDown = function (e) {
          if (
            (n.prototype._keyDown.call(this, e),
            !this._editor.getCurrentInlineEditorNode() &&
              e.key === A.Constant.TAB &&
              !this._mode)
          ) {
            var t = this._editor.getSelection();
            t &&
              1 === t.length &&
              (t[0] instanceof o || t[0] instanceof l) &&
              this._manager.activateOldPathTool();
          }
        }

/** @override */
    IFSubSelectTool.prototype._getSelectableElement = function (element) {
        return element instanceof IFShape ? element : null;
    };

    /** override */
GSubSelectTool.prototype.toString = function () {
          return "[Object GSubSelectTool]";
        }

module.exports = GSubSelectTool;
