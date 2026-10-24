/**
 * GShapeTool
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GShapeTool() {
  // Constructor (reconstructed)
}

// Prototype methods
/** @override */
GShapeTool.prototype.deactivate = function (view) {
          this._editor && this._editor.getGuides().invalidate(),
            this.updateInlineHint(null),
            p.prototype.deactivate.call(this, e),
            e.removeEventListener(h.Move, this._mouseMove, this),
            e.removeEventListener(h.DragStart, this._mouseDragStart),
            e.removeEventListener(h.Drag, this._mouseDrag),
            e.removeEventListener(h.DragEnd, this._mouseDragEnd),
            e.removeEventListener(h.Down, this._mouseDown),
            e.removeEventListener(h.Release, this._mouseRelease),
            n.removeEventListener(r, this._modifiersChanged);
        }

/** @override */
GShapeTool.prototype.isDeactivatable = function () {
          return !this._isDragging;
        }

/** @override */
    IFShapeTool.prototype.isDeactivatable = function () {
        // cannot deactivate while dragging
        return this._dragStart ? false : true;
    };

    /** @override */
GShapeTool.prototype.paint = function (context) {}

GShapeTool.prototype.getAdditionalTransactionData = function (e, t) {
          return "function" == typeof this.getAdditionalTransactionDataMixin
            ? this.getAdditionalTransactionDataMixin(e, t)
            : null;
        }

/** @private */
GShapeTool.prototype._paintOutline = function (context) {
          e.canvas.putVertices(new l(this._shape)),
            e.canvas.strokeVertices(e.selectionOutlineColor, c.outlineWidth);
        }

/** @private */
    IFShapeTool.prototype._paintOutline = function (context) {
        context.canvas.putVertices(new IFVertexPixelAligner(this._shape));
        context.canvas.strokeVertices(context.selectionOutlineColor);
    };

    /**
     * @param {GUIMouseEvent.Down} event
     * @private
     */
GShapeTool.prototype._mouseDown = function (event) {
          e.button === h.BUTTON_LEFT &&
            this._editor.updateByMousePosition(
              e.client,
              this._view.getWorldTransform(this._scene),
              !1,
              this._view.getViewConfiguration()
            );
        }

/**
     * @param {GUIMouseEvent.Release} event
     * @private
     */
GShapeTool.prototype._mouseRelease = function (event) {
          if (!this._hasCreatedShape) {
            var t = this._view
              .getViewTransform(this._view.getScene().getActivePage())
              .mapPoint(e.client);
            this._editor.getGuides().beginMap(this._editor.getMappingScopes()),
              (t = this._editor
                .getGuides()
                .mapPoint(t, null, this._getExclusions())),
              this._editor.getGuides().finishMap(),
              this._createShapeManually(t);
          }
          (this._hasCreatedShape = false), this._manager.notifyJobDone(this);
        }

/**
     * @param {GUIMouseEvent.DragStart} event
     * @private
     */
GShapeTool.prototype._mouseDragStart = function (event) {
          (this._hasCreatedShape = false),
            (this._isDragging = true),
            this.beginPan(),
            (this._dragStart = this._view
              .getViewTransform(this._view.getScene().getActivePage())
              .mapPoint(e.client)),
            this._editor.getGuides().beginMap(this._editor.getMappingScopes()),
            (this._dragStart = this._editor
              .getGuides()
              .mapPoint(this._dragStart, null, this._getExclusions())),
            this._editor.getGuides().finishMap(),
            (this._shape = this._createShape()),
            this._invalidateShape(),
            (this._hasCreatedShape = this._insertShape(this._shape, !0));
          var t = g.getEditor(this._shape);
          t && (this._shape.setFlag(f.Flag.NoPaint), t.setOutlineTmpFlag()),
            this.updateInlineHint(null),
            this.updateCursor();
        }

/**
     * @param {GUIMouseEvent.Drag} event
     * @private
     */
GShapeTool.prototype._mouseDrag = function (event) {
          (this._dragCurrent = this._view
            .getViewTransform(this._view.getScene().getActivePage())
            .mapPoint(e.client)),
            this.isPanning() && this.panView(e.client, e.clientDelta),
            n.modifiers.spaceKey &&
              this._dragStartOrig &&
              (this._dragStart = this._dragStartOrig.add(
                this._dragCurrent.subtract(this._dragCurrentOrig)
              )),
            this._invalidateShape();
        }

/**
     * @param {GUIMouseEvent.Drag} event
     * @private
     */
    IFShapeTool.prototype._mouseDrag = function (event) {
        this._dragCurrent = this._view.getViewTransform().mapPoint(event.client);
        this._invalidateShape();
    };

    /**
     * @param {GUIMouseEvent.DragEnd} event
     * @private
     */
