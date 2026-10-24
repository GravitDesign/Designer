/**
     * The line tool
     * @class GLineTool
     * @extends IFShapeTool
     * @constructor
     */

function GLineTool() {
        r.call(this, !0, !0);
      }

GObject.inherit(GLineTool, GTool);

// Prototype methods
GLineTool.prototype._getRelatedItemClass = function () {
          return n;
        }

/**
     * The line tool
     * @class IFLineTool
     * @extends IFShapeTool
     * @constructor
     */
    function IFLineTool() {
        IFShapeTool.call(this, true, true);
    }

    IFObject.inherit(IFLineTool, IFShapeTool);

    /** @override */
GLineTool.prototype._createShape = function () {
          var e = new (this._getRelatedItemClass())(!1);
          return (
            e.getAnchorPoints().appendChild(new a.AnchorPoint()),
            e.getAnchorPoints().appendChild(new a.AnchorPoint()),
            e
          );
        }

/** @override */
    IFLineTool.prototype._createShape = function () {
        var path = new IFPath();
        path.getAnchorPoints().appendChild(new IFPathBase.AnchorPoint());
        path.getAnchorPoints().appendChild(new IFPathBase.AnchorPoint());
        return path;
    };

    /** @override */
GLineTool.prototype._updateShape = function (shape, area, line) {
          return (
            !!i &&
            (e
              .getAnchorPoints()
              .getChildByIndex(0)
              .setProperties(["x", "y"], [i[0].getX(), i[0].getY()]),
            e
              .getAnchorPoints()
              .getChildByIndex(1)
              .setProperties(["x", "y"], [i[1].getX(), i[1].getY()]),
            !0)
          );
        }

GLineTool.prototype._insertShape = function (e, t, i, n) {
          var o = false;
          if (i)
            (o = r.prototype._insertShape.call(this, e, t, !0)),
              e.getPaintLayers().clearFillLayers();
          else
            try {
              this._editor.beginTransaction(),
                (o = r.prototype._insertShape.call(this, e, t, !0)),
                e.getPaintLayers().clearFillLayers();
            } finally {
              var a = this.getAdditionalTransactionData(e, e.getParent());
              this._editor.commitTransaction(
                n || s.get(new l("GShapeTool", "action.insert-elements")),
                a
              );
            }
          return o;
        }

GLineTool.prototype._showMousePositionInlineHint = function () {
          return true;
        }

GLineTool.prototype._showAreaInlineHint = function () {
          return true;
        }

/** @override */
    IFLineTool.prototype._updateShape = function (shape, area, line) {
        shape.getAnchorPoints().getChildByIndex(0).setProperties(['x', 'y'], [line[0].getX(), line[0].getY()]);
        shape.getAnchorPoints().getChildByIndex(1).setProperties(['x', 'y'], [line[1].getX(), line[1].getY()]);
    };

    /** override */
GLineTool.prototype.toString = function () {
          return "[Object GLineTool]";
        }

module.exports = GLineTool;
