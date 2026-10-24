/**
 * GBoolOpProperties
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GBoolOpProperties() {
  // Constructor (reconstructed)
}

// Prototype methods
GBoolOpProperties.prototype.update = function (e, t) {
        if (
          (this._document &&
            (this._document
              .getScene()
              .removeEventListener(
                o.GNode.AfterPropertiesChangeEvent,
                this._afterPropertiesChange
              ),
            (this._document = null)),
          (this._elements = []),
          e && t)
        ) {
          for (var n = 0; n < t.length; ++n) {
            var i = t[n];
            if (
              i.getParent() &&
              i.getParent() instanceof o.GCompoundShape &&
              i.getPrevious()
            )
              this._elements.push(i);
            else if (i instanceof o.GCompoundShape && i.getFirstChild())
              for (
                var a = i.getFirstChild().getNext();
                null !== a;
                a = a.getNext()
              )
                this._elements.push(a);
          }
          if (this._elements.length)
            return (
              (this._document = e),
              this._document
                .getScene()
                .addEventListener(
                  o.GNode.AfterPropertiesChangeEvent,
                  this._afterPropertiesChange,
                  this
                ),
              this._updateProperties(),
              !0
            );
        }
        return false;
      }

GBoolOpProperties.prototype._afterPropertiesChange = function (e) {
        !e.temporary &&
          this._elements.length > 0 &&
          this._elements[0] === e.node &&
          this._updateProperties();
      }

GBoolOpProperties.prototype._updateProperties = function () {
        var e = this._elements[0];
        this._panel.find("button[data-op]").each(function (t, n) {
          var o = $(n);
          o.toggleClass(
            "g-active",
            e.getProperty("bool") === parseInt(o.attr("data-op"))
          );
        });
      }

GBoolOpProperties.prototype.toString = function () {
        return "[Object GBoolOpProperties]";
      }

module.exports = GBoolOpProperties;
