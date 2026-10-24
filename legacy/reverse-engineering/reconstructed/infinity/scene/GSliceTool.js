/**
     * The slice tool
     * @class GSliceTool
     * @extends IFTool
     * @constructor
     */

function GSliceTool() {
  // Constructor (reconstructed)
}

// Prototype methods
/**
     * @param {IFSlice} [slice] the slice to invalidate,
     * if not provided defaults to current slice if any
     * @private
     */
GSliceTool.prototype._invalidateSliceArea = function (slice) {
          if ((e = e || this._slice)) {
            var t = this._view
              .getWorldTransform(this._view.getScene().getActivePage())
              .mapRect(e.getGeometryBBox());
            t &&
              (t.getWidth() > 0 || t.getHeight() > 0) &&
              this.invalidateArea(t.expanded(1, 1, 1, 1));
          }
        }

/**
     * Called to update the slice of this tool
     * @param {IFSlice} slice the slice to update
     * @param {IFRect} area the slice area in scene coordinates
     * @private
     */
GSliceTool.prototype._updateSlice = function (slice, area) {
          t &&
            e.setProperties(
              ["x", "y", "w", "h"],
              [t.getX(), t.getY(), t.getWidth(), t.getHeight()]
            );
        }

/** override */
GSliceTool.prototype.toString = function () {
          return "[Object GSliceTool]";
        }

module.exports = GSliceTool;
