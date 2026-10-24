/**
     * The base for an element editor
     * @param {IFElement} element the element this editor works on
     * @class GElementEditor
     * @extends IFObject
     * @constructor
     */

function GElementEditor() {
  // Constructor (reconstructed)
}

// Prototype methods
GElementEditor.prototype.acceptDrop = function (position, type, source, hitData) {
          if (this._editors)
            for (var r = 0; r < this._editors.length; ++r)
              if (
                this._editors[r] instanceof f &&
                !0 === this._editors[r].acceptDrop(e, t, i, n)
              )
                return true;
          return false;
        }

GElementEditor.prototype.applyPropertiesToParts = function (e, t, i, n, r) {
          return false;
        }

GElementEditor.prototype.getPartsProperty = function (e) {
          return null;
        }

GElementEditor.prototype.getStylableParts = function () {
          return null;
        }

/**
     * Called whenever a newly inserted element should become
     * some default setup
     * @param {IFColor} fillColor the current default fill color
     * @param {IFColor} strokeColor the current default stroke color
     */
GElementEditor.prototype.initialSetup = function (e, t) {
          this._element.hasMixin(o) && this._element.setProperty("uid", t);
        }

GElementEditor.prototype.getObjectNameModified = function () {
          return this.getElement().getNodeNameTranslated();
        }

GElementEditor.prototype.getEditorStateData = function () {
          return null;
        }

GElementEditor.prototype.restoreEditorStateData = function (e) {}

GElementEditor.prototype.findPivots = function (e) {
          return this._element.findPivots(!0, e);
        }

GElementEditor.prototype.getElementSelectionBBox = function () {
          return this._element.getGeometryBBox();
        }

GElementEditor.prototype._setElementPreview = function (e) {
          this._elementPreview && (this._elementPreview._baseElement = null),
            (this._elementPreview = e),
            this._elementPreview &&
              (this._elementPreview._baseElement = this._element);
        }

/**
     * Called when this editor is attached to the node
     */
GElementEditor.prototype._attach = function () {}

/**
     * Called when this editor is attached to the node
     */
    IFElementEditor.prototype._attach = function () {
        // NO-OP
    };

    /**
     * Called when this editor is detached from the node
     */
GElementEditor.prototype._detach = function () {}

/** @override */
GElementEditor.prototype.toString = function () {
          return "[Object GElementEditor]";
        }

module.exports = GElementEditor;