GShapeTool.prototype._mouseDragEnd = function (event) {
          this.endPan(), this._editor.getGuides().invalidate();
          var t = this._shape;
          if (
            ((this._shape = null),
            (this._dragStart = null),
            (this._dragCurrent = null),
            (this._shape = null),
            (this._dragArea = null),
            (this._dragLine = null),
            (this._dragStartOrig = null),
            (this._dragCurrentOrig = null),
            (this._isDragging = false),
            this.updateCursor(),
            this.updateInlineHint(null),
            !this._hasCreatedShape && t)
          )
            this._prepareShapeForAppend(t),
              this._insertShape(t),
              (this._hasCreatedShape = true);
          else if (this._hasCreatedShape) {
            t.removeFlag(f.Flag.NoPaint);
            var i = g.getEditor(t);
            i && i.removeOutlineTmpFlag(),
              t._notifyChange(f._Change.FinishGeometryUpdate, 1);
          }
        }

/**
     * @param {GUIMouseEvent.Move} event
     * @private
     */
GShapeTool.prototype._mouseMove = function (event) {
          this._isDragging ||
            ((this._movePosition = this._view
              .getViewTransform(this._view.getScene().getActivePage())
              .mapPoint(e.client)),
            this._invalidateMovePosition());
        }

/**
     * @param {GUIMouseEvent.Move} event
     * @private
     */
    IFShapeTool.prototype._mouseMove = function (event) {
        // NO-OP
    };

    /**
     * @param {GUIPlatform.ModifiersChangedEvent} event
     * @private
     */
GShapeTool.prototype._modifiersChanged = function (event) {
          (this._keepRatio && e.changed.shiftKey) ||
          (this._fromCenter && e.changed.optionKey) ||
          e.changed.metaKey
            ? this._invalidateShape()
            : e.changed.spaceKey &&
              (n.modifiers.spaceKey
                ? ((this._dragStartOrig = this._dragStart),
                  (this._dragCurrentOrig = this._dragCurrent))
                : ((this._dragStartOrig = null),
                  (this._dragCurrentOrig = null))),
            e.changed.metaKey &&
              !this._isDragging &&
              this._invalidateMovePosition();
        }

GShapeTool.prototype._getExclusions = function () {
          var e = this._getRelatedItemClass();
          return e && e.prototype.hasMixin.call(e.prototype, v) ? [_] : null;
        }

GShapeTool.prototype._invalidateMovePosition = function () {
          if (this._movePosition) {
            this._editor.getGuides().beginMap(this._editor.getMappingScopes());
            var e = this._editor
              .getGuides()
              .mapPoint(this._movePosition, null, this._getExclusions());
            if (
              (this._editor.getGuides().finishMap(),
              c.showTooltips &&
                c.coordinatesTooltip &&
                this._showMousePositionInlineHint())
            ) {
              var t =
                this._scene.pointToString(e.getX(), c.tooltipDecimalPlaces) +
                ", " +
                this._scene.pointToString(e.getY(), c.tooltipDecimalPlaces);
              this.updateInlineHint(t, e, u.Side.BOTTOM_LEFT);
            }
          }
        }

/**
     * @param {GUIPlatform.ModifiersChangedEvent} event
     * @private
     */
    IFShapeTool.prototype._modifiersChanged = function (event) {
        if ((this._keepRatio && event.changed.shiftKey) ||
                (this._fromCenter && event.changed.optionKey) ||
                event.changed.metaKey) {

            this._invalidateShape();
        }
    };

    /**
     * @private
     */
