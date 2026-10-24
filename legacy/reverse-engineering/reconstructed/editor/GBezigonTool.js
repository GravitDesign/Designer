/**
     * The bezigon tool
     * @class GBezigonTool
     * @extends IFPathTool
     * @constructor
     * @version 1.0
     */

function GBezigonTool() {
  // Constructor (reconstructed)
}

// Prototype methods
/**
     * Constructs new point, specific to Bezigon Tool, with the given position
     * @param {GUIMouseEvent} event used to define pressed button
     * @param {IFPoint} pt - coordinates to be used for new position in world system
     * @returns {IFPath.AnchorPoint} newly created anchor point
     * @private
     */
GBezigonTool.prototype._constructNewPoint = function (event, pt) {
          var i = new A.AnchorPoint();
          return (
            i.setProperties(["x", "y", "ah"], [t.getX(), t.getY(), !0]),
            e.button == s.BUTTON_LEFT
              ? p.modifiers.optionKey &&
                i.setProperty("tp", c.AnchorPoint.Type.Symmetric)
              : i.setProperty("tp", c.AnchorPoint.Type.Connector),
            i
          );
        }

/**
     * For Append and Prepend mode checks if a point, newly added to preview, is the path other end point.
     * And if so, closes the path specific for Bezigon Tool way, and removes that extra point from preview.
     * @private
     */
GBezigonTool.prototype._closeIfNeeded = function () {
          if (
            this._pathRef &&
            (this._newPoint ||
              this._pathRef.getAnchorPoints().getFirstChild() !=
                this._pathRef.getAnchorPoints().getLastChild()) &&
            (this._mode == r.Mode.Append || this._mode == r.Mode.Prepend)
          ) {
            var e, t;
            this._mode == r.Mode.Append
              ? ((e = this._dpathRef.getAnchorPoints().getLastChild()),
                (t = this._pathRef.getAnchorPoints().getFirstChild()))
              : ((e = this._dpathRef.getAnchorPoints().getFirstChild()),
                (t = this._pathRef.getAnchorPoints().getLastChild()));
            var i = new l(e.getProperty("x"), e.getProperty("y")),
              n = this._pathRef.getTransform();
            (i = n ? n.mapPoint(i) : i),
              t &&
                this._pathEditor.hitAnchorPoint(
                  t,
                  this._view
                    .getWorldTransform(this._view.getScene().getActivePage())
                    .mapPoint(i),
                  this._view.getWorldTransform(
                    this._view.getScene().getActivePage()
                  ),
                  h.annotDropDistance
                ) &&
                (this._transactionType == r.Transaction.NoTransaction
                  ? this._startTransaction(r.Transaction.ModifyPathProperties)
                  : (this._transactionType =
                      r.Transaction.ModifyPathProperties),
                this._pathRef.beginUpdate(),
                this._pathEditor.selectOnePoint(t),
                p.modifiers.optionKey &&
                  t.setProperties(
                    ["ah", "tp"],
                    [!1, c.AnchorPoint.Type.Asymmetric]
                  ),
                t.getProperty("ah") ||
                  t.setProperties(
                    ["hlx", "hly"],
                    [e.getProperty("hlx"), e.getProperty("hly")]
                  ),
                this._dpathRef.getAnchorPoints().removeChild(e),
                this._newPoint ||
                  ((e =
                    this._mode == r.Mode.Append
                      ? this._pathRef.getAnchorPoints().getLastChild()
                      : this._pathRef.getAnchorPoints().getFirstChild()),
                  this._pathRef.getAnchorPoints().removeChild(e)),
                this._dpathRef.setProperty("closed", !0),
                this._pathRef.setProperty("closed", !0),
                this._pathRef.endUpdate(),
                this._pathEditor.requestInvalidation(),
                this._pathEditor.setActiveExtendingMode(u.ExtendingMode.Off),
                (this._newPoint = false));
          }
        }

/** @override */
GBezigonTool.prototype._mouseRelease = function (event) {
          if (
            (this._pathEditor && this._pathEditor.allowRemoval(),
            this._editor.getGuides().invalidate(),
            !this._released)
          )
            try {
              if (
                ((this._released = true),
                this._mode == r.Mode.Append || this._mode == r.Mode.Prepend)
              ) {
                var t = this._updatePoint(e.client);
                this._closeIfNeeded(),
                  this._pathRef && this._pathRef.getProperty("closed")
                    ? (this._setCursorForPosition(a.PenMinus),
                      (this._mode = r.Mode.Edit))
                    : this._newPoint
                    ? (this._addPoint(this._editPt, !1, !0),
                      this._setCursorForPosition(a.Pen))
                    : this._editPt &&
                      this._pathRef &&
                      (this._transactionType == r.Transaction.NoTransaction &&
                        this._startTransaction(r.Transaction.MovePoint),
                      this._pathEditor.applyTransform(this._pathRef),
                      this._setCursorForPosition(a.PenEnd),
                      this._pathEditor.setActiveExtendingMode(
                        this._mode == r.Mode.Prepend
                          ? u.ExtendingMode.Beginning
                          : u.ExtendingMode.End
                      )),
                  this._commitChanges();
              } else if (
                this._mode == r.Mode.Edit &&
                (this._editPt || this._refPt)
              )
                if (this._dragStarted && this._editPt && this._pathRef) {
                  t = this._updatePoint(e.client);
                  this._transactionType == r.Transaction.NoTransaction &&
                    this._startTransaction(r.Transaction.MovePoint),
                    this._pathEditor.applyTransform(this._pathRef),
                    this._setCursorForPosition(null, t),
                    this._commitChanges();
                } else
                  this._editPt
                    ? this._commitChanges()
                    : this._mouseNoDragReleaseOnEdit(e.client);
              (this._dragStarted = false), (this._dragStartPt = null);
            } finally {
              this._finishTransaction();
            }
          (this._lastMouseEvent = null), this._allowDeactivation();
        }

/** override */
GBezigonTool.prototype.toString = function () {
          return "[Object GBezigonTool]";
        }

module.exports = GBezigonTool;
