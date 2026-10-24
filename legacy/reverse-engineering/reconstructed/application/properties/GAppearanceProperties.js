/**
 * GAppearanceProperties
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GAppearanceProperties() {
  // Constructor (reconstructed)
}

// Prototype methods
GAppearanceProperties.prototype._addPreview = function (e) {
        this._panel.find(".g-styles-preview").empty(),
          this._panel
            .find(".g-styles-preview")
            .css("display", "")
            .append(
              $("<img/>")
                .css({ height: "20px", width: "20px", borderRadius: "3px" })
                .attr("src", e)
            );
      }

GAppearanceProperties.prototype._assignProperty = function (e, t, n) {
        this._assignProperties([e], [t], n);
      }

GAppearanceProperties.prototype._assignProperties = function (e, t, n) {
        if (this._document) {
          var o = this._document.getEditor();
          o.beginTransaction();
          try {
            for (var a = 0; a < this._elements.length; ++a) {
              this._elements[a];
              var r = i.GElementEditor.getEditor(this._elements[a]);
              (r && r.applyPropertiesToParts(e, t)) ||
                this._elements[a].setProperties(e, t);
            }
          } finally {
            o.commitTransaction(n);
          }
        } else console.warn("GAppearanceProperties: empty _document property");
      }

GAppearanceProperties.prototype._checkSyncState = function () {
        this._elements &&
        this._elements.length > 0 &&
        this._elements[0].hasProperty("sref") &&
        !this._elements[0].equalsStyle()
          ? this._panel.find(".g-style-sync").removeClass("g-disabled")
          : this._panel.find(".g-style-sync").addClass("g-disabled");
      }

GAppearanceProperties.prototype.toString = function () {
        return "[Object GAppearanceProperties]";
      }

module.exports = GAppearanceProperties;