GShapeTool.prototype._invalidateShape = function () {
          if (this._dragStart && this._dragCurrent) {
            this._editor.getGuides().useExclusions([this._shape]),
              this._editor
                .getGuides()
                .beginMap(this._editor.getMappingScopes());
            var e = this._editor
              .getGuides()
              .mapPoint(this._dragCurrent, null, this._getExclusions());
            if (
              (this._editor.getGuides().finishMap(),
              !A.equals(this._dragStart, e))
            ) {
              var t = this._dragStart.getX(),
                i = this._dragStart.getY(),
                r = e.getX(),
                o = e.getY(),
                s = r,
                l = o;
              if (this._keepRatio && n.modifiers.shiftKey) {
                var h = r < t ? -1 : 1,
                  p = o < i ? -1 : 1;
                (m = Math.abs(r - t)) >= (y = Math.abs(o - i))
                  ? ((r = t + m * h), (o = i + m * p), (l = m < 2 * y ? o : i))
                  : ((r = t + y * h), (o = i + y * p), (s = y < 2 * m ? r : t));
              }
              var d = null,
                g = null;
              if (
                (this._fromCenter && n.modifiers.optionKey
                  ? ((d = u.fromPoints(
                      new A(t - (r - t), i - (o - i)),
                      new A(t + (r - t), i + (o - i))
                    )),
                    (g = [
                      new A(t - (s - t), i - (l - i)),
                      new A(t + (s - t), i + (l - i)),
                    ]))
                  : ((d = u.fromPoints(new A(t, i), new A(r, o))),
                    (g = [new A(t, i), new A(s, l)])),
                (this._dragArea = d),
                (this._dragLine = g),
                this._updateShape(this._shape, d, g, !0),
                c.showTooltips && c.sizeTooltip && this._showAreaInlineHint())
              ) {
                var f = null;
                if (this._dragArea) {
                  var m = this._dragArea.getWidth(),
                    y = this._dragArea.getHeight();
                  f =
                    this._shape instanceof a && this._shape.isLine()
                      ? this._scene.pointToString(
                          Math.sqrt(m * m + y * y),
                          c.tooltipDecimalPlaces
                        )
                      : this._scene.pointToString(m, c.tooltipDecimalPlaces) +
                        " × " +
                        this._scene.pointToString(y, c.tooltipDecimalPlaces);
                }
                this.updateInlineHint(f, this._dragCurrent, u.Side.BOTTOM_LEFT);
              }
            }
          }
        }

/**
     * Called to prepare a shape for appending
     * @param {IFShape} shape
     * @private
     */
GShapeTool.prototype._prepareShapeForAppend = function (shape) {
          return this._updateShape(e, this._dragArea, this._dragLine, !0);
        }

/**
     * Called to prepare a shape for appending
     * @param {IFShape} shape
     * @private
     */
    IFShapeTool.prototype._prepareShapeForAppend = function (shape) {
        // Update shape with scene coordinates before appending
        this._updateShape(shape, this._dragArea, this._dragLine, true);
    };

    /**
     * Called to insert a given shape
     * @param {IFShape} shape
     * @private
     */
GShapeTool.prototype._insertShape = function (shape) {
          if (e && e.getParent()) return false;
          if (i) this._editor.insertElements([e], !1, !!i, !0);
          else
            try {
              this._editor.beginTransaction(),
                this._editor.insertElements([e], !1, !0, !0);
            } finally {
              var r = this.getAdditionalTransactionData(e, e.getParent());
              this._editor.commitTransaction(
                n || m.get(new y("GShapeTool", "action.insert-elements")),
                r
              );
            }
          return true;
        }

/**
     * Called to create a shape manually as it has not yet been created via drag
     * @param {IFPoint} position the position to create the shape at in scene coordinates
     * @private
     */
GShapeTool.prototype._createShapeManually = function (position) {}

/**
     * Called to create a shape manually as it has not yet been created via drag
     * @param {IFPoint} position the position to create the shape at in scene coordinates
     * @private
     */
    IFShapeTool.prototype._createShapeManually = function (position) {
        // NO-OP
    };

    /**
     * Called to create an instance of the shape for this tool
     * @return {IFShape}
     * @private
     */
GShapeTool.prototype._createShape = function () {
          return new (this._getRelatedItemClass())();
        }

/**
     * Called to update the shape of this tool
     * @param {IFShape} shape the shape to update
     * @param {IFRect} area the shape area
     * @param {Array<IFPoint>} line the shape line
     * @param {Boolean} scene true if coordinates are in scene coordinates,
     * this usually is only the case before the shape gets appended, otherwise
     * if false, the coordinates are in view coordinates
     * @private
     */
GShapeTool.prototype._updateShape = function (shape, area, line, scene) {
          throw new Error("Not Supported.");
        }

/**
     * Called to check whether a center cross should be painted or not
     * @return {Boolean} true if a center cross should be painted, false if not (default)
     * @private
     */
GShapeTool.prototype._hasCenterCross = function () {
          return false;
        }

GShapeTool.prototype._showMousePositionInlineHint = function () {
          return false;
        }

GShapeTool.prototype._showAreaInlineHint = function () {
          return false;
        }

GShapeTool.prototype._getRelatedItemClass = function () {
          return d;
        }

/**
     * Called to check whether a center cross should be painted or not
     * @return {Boolean} true if a center cross should be painted, false if not (default)
     * @private
     */
    IFShapeTool.prototype._hasCenterCross = function () {
        return false;
    };

    /** override */
GShapeTool.prototype.toString = function () {
          return "[Object GShapeTool]";
        }

module.exports = GShapeTool;
