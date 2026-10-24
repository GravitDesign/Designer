/**
     * The ellipse tool
     * @class GEllipseTool
     * @extends IFShapeTool
     * @constructor
     */

function GEllipseTool() {
        r.call(this, !0, !0);
      }

GObject.inherit(GEllipseTool, GSimpleShapeTool);

// Prototype methods
GEllipseTool.prototype._getRelatedItemClass = function () {
          return o;
        }

/**
     * The ellipse tool
     * @class IFEllipseTool
     * @extends IFShapeTool
     * @constructor
     */
    function IFEllipseTool() {
        IFShapeTool.call(this, true, true);
    }

    IFObject.inherit(IFEllipseTool, IFShapeTool);

    /** @override */
    IFEllipseTool.prototype._createShape = function () {
        return new IFEllipse();
    };

    /** @override */
GEllipseTool.prototype._updateShape = function (shape, area, line) {
          return (
            !!t &&
            (e.setProperty(
              "trf",
              new n(
                Math.max(1, t.getWidth()) / 2,
                0,
                0,
                Math.max(1, t.getHeight()) / 2,
                t.getX() + t.getWidth() / 2,
                t.getY() + t.getHeight() / 2
              )
            ),
            !0)
          );
        }

GEllipseTool.prototype._showMousePositionInlineHint = function () {
          return true;
        }

GEllipseTool.prototype._showAreaInlineHint = function () {
          return true;
        }

/** @override */
    IFEllipseTool.prototype._updateShape = function (shape, area, line) {
        // Original shape is a circle with coordinates x,y: [-1, 1]. Transform it to fit into the area:
        shape.setProperty('trf',
            new IFTransform(area.getWidth() / 2, 0, 0, area.getHeight() / 2,
                area.getX() + area.getWidth() / 2, area.getY() + area.getHeight() / 2));
    };

    /** @override */
GEllipseTool.prototype._hasCenterCross = function () {
          return true;
        }

/** @override */
    IFEllipseTool.prototype._hasCenterCross = function () {
        return true;
    };

    /** override */
GEllipseTool.prototype.toString = function () {
          return "[Object GEllipseTool]";
        }

module.exports = GEllipseTool;
