/**
     * An editor for a path
     * @param {IFPath} path the path this editor works on
     * @class GPathEditor
     * @extends IFPathBaseEditor
     * @constructor
     */

function GPathEditor() {
  // Constructor (reconstructed)
}

// Prototype methods
/**
     * Assign a given set of preview point to source point
     * @param {IFPathBase.AnchorPoint} sourcePoint
     * @param {Array<String>} properties
     * @private
     */
GPathEditor.prototype._assignPreviewPointPropertiesToSourcePoint = function (sourcePoint, properties) {
          var i = this.getPathPointPreview(e);
          i && e.setProperties(t, i.getProperties(t));
        }

/**
     * Assign all geometry properties of preview point to corresponding point of an element
     * @param {IFPathBase.AnchorPoint} point - a point to use for finding preview point
     * @param {IFElement} element the element to which point to apply the transformation,
     * might be different than the one this editor works on. This will be never null.
     * @private
     */
GPathEditor.prototype._transferPreviewProperties = function (point, element) {
          var i = this._element.getAnchorPoints().getIndexOfChild(e),
            n = t.getAnchorPoints().getChildByIndex(i),
            r = this.getPathPointPreview(n);
          r && n.transferProperties(r, [m.AnchorPoint.GeometryProperties]);
        }

/**
     * Filters selection to not include separatly points, which are already included as some segment end-points
     * @param {Array<*>} selection the part selection to be filtered
     * @returns {Array<*>} the new filtered selection
     * @private
     */
GPathEditor.prototype._filterSelection = function (selection) {
          if (!e) return null;
          for (var t, i = [], n = 0; n < e.length; ++n)
            if (e[n].type != P.PartType.Point) i.push(e[n]);
            else {
              t = true;
              for (var r = 0; r < e.length; ++r)
                if (
                  e[r].type == P.PartType.Segment &&
                  (e[n].point == e[r].apLeft || e[n].point == e[r].apRight)
                ) {
                  t = false;
                  break;
                }
              t && i.push(e[n]);
            }
          return i;
        }

/**
     * If the path is updated (may be way around of this path editor), handle this by updating preview
     * @param {IFElement.GeometryChangeEvent} evt
     * @private
     */
GPathEditor.prototype._geometryChange = function (evt) {
          e.type == n.GeometryChangeEvent.Type.After &&
            e.element == this._element &&
            this._elementPreview &&
            (this.releasePathPreview(), this.requestInvalidation());
        }

GPathEditor.prototype._handleFinishDrawing = function () {
          x.defaultBorderPositionForLines &&
            this._element.isMultiPointsLine() &&
            this._setBorderAlignmentToCenter();
        }

GPathEditor.prototype._setBorderAlignmentToCenter = function () {
          var e = this._element.getPaintLayers(),
            t = e && e.getBorderLayers();
          t &&
            t.forEach((e) => {
              e.setProperty("_ba", B.BorderAlignment.Center);
            });
        }

GPathEditor.prototype._afterInsert = function (e) {
          e.node instanceof B.BorderPaintLayer && this._handleFinishDrawing();
        }

/** @override */
GPathEditor.prototype.toString = function () {
          return "[Object GPathEditor]";
        }

module.exports = GPathEditor;
