/**
     * Page properties panel
     * @class GPageProperties
     * @extends GProperties
     * @constructor
     */

function GPageProperties() {
  // Constructor (reconstructed)
}

// Prototype methods
GPageProperties.prototype._manageClipButtonState = function (e, t) {
        this._clipContentButton &&
          (t || this._clipContentButton.hasClass("g-disabled")
            ? t &&
              (this._clipContentButton.hasClass("g-disabled") &&
                (this._clipContentButton.removeAttr("disabled"),
                this._clipContentButton.removeClass("g-disabled")),
              e
                ? this._clipContentButton.addClass("g-active")
                : this._clipContentButton.removeClass("g-active"))
            : (this._clipContentButton.attr("disabled", !0),
              this._clipContentButton.addClass("g-disabled"),
              this._clipContentButton.removeClass("g-active")));
      }

/**
     * @param {String} property
     * @param {*} value
     * @private
     */
GPageProperties.prototype._assignProperty = function (property, value) {
        this._assignProperties([e], [t], n);
      }

/**
     * @param {String} property
     * @param {*} value
     * @private
     */
    GPageProperties.prototype._assignProperty = function (property, value) {
        this._assignProperties([property], [value]);
    };

    /**
     * @param {Array<String>} properties
     * @param {Array<*>} values
     * @private
     */
GPageProperties.prototype._assignProperties = function (properties, values) {
        this._ownChange = true;
        var r = this._document.getEditor();
        r.beginTransaction();
        try {
          this._pages.forEach(function (n) {
            var o = e,
              r = t;
            a &&
              ((o = e.slice()),
              (r = t.slice()),
              n.getProperty("bck") instanceof i.GColor ||
                (o.push("bck"),
                r.push(i.GRGBColor.WHITE),
                o.push("bop"),
                r.push(1)));
            n.setProperties(o, r);
          });
        } finally {
          r.commitTransaction(n, o || null), (this._ownChange = false);
        }
      }

/** @override */
GPageProperties.prototype.toString = function () {
        return "[Object GPageProperties]";
      }

module.exports = GPageProperties;
