/**
     * The zoom tool
     * @class GZoomTool
     * @extends IFTool
     * @constructor
     * @version 1.0
     */

function GZoomTool() {
  // Constructor (reconstructed)
}

// Prototype methods
/**
     * -2 = zoom out max, -1 = zoom out, 0 = no zoom, +1 = zoom in, +2 = zoom in max
     * @type {Number}
     * @private
     */
    IFZoomTool.prototype._zoomMode = false;

    /**
     * @type {IFRect}
     * @private
     */
    IFZoomTool.prototype._dragArea = null;

    /** @override */
GZoomTool.prototype.getCursor = function () {
          switch (this._zoomMode) {
            case -2:
            case -1:
              return a.ZoomMinus;
            case 1:
            case 2:
              return a.ZoomPlus;
            default:
              return a.ZoomNone;
          }
        }

/**
     * @type {IFRect}
     * @private
     */
    IFZoomTool.prototype._dragArea = null;

    /** @override */
    IFZoomTool.prototype.getCursor = function () {
        switch (this._zoomMode) {
            case -2:
            case -1:
                return IFCursor.ZoomMinus;
            case +1:
            case +2:
                return IFCursor.ZoomPlus;
            default:
                return IFCursor.ZoomNone;
        }
    };

    /** @override */
GZoomTool.prototype.activate = function (view) {
          A.prototype.activate.call(this, e, t),
            this._updateMode(),
            t ||
              (e.addEventListener(l.DragStart, this._mouseDragStart, this),
              e.addEventListener(l.Drag, this._mouseDrag, this),
              e.addEventListener(l.DragEnd, this._mouseDragEnd, this),
              e.addEventListener(l.Release, this._mouseRelease, this),
              e.addEventListener(h.TransformEvent, this._updateMode, this),
              n.addEventListener(r, this._modifiersChanged, this));
        }

/** @override */
GZoomTool.prototype.deactivate = function (view) {
          A.prototype.deactivate.call(this, e, t),
            e.removeEventListener(l.DragStart, this._mouseDragStart),
            e.removeEventListener(l.Drag, this._mouseDrag),
            e.removeEventListener(l.DragEnd, this._mouseDragEnd),
            e.removeEventListener(l.Release, this._mouseRelease),
            e.removeEventListener(h.TransformEvent, this._updateMode, this),
            n.removeEventListener(r, this._modifiersChanged);
        }

/** @override */
GZoomTool.prototype.isDeactivatable = function () {
          return !this._dragArea;
        }

/** @override */
    IFZoomTool.prototype.isDeactivatable = function () {
        // cannot deactivate while dragging
        return this._dragArea ? false : true;
    };

    /** @override */
GZoomTool.prototype.paint = function (context) {
          if (this._hasDragArea()) {
            var t = Math.floor(this._dragArea.getX()),
              i = Math.floor(this._dragArea.getY()),
              n = Math.ceil(this._dragArea.getWidth()),
              r = Math.ceil(this._dragArea.getHeight());
            c.outlineWidth % 2 != 0 &&
              ((t += 0.5), (i += 0.5), (n -= 1), (r -= 1)),
              e.canvas.strokeRect(t, i, n, r, c.outlineWidth);
          }
        }

/**
     * @param {GUIMouseEvent.DragStart} event
     * @private
     */
GZoomTool.prototype._mouseDragStart = function (event) {
          this._dragStartTime = new Date().getTime();
        }

/**
     * @param {GUIMouseEvent.DragStart} event
     * @private
     */
    IFZoomTool.prototype._mouseDragStart = function (event) {
        // NO-OP
    };

    /**
     * @param {GUIMouseEvent.Drag} event
     * @private
     */
GZoomTool.prototype._mouseDrag = function (event) {
          0 !== this._zoomMode &&
            (this._hasDragArea() &&
              this.invalidateArea(this._dragArea.expanded(2, 2, 2, 2)),
            (this._dragArea = s.fromPoints(e.clientStart, e.client)),
            this._hasDragArea() &&
              this.invalidateArea(this._dragArea.expanded(2, 2, 2, 2)));
        }

/**
     * @param {GUIMouseEvent.DragEnd} event
     * @private
     */
GZoomTool.prototype._mouseDragEnd = function (event) {
          if (0 !== this._zoomMode)
            if (
              (new Date().getTime() - this._dragStartTime < 200 &&
                this._dragArea &&
                this._dragArea.getWidth() * this._dragArea.getHeight() < 64 &&
                (this._dragArea = null),
              this._dragArea && !this._dragArea.isEmpty())
            ) {
              var t = this._view.getViewTransform().mapRect(this._dragArea);
              this._view.zoomAll(t, this._zoomMode < 0);
            } else
              this._hasDragArea() &&
                this.invalidateArea(this._dragArea.expanded(2, 2, 2, 2));
        }

/**
     * @param {GUIMouseEvent.Release} event
     * @private
     */
GZoomTool.prototype._mouseRelease = function (event) {
          if (!this._dragArea || (this._dragArea && this._dragArea.isEmpty())) {
            var t = null,
              i = null,
              n = null;
            if (2 === this._zoomMode) t = h.options.maxZoomFactor;
            else if (-2 === this._zoomMode) t = h.options.minZoomFactor;
            else if (0 !== this._zoomMode) {
              if (p.options.zoomLevels)
                for (
                  var r = p.options.zoomLevels,
                    o = this._view.getZoom(),
                    a = r.length - 1,
                    s = 0;
                  s < r.length;
                  s++
                )
                  if (
                    (o > r[s] && (i = r[s]),
                    o < r[a - s] && (n = r[a - s]),
                    o === r[s])
                  ) {
                    (i = s > 0 ? r[s - 1] : h.options.minZoomFactor),
                      (n = a > 0 ? r[s + 1] : h.options.maxZoomFactor);
                    break;
                  }
              t =
                1 === this._zoomMode
                  ? n || this._view.getZoom() * p.options.zoomStep
                  : i || this._view.getZoom() / p.options.zoomStep;
            }
            if (null !== t) {
              var l = this._view.getViewTransform().mapPoint(e.client);
              this._view.zoomAt(l, t);
            }
          }
          this._dragArea = null;
        }

/**
     * @param {GUIPlatform.ModifiersChangedEvent} event
     * @private
     */
GZoomTool.prototype._modifiersChanged = function (event) {
          this._updateMode();
        }

GZoomTool.prototype._updateMode = function () {
          var e = 0;
          (((e = n.modifiers.optionKey ? -1 : 1) < 0 &&
            this._view.getZoom() <= h.options.minZoomFactor) ||
            (e > 0 && this._view.getZoom() >= h.options.maxZoomFactor)) &&
            (e = 0),
            e != this._zoomMode && ((this._zoomMode = e), this.updateCursor());
        }

/**
     * @private
     */
GZoomTool.prototype._hasDragArea = function () {
          return (
            this._dragArea &&
            (this._dragArea.getHeight() > 0 || this._dragArea.getWidth() > 0)
          );
        }

/**
     * @private
     */
    IFZoomTool.prototype._hasDragArea = function () {
        return (this._dragArea && (this._dragArea.getHeight() > 0 || this._dragArea.getWidth() > 0));
    };

    /** override */
GZoomTool.prototype.toString = function () {
          return "[Object GZoomTool]";
        }

module.exports = GZoomTool;
