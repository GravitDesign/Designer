/**
     * An editor for an ellipse
     * @param {IFEllipse} ellipse the ellipse this editor works on
     * @class GEllipseEditor
     * @extends IFPathBaseEditor
     * @constructor
     */

function GEllipseEditor() {
  // Constructor (reconstructed)
}

// Prototype methods
/**
     * @returns {Boolean}
     * @private
     */
GEllipseEditor.prototype._showSegmentDetails = function () {
          return (
            this._showAnnotations() &&
            this.hasFlag(m.Flag.Detail) &&
            !this._elementPreview
          );
        }

GEllipseEditor.prototype._iterateArcEnds = function (paintElement, iterator) {
          var i = e ? this.getPaintElement() : this._element,
            n = i.getTransform(),
            r = i.getProperty("sa"),
            o = i.getProperty("ea");
          n = n || new d(1, 0, 0, 1, 0, 0);
          for (
            var a = [
                {
                  id: b.START_ANGLE_PART_ID,
                  position: n.mapPoint(new c(Math.cos(r), Math.sin(r))),
                },
                {
                  id: b.END_ANGLE_PART_ID,
                  position: n.mapPoint(new c(Math.cos(o), Math.sin(o))),
                },
              ],
              s = 0;
            s < a.length && !0 !== t(a[s]);
            ++s
          );
        }

/** @override */
GEllipseEditor.prototype.toString = function () {
          return "[Object GEllipseEditor]";
        }

module.exports = GEllipseEditor;
