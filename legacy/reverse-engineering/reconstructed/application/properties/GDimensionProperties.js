/**
 * GDimensionProperties
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GDimensionProperties() {
  // Constructor (reconstructed)
}

// Prototype methods
GDimensionProperties.prototype._assignAnchorProperty = function (e, t) {
        if (this._document) {
          var n = this._document.getEditor();
          n.beginTransaction();
          try {
            for (var o = 0; o < this._elements.length; ++o) {
              var r = this._elements[o];
              if (r.getParent().hasMixin(a.GElement.Layout)) {
                var s = i.GElementEditor.getEditor(this._elements[o]);
                (s && s.applyPropertiesToParts(e, t)) ||
                  this._elements[o].setProperties(e, t);
              }
            }
          } finally {
            n.commitTransaction(
              a.GLocale.get(
                new a.GLocaleKey("GDimensionProperties", "action.change-anchor")
              )
            );
          }
        } else console.warn("GDimensionProperties: empty _document property");
      }

GDimensionProperties.prototype._getDelta = function () {
        return new a.GPoint(0, 0);
      }

GDimensionProperties.prototype.toString = function () {
        return "[Object GDimensionProperties]";
      }

module.exports = GDimensionProperties;
