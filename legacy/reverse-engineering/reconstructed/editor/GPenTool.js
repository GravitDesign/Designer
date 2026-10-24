/**
     * The pen tool
     * @class GPenTool
     * @extends IFPathTool
     * @constructor
     * @version 1.0
     */

function GPenTool() {
  // Constructor (reconstructed)
}

// Prototype methods
/**
     * Sets shoulder length for styled corners equal to the distance between anchor point's position and passed position
     * @param {IFPoint} newPos - position, which should be used for shoulder length calculation in view coordinates
     * @private
     */
GPenTool.prototype._updateShoulders = function (newPos) {
          if (
            (this._mode == o.Mode.Append || this._mode == o.Mode.Prepend) &&
            this._editPt
          )
            if (
              this._pathEditor.hitAnchorPoint(
                this._editPt,
                e,
                this._view.getWorldTransform(
                  this._view.getScene().getActivePage()
                ),
                0
              )
            )
              this._mode == o.Mode.Append
                ? this._editPt.setProperty("cr", null)
                : this._mode == o.Mode.Prepend &&
                  this._editPt.setProperty("cl", null);
            else {
              var t = this._pathEditor.getTransformFromNative(
                  this._view.getWorldTransform(
                    this._view.getScene().getActivePage()
                  )
                ),
                i = new h(
                  this._editPt.getProperty("x"),
                  this._editPt.getProperty("y")
                );
              i = t.mapPoint(i);
              var n = p.ptDist(i.getX(), i.getY(), e.getX(), e.getY());
              this._mode == o.Mode.Append
                ? this._editPt.setProperty("cr", n)
                : this._mode == o.Mode.Prepend &&
                  this._editPt.setProperty("cl", n);
            }
        }

/**
     * This function should be called only if mouse dragging of a point is started.
     * It updates edited point's handles or shoulders to correspond to new position.
     * Position is constrained and snapped to guides if needed.
     * @param {IFPoint} clickPt - new position
     * @returns {IFPoint} - modified new position, if it was constrained or snapped to guides
     * @private
     */
GPenTool.prototype._updatePointProperties = function (clickPt) {
          var t = e;
          if (
            (this._pathEditor.requestInvalidation(),
            this._editPt &&
              this._editPt.getProperty("tp") == u.CornerType.Rounded)
          )
            this._updateShoulders(e);
          else if (d.modifiers.spaceKey) {
            if (
              this._lastMouseEvent &&
              this._lastMouseEvent.clientDelta &&
              this._editPt
            ) {
              var i = this._editPt.getProperty("x"),
                n = this._editPt.getProperty("y"),
                r = new h(
                  i + this._lastMouseEvent.clientDelta._x,
                  n + this._lastMouseEvent.clientDelta._y
                );
              (r = this._updatePoint(r)),
                this._pathEditor.requestInvalidation(),
                (t = t.add(new h(r.getX() - i, r.getY() - n)));
            }
          } else
            (t = this._constrainIfNeeded(
              e,
              this._view.getWorldTransform(
                this._view.getScene().getActivePage()
              ),
              this._pathRef,
              this._dragStartPt
            )),
              this._updateHandles(t);
          return t;
        }

/** override */
GPenTool.prototype.toString = function () {
          return "[Object GPenTool]";
        }

module.exports = GPenTool;
