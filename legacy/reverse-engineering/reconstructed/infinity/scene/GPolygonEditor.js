/**
     * An editor for a polygon
     * @param {IFPolygon} polygon the polygon this editor works on
     * @class GPolygonEditor
     * @extends IFPathBaseEditor
     * @constructor
     */

function GPolygonEditor() {
  // Constructor (reconstructed)
}

// Prototype methods
/** @override */
GPolygonEditor.prototype._getPartInfoAt = function (location, transform, tolerance) {
          if (this._showSegmentDetails()) {
            var n = null;
            if (
              (this._element.iterateSegments(
                function (i, r, o) {
                  if (
                    g
                      .getAnnotationBBox(
                        t,
                        i,
                        c.annotationHandles.polygon.size,
                        !1
                      )
                      .expanded(
                        c.annotPickDistance,
                        c.annotPickDistance,
                        c.annotPickDistance,
                        c.annotPickDistance
                      )
                      .containsPoint(e)
                  ) {
                    var a = r ? m.INSIDE_PART_ID : m.OUTSIDE_PART_ID;
                    return (n = new u.PartInfo(this, a, o, !0, !0)), !0;
                  }
                }.bind(this),
                !0
              ),
              n)
            )
              return n;
          }
          return l.prototype._getPartInfoAt.call(this, e, t, i);
        }

/**
     * @returns {Boolean}
     * @private
     */
GPolygonEditor.prototype._showSegmentDetails = function () {
          return (
            this._showAnnotations() &&
            this.hasFlag(u.Flag.Detail) &&
            !this._elementPreview
          );
        }

/**
     * @returns {Boolean}
     * @private
     */
    IFPolygonEditor.prototype._showSegmentDetails = function () {
        return this._showAnnotations() && this.hasFlag(IFElementEditor.Flag.Detail) && !this._elementPreview;
    };

    /** @override */
GPolygonEditor.prototype.toString = function () {
          return "[Object GPolygonEditor]";
        }

module.exports = GPolygonEditor;
