/**
     * The layer tool
     * @class GLayerTool
     * @extends IFSelectTool
     * @constructor
     */

function GLayerTool() {
  // Constructor (reconstructed)
}

// Prototype methods
/**
     * The layer tool
     * @class IFLayerTool
     * @extends IFSelectTool
     * @constructor
     */
    function IFLayerTool() {
        IFSelectTool.call(this);
    };

    IFObject.inherit(IFLayerTool, IFSelectTool);

    /** @override */
GLayerTool.prototype.activate = function (view) {
          n.prototype.activate.call(this, e, t);
          var i = true;
          if (this._editor) {
            var o = this._editor.getSelection();
            if (o && o.length)
              for (var a = 0; a < o.length && i; ++a) i = o[a] instanceof r;
            if (!i) {
              this._editor && !t && this._editor.storeSelection();
              var s = this._scene.getActiveLayer();
              s
                ? this._editor.updateSelection(!1, [s])
                : this._editor.clearSelection();
            }
          }
          this._onlyLayers = i;
        }

/** @override */
    IFLayerTool.prototype.activate = function (view) {
        IFSelectTool.prototype.activate.call(this, view);

        // Store current selection & select active layer
        this._editor.storeSelection();

        var activeLayer = this._scene.getActiveLayer();
        if (activeLayer) {
            this._editor.updateSelection(false, [activeLayer])
        } else {
            this._editor.clearSelection();
        }
    };

    /** @override */
GLayerTool.prototype.deactivate = function (view) {
          !this._editor ||
            t ||
            this._onlyLayers ||
            this._editor.restoreSelection(),
            n.prototype.deactivate.call(this, e, t);
        }

/** @override */
    IFLayerTool.prototype.deactivate = function (view) {
        // Restore previous selection
        this._editor.restoreSelection();

        IFSelectTool.prototype.deactivate.call(this, view);
    };

    /** @override */
GLayerTool.prototype._getSelectableElement = function (element) {
          for (var i = e; null !== i; i = i.getParent())
            if (i instanceof r) return i;
          return this._scene.getActiveLayer();
        }

/** @override */
    IFLayerTool.prototype._getSelectableElement = function (element) {
        for (var p = element; p !== null; p = p.getParent()) {
            if (p instanceof IFLayer) {
                return p;
            }
        }

        return null;
    };

    /** override */
GLayerTool.prototype.toString = function () {
          return "[Object GLayerTool]";
        }

module.exports = GLayerTool;
