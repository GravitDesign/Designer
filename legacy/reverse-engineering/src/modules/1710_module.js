/**
 * Webpack Module #1710
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(8),
      n(3),
      n(4),
      n(1352),
      (e.exports = (e) => {
        (e._DragAndDropHelper = function (e) {
          this._vtree = e;
        }),
          (e._DragAndDropHelper.prototype._droppableNodeUpper = null),
          (e._DragAndDropHelper.prototype._droppableNodeLower = null),
          (e._DragAndDropHelper.prototype._droppableNodeInside = null),
          (e._DragAndDropHelper.prototype.setDroppableNodeInside = function (
            e
          ) {
            (e && e === this._droppableNodeInside) ||
              (this._droppableNodeInside &&
                this._droppableNodeInside.row.classList.remove(
                  this._vtree._insertIntoStyle
                )),
              (this._droppableNodeInside = e),
              e &&
                this._droppableNodeInside.row.classList.add(
                  this._vtree._insertIntoStyle
                );
          }),
          (e._DragAndDropHelper.prototype.setDroppableNodeLower = function (e) {
            (this._droppableNodeLower = e), (this._droppableNodeUpper = null);
            const t = this._vtree._dragNode;
            this._vtree.beginUpdate(),
              this._vtree.removeNode(t),
              this._vtree.insertNodeAfter(e, t),
              this._vtree.endUpdate(!0);
          }),
          (e._DragAndDropHelper.prototype.setDroppableNodeUpper = function (e) {
            (this._droppableNodeUpper = e), (this._droppableNodeLower = null);
            const t = this._vtree._dragNode;
            this._vtree.beginUpdate(),
              this._vtree.removeNode(t),
              this._vtree.insertNodeBefore(e, t),
              this._vtree.endUpdate(!0);
          }),
          (e._DragAndDropHelper.prototype.drop = function () {
            const e = this._vtree._dragNode,
              t = this._vtree._root;
            if (this._droppableNodeInside) {
              const t = this._droppableNodeInside;
              this._vtree.beginUpdate(),
                this._vtree.removeNode(e),
                this._vtree.appendNode(t, e),
                this._vtree.endUpdate(!0),
                this._vtree._dropCallback &&
                  this._vtree._dropCallback(t, null, null, [e]);
            } else if (this._droppableNodeUpper) {
              const n = this._droppableNodeUpper;
              this._vtree._dropCallback &&
                (n !== t
                  ? this._vtree._dropCallback(n.parent, e.next, e.previous, [e])
                  : this._vtree._dropCallback(t, null, null, [e]));
            } else if (this._droppableNodeLower) {
              const t = this._droppableNodeLower;
              this._vtree._dropCallback &&
                this._vtree._dropCallback(t.parent, e.next, e.previous, [e]);
            }
          }),
          (e._DragAndDropHelper.prototype.toString = function () {
            return "[Object GVirtualTree._DragAndDropHelper]";
          });
      });
  }