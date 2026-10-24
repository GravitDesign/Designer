/**
     * Text properties panel
     * @class GTextProperties
     * @extends GProperties
     * @constructor
     */

function GTextProperties() {
  // Constructor (reconstructed)
}

// Prototype methods
GTextProperties.prototype._hasMultipleLanguages = function () {
        return this._hasMultipleValues(i.GText.PropertyMapping._tlocl);
      }

GTextProperties.prototype._hasMultipleStylisticSets = function () {
        return this._hasMultipleValues(i.GText.PropertyMapping._tstyls);
      }

GTextProperties.prototype._hasMultipleValues = function (e) {
        return this._text.some((t) => {
          if (t instanceof i.GText) {
            const n = t.getTLCore().getDocumentRange().getFormatting()[e];
            return g.multipleValues === n;
          }
        });
      }

GTextProperties.prototype._toggleFormatting = function (e) {
        if (this._text && this._text.length) {
          const n = this._text.map((e) => o.GElementEditor.getEditor(e) || e),
            a = this._getFormatting("underline", n) || null,
            r = this._getFormatting("strikeout", n) || null;
          var t = this._getFormatting("ligatures", n);
          const s = {
              underline: a,
              strikeout: r,
              ligatures: (t =
                "auto" === t ? !this._getProperty("_tcs", n) : !!t),
              fractions: this._getFormatting("fractions", n),
            },
            l = this._getProperty("_tfw", n) || "",
            c = this._getProperty("_tfs", n) || "";
          if ("bold" === e) {
            let e;
            parseInt(l) === i.GFont.Weight.Bold
              ? ((e =
                  this._weightsAvailable.indexOf(i.GFont.Weight.Regular) >= 0
                    ? i.GFont.Weight.Regular
                    : Math.min.apply(null, this._weightsAvailable)),
                (e = e || i.GFont.Style.Regular))
              : (e = i.GFont.Weight.Bold),
              this._assignProperties(["_tfw"], [e]);
          } else if ("italic" === e)
            this._assignProperties(
              ["_tfs"],
              [
                c === i.GFont.Style.Italic
                  ? i.GFont.Style.Normal
                  : i.GFont.Style.Italic,
              ]
            );
          else {
            const t = this._document.getEditor();
            try {
              t.beginTransaction(),
                this._text.forEach((t) => {
                  if (
                    (t instanceof o.GTextEditor && (t = t.getElement()),
                    t instanceof i.GText)
                  ) {
                    const n = t.getTLCore();
                    if (n) {
                      let i;
                      const a = o.GElementEditor.getEditor(t);
                      (i =
                        a && a.isInlineEdit()
                          ? n.selectedRange()
                          : n.getDocumentRange()),
                        i && i.setFormatting(e, 1 != s[e]);
                    }
                  }
                });
            } finally {
              t.commitTransaction(
                i.GLocale.get(
                  new i.GLocaleKey(
                    "GTextProperties",
                    "action.modify-text-properties"
                  )
                )
              );
            }
          }
          this._updateProperties();
        }
      }

GTextProperties.prototype._assignMarker = function (e) {
        if (!this._document) return;
        const t = this._document.getEditor();
        (this._ownChange = true), t.beginTransaction();
        try {
          this._text.forEach((t) => {
            if (
              (t instanceof o.GTextEditor && (t = t.getElement()),
              t instanceof i.GText)
            ) {
              const n = t.getTLCore();
              if (n) {
                let i;
                const a = o.GElementEditor.getEditor(t);
                (i =
                  a && a.isInlineEdit()
                    ? n.selectedRange()
                    : n.getDocumentRange()),
                  i && i.toggleList(e);
              }
            }
          });
        } finally {
          t.commitTransaction(
            i.GLocale.get(
              new i.GLocaleKey(
                "GTextProperties",
                "action.modify-text-properties"
              )
            )
          ),
            (this._ownChange = false);
        }
      }

/**
     * @param {String} property
     * @param {*} value
     * @private
     */
GTextProperties.prototype._assignProperty = function (property, value) {
        this._assignProperties([e], [t], n, o);
      }

/**
     * @param {String} property
     * @param {*} value
     * @private
     */
    GTextProperties.prototype._assignProperty = function (property, value) {
        this._assignProperties([property], [value]);
    };

    /**
     * @param {Array<String>} properties
     * @param {Array<*>} values
     * @private
     */
GTextProperties.prototype._assignProperties = function (properties, values) {
        if (this._document) {
          var r = this._document.getEditor();
          n || ((this._ownChange = true), r.beginTransaction());
          try {
            for (var s = 0; s < this._text.length; ++s) {
              (l = o.GElementEditor.getEditor(this._text[s]))
                ? l.setProperties(e, t, n)
                : this._text[s].setProperties(e, t, !1, !1, n);
            }
          } finally {
            n ||
              (r.commitTransaction(
                i.GLocale.get(
                  new i.GLocaleKey(
                    "GTextProperties",
                    "action.modify-text-properties"
                  )
                ),
                a || null
              ),
              (this._ownChange = false));
          }
          if (e.includes("sc"))
            for (s = 0; s < this._text.length; ++s) {
              var l;
              (l = o.GElementEditor.getEditor(this._text[s])) &&
                l.requestInvalidation();
            }
        }
      }

/** @override */
GTextProperties.prototype.toString = function () {
        return "[Object GTextProperties]";
      }

module.exports = GTextProperties;
