/**
     * The rectangle tool
     * @class GRectangleTool
     * @extends IFShapeTool
     * @constructor
     */

function GRectangleTool() {
        r.call(this, !0, !0);
      }

GObject.inherit(GRectangleTool, GSimpleShapeTool);

// Prototype methods
GRectangleTool.prototype._getRelatedItemClass = function () {
          return a;
        }

/**
     * The rectangle tool
     * @class IFRectangleTool
     * @extends IFShapeTool
     * @constructor
     */
    function IFRectangleTool() {
        IFShapeTool.call(this, true, true);
    }

    IFObject.inherit(IFRectangleTool, IFShapeTool);

    /** @override */
    IFRectangleTool.prototype._createShape = function () {
        return new IFRectangle();
    };

    /** @override */
GRectangleTool.prototype._updateShape = function (shape, area, line) {
          return (
            !!t &&
            (e.setProperty(
              "trf",
              new n(
                Math.max(t.getWidth(), 1) / 2,
                0,
                0,
                Math.max(t.getHeight(), 1) / 2,
                t.getX() + t.getWidth() / 2,
                t.getY() + t.getHeight() / 2
              )
            ),
            !0)
          );
        }

/** @override */
    IFRectangleTool.prototype._updateShape = function (shape, area, line) {
        // Original shape is a rectangle with coordinates x,y: [-1, 1]. Transform it to fit into the area:
        shape.setProperty('trf',
            new IFTransform(area.getWidth() / 2, 0, 0, area.getHeight() / 2,
                area.getX() + area.getWidth() / 2, area.getY() + area.getHeight() / 2));
    };

    /** @override */
GRectangleTool.prototype._hasCenterCross = function () {
          return true;
        }

GRectangleTool.prototype._showMousePositionInlineHint = function () {
          return true;
        }

GRectangleTool.prototype._showAreaInlineHint = function () {
          return true;
        }

/** @override */
    IFRectangleTool.prototype._hasCenterCross = function () {
        return true;
    };

    /** override */
GRectangleTool.prototype.toString = function () {
          return "[Object GRectangleTool]";
        }

module.exports = GRectangleTool;
