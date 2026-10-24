/**
 * GItemProperties
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GItemProperties() {
  // Constructor (reconstructed)
}

// Prototype methods
GItemProperties.prototype._assignProperty = function (e, t, n) {
        if ("clk" == e || "scc" == e) {
          var i = this._document.getEditor();
          i.beginTransaction();
          try {
            for (var a = 0; a < this._items.length; ++a) {
              var r = this._items[a];
              this._hasChildItem(r) &&
                ("clk" == e || r instanceof o.GShape) &&
                this._items[a].setProperties([e], [t]);
            }
          } finally {
            i.commitTransaction(n);
          }
        }
      }

GItemProperties.prototype._hasChildItem = function (e) {
        return (
          !!e.hasMixin(o.GNode.Container) &&
          !e.acceptChildren(
            function (e) {
              return !(e instanceof o.GItem);
            },
            !1,
            !1
          )
        );
      }

GItemProperties.prototype.toString = function () {
        return "[Object GItemProperties]";
      }

module.exports = GItemProperties;
