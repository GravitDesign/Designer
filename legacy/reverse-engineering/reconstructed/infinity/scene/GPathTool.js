/**
     * The base tool for path creating tools
     * @class GPathTool
     * @extends IFTool
     * @constructor
     * @version 1.0
     */

function GPathTool() {
  // Constructor (reconstructed)
}

// Prototype methods
GPathTool.prototype._setCursorForPosition = function (cursor, clickPt) {
          if (null !== e) this._cursor = e;
          else if (t)
            if (
              (this._pathEditor || this._checkPathEditor(), this._pathEditor)
            ) {
              var i = this._getPartInfo(t);
              if (i && i.id.type == l.PartType.Point) {
                var r = i.id.point,
                  o = i.editor.getPath();
                o.getProperty("closed") ||
                (r !== o.getAnchorPoints().getFirstChild() &&
                  r !== o.getAnchorPoints().getLastChild())
                  ? this._mode == T.Mode.Edit
                    ? (null !== r.getProperty("hlx") &&
                        null !== r.getProperty("hly")) ||
                      (null !== r.getProperty("hrx") &&
                        null !== r.getProperty("hry"))
                      ? (this._cursor = h.PenModify)
                      : (this._cursor = h.PenMinus)
                    : (this._cursor = h.Pen)
                  : (this._mode == T.Mode.Append &&
                      r === o.getAnchorPoints().getFirstChild()) ||
                    (this._mode == T.Mode.Prepend &&
                      r === o.getAnchorPoints().getLastChild())
                  ? (this._cursor = h.PenEnd)
                  : (this._mode == T.Mode.Append &&
                      r === o.getAnchorPoints().getLastChild()) ||
                    (this._mode == T.Mode.Prepend &&
                      r === o.getAnchorPoints().getFirstChild())
                  ? (this._cursor = h.PenModify)
                  : (this._cursor = h.Pen);
              } else
                this._mode == T.Mode.Edit
                  ? i && i.id.type == l.PartType.Segment
                    ? n.modifiers.shiftKey || this._isSegmentMiddle(i)
                      ? (this._cursor = h.PenPlusMiddle)
                      : (this._cursor = h.PenPlus)
                    : (this._cursor = h.PenStart)
                  : (this._cursor = h.Pen);
            } else this._cursor = h.PenStart;
          else this._cursor = h.PenStart;
          this.updateCursor();
        }

GPathTool.prototype._getPartInfo = function (e) {
          var t = null;
          if (this._pathEditor)
            if (this._cached && this._cached.point == e) {
              if (
                ((t = this._cached.partInfo),
                !n.modifiers.shiftKey && this._cached.middlePoint)
              ) {
                var i = this._getPaintRect();
                (this._cached.middlePoint = null),
                  (this._cached.segmentNo = null),
                  this.invalidateArea(i);
              }
            } else {
              t = this._pathEditor.getPartInfoAt(
                e,
                this._view.getWorldTransform(
                  this._view.getScene().getActivePage()
                ),
                null,
                d.pickDistance
              );
              var r = null,
                o = null;
              this._cached &&
              null !== this._cached.segmentNo &&
              n.modifiers.shiftKey &&
              (!t ||
                (t.id.type == l.PartType.Segment &&
                  t.data.type == l.SegmentData.HitRes &&
                  t.data.hitRes.outline &&
                  t.data.hitRes.segment === this._cached.segmentNo))
                ? ((o = this._cached.segmentNo), (r = this._cached.middlePoint))
                : this._cached &&
                  this._cached.middlePoint &&
                  this.invalidateArea(this._getPaintRect()),
                (this._cached = {
                  point: e,
                  partInfo: t,
                  segmentNo: o,
                  middlePoint: r,
                });
            }
          return t;
        }

GPathTool.prototype._highlightMiddle = function (e) {
          if (this._pathEditor) {
            var t = this._getPartInfo(e);
            if (
              !this._cached.middlePoint &&
              t &&
              t.id.type == l.PartType.Segment &&
              t.data.type == l.SegmentData.HitRes &&
              t.data.hitRes.outline
            ) {
              var i = t.editor
                .getElement()
                .getSegmentMiddle(t.data.hitRes.segment);
              i &&
                ((this._cached.segmentNo = t.data.hitRes.segment),
                (this._cached.middlePoint = i),
                this.invalidateArea(this._getPaintRect()));
            }
          }
        }

