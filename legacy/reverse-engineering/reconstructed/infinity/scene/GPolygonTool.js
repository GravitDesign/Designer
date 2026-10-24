/**
     * The polygon tool
     * @class GPolygonTool
     * @extends IFShapeTool
     * @constructor
     * @version 1.0
     */

function GPolygonTool() {
        r.call(this, !1, !1);
      }

GObject.inherit(GPolygonTool, GSimpleShapeTool);

// Prototype methods
GPolygonTool.prototype._getRelatedItemClass = function () {
          return n;
        }

/**
     * @type {number}
     * @private
     */
    IFPolygonTool.prototype._numberOfPoints = 6;

    /**
     * @type {number}
     * @private
     */
    IFPolygonTool.prototype._innerRadiusFactor = 0.5;

    /** @override */
GPolygonTool.prototype._modifiersChanged = function (event) {
          e.changed.shiftKey && this._invalidateShape(),
            r.prototype._modifiersChanged.call(this, e);
        }

/**
     * @type {number}
     * @private
     */
    IFPolygonTool.prototype._innerRadiusFactor = 0.5;

    /** @override */
    IFPolygonTool.prototype._modifiersChanged = function (event) {
        if (event.changed.shiftKey || event.changed.optionKey) {
            this._invalidateShape();
        }
        IFShapeTool.prototype._modifiersChanged.call(this, event);
    };

    /** @override */
GPolygonTool.prototype._createShape = function () {
          return new n();
        }

GPolygonTool.prototype._getNumberOfPoints = function () {
          return 6;
        }

GPolygonTool.prototype._getInnerRadiusFactor = function () {
          return 0;
        }

/** @override */
    IFPolygonTool.prototype._modifiersChanged = function (event) {
        if (event.changed.shiftKey || event.changed.optionKey) {
            this._invalidateShape();
        }
        IFShapeTool.prototype._modifiersChanged.call(this, event);
    };

    /** @override */
    IFPolygonTool.prototype._createShape = function () {
        return new IFPolygon();
    };

    /** @override */
GPolygonTool.prototype._updateShape = function (shape, area, line) {
          if (i) {
            var n = this._getNumberOfPoints(),
              r = i[1].getX() - i[0].getX(),
              o = i[1].getY() - i[0].getY(),
              l = a.normalizeAngleRadians(Math.atan2(o, r)),
              h = a.ptDist(i[1].getX(), i[1].getY(), i[0].getX(), i[0].getY());
            s.modifiers.shiftKey && (l = this._lockAngle(l));
            var A = l,
              c = a.normalizeAngleRadians(l + Math.PI / n),
              p = h,
              u = h * Math.cos(Math.PI / n),
              d = this._getInnerRadiusFactor();
            return (
              d && (u = h * d),
              (u = Math.max(0.5, u)),
              (p = Math.max(u, p)),
              e.setProperties(
                ["pts", "cx", "cy", "ir", "or", "ia", "oa"],
                [n, i[0].getX(), i[0].getY(), Math.max(0.5, u), p, c, A]
              ),
              !0
            );
          }
          return false;
        }

GPolygonTool.prototype._showMousePositionInlineHint = function () {
          return true;
        }

GPolygonTool.prototype._showAreaInlineHint = function () {
          return true;
        }

/** @override */
GPolygonTool.prototype._hasCenterCross = function () {
          return true;
        }

GPolygonTool.prototype._lockAngle = function (e) {
          return (Math.round((12 * e) / Math.PI) * Math.PI) / 12;
        }

/** @override */
    IFPolygonTool.prototype._hasCenterCross = function () {
        return true;
    };

    /** override */
GPolygonTool.prototype.toString = function () {
          return "[Object GPolygonTool]";
        }

module.exports = GPolygonTool;
