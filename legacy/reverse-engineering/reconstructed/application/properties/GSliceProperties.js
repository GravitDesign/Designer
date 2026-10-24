/**
     * Slice properties panel
     * @class GSliceProperties
     * @extends GProperties
     * @constructor
     */

function GSliceProperties() {
  // Constructor (reconstructed)
}

// Prototype methods
/** @override */
GSliceProperties.prototype.update = function (document, elements) {
        if ((this._updateUI(), this._ownChange)) return true;
        if (
          (this._chooserElem && this._chooserElem.gPatternChooser("close"),
          this._document &&
            (this._document
              .getScene()
              .removeEventListener(
                i.GNode.AfterPropertiesChangeEvent,
                this._afterPropertiesChange,
                this
              ),
            gDesigner.removeEventListener(l, this._settingChanged),
            (this._document = null)),
          (this._slices = []),
          e)
        ) {
          for (var o = 0; o < t.length; ++o)
            t[o] instanceof i.GSlice && this._slices.push(t[o]);
          if (this._slices.length && this._slices.length === t.length)
            return (
              (this._document = e),
              this._document
                .getScene()
                .addEventListener(
                  i.GNode.AfterPropertiesChangeEvent,
                  this._afterPropertiesChange,
                  this
                ),
              gDesigner.addEventListener(l, this._settingChanged, this),
              this._updateProperties(n),
              !0
            );
        }
        return false;
      }

GSliceProperties.prototype._updateUI = function () {
        let e = (e) => {
            e.prev().remove();
          },
          t = (e, t) => {
            e.prev().length ||
              $("<span/>").addClass("g-input-label").text(t).insertBefore(e);
          },
          n = this._panel.find(".slice-position-left-row .property-label span"),
          o = this._panel.find(".slice-size-width-row .property-label span"),
          a = this._panel.find(".x-input"),
          r = this._panel.find(".y-input"),
          s = this._panel.find(".w-input"),
          l = this._panel.find(".h-input");
        gDesigner.isTouchEnabled()
          ? (this._panel.find(".trm-checkbox").gCheckboxSlider(),
            this._panel.find(".cls-check-checkbox").gCheckboxSlider(),
            n.text(
              i.GLocale.get(new i.GLocaleKey("GCommonNames", "text.position"))
            ),
            o.text(
              i.GLocale.get(new i.GLocaleKey("GCommonNames", "text.size"))
            ),
            t(a, "x"),
            t(r, "y"),
            t(s, "w"),
            t(l, "h"))
          : (this._panel.find(".trm-checkbox").gCheckboxSlider("unmount"),
            this._panel.find(".cls-check-checkbox").gCheckboxSlider("unmount"),
            n.text(
              i.GLocale.get(new i.GLocaleKey("GCommonNames", "text.left"))
            ),
            o.text(
              i.GLocale.get(new i.GLocaleKey("GCommonNames", "text.width"))
            ),
            e(a),
            e(r),
            e(s),
            e(l));
      }

/**
     * @param {IFNode.AfterPropertiesChangeEvent} event
     * @private
     */
GSliceProperties.prototype._afterPropertiesChange = function (event) {
        !e.temporary &&
          this._slices.length > 0 &&
          this._slices[0] === e.node &&
          this._updateProperties();
      }

GSliceProperties.prototype._settingChanged = function (e) {
        "decimals_num" === e.key && this._updateProperties(),
          "touch" === e.key && this._updateUI();
      }

/**
     * @param {IFNode.AfterPropertiesChangeEvent} event
     * @private
     */
    GSliceProperties.prototype._afterPropertiesChange = function (event) {
        // Update ourself if our first element is changed
        if (this._slices.length > 0 && this._slices[0] === event.node) {
            this._updateProperties();
        }
    };

    /**
     * @private
     */
GSliceProperties.prototype._updateProperties = function (e) {
        var t = this._document.getScene(),
          n = this._slices[0],
          o = function (e) {
            var o = this._panel.find('input[data-property="' + e + '"]');
            this._slices.length > 1
              ? o.gInputBox("value", null).prop("disabled", !0)
              : o
                  .gInputBox(
                    "value",
                    t.pointToString(
                      n.getProperty(e),
                      t.getOptimalDecimalsCount()
                    )
                  )
                  .prop("disabled", !1);
          }.bind(this);
        o("x"), o("y"), o("w"), o("h");
        var i = n.getProperty("cls");
        this._panel.find('[data-property="cls-check"]').prop("checked", !!i),
          this._panel
            .find('[data-property="cls"]')
            .prop("disabled", !i)
            .gPatternChooser("value", n.getProperty("cls")),
          this._panel
            .find('input[data-property="trm"]')
            .prop("checked", n.getProperty("trm")),
          e &&
            (e.evtType == a.GEditor.ModifiedEvent.Type.Undo ||
              e.evtType == a.GEditor.ModifiedEvent.Type.Redo) &&
            e.chooserOn &&
            e.slicePattern &&
            this._panel
              .find('[data-property="cls"]')
              .find(".preview")
              .trigger("click");
      }

/**
     * @param {String} property
     * @param {*} value
     * @private
     */
GSliceProperties.prototype._assignProperty = function (property, value) {
        this._assignProperties([e], [t], n, o);
      }

/**
     * @param {String} property
     * @param {*} value
     * @private
     */
    GSliceProperties.prototype._assignProperty = function (property, value) {
        this._assignProperties([property], [value]);
    };

    /**
     * @param {Array<String>} properties
     * @param {Array<*>} values
     * @private
     */
GSliceProperties.prototype._assignProperties = function (properties, values) {
        if (n)
          for (var a = 0; a < this._slices.length; ++a)
            this._slices[a].setProperties(e, t, !0);
        else {
          this._ownChange = true;
          var r = this._document.getEditor();
          r.beginTransaction();
          try {
            for (a = 0; a < this._slices.length; ++a)
              this._slices[a].setProperties(e, t);
          } finally {
            r.commitTransaction(
              i.GLocale.get(
                new i.GLocaleKey(
                  "GSliceProperties",
                  "action.modify-slice-properties"
                )
              ),
              o || null
            ),
              (this._ownChange = false);
          }
        }
      }

/** @override */
GSliceProperties.prototype.toString = function () {
        return "[Object GSliceProperties]";
      }

module.exports = GSliceProperties;
