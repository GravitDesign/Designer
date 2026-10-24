/**
 * GPathsGraphTool
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GPathsGraphTool() {
  // Constructor (reconstructed)
}

// Prototype methods
GPathsGraphTool.prototype._mouseNoDragReleaseOnEdit = function (e) {
          this._refPt &&
            ((null == this._refPt.getProperty("hlx") &&
              null == this._refPt.getProperty("hly") &&
              null == this._refPt.getProperty("hrx") &&
              null == this._refPt.getProperty("hry")) ||
              (this._transactionType == B.Transaction.NoTransaction &&
                this._startTransaction(B.Transaction.ModifyPointProperties),
              this._refPt.setProperties(
                ["ah", "hlx", "hly", "hrx", "hry"],
                [!1, null, null, null, null]
              ),
              this._finishTransaction(),
              this._makePointMajor(this._refPt),
              this._setCursorForPosition(A.PenMinus)),
            (this._refPt = null),
            this._commitChanges());
        }

GPathsGraphTool.prototype._setCursorForPosition = function (e, t) {
          if (null !== e) this._cursor = e;
          else if (t)
            if (
              (this._graphEditor || this._checkPathsGraphEditor(),
              this._graphEditor)
            ) {
              var i = this._getPartInfo(t);
              this._mode == B.Mode.Edit
                ? i
                  ? i.id.type == c.PartType.Anchor
                    ? (this._cursor = A.PenEnd)
                    : i.id.type == c.PartType.Point
                    ? (this._cursor = A.PenModify)
                    : (this._cursor = A.PenPlus)
                  : (this._cursor = A.PenStart)
                : i
                ? i.id.type == c.PartType.Anchor
                  ? (this._cursor = A.PenEnd)
                  : i.id.type == c.PartType.Point
                  ? (this._cursor = A.PenModify)
                  : (this._cursor = A.PenPlus)
                : (this._cursor = A.Pen);
            } else this._cursor = A.PenStart;
          this.updateCursor();
        }

GPathsGraphTool.prototype._getPartInfo = function (e) {
          var t = null;
          return (
            this._graphEditor &&
              (this._cached && this._cached.point == e
                ? (t = this._cached.partInfo)
                : ((t = this._graphEditor.getPartInfoAt(
                    e,
                    this._view.getWorldTransform(
                      this._view.getScene().getActivePage()
                    ),
                    null,
                    h.pickDistance
                  )) &&
                    t.id.type == c.PartType.Facet &&
                    (t = null),
                  (this._cached = {
                    point: e,
                    partInfo: t,
                  }))),
            t
          );
        }

GPathsGraphTool.prototype.toString = function () {
          return "[Object GPathsGraphTool]";
        }

module.exports = GPathsGraphTool;