GPathTool.prototype._getPaintRect = function () {
          if (this._cached && this._cached.middlePoint) {
            var e = d.annotationHandles.path.center;
            return b.getAnnotationBBox(
              this._view.getWorldTransform(
                this._view.getScene().getActivePage()
              ),
              this._cached.middlePoint,
              e.size,
              !0
            );
          }
          return null;
        }

GPathTool.prototype._sceneModified = function (e) {
          this._findSideConnectPoints();
        }

GPathTool.prototype._findSideConnectPoints = function () {
          var e = this._scene.getActivePage();
          (this._sideConnectPoints = null), this._checkPathEditor();
          var t = this._pathRef
            ? this._pathRef
            : this._pathEditor && this._pathEditor instanceof l
            ? this._pathEditor.getPath()
            : null;
          e.accept(
            function (e) {
              if (
                e instanceof m &&
                !e.hasFlag(E.Flag.FullLocked) &&
                !e.getProperty("closed") &&
                e != t
              ) {
                var i = e.getAnchorPoints(),
                  n = new u(
                    i.getFirstChild().getProperty("x"),
                    i.getFirstChild().getProperty("y")
                  ),
                  r = e.getProperty("trf"),
                  o = {
                    node: e,
                    pt: (n = r ? r.mapPoint(n) : n),
                    end: 1,
                  };
                this._sideConnectPoints
                  ? this._sideConnectPoints.push(o)
                  : (this._sideConnectPoints = [o]),
                  i.getFirstChild() != i.getLastChild() &&
                    ((n = new u(
                      i.getLastChild().getProperty("x"),
                      i.getLastChild().getProperty("y")
                    )),
                    (n = r ? r.mapPoint(n) : n),
                    this._sideConnectPoints.push({
                      node: e,
                      pt: n,
                      end: 2,
                    }));
              }
              return true;
            }.bind(this),
            !1,
            !0
          );
        }

GPathTool.prototype._hitSideConnectPoints = function (e) {
          if (this._sideConnectPoints)
            for (var t = 0; t < this._sideConnectPoints.length; ++t) {
              var i = this._sideConnectPoints[t];
              if (
                w.isEqualEps(i.pt.getX(), e.getX()) &&
                w.isEqualEps(i.pt.getY(), e.getY())
              )
                return i;
            }
          return null;
        }

GPathTool.prototype._connectPaths = function (e) {
          if (this._pathRef) {
            var t = this._pathRef.getProperty("trf"),
              i = e.node.getProperty("trf"),
              n = null;
            if (null != t || null != i) {
              n = i || null;
              var r = t ? t.inverted() : null;
              r && (n = n ? n.multiplied(r) : r);
            }
            var o = new m();
            o
              .getAnchorPoints()
              .deserialize(e.node.getAnchorPoints().serialize(n)),
              2 == e.end && o.reverseOrder(),
              this._pathEditor.requestInvalidation(),
              this._pathEditor.releasePathPreview(),
              this._startTransaction(T.Transaction.JoinPaths),
              this._pathRef &&
                this._mode == T.Mode.Prepend &&
                this._pathRef.reverseOrder(),
              e.node.getParent().removeChild(e.node),
              (this._refPt = null);
            for (
              var a = o.getAnchorPoints().getFirstChild();
              null != a;
              a = o.getAnchorPoints().getFirstChild()
            )
              o.getAnchorPoints().removeChild(a),
                this._pathRef.getAnchorPoints().appendChild(a),
                this._refPt || (this._refPt = a);
            this._makePointMajor(this._refPt),
              this._pathEditor.setActiveExtendingMode(x.ExtendingMode.Off),
              this._finishTransaction(),
              (this._mode = T.Mode.Edit),
              (this._editPt = this._pathEditor.getPathPointPreview(
                this._refPt
              )),
              this._findSideConnectPoints();
          }
        }

/** override */
GPathTool.prototype.toString = function () {
          return "[Object GPathTool]";
        }

module.exports = GPathTool;
