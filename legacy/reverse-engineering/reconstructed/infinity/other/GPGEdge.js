/**
 * GPGEdge
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GPGEdge() {
  // Constructor (reconstructed)
}

// Prototype methods
GPGEdge.prototype.getMarkersBorderBBox = function (e, t) {
          var i = null;
          if (t.$_bhm || t.$_btm) {
            var n = this._pathBase;
            e &&
              ((n = new c(!1, this._pathBase.cloneAnchorPoints())).setProperty(
                "trf",
                e
              ),
              n.assignStyleFrom(this));
            i = n.getGeometryBBox();
            i = n._calculateMarkersBorderBBox(i, t);
          }
          return i;
        }

GPGEdge.prototype.toString = function () {
          return "[Object GPGEdge]";
        }

module.exports = GPGEdge;
