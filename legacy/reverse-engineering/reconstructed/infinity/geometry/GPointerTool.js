/**
     * The pointer selection tool
     * @class GPointerTool
     * @extends IFSelectTool
     * @constructor
     * @version 1.0
     */

function GPointerTool() {
        n.call(this);
      }

GObject.inherit(GPointerTool, n);

// Prototype methods
GPointerTool.prototype.activate = function (e, t) {
          n.prototype.activate.call(this, e, t),
            this._editor.setSelectionDetail(!1, !0),
            a.styleEditors &&
              ((this._styleEdManager = e
                .getScene()
                .getWorkspace()
                .getStyleEdManager()),
              this._styleEdManager.activate(e)),
            (this._allowDistanceHelper = a.showDistance);
        }

GPointerTool.prototype.deactivate = function (e, t) {
          t ||
            (this.setEditMode(n.EditMode.Select),
            this._styleEdManager && this._styleEdManager.deactivate()),
            n.prototype.deactivate.call(this, e, t);
        }

GPointerTool.prototype._mouseDblClick = function (e) {
          var t = n.prototype._mouseDblClick.call(this, e);
          return (
            t ||
              (this._editorUnderMouseInfo &&
                this._editorUnderMouseInfo.editor instanceof h) ||
              !(
                (this._clickedElement &&
                  this._clickedElement.hasFlag(r.Flag.Selected)) ||
                (this._editorUnderMouseInfo &&
                  this._editorUnderMouseInfo.editor.hasFlag(s.Flag.Selected) &&
                  !this._editorUnderMouseInfo.editor.canHandleDblClick())
              ) ||
              (a.selectDoubleClickBehavior == n._DblClick.EditModeSwitch
                ? (((this._clickedElement &&
                    this._clickedElement.hasFlag(r.Flag.Selected)) ||
                    this._editMode === n.EditMode.Edit) &&
                    this.setEditMode(
                      this._editMode === n.EditMode.Edit
                        ? n.EditMode.Select
                        : n.EditMode.Edit
                    ),
                  (t = true))
                : a.selectDoubleClickBehavior == n._DblClick.SubSelectSwitch &&
                  ((t = true), this._manager.activateTool(l))),
            t
          );
        }

GPointerTool.prototype._keyDown = function (e) {
          a.toolExitKey &&
            e.key === a.toolExitKey &&
            this.setEditMode(n.EditMode.Select),
            n.prototype._keyDown.call(this, e);
        }

/**
     * The pointer selection tool
     * @class IFPointerTool
     * @extends IFSelectTool
     * @constructor
     * @version 1.0
     */
    function IFPointerTool() {
        IFSelectTool.call(this);
    };

    IFObject.inherit(IFPointerTool, IFSelectTool);

    /** override */
GPointerTool.prototype.toString = function () {
          return "[Object GPointerTool]";
        }

module.exports = GPointerTool;
