/**
 * GPGAnchor
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GPGAnchor() {
  // Constructor (reconstructed)
}

// Prototype methods
GPGAnchor.prototype._handleChange = function (e, t) {
          if (e === n._Change.Store) t.blob.props = this.serialize();
          else if (e === n._Change.Restore)
            t.blob.hasOwnProperty("props") && this.deserialize(t.blob.props);
          else if (e == n._Change.AfterPropertiesChange) {
            var i = t.properties.indexOf("x"),
              r = t.properties.indexOf("y");
            if (i >= 0 || r >= 0) {
              for (var o = 0; o < this._inEdges.length; ++o)
                this._inEdges[o]
                  .getPathBase()
                  .getAnchorPoints()
                  .getLastChild()
                  .setProperties(["x", "y"], [this.$x, this.$y]);
              for (o = 0; o < this._outEdges.length; ++o)
                this._outEdges[o]
                  .getPathBase()
                  .getAnchorPoints()
                  .getFirstChild()
                  .setProperties(["x", "y"], [this.$x, this.$y]);
            }
          }
          n.prototype._handleChange.call(this, e, t);
        }

GPGAnchor.prototype._insertOrdered = function (e) {
          if (this._orderedEdges) {
            for (var t, i = null, n = 0; n < this._orderedEdges.length; ++n)
              (t = this._orderedEdges[n]),
                !i && t.getAngle() >= e.getAngle()
                  ? ((i = t), (this._orderedEdges[n] = e))
                  : i && ((this._orderedEdges[n] = i), (i = t));
            this._orderedEdges.push(i || e);
          } else this._orderedEdges = [e];
        }

GPGAnchor.prototype.toString = function () {
          return "[Object GPGAnchor]";
        }

module.exports = GPGAnchor;
