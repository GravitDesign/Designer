/**
 * GFreehandTool
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GFreehandTool() {
  // Constructor (reconstructed)
}

// Prototype methods
GFreehandTool.prototype._correctFillVisibility = function () {
          if (this._newPath)
            if (this._startingSelection && this._startingSelection.length) {
              for (
                var e = null, t = this._startingSelection.length - 1;
                t >= 0;
                t--
              ) {
                var i = this._startingSelection[t];
                if (
                  i instanceof c &&
                  !0 === i.getProperty("closed") &&
                  !1 === i.getProperty("fvs")
                ) {
                  e = i;
                  break;
                }
              }
              e ||
                v.each(
                  this._newPath.getPaintLayers().getFillLayers(),
                  function (e, t) {
                    t.setProperty("_vs", !0);
                  }
                );
            } else
              v.each(
                this._newPath.getPaintLayers().getFillLayers(),
                function (e, t) {
                  t.setProperty("_vs", !0);
                }
              );
        }

GFreehandTool.prototype._closeIfNeeded = function (e) {
          if (!this._newPath) return false;
          var t = this._newPath.getAnchorPoints(),
            i = t.getFirstChild(),
            n = t.getLastChild(),
            r = (i.$x - n.$x) * (i.$x - n.$x) + (i.$y - n.$y) * (i.$y - n.$y),
            o = window.devicePixelRatio / this._view.getZoom();
          return (
            r < 225 * o * o &&
            (e ||
              (n.setProperties(["x", "y"], [i.$x, i.$y]),
              this._newPath.correctClosedAttribute()),
            !0)
          );
        }

GFreehandTool.prototype._getRelatedItemClass = function () {
          return c;
        }

GFreehandTool.prototype._mouseDblClick = function (e) {
          "edit" == b.selectDoubleClickBehavior &&
            this._manager.notifyJobDone(this);
        }

GFreehandTool.prototype.toString = function () {
          return "[Object GFreehandTool]";
        }

module.exports = GFreehandTool;
