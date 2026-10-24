/**
     * The base for a scene editor
     * @param {IFScene} scene the scene this editor works on
     * @class GSceneEditor
     * @extends IFElementEditor
     * @constructor
     */

function GSceneEditor() {
  // Constructor (reconstructed)
}

// Prototype methods
GSceneEditor.prototype.applyTBoxTransform = function (option) {
          this._getGraphicEditor().getGuides().invalidate(),
            this._tBoxMode == b.TBoxMode.CNTRMOVE
              ? (this._applyTBoxCenterTransform(), this.showTransformBox())
              : this._getGraphicEditor().applySelectionTransform(e, !1, !1, !0),
            this._updateTBoxMode(b.TBoxMode.PASSIVE),
            (this._tBoxData = null),
            (this._mouseInfo = null);
        }

GSceneEditor.prototype._updateSelectionTransformBox = function (center) {
          this.requestInvalidation();
          var i = this._getGraphicEditor().getIndividualSelection();
          if (i && i.length) {
            var n = this._transformBox,
              r = null,
              a = null;
            e
              ? ((r = e.getX()), (a = e.getY()))
              : this._transformBox &&
                t &&
                ((r = this._transformBox.cx), (a = this._transformBox.cy)),
              (this._transformBox = null);
            var s = f.getGroupTransformBBox(i, !0);
            if (s) {
              var l = this._element.getActivePage(),
                h = l ? l.getPosition(!0) : null;
              h && (s = s.translated(-h.getX(), -h.getY())),
                (this._transformBox = new o(
                  s,
                  r,
                  a,
                  this._tBoxFlags,
                  this.getElement()
                ));
            }
            var A = this.getElement().getWorkspace()
              ? this.getElement().getWorkspace().getTransactionRecorder()
              : null;
            A && A.afterTBoxChange(this.getElement(), n, this._transformBox),
              this.requestInvalidation(),
              this._transformBox
                ? this._updateTBoxMode(b.TBoxMode.PASSIVE)
                : this._updateTBoxMode(b.TBoxMode.NA),
              (this._tBoxData = null),
              (this._mouseInfo = null),
              this._visualsArea && (this._visualsArea = null);
          } else this.setTransformBoxActive(!1);
        }

GSceneEditor.prototype._geometryChange = function (evt) {
          this._transformBox &&
            e.element.hasFlag(n.Flag.Selected) &&
            (e.type == p.GeometryChangeEvent.Type.After ||
              e.type == p.GeometryChangeEvent.Type.Child) &&
            ((this._transformBox.trf || this._transformBox.cTrf) &&
              this._transformBox.applyCenterTransform(),
            this._updateSelectionTransformBox(null, !0));
        }

GSceneEditor.prototype._selectionChanged = function (e) {
          this.setTransformBoxActive(!0);
        }

GSceneEditor.prototype._getGraphicEditor = function () {
          return this._element.__graphic_editor__;
        }

/** @override */
GSceneEditor.prototype.toString = function () {
          return "[Object GSceneEditor]";
        }

module.exports = GSceneEditor;
